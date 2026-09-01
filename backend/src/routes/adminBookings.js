const express = require("express");
const { z } = require("zod");
const mongoose = require("mongoose");
const { connectToDatabase } = require("../lib/mongodb");
const { Booking } = require("../models/Booking");
const { Enquiry } = require("../models/Enquiry");
const { Vehicle } = require("../models/Vehicle");
const { VehicleCategory } = require("../models/VehicleCategory");
const { User } = require("../models/User");
const { requireSuperAdmin } = require("../middleware/requireAuth");
const { recordAuditLog } = require("../lib/auditLog");
const { generateBookingId } = require("../lib/publicIds");
const { generateBookingPdf } = require("../lib/pdf");
const { getSiteSettings } = require("../lib/siteSettings");
const { sendTransactionalEmail } = require("../lib/brevo");
const { bookingConfirmationEmail, bookingCancellationEmail } = require("../lib/emailTemplates");
const { createNotification } = require("../lib/notify");
const { parseDateRange } = require("../lib/dateRange");
const { normalizePhone } = require("../lib/msg91");

const router = express.Router();

// Only the SuperAdmin creates, edits, or cancels bookings (spec §67).
// A customer can never reach any endpoint in this file.
router.use(requireSuperAdmin);

function isValidId(id) {
  return mongoose.Types.ObjectId.isValid(id);
}

// The admin UI links to a booking using either its Mongo _id or its
// human-readable bookingId (e.g. "KWT-2026-00842") depending on which page
// built the link — so every route keyed on :id must accept both, exactly
// like the existing GET detail and PDF-download routes already do.
function bookingLookupQuery(idParam) {
  return isValidId(idParam) ? { _id: idParam } : { bookingId: idParam };
}

function serializeBooking(b) {
  return {
    id: b._id.toString(),
    bookingId: b.bookingId,
    userId: b.userId?.toString(),
    enquiryId: b.enquiryId ? b.enquiryId.toString() : null,
    customer: b.customerSnapshot,
    vehicles: (b.vehicles || []).map((v) => v.vehicle),
    journey: b.journey,
    pricing: b.pricing,
    status: b.status,
    bookingDate: b.bookingDate,
    terms: b.terms,
    cancelledAt: b.cancelledAt,
    cancellationReason: b.cancellationReason,
    refundAmount: Number(b.refundAmount || 0),
    refundStatus: b.refundStatus || "NOT_APPLICABLE",
    refundExpectedDays: b.refundExpectedDays || "5–7 business days",
    adminNotes: b.adminNotes || [],
    createdAt: b.createdAt,
    updatedAt: b.updatedAt,
  };
}

async function buildVehicleSnapshot(vehicleId) {
  const vehicle = await Vehicle.findById(vehicleId).lean();
  if (!vehicle) return null;
  const category = vehicle.categoryId
    ? await VehicleCategory.findById(vehicle.categoryId).select("name").lean()
    : null;
  return {
    vehicleId: vehicle._id,
    name: vehicle.name,
    category: category?.name || null,
    capacity: vehicle.capacity,
    acType: vehicle.acType,
    seatType: vehicle.seatType,
    amenities: vehicle.amenities || [],
    photoUrl: vehicle.photos?.[0]?.url || null,
  };
}

// --- List bookings (search + filter + pagination) ---
router.get("/", async (req, res) => {
  try {
    await connectToDatabase();
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 25));
    const filter = {};
    const range = parseDateRange(req.query.from, req.query.to);
    if (!range) return res.status(400).json({success:false,error:"Invalid date range."});
    filter.createdAt = { $gte: range.start, $lte: range.end };
    if (req.query.status) filter.status = req.query.status;
    if (req.query.search) {
      const term = req.query.search.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const re = new RegExp(term, "i");
      filter.$or = [
        { bookingId: re },
        { "customerSnapshot.name": re },
        { "customerSnapshot.phone": re },
      ];
    }

    const [items, total] = await Promise.all([
      Booking.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
      Booking.countDocuments(filter),
    ]);

    return res.json({ success: true, bookings: items.map(serializeBooking), page, limit, total });
  } catch (err) {
    console.error("admin booking list error", err);
    return res.status(500).json({ success: false, error: "Failed to load bookings." });
  }
});

// --- Detail ---
router.get("/:id", async (req, res) => {
  try {
    await connectToDatabase();
    const booking = await Booking.findOne(bookingLookupQuery(req.params.id)).lean();
    if (!booking) return res.status(404).json({ success: false, error: "Booking not found." });
    return res.json({ success: true, booking: serializeBooking(booking) });
  } catch (err) {
    console.error("admin booking detail error", err);
    return res.status(500).json({ success: false, error: "Failed to load booking." });
  }
});

// --- Create a booking manually, optionally converting from an enquiry ---
//
// This is the single place a Booking is ever created. The SuperAdmin
// selects the final vehicle(s), enters journey + pricing details, and the
// system generates the public Booking ID server-side (spec §17/§20).
const vehicleLineSchema = z.object({
  vehicleId: z.string().refine(isValidId, "Invalid vehicle reference."),
  notes: z.string().trim().max(300).optional().nullable(),
});

const createBookingSchema = z.object({
  enquiryId: z.string().refine(isValidId, "Invalid enquiry reference.").optional().nullable(),
  userId: z.string().refine(isValidId, "Invalid customer reference.").optional().nullable(),
  customer: z
    .object({
      name: z.string().trim().min(2).max(120),
      phone: z.string().trim().min(6).max(20),
      email: z.string().trim().email().optional().or(z.literal("")).nullable(),
    })
    .optional(),
  vehicles: z.array(vehicleLineSchema).min(1, "Select at least one vehicle."),
  journey: z.object({
    pickup: z.string().trim().min(1).max(200),
    destination: z.string().trim().min(1).max(200),
    journeyStart: z.coerce.date(),
    journeyEnd: z.coerce.date().optional().nullable(),
    pickupTime: z.string().trim().max(20).optional().nullable(),
    passengers: z.coerce.number().int().positive().max(500),
    notes: z.string().trim().max(1000).optional().nullable(),
  }),
  pricing: z
    .object({
      rentalAmount: z.coerce.number().min(0).default(0),
      additionalCharges: z.coerce.number().min(0).default(0),
      discount: z.coerce.number().min(0).default(0),
      taxAmount: z.coerce.number().min(0).default(0),
      amountReceived: z.coerce.number().min(0).default(0),
    })
    .optional()
    .default({}),
  status: z.enum(["DRAFT", "CONFIRMED", "IN_PROGRESS", "COMPLETED", "CANCELLED"]).optional().default("CONFIRMED"),
  terms: z.string().trim().max(2000).optional().nullable(),
  sendEmail: z.boolean().optional().default(false),
});

router.post("/", async (req, res) => {
  try {
    const parsed = createBookingSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        error: parsed.error.issues[0]?.message ?? "Invalid booking details.",
      });
    }
    const d = parsed.data;
    const todayIndia = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(new Date());
    const startDateOnly = d.journey.journeyStart.toISOString().slice(0, 10);
    const endDateOnly = d.journey.journeyEnd ? d.journey.journeyEnd.toISOString().slice(0, 10) : null;
    if (startDateOnly < todayIndia) return res.status(422).json({ success: false, error: "Journey date cannot be in the past." });
    if (endDateOnly && endDateOnly < startDateOnly) return res.status(422).json({ success: false, error: "Return date cannot be before the journey date." });
    await connectToDatabase();

    // Resolve enquiry (optional) and customer.
    let enquiry = null;
    if (d.enquiryId) {
      enquiry = await Enquiry.findById(d.enquiryId);
      if (!enquiry) return res.status(404).json({ success: false, error: "Enquiry not found." });
      // BOOKED is the normal pre-conversion state. BOOKING-with-no-real-
      // booking is a pre-fix data state (see adminEnquiries.js) that we
      // still allow converting so it isn't permanently stuck.
      if (!["BOOKED", "BOOKING"].includes(enquiry.status)) {
        return res.status(409).json({ success: false, error: "Only enquiries selected for booking can be converted." });
      }
      if (enquiry.convertedToBookingId) {
        // Idempotency (spec §66): converting an already-converted enquiry
        // returns the existing booking rather than creating a duplicate.
        const existing = await Booking.findById(enquiry.convertedToBookingId).lean();
        if (existing) {
          return res.json({ success: true, booking: serializeBooking(existing), alreadyConverted: true });
        }
      }
    }

    let userId = d.userId || enquiry?.userId || null;
    let customerSnapshot = d.customer;
    if (!customerSnapshot && enquiry) {
      customerSnapshot = { name: enquiry.name, phone: enquiry.phone, email: enquiry.email };
    }
    if (!customerSnapshot) {
      return res.status(400).json({ success: false, error: "Customer details are required." });
    }
    const normalizedCustomerPhone = normalizePhone(customerSnapshot.phone || "");
    if (normalizedCustomerPhone.length !== 10) {
      return res.status(400).json({ success: false, error: "A valid 10-digit customer mobile number is required." });
    }
    customerSnapshot = { ...customerSnapshot, phone: normalizedCustomerPhone };

    // Every booking is tied to a User record so it can appear in that
    // customer's portal — find-or-create by phone, matching the OTP
    // login identity.
    if (!userId) {
      let user = await User.findOne({ phone: customerSnapshot.phone });
      if (!user) {
        user = await User.create({
          phone: customerSnapshot.phone,
          name: customerSnapshot.name,
          email: customerSnapshot.email || null,
          role: "customer",
        });
      }
      userId = user._id;
    }

    // Resolve every booked vehicle to a fresh snapshot.
    const vehicleLines = [];
    for (const line of d.vehicles) {
      // eslint-disable-next-line no-await-in-loop
      const snapshot = await buildVehicleSnapshot(line.vehicleId);
      if (!snapshot) {
        return res.status(404).json({ success: false, error: "One or more selected vehicles were not found." });
      }
      vehicleLines.push({ vehicle: snapshot, notes: line.notes || null });
    }

    const rentalAmount = d.pricing.rentalAmount || 0;
    const additionalCharges = d.pricing.additionalCharges || 0;
    const discount = d.pricing.discount || 0;
    const taxAmount = d.pricing.taxAmount || 0;
    const totalAmount = Math.max(0, rentalAmount + additionalCharges + taxAmount - discount);
    const amountReceived = Math.min(d.pricing.amountReceived || 0, totalAmount);
    const balanceAmount = Math.max(0, totalAmount - amountReceived);

    const bookingId = await generateBookingId();

    const booking = await Booking.create({
      bookingId,
      userId,
      enquiryId: enquiry ? enquiry._id : null,
      customerSnapshot: {
        name: customerSnapshot.name,
        phone: customerSnapshot.phone,
        email: customerSnapshot.email || null,
      },
      vehicles: vehicleLines,
      journey: d.journey,
      pricing: {
        rentalAmount,
        additionalCharges,
        discount,
        taxAmount,
        totalAmount,
        amountReceived,
        balanceAmount,
        currency: "INR",
      },
      status: d.status,
      terms: d.terms || null,
      createdBy: req.session.userId,
    });

    if (enquiry) {
      enquiry.convertedToBookingId = booking._id;
      enquiry.status = "BOOKING";
      await enquiry.save();
    }

    await recordAuditLog({
      req,
      action: "BOOKING_CREATED",
      entityType: "Booking",
      entityId: booking._id,
      metadata: { bookingId: booking.bookingId, enquiryId: enquiry?._id?.toString() || null },
    });

    createNotification({
      userId,
      type: "BOOKING_CONFIRMED",
      channel: "IN_APP",
      title: "Booking confirmed",
      message: `Your booking ${booking.bookingId} has been confirmed by Kuwarji Travels.`,
      bookingId: booking._id,
    });

    let emailResult = null;
    if (d.sendEmail && customerSnapshot.email) {
      try {
        const bookingObj = booking.toObject();
        const pdfSettings = await getSiteSettings();
        bookingObj.businessSnapshot = { ...(bookingObj.businessSnapshot || {}), authorizedSignatory: pdfSettings.authorizedSignatory ? { ...pdfSettings.authorizedSignatory, signatureUrl: pdfSettings.signatureUrl } : null };
        const pdfBuffer = await generateBookingPdf(bookingObj);
        emailResult = await sendTransactionalEmail({
          to: customerSnapshot.email,
          toName: customerSnapshot.name,
          subject: `Your Kuwarji Travels Booking is Confirmed — ${booking.bookingId}`,
          htmlContent: bookingConfirmationEmail({ booking: bookingObj }),
          template: "booking_confirmation",
          userId: userId.toString(),
          bookingId: booking._id.toString(),
          attachments: [{ name: `${booking.bookingId}.pdf`, content: pdfBuffer.toString("base64") }],
        });
      } catch (err) {
        console.error("booking confirmation email error", err);
        emailResult = { sent: false, reason: err.message || "Failed to prepare/send booking email." };
      }
    }

    return res.status(201).json({
      success: true,
      booking: serializeBooking(booking.toObject()),
      email: emailResult ? { sent: !!emailResult.sent, reason: emailResult.reason || null } : null,
    });
  } catch (err) {
    console.error("admin booking create error", err);
    return res.status(500).json({ success: false, error: "Failed to create booking." });
  }
});

// --- Update booking details/status/pricing ---
const updateBookingSchema = z.object({
  journey: createBookingSchema.shape.journey.partial().optional(),
  pricing: z
    .object({
      rentalAmount: z.coerce.number().min(0).optional(),
      additionalCharges: z.coerce.number().min(0).optional(),
      discount: z.coerce.number().min(0).optional(),
      taxAmount: z.coerce.number().min(0).optional(),
      amountReceived: z.coerce.number().min(0).optional(),
    })
    .optional(),
  status: z.enum(["DRAFT", "CONFIRMED", "IN_PROGRESS", "COMPLETED", "CANCELLED"]).optional(),
  terms: z.string().trim().max(2000).optional().nullable(),
  note: z.string().trim().max(1000).optional(),
});

router.patch("/:id", async (req, res) => {
  try {
    const parsed = updateBookingSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ success: false, error: parsed.error.issues[0]?.message ?? "Invalid request." });
    }
    const d = parsed.data;

    await connectToDatabase();
    const booking = await Booking.findOne(bookingLookupQuery(req.params.id));
    if (!booking) return res.status(404).json({ success: false, error: "Booking not found." });

    if (d.journey) {
      const nextJourney = { ...booking.journey.toObject(), ...d.journey };
      const todayIndia = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(new Date());
      const startDateOnly = new Date(nextJourney.journeyStart).toISOString().slice(0, 10);
      const endDateOnly = nextJourney.journeyEnd ? new Date(nextJourney.journeyEnd).toISOString().slice(0, 10) : null;
      if (startDateOnly < todayIndia) return res.status(422).json({ success: false, error: "Journey date cannot be in the past." });
      if (endDateOnly && endDateOnly < startDateOnly) return res.status(422).json({ success: false, error: "Return date cannot be before the journey date." });
      Object.assign(booking.journey, d.journey);
    }
    if (d.pricing) {
      const p = booking.pricing;
      Object.assign(p, d.pricing);
      p.totalAmount = Math.max(0, (p.rentalAmount || 0) + (p.additionalCharges || 0) + (p.taxAmount || 0) - (p.discount || 0));
      p.amountReceived = Math.min(p.amountReceived || 0, p.totalAmount);
      p.balanceAmount = Math.max(0, p.totalAmount - p.amountReceived);
    }
    const previousStatus = booking.status;
    if (d.status) {
      // A customer cancellation is final from the admin UI/API. Admins may
      // still add notes or view the record, but cannot overwrite CANCELLED
      // back to CONFIRMED/another status.
      if (booking.status === "CANCELLED" && d.status !== "CANCELLED") {
        return res.status(409).json({ success:false, error:"This booking was cancelled and cannot be reopened or overwritten." });
      }
      booking.status = d.status;
      if (d.status === "CANCELLED") {
        booking.cancelledAt = booking.cancelledAt || new Date();
        booking.refundAmount = Number(booking.pricing?.amountReceived || 0);
        booking.refundStatus = booking.refundAmount > 0 ? "REFUND_PENDING" : "NOT_APPLICABLE";
        booking.refundExpectedDays = "5–7 business days";
      } else {
        booking.cancelledAt = null;
        booking.refundAmount = 0;
        booking.refundStatus = "NOT_APPLICABLE";
      }
    }
    if (d.terms !== undefined) booking.terms = d.terms;
    if (d.note) {
      booking.adminNotes.push({ note: d.note, addedBy: req.session.userId });
    }

    await booking.save();
    if (booking.status === "CANCELLED") {
      const { Enquiry } = require("../models/Enquiry");
      await Enquiry.updateOne({ convertedToBookingId: booking._id }, { $set: { status: "CANCELLED" } });
    }

    // Keep an existing invoice synchronized when booking pricing is edited.
    // This prevents different balance values appearing in invoice, booking,
    // balance-sheet and customer views.
    if (d.pricing) {
      const { Invoice } = require("../models/Invoice");
      const invoice = await Invoice.findOne({ bookingId: booking._id });
      if (invoice) {
        invoice.total = Number(booking.pricing.totalAmount || 0);
        invoice.amountReceived = Math.min(Number(booking.pricing.amountReceived || 0), invoice.total);
        invoice.balance = Math.max(0, invoice.total - invoice.amountReceived);
        await invoice.save();
      }
    }

    if (previousStatus !== booking.status && booking.status === "CANCELLED") {
      createNotification({ userId: booking.userId, type: "BOOKING_CANCELLED", channel: "IN_APP", title: "Booking cancelled", message: `Your booking ${booking.bookingId} has been cancelled by Kuwarji Travels.`, bookingId: booking._id });
    } else if (previousStatus !== booking.status && booking.status === "CONFIRMED") {
      createNotification({ userId: booking.userId, type: "BOOKING_CONFIRMED", channel: "IN_APP", title: "Booking confirmed", message: `Your booking ${booking.bookingId} has been confirmed by Kuwarji Travels.`, bookingId: booking._id });
    }

    await recordAuditLog({
      req,
      action: "BOOKING_MODIFIED",
      entityType: "Booking",
      entityId: booking._id,
      metadata: { status: booking.status },
    });

    return res.json({ success: true, booking: serializeBooking(booking.toObject()) });
  } catch (err) {
    console.error("admin booking update error", err);
    return res.status(500).json({ success: false, error: "Failed to update booking." });
  }
});

// --- Send booking PDF by email (manual admin action only) ---
router.post("/:id/email", async (req, res) => {
  try {
    await connectToDatabase();
    const booking = await Booking.findOne(bookingLookupQuery(req.params.id)).lean();
    if (!booking) return res.status(404).json({ success: false, error: "Booking not found." });
    if (!booking.customerSnapshot.email) {
      return res.status(400).json({ success: false, error: "This customer has no email on file." });
    }
    const pdfSettings = await getSiteSettings();
    const bookingObj = { ...booking, businessSnapshot: { ...(booking.businessSnapshot || {}), authorizedSignatory: pdfSettings.authorizedSignatory ? { ...pdfSettings.authorizedSignatory, signatureUrl: pdfSettings.signatureUrl } : null } };
    const pdfBuffer = await generateBookingPdf(bookingObj);
    const result = await sendTransactionalEmail({
      to: booking.customerSnapshot.email,
      toName: booking.customerSnapshot.name,
      subject: `Your Kuwarji Travels Booking — ${booking.bookingId}`,
      htmlContent: bookingConfirmationEmail({ booking: bookingObj }),
      template: "booking_confirmation_manual",
      userId: booking.userId.toString(),
      bookingId: booking._id.toString(),
      attachments: [{ name: `${booking.bookingId}.pdf`, content: pdfBuffer.toString("base64") }],
    });
    if (!result.sent) {
      return res.status(502).json({ success: false, sent: false, error: result.reason || "Email service failed to send the booking." });
    }
    await recordAuditLog({ req, action: "BOOKING_EMAILED", entityType: "Booking", entityId: booking._id });
    return res.json({ success: true, sent: true, messageId: result.messageId || null });
  } catch (err) {
    console.error("admin booking email error", err);
    return res.status(500).json({ success: false, error: "Failed to email booking PDF." });
  }
});

// --- Cancel a booking ---
router.post("/:id/cancel", async (req, res) => {
  try {
    await connectToDatabase();
    const booking = await Booking.findOne(bookingLookupQuery(req.params.id));
    if (!booking) return res.status(404).json({ success: false, error: "Booking not found." });

    if (booking.status === "CANCELLED") {
      return res.status(409).json({ success:false, error:"This booking is already cancelled and cannot be overwritten." });
    }
    booking.status = "CANCELLED";
    booking.cancelledAt = new Date();
    booking.cancellationReason = req.body?.reason || null;
    booking.refundAmount = Number(booking.pricing?.amountReceived || 0);
    booking.refundStatus = booking.refundAmount > 0 ? "REFUND_PENDING" : "NOT_APPLICABLE";
    booking.refundExpectedDays = "5–7 business days";
    await booking.save();
    const { Enquiry } = require("../models/Enquiry");
    await Enquiry.updateOne({ convertedToBookingId: booking._id }, { $set: { status: "CANCELLED" } });

    createNotification({
      userId: booking.userId,
      type: "BOOKING_CANCELLED",
      channel: "IN_APP",
      title: "Booking cancelled",
      message: `Your booking ${booking.bookingId} has been cancelled by Kuwarji Travels.`,
      bookingId: booking._id,
    });

    await recordAuditLog({
      req,
      action: "BOOKING_CANCELLED",
      entityType: "Booking",
      entityId: booking._id,
    });

    if (booking.customerSnapshot.email) {
      sendTransactionalEmail({
        to: booking.customerSnapshot.email,
        toName: booking.customerSnapshot.name,
        subject: `Booking cancelled — ${booking.bookingId}`,
        htmlContent: bookingCancellationEmail({ booking: booking.toObject() }),
        template: "booking_cancellation",
        userId: booking.userId.toString(),
        bookingId: booking._id.toString(),
      }).catch((err) => console.error("cancellation email error", err));
    }

    return res.json({ success: true, booking: serializeBooking(booking.toObject()) });
  } catch (err) {
    console.error("admin booking cancel error", err);
    return res.status(500).json({ success: false, error: "Failed to cancel booking." });
  }
});

// --- Download PDF ---
router.get("/:id/pdf", async (req, res) => {
  try {
    await connectToDatabase();
    const booking = await Booking.findOne(bookingLookupQuery(req.params.id)).lean();
    if (!booking) return res.status(404).json({ success: false, error: "Booking not found." });
    const pdfSettings = await getSiteSettings();
    booking.businessSnapshot = { ...(booking.businessSnapshot || {}), authorizedSignatory: pdfSettings.authorizedSignatory ? { ...pdfSettings.authorizedSignatory, signatureUrl: pdfSettings.signatureUrl } : null };
    const pdfBuffer = await generateBookingPdf(booking);
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${booking.bookingId}.pdf"`);
    return res.send(pdfBuffer);
  } catch (err) {
    console.error("admin booking pdf error", err);
    return res.status(500).json({ success: false, error: "Failed to generate PDF." });
  }
});

module.exports = router;
