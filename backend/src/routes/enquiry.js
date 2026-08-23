const express = require("express");
const { z } = require("zod");
const mongoose = require("mongoose");
const { connectToDatabase } = require("../lib/mongodb");
const { Enquiry } = require("../models/Enquiry");
const { Vehicle } = require("../models/Vehicle");
const { VehicleCategory } = require("../models/VehicleCategory");
const { TourPackage } = require("../models/TourPackage");
const {
  verifyMsg91AccessToken,
  normalizePhone,
  Msg91VerificationError,
} = require("../lib/msg91");
const { ConfigError, env } = require("../env");
const { createRateLimiter } = require("../middleware/rateLimit");
const { requireAdmin, attachSessionIfPresent } = require("../middleware/requireAuth");
const { generateEnquiryId } = require("../lib/publicIds");
const { OtpVerification } = require("../models/OtpVerification");
const { sendTransactionalEmail } = require("../lib/brevo");
const { enquiryCustomerEmail, enquirySuperAdminEmail } = require("../lib/emailTemplates");
const { STATUS_VALUES } = require("../lib/enquiryFilters");

const router = express.Router();

// --- Public: submit an enquiry ---
//
// The form itself sends the OTP and verifies it client-side via the same
// MSG91 widget used for login (see OtpLogin.jsx / EnquiryForm.jsx /
// VehicleEnquiryForm.jsx). The resulting `accessToken` is only proof the
// browser can present — it is re-verified here against MSG91's server
// before anything is written to the database, exactly like
// /api/auth/verify. A submission is never trusted just because the
// client says "OTP verified".
//
// `selectedVehicles` supports the multi-vehicle enquiry requirement
// (spec §7): a customer can enquire about several vehicles in one
// submission. `vehicleId` is kept for backward compatibility with a
// single-vehicle enquiry from a vehicle detail page.
const submitBodySchema = z.object({
  name: z.string().trim().min(2, "Enter your full name.").max(120),
  phone: z
    .string()
    .transform((v) => v.replace(/\D/g, ""))
    .refine((v) => v.length === 10, "Enter a valid 10-digit mobile number."),
  email: z.string().trim().email("Enter a valid email.").optional().or(z.literal("")).nullable(),
  packageId: z.string().refine((v) => mongoose.Types.ObjectId.isValid(v), "Invalid package reference.").optional().nullable(),
  vehicleId: z
    .string()
    .refine((v) => mongoose.Types.ObjectId.isValid(v), "Invalid vehicle reference.")
    .optional()
    .nullable(),
  selectedVehicleIds: z
    .array(z.string().refine((v) => mongoose.Types.ObjectId.isValid(v), "Invalid vehicle reference."))
    .max(20)
    .optional()
    .default([]),
  vehicleType: z.string().trim().max(60).optional().or(z.literal("")).nullable(),
  pickupLocation: z.string().trim().max(200).optional().or(z.literal("")).nullable(),
  destination: z.string().trim().max(200).optional().or(z.literal("")).nullable(),
  tripDate: z.string().trim().max(60).optional().or(z.literal("")).nullable(),
  returnDate: z.string().trim().max(60).optional().or(z.literal("")).nullable(),
  pickupTime: z.string().trim().max(20).optional().or(z.literal("")).nullable(),
  passengers: z.coerce.number().int().min(1).max(500).optional().nullable(),
  tripType: z.enum(["ONE_WAY", "ROUND_TRIP", "LOCAL", "OUTSTATION"]).optional().nullable(),
  message: z.string().trim().max(1000).optional().or(z.literal("")).nullable(),
  accessToken: z.string().min(10, "OTP verification is required before submitting."),
});

const submitRateLimit = createRateLimiter({ windowMs: 15 * 60 * 1000, max: 10 });
function todayIndia() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(new Date());
}

function validateFutureDates(tripDate, returnDate) {
  const today = todayIndia();
  if (tripDate && !/^\d{4}-\d{2}-\d{2}$/.test(tripDate)) return "Travel date must use YYYY-MM-DD.";
  if (returnDate && !/^\d{4}-\d{2}-\d{2}$/.test(returnDate)) return "Return date must use YYYY-MM-DD.";
  if (tripDate && tripDate < today) return "Travel date cannot be in the past.";
  if (returnDate && returnDate < (tripDate || today)) return "Return date cannot be before the travel date.";
  return null;
}


async function buildVehicleSnapshot(vehicle) {
  const category = vehicle.categoryId
    ? await VehicleCategory.findById(vehicle.categoryId).select("name").lean()
    : null;
  return {
    name: vehicle.name,
    category: category?.name || null,
    capacity: vehicle.capacity,
    acType: vehicle.acType,
    seatType: vehicle.seatType,
    amenities: vehicle.amenities || [],
    photoUrl: vehicle.photos?.[0]?.url || null,
  };
}

router.post("/", submitRateLimit, attachSessionIfPresent, async (req, res) => {
  try {
    const parsed = submitBodySchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        error: parsed.error.issues[0]?.message ?? "Invalid request.",
      });
    }

    let packageSnapshot = null;
    if (parsed.data.packageId) {
      const pkg = await TourPackage.findOne({ _id: parsed.data.packageId, isActive: true }).lean();
      if (!pkg) return res.status(400).json({ success: false, error: "Selected tour package is not available." });
      packageSnapshot = { title: pkg.title, destination: pkg.destination, durationDays: pkg.durationDays, priceFrom: pkg.priceFrom };
    }

    const dateError = validateFutureDates(parsed.data.tripDate, parsed.data.returnDate);
    if (dateError) return res.status(422).json({ success: false, error: dateError });

    // 1. Re-verify the OTP access token server-side. Never trust the
    // client's word that the number was verified.
    const { verifiedIdentifier } = await verifyMsg91AccessToken(parsed.data.accessToken);
    const verifiedPhone = normalizePhone(verifiedIdentifier);

    if (verifiedPhone !== parsed.data.phone) {
      return res.status(422).json({
        success: false,
        error: "The verified mobile number doesn't match the one entered.",
      });
    }

    await connectToDatabase();

    // 2. Resolve every selected vehicle. Each one must exist and not be
    // soft-deleted — an enquiry never saves a dangling reference. A
    // legacy single vehicleId is folded into the same list.
    const allIds = [...new Set([...parsed.data.selectedVehicleIds, parsed.data.vehicleId].filter(Boolean))];
    let selectedVehicles = [];
    if (allIds.length) {
      const vehicles = await Vehicle.find({ _id: { $in: allIds }, deletedAt: null }).lean();
      if (vehicles.length !== allIds.length) {
        return res.status(404).json({ success: false, error: "One or more selected vehicles are no longer available." });
      }
      selectedVehicles = await Promise.all(
        vehicles.map(async (v) => ({
          vehicleId: v._id,
          vehicleSnapshot: await buildVehicleSnapshot(v),
        }))
      );
    }

    const enquiryId = await generateEnquiryId();
    const primaryVehicle = selectedVehicles[0] || null;

    const enquiry = await Enquiry.create({
      enquiryId,
      userId: req.session?.userId || null,
      vehicleId: primaryVehicle ? primaryVehicle.vehicleId : null,
      packageId: parsed.data.packageId || null,
      packageSnapshot,
      selectedVehicles,
      name: parsed.data.name,
      phone: verifiedPhone,
      email: parsed.data.email || null,
      vehicleType: parsed.data.vehicleType || (primaryVehicle ? primaryVehicle.vehicleSnapshot.name : null),
      pickupLocation: parsed.data.pickupLocation || null,
      destination: parsed.data.destination || null,
      tripDate: parsed.data.tripDate || null,
      returnDate: parsed.data.returnDate || null,
      pickupTime: parsed.data.pickupTime || null,
      passengers: parsed.data.passengers ?? null,
      tripType: parsed.data.tripType || null,
      message: parsed.data.message || null,
      phoneVerified: true,
      status: "NEW",
    });

    // Best-effort audit row — never blocks the enquiry response.
    OtpVerification.create({
      phone: verifiedPhone,
      purpose: "ENQUIRY",
      verified: true,
      ip: req.headers["x-forwarded-for"] || req.ip || null,
      userAgent: req.headers["user-agent"] || null,
    }).catch((err) => console.error("otp verification log error", err));

    // Send confirmation + SuperAdmin notification emails. Failures are
    // logged (EmailLog, via lib/brevo.js) but never roll back or block
    // the enquiry — the customer still sees success (spec §32).
    const enquiryObj = enquiry.toObject();
    if (enquiryObj.email) {
      sendTransactionalEmail({
        to: enquiryObj.email,
        toName: enquiryObj.name,
        subject: "Thank you for showing interest in Kuwarji Travels",
        htmlContent: enquiryCustomerEmail({ enquiry: enquiryObj }),
        template: "enquiry_customer_confirmation",
        userId: enquiryObj.userId ? enquiryObj.userId.toString() : null,
      }).catch((err) => console.error("enquiry customer email error", err));
    }
    if (env.superAdminEmail) {
      sendTransactionalEmail({
        to: env.superAdminEmail,
        toName: "Kuwarji Travels",
        subject: `New Vehicle Enquiry - ${enquiryObj.enquiryId}`,
        htmlContent: enquirySuperAdminEmail({ enquiry: enquiryObj }),
        template: "enquiry_superadmin_notification",
      }).catch((err) => console.error("enquiry superadmin email error", err));
    }

    return res.json({
      success: true,
      enquiry: {
        id: enquiry._id.toString(),
        enquiryId: enquiry.enquiryId,
        selectedVehicles: enquiry.selectedVehicles.map((v) => ({
          vehicleId: v.vehicleId.toString(),
          name: v.vehicleSnapshot.name,
        })),
        createdAt: enquiry.createdAt,
      },
    });
  } catch (err) {
    if (err instanceof Msg91VerificationError) {
      return res.status(401).json({ success: false, error: err.message });
    }
    if (err instanceof ConfigError) {
      console.error(err.message);
      return res.status(500).json({
        success: false,
        error: "The server is missing required configuration. Please contact the site administrator.",
      });
    }
    console.error("enquiry create error", err);
    return res.status(500).json({
      success: false,
      error: "Something went wrong submitting your enquiry. Please try again.",
    });
  }
});

// --- Admin: list + update enquiries ---
// (Legacy simple endpoints — the richer search/filter/notes surface is
// routes/adminEnquiries.js, mounted at /api/admin/enquiries.)

router.get("/", requireAdmin, async (req, res) => {
  try {
    await connectToDatabase();
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 25));

    const [items, total] = await Promise.all([
      Enquiry.find({}).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
      Enquiry.countDocuments({}),
    ]);

    return res.json({
      success: true,
      enquiries: items.map((e) => ({
        id: e._id.toString(),
        enquiryId: e.enquiryId,
        name: e.name,
        phone: e.phone,
        email: e.email,
        vehicleType: e.vehicleType,
        tripDate: e.tripDate,
        message: e.message,
        status: e.status,
        convertedToBookingId: e.convertedToBookingId ? e.convertedToBookingId.toString() : null,
        createdAt: e.createdAt,
      })),
      page,
      limit,
      total,
    });
  } catch (err) {
    console.error("enquiry list error", err);
    return res.status(500).json({ success: false, error: "Failed to load enquiries." });
  }
});

const statusBodySchema = z.object({
  status: z.enum(STATUS_VALUES),
});

router.patch("/:id/status", requireAdmin, async (req, res) => {
  try {
    const parsed = statusBodySchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ success: false, error: "Invalid status." });
    }

    await connectToDatabase();
    const enquiry = await Enquiry.findByIdAndUpdate(
      req.params.id,
      { status: parsed.data.status },
      { new: true }
    ).lean();

    if (!enquiry) {
      return res.status(404).json({ success: false, error: "Enquiry not found." });
    }

    return res.json({ success: true, enquiry: { id: enquiry._id.toString(), status: enquiry.status } });
  } catch (err) {
    console.error("enquiry status update error", err);
    return res.status(500).json({ success: false, error: "Failed to update enquiry." });
  }
});

module.exports = router;
