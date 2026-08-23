const express = require("express");
const { z } = require("zod");
const { connectToDatabase } = require("../lib/mongodb");
const { Review } = require("../models/Review");
const { Booking } = require("../models/Booking");
const { Vehicle } = require("../models/Vehicle");
const { requireAuth } = require("../middleware/requireAuth");

const router = express.Router();

const createSchema = z.object({
  bookingId: z.string().min(1),
  rating: z.coerce.number().int().min(1).max(5),
  text: z.string().trim().max(1000).optional().default(""),
});

// --- Authenticated: submit a review (only for own COMPLETED bookings) ---
router.post("/", requireAuth, async (req, res) => {
  try {
    const parsed = createSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        error: parsed.error.issues[0]?.message ?? "Invalid review.",
      });
    }

    await connectToDatabase();

    const booking = await Booking.findOne({ bookingId: parsed.data.bookingId }).lean();
    if (!booking || booking.userId.toString() !== req.session.userId) {
      return res.status(404).json({ success: false, error: "Booking not found." });
    }
    if (booking.status !== "COMPLETED") {
      return res.status(422).json({
        success: false,
        error: "You can only review a booking after the trip is completed.",
      });
    }

    const existing = await Review.findOne({ bookingId: booking._id }).lean();
    if (existing) {
      return res.status(409).json({ success: false, error: "You've already reviewed this booking." });
    }

    const reviewVehicleId = booking.vehicles?.[0]?.vehicle?.vehicleId;
    if (!reviewVehicleId) {
      return res.status(422).json({ success: false, error: "This booking has no linked vehicle to review." });
    }

    const review = await Review.create({
      bookingId: booking._id,
      userId: req.session.userId,
      vehicleId: reviewVehicleId,
      rating: parsed.data.rating,
      text: parsed.data.text,
      status: "PENDING",
    });

    // Recompute the vehicle's live rating average from APPROVED reviews
    // only — a brand-new PENDING review doesn't move the public rating
    // until an admin approves it (spec §45: "no arbitrary fake reviews").
    void review;

    return res.json({
      success: true,
      review: { id: review._id.toString(), status: review.status },
      message: "Thanks — your review is submitted and will appear once it's been moderated.",
    });
  } catch (err) {
    console.error("review create error", err);
    return res.status(500).json({ success: false, error: "Failed to submit review." });
  }
});


// Authenticated: reviews submitted by the current customer
router.get("/mine", requireAuth, async (req, res) => {
  try {
    await connectToDatabase();
    const reviews = await Review.find({ userId: req.session.userId }).select("bookingId rating text status featured createdAt").lean();
    return res.json({ success: true, reviews: reviews.map((r) => ({ bookingId: r.bookingId.toString(), rating: r.rating, text: r.text, status: r.status, featured: r.featured, createdAt: r.createdAt })) });
  } catch (err) {
    console.error("my reviews error", err);
    return res.status(500).json({ success: false, error: "Failed to load your reviews." });
  }
});

// Public: admin-selected customer reviews for the landing page
router.get("/featured", async (req, res) => {
  try {
    await connectToDatabase();
    const reviews = await Review.find({ status: "APPROVED" })
      .sort({ createdAt: -1 })
      .limit(24)
      .populate("userId", "name")
      .lean();
    return res.json({
      success: true,
      reviews: reviews.map((r) => ({
        id: r._id.toString(),
        customerName: r.customerName || r.userId?.name || "Kuwarji customer",
        rating: r.rating,
        text: r.text || "",
      })),
    });
  } catch (err) {
    console.error("featured reviews error", err);
    return res.status(500).json({ success: false, error: "Failed to load reviews." });
  }
});

// --- Public: approved reviews for a vehicle ---
router.get("/vehicle/:vehicleId", async (req, res) => {
  try {
    await connectToDatabase();
    const vehicle = await Vehicle.findById(req.params.vehicleId).lean();
    if (!vehicle) return res.status(404).json({ success: false, error: "Vehicle not found." });

    const reviews = await Review.find({ vehicleId: vehicle._id, status: "APPROVED" })
      .sort({ createdAt: -1 })
      .limit(20)
      .populate("userId", "name")
      .lean();

    return res.json({
      success: true,
      reviews: reviews.map((r) => ({
        rating: r.rating,
        text: r.text,
        author: r.userId?.name || "Kuwarji customer",
        createdAt: r.createdAt,
      })),
    });
  } catch (err) {
    console.error("review list error", err);
    return res.status(500).json({ success: false, error: "Failed to load reviews." });
  }
});

module.exports = router;
