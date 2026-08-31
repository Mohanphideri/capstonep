const express = require("express");
const { z } = require("zod");
const mongoose = require("mongoose");
const { connectToDatabase } = require("../lib/mongodb");
const { Enquiry } = require("../models/Enquiry");
const { Vehicle } = require("../models/Vehicle");
const { requireSuperAdmin } = require("../middleware/requireAuth");
const { recordAuditLog } = require("../lib/auditLog");
const { buildEnquiryFilter, STATUS_VALUES } = require("../lib/enquiryFilters");
const { parseDateRange } = require("../lib/dateRange");

const router = express.Router();

// Enquiry administration is SUPER_ADMIN-only per the Phase 2 spec — this
// is a separate, richer router from the legacy admin endpoints still
// living in routes/enquiry.js (kept as-is for the existing dashboard
// "Enquiries" tab, which remains open to any staff/admin/super_admin).
router.use(requireSuperAdmin);

function isValidId(id) {
  return mongoose.Types.ObjectId.isValid(id);
}

function serializeSummary(e, vehicleById) {
  const vehicle = e.vehicleId ? vehicleById.get(e.vehicleId.toString()) : null;
  return {
    id: e._id.toString(),
    enquiryId: e.enquiryId,
    name: e.name,
    phone: e.phone,
    email: e.email,
    vehicle: vehicle ? { id: vehicle._id.toString(), name: vehicle.name } : null,
    selectedVehicles: (e.selectedVehicles || []).map((v) => v.vehicleSnapshot?.name).filter(Boolean),
    vehicleType: e.vehicleType,
    package: e.packageSnapshot ? { id: e.packageId?.toString() || null, ...e.packageSnapshot } : null,
    pickupLocation: e.pickupLocation,
    destination: e.destination,
    tripDate: e.tripDate,
    returnDate: e.returnDate,
    passengers: e.passengers,
    tripType: e.tripType,
    status: e.status,
    convertedToBookingId: e.convertedToBookingId ? e.convertedToBookingId.toString() : null,
    canCreateBooking: e.status === "BOOKED" && !e.convertedToBookingId,
    createdAt: e.createdAt,
    updatedAt: e.updatedAt,
  };
}

function serializeDetail(e, vehicle) {
  return {
    id: e._id.toString(),
    enquiryId: e.enquiryId,
    name: e.name,
    phone: e.phone,
    email: e.email,
    vehicle: vehicle
      ? { id: vehicle._id.toString(), name: vehicle.name, capacity: vehicle.capacity }
      : null,
    selectedVehicles: (e.selectedVehicles || []).map((v) => ({
      vehicleId: v.vehicleId?.toString(),
      name: v.vehicleSnapshot?.name,
      capacity: v.vehicleSnapshot?.capacity,
    })),
    vehicleType: e.vehicleType,
    package: e.packageSnapshot ? { id: e.packageId?.toString() || null, ...e.packageSnapshot } : null,
    pickupLocation: e.pickupLocation,
    destination: e.destination,
    tripDate: e.tripDate,
    returnDate: e.returnDate,
    pickupTime: e.pickupTime,
    passengers: e.passengers,
    tripType: e.tripType,
    message: e.message,
    status: e.status,
    convertedToBookingId: e.convertedToBookingId ? e.convertedToBookingId.toString() : null,
    notes: (e.notes || []).map((n) => ({
      message: n.message,
      authorRole: n.authorRole,
      createdAt: n.createdAt,
    })),
    createdAt: e.createdAt,
    updatedAt: e.updatedAt,
  };
}

// --- List (search + filter + pagination) ---
router.get("/", async (req, res) => {
  try {
    await connectToDatabase();

    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 25));
    const filter = buildEnquiryFilter({
      status: req.query.status,
      vehicleId: req.query.vehicleId,
      search: req.query.search,
      tripDate: req.query.tripDate,
    });
    const eligibleForBooking = req.query.eligibleForBooking === "true";
    // Create Booking should show every enquiry explicitly selected for booking;
    // do not silently exclude older selected enquiries because the normal
    // enquiry list has a default recent-date window.
    if (!eligibleForBooking || req.query.from || req.query.to) {
      const range = parseDateRange(req.query.from, req.query.to);
      if (!range) return res.status(400).json({ success:false, error:"Invalid date range." });
      filter.createdAt = { $gte: range.start, $lte: range.end };
    }
    if (eligibleForBooking) {
      // Normally only BOOKED enquiries are eligible. A prior version of the
      // admin UI let staff manually set status to BOOKING without actually
      // creating a booking — that orphaned the enquiry (no real booking,
      // but no longer matching this filter either). Rescue those too.
      filter.status = { $in: ["BOOKED", "BOOKING"] };
      filter.convertedToBookingId = null;
    }

    const [items, total] = await Promise.all([
      Enquiry.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Enquiry.countDocuments(filter),
    ]);

    const vehicleIds = [...new Set(items.filter((e) => e.vehicleId).map((e) => e.vehicleId.toString()))];
    const vehicles = vehicleIds.length
      ? await Vehicle.find({ _id: { $in: vehicleIds } }).select("name").lean()
      : [];
    const vehicleById = new Map(vehicles.map((v) => [v._id.toString(), v]));

    return res.json({
      success: true,
      enquiries: items.map((e) => serializeSummary(e, vehicleById)),
      page,
      limit,
      total,
      statuses: STATUS_VALUES,
    });
  } catch (err) {
    console.error("admin enquiry list error", err);
    return res.status(500).json({ success: false, error: "Failed to load enquiries." });
  }
});

// --- Detail ---
router.get("/:id", async (req, res) => {
  try {
    if (!isValidId(req.params.id)) {
      return res.status(400).json({ success: false, error: "Invalid enquiry id." });
    }
    await connectToDatabase();
    const enquiry = await Enquiry.findById(req.params.id).lean();
    if (!enquiry) {
      return res.status(404).json({ success: false, error: "Enquiry not found." });
    }
    const vehicle = enquiry.vehicleId ? await Vehicle.findById(enquiry.vehicleId).lean() : null;
    return res.json({ success: true, enquiry: serializeDetail(enquiry, vehicle) });
  } catch (err) {
    console.error("admin enquiry detail error", err);
    return res.status(500).json({ success: false, error: "Failed to load enquiry." });
  }
});

// --- Status update ---
const statusSchema = z.object({ status: z.enum(STATUS_VALUES) });

router.patch("/:id/status", async (req, res) => {
  try {
    if (!isValidId(req.params.id)) {
      return res.status(400).json({ success: false, error: "Invalid enquiry id." });
    }
    const parsed = statusSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        error: `Status must be one of: ${STATUS_VALUES.join(", ")}.`,
      });
    }

    await connectToDatabase();
    const existing = await Enquiry.findById(req.params.id);
    if (!existing) {
      return res.status(404).json({ success: false, error: "Enquiry not found." });
    }
    if (parsed.data.status === "BOOKING") {
      return res.status(400).json({
        success: false,
        error: "\"Booking\" is set automatically when this enquiry is converted into a real booking — use \"Convert to booking\" instead of setting this status directly.",
      });
    }
    if (existing.convertedToBookingId) {
      return res.status(409).json({ success: false, error: "This enquiry is already converted to a booking." });
    }
    const enquiry = await Enquiry.findByIdAndUpdate(
      req.params.id,
      { status: parsed.data.status },
      { new: true }
    ).lean();
    if (!enquiry) {
      return res.status(404).json({ success: false, error: "Enquiry not found." });
    }

    await recordAuditLog({
      req,
      action: "ENQUIRY_STATUS_CHANGED",
      entityType: "Enquiry",
      entityId: enquiry._id,
      metadata: { status: enquiry.status },
    });

    return res.json({ success: true, enquiry: { id: enquiry._id.toString(), status: enquiry.status } });
  } catch (err) {
    console.error("admin enquiry status error", err);
    return res.status(500).json({ success: false, error: "Failed to update enquiry status." });
  }
});

// --- Internal notes ---
const noteSchema = z.object({ message: z.string().trim().min(1).max(2000) });

router.post("/:id/notes", async (req, res) => {
  try {
    if (!isValidId(req.params.id)) {
      return res.status(400).json({ success: false, error: "Invalid enquiry id." });
    }
    const parsed = noteSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ success: false, error: "A note message is required." });
    }

    await connectToDatabase();
    const enquiry = await Enquiry.findById(req.params.id);
    if (!enquiry) {
      return res.status(404).json({ success: false, error: "Enquiry not found." });
    }

    enquiry.notes.push({
      authorId: req.session.userId,
      authorRole: req.session.role,
      message: parsed.data.message,
    });
    await enquiry.save();

    await recordAuditLog({
      req,
      action: "ENQUIRY_NOTES_CHANGED",
      entityType: "Enquiry",
      entityId: enquiry._id,
    });

    return res.status(201).json({
      success: true,
      notes: enquiry.notes.map((n) => ({
        message: n.message,
        authorRole: n.authorRole,
        createdAt: n.createdAt,
      })),
    });
  } catch (err) {
    console.error("admin enquiry note error", err);
    return res.status(500).json({ success: false, error: "Failed to add note." });
  }
});

module.exports = router;
