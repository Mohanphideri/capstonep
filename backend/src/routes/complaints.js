const express = require("express");
const { z } = require("zod");
const { connectToDatabase } = require("../lib/mongodb");
const { Complaint } = require("../models/Complaint");
const { Booking } = require("../models/Booking");
const { generateTicketId } = require("../lib/publicIds");
const { requireAuth } = require("../middleware/requireAuth");
const { createRateLimiter } = require("../middleware/rateLimit");
const { createNotification } = require("../lib/notify");

const router = express.Router();

const CATEGORIES = [
  "DRIVER_ISSUE",
  "VEHICLE_CONDITION",
  "DELAY",
  "PICKUP_ISSUE",
  "DROP_ISSUE",
  "PAYMENT_ISSUE",
  "STAFF_BEHAVIOUR",
  "OTHER",
];

function serializeComplaint(c) {
  const booking = c.bookingId && typeof c.bookingId === "object" ? c.bookingId : null;
  const user = c.userId && typeof c.userId === "object" ? c.userId : null;
  return {
    ticketId: c.ticketId,
    bookingId: booking?.bookingId || c.bookingId,
    customer: {
      name: user?.name || c.customerSnapshot?.name || booking?.customerSnapshot?.name || "Customer",
      mobile: user?.phone || c.customerSnapshot?.phone || booking?.customerSnapshot?.phone || "—",
      email: user?.email || c.customerSnapshot?.email || booking?.customerSnapshot?.email || "—",
    },
    journey: booking?.journey || null,
    bookingStatus: booking?.status || null,
    category: c.category,
    vehicleIndex: c.vehicleIndex ?? null,
    vehicleName: c.vehicleName || "",
    subject: c.subject,
    description: c.description,
    attachments: c.attachments,
    status: c.status,
    messages: (c.messages || []).filter((m) => !m.isInternalNote),
    createdAt: c.createdAt,
    updatedAt: c.updatedAt,
  };
}

const createSchema = z.object({
  bookingId: z.string().min(1),
  category: z.enum(CATEGORIES),
  subject: z.string().trim().min(3).max(150),
  description: z.string().trim().min(10).max(2000),
  attachments: z.array(z.string().url()).max(5).optional().default([]),
  vehicleIndex: z.number().int().min(0).optional().nullable(),
  vehicleName: z.string().trim().max(150).optional().default(""),
});

const createRateLimit = createRateLimiter({ windowMs: 15 * 60 * 1000, max: 10 });

// --- Authenticated: create a complaint against an eligible (own) booking ---
router.post("/", requireAuth, createRateLimit, async (req, res) => {
  try {
    const parsed = createSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        error: parsed.error.issues[0]?.message ?? "Invalid complaint details.",
      });
    }

    await connectToDatabase();

    // Ownership check on the referenced booking — a complaint can never be
    // filed against someone else's booking, regardless of what bookingId
    // the client sends.
    const booking = await Booking.findOne({ bookingId: parsed.data.bookingId }).lean();
    if (!booking || booking.userId.toString() !== req.session.userId) {
      return res.status(404).json({ success: false, error: "Booking not found." });
    }
    if (parsed.data.vehicleIndex != null) {
      const vehicle = Array.isArray(booking.vehicles) ? booking.vehicles[parsed.data.vehicleIndex] : null;
      if (!vehicle) return res.status(400).json({ success: false, error: "Selected vehicle was not found in this booking." });
      if (parsed.data.vehicleName && vehicle.name && parsed.data.vehicleName !== vehicle.name) {
        return res.status(400).json({ success: false, error: "Selected vehicle does not match this booking." });
      }
    }

    const ticketId = await generateTicketId();
    const complaint = await Complaint.create({
      ticketId,
      userId: req.session.userId,
      bookingId: booking._id,
      vehicleIndex: parsed.data.vehicleIndex ?? null,
      vehicleName: parsed.data.vehicleName || "",
      category: parsed.data.category,
      subject: parsed.data.subject,
      description: parsed.data.description,
      attachments: parsed.data.attachments,
      status: "OPEN",
      messages: [
        {
          authorId: req.session.userId,
          authorRole: "customer",
          message: parsed.data.description,
          isInternalNote: false,
        },
      ],
    });

    createNotification({
      userId: req.session.userId,
      type: "COMPLAINT_CREATED",
      channel: "IN_APP",
      title: "Complaint received",
      message: `Your ticket ${ticketId} has been logged.`,
      complaintId: complaint._id,
      bookingId: booking._id,
    });

    return res.json({ success: true, complaint: serializeComplaint(complaint.toObject()) });
  } catch (err) {
    console.error("complaint create error", err);
    return res.status(500).json({ success: false, error: "Failed to submit complaint." });
  }
});

// --- Authenticated: list own complaints ---
router.get("/", requireAuth, async (req, res) => {
  try {
    await connectToDatabase();
    const filter = { userId: req.session.userId };
    if (req.query.bookingId) {
      const booking = await Booking.findOne({ bookingId: req.query.bookingId }).select("_id").lean();
      if (!booking) return res.json({ success: true, complaints: [] });
      filter.bookingId = booking._id;
    }
    const complaints = await Complaint.find(filter)
      .populate("bookingId", "bookingId customerSnapshot journey status vehicles")
      .populate("userId", "name phone email")
      .sort({ createdAt: -1 })
      .lean();
    return res.json({ success: true, complaints: complaints.map(serializeComplaint) });
  } catch (err) {
    console.error("complaint list error", err);
    return res.status(500).json({ success: false, error: "Failed to load complaints." });
  }
});

// --- Authenticated: complaint detail (ownership enforced) ---
router.get("/:ticketId", requireAuth, async (req, res) => {
  try {
    await connectToDatabase();
    const complaint = await Complaint.findOne({ ticketId: req.params.ticketId })
      .populate("bookingId", "bookingId customerSnapshot journey status vehicles")
      .populate("userId", "name phone email")
      .lean();
    if (!complaint || complaint.userId.toString() !== req.session.userId) {
      return res.status(404).json({ success: false, error: "Complaint not found." });
    }
    return res.json({ success: true, complaint: serializeComplaint(complaint) });
  } catch (err) {
    console.error("complaint detail error", err);
    return res.status(500).json({ success: false, error: "Failed to load complaint." });
  }
});

// --- Authenticated: customer reply (ownership enforced) ---
const replySchema = z.object({ message: z.string().trim().min(1).max(2000) });

router.post("/:ticketId/messages", requireAuth, async (req, res) => {
  try {
    const parsed = replySchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ success: false, error: "Message can't be empty." });
    }

    await connectToDatabase();
    const complaint = await Complaint.findOne({ ticketId: req.params.ticketId });
    if (!complaint || complaint.userId.toString() !== req.session.userId) {
      return res.status(404).json({ success: false, error: "Complaint not found." });
    }
    if (["RESOLVED", "CLOSED"].includes(complaint.status)) {
      return res.status(400).json({ success: false, error: "This ticket is closed." });
    }

    complaint.messages.push({
      authorId: req.session.userId,
      authorRole: "customer",
      message: parsed.data.message,
      isInternalNote: false,
    });
    await complaint.save();

    return res.json({ success: true, complaint: serializeComplaint(complaint.toObject()) });
  } catch (err) {
    console.error("complaint reply error", err);
    return res.status(500).json({ success: false, error: "Failed to send message." });
  }
});

module.exports = router;
