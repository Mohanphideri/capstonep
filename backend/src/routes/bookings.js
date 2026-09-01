const express = require("express");
const { connectToDatabase } = require("../lib/mongodb");
const { Booking } = require("../models/Booking");
const { Invoice } = require("../models/Invoice");
const { generateBookingPdf } = require("../lib/pdf");
const { getSiteSettings } = require("../lib/siteSettings");
const { requireAuth } = require("../middleware/requireAuth");
const { User } = require("../models/User");
const { normalizePhone } = require("../lib/msg91");

const router = express.Router();

// Customer-facing bookings API.
//
// There is NO customer checkout here — bookings are created only by the
// SuperAdmin (see routes/adminBookings.js). Everything below is
// read-only from the customer's point of view, and every query is
// scoped to req.session.userId so a customer can never see another
// customer's booking (spec §38/§68).

function serializeBooking(b, invoiceSummary) {
  return {
    bookingId: b.bookingId,
    status: b.status,
    vehicles: (b.vehicles || []).map((v) => v.vehicle),
    journey: b.journey,
    pricing: b.pricing,
    bookingDate: b.bookingDate,
    terms: b.terms,
    cancelledAt: b.cancelledAt,
    cancellationReason: b.cancellationReason,
    refundAmount: Number(b.refundAmount || 0),
    refundStatus: b.refundStatus || "NOT_APPLICABLE",
    refundExpectedDays: b.refundExpectedDays || "5–7 business days",
    invoice: invoiceSummary || null,
    createdAt: b.createdAt,
  };
}

// --- Authenticated: list own bookings ---
router.get("/", requireAuth, async (req, res) => {
  try {
    await connectToDatabase();
    const user = await User.findById(req.session.userId).select("phone").lean();
    const phone = user?.phone ? normalizePhone(user.phone) : null;
    const filter = phone ? { $or: [{ userId: req.session.userId }, { "customerSnapshot.phone": phone }] } : { userId: req.session.userId };
    const scope = req.query.scope;
    const now = new Date();
    if (scope === "upcoming") {
      filter["journey.journeyStart"] = { $gte: now };
      filter.status = { $in: ["DRAFT", "CONFIRMED", "IN_PROGRESS"] };
    } else if (scope === "past" || scope === "completed") {
      filter.status = { $in: ["COMPLETED"] };
    } else if (scope === "cancelled") {
      filter.status = { $in: ["CANCELLED"] };
    }

    const bookings = await Booking.find(filter).sort({ createdAt: -1 }).lean();
    const invoices = await Invoice.find({ bookingId: { $in: bookings.map((b) => b._id) } })
      .select("invoiceNumber bookingId total balance status")
      .lean();
    const invoiceByBooking = new Map(invoices.map((i) => [i.bookingId.toString(), i]));

    return res.json({
      success: true,
      bookings: bookings.map((b) =>
        serializeBooking(b, invoiceByBooking.get(b._id.toString()) || null)
      ),
    });
  } catch (err) {
    console.error("booking list error", err);
    return res.status(500).json({ success: false, error: "Failed to load bookings." });
  }
});

// --- Authenticated: booking detail (ownership enforced) ---
router.get("/:bookingId", requireAuth, async (req, res) => {
  try {
    await connectToDatabase();
    const user = await User.findById(req.session.userId).select("phone").lean();
    const phone = user?.phone ? normalizePhone(user.phone) : null;
    const booking = await Booking.findOne({ bookingId: req.params.bookingId }).lean();
    const ownsBooking = booking && (booking.userId?.toString() === req.session.userId || (phone && normalizePhone(booking.customerSnapshot?.phone || "") === phone));
    if (!booking || !ownsBooking) {
      return res.status(404).json({ success: false, error: "Booking not found." });
    }
    const invoice = await Invoice.findOne({ bookingId: booking._id })
      .select("invoiceNumber bookingId total balance status")
      .lean();
    return res.json({ success: true, booking: serializeBooking(booking, invoice) });
  } catch (err) {
    console.error("booking detail error", err);
    return res.status(500).json({ success: false, error: "Failed to load booking." });
  }
});


// --- Authenticated: customer cancellation ---
router.post("/:bookingId/cancel", requireAuth, async (req, res) => {
  try {
    if (String(req.body?.confirmation || "").trim().toLowerCase() !== "cancel") {
      return res.status(400).json({ success: false, error: 'Type "cancel" to confirm cancellation.' });
    }
    await connectToDatabase();
    const user = await User.findById(req.session.userId).select("phone").lean();
    const phone = user?.phone ? normalizePhone(user.phone) : null;
    const booking = await Booking.findOne({ bookingId: req.params.bookingId });
    const ownsBooking = booking && (booking.userId?.toString() === req.session.userId || (phone && normalizePhone(booking.customerSnapshot?.phone || "") === phone));
    if (!booking || !ownsBooking) return res.status(404).json({ success: false, error: "Booking not found." });
    // Cancellation is idempotent: if the first request reached the server but
    // its response was lost, a repeated request returns the already-cancelled
    // booking instead of showing a misleading failure.
    if (booking.status === "CANCELLED") {
      const invoice = await Invoice.findOne({ bookingId: booking._id }).select("invoiceNumber bookingId total balance status").lean();
      return res.json({ success: true, booking: serializeBooking(booking.toObject(), invoice), alreadyCancelled: true });
    }
    if (!["DRAFT", "CONFIRMED"].includes(booking.status)) {
      return res.status(422).json({ success: false, error: "This booking can no longer be cancelled online." });
    }
    booking.status = "CANCELLED";
    booking.cancelledAt = new Date();
    booking.cancellationReason = "Cancelled by customer";
    booking.refundAmount = Number(booking.pricing?.amountReceived || 0);
    booking.refundStatus = booking.refundAmount > 0 ? "REFUND_PENDING" : "NOT_APPLICABLE";
    booking.refundExpectedDays = "5–7 business days";
    await booking.save();
    const { Enquiry } = require("../models/Enquiry");
    await Enquiry.updateOne({ convertedToBookingId: booking._id }, { $set: { status: "CANCELLED" } });
    createNotification({ userId: booking.userId || req.session.userId, type: "BOOKING_CANCELLED", channel: "IN_APP", title: "Booking cancelled", message: booking.refundAmount > 0 ? `Your booking ${booking.bookingId} has been cancelled. Your refundable amount will be processed within 5–7 business days.` : `Your booking ${booking.bookingId} has been cancelled.`, bookingId: booking._id });
    const invoice = await Invoice.findOne({ bookingId: booking._id }).select("invoiceNumber bookingId total balance status").lean();
    return res.json({ success: true, booking: serializeBooking(booking.toObject(), invoice) });
  } catch (err) {
    console.error("customer booking cancel error", err);
    return res.status(500).json({ success: false, error: "Failed to cancel booking." });
  }
});

// --- Authenticated: download booking PDF (ownership enforced) ---
router.get("/:bookingId/pdf", requireAuth, async (req, res) => {
  try {
    await connectToDatabase();
    const user = await User.findById(req.session.userId).select("phone").lean();
    const phone = user?.phone ? normalizePhone(user.phone) : null;
    const booking = await Booking.findOne({ bookingId: req.params.bookingId }).lean();
    const ownsBooking = booking && (booking.userId?.toString() === req.session.userId || (phone && normalizePhone(booking.customerSnapshot?.phone || "") === phone));
    if (!booking || !ownsBooking) {
      return res.status(404).json({ success: false, error: "Booking not found." });
    }
    const pdfSettings = await getSiteSettings();
    booking.businessSnapshot = { ...(booking.businessSnapshot || {}), authorizedSignatory: pdfSettings.authorizedSignatory ? { ...pdfSettings.authorizedSignatory, signatureUrl: pdfSettings.signatureUrl } : null };
    const pdfBuffer = await generateBookingPdf(booking);
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${booking.bookingId}.pdf"`);
    return res.send(pdfBuffer);
  } catch (err) {
    console.error("booking pdf error", err);
    return res.status(500).json({ success: false, error: "Failed to generate PDF." });
  }
});

module.exports = router;
