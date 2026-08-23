const express = require("express");
const { z } = require("zod");
const mongoose = require("mongoose");
const { connectToDatabase } = require("../lib/mongodb");
const { Review } = require("../models/Review");
const { Vehicle } = require("../models/Vehicle");
const { requireSuperAdmin } = require("../middleware/requireAuth");

const router = express.Router();
router.use(requireSuperAdmin);

function serializeReview(r) {
  return {
    id: r._id.toString(),
    bookingId: r.bookingId?.bookingId || "—",
    customer: r.customerName || r.userId?.name || "Customer",
    phone: r.customerPhone || r.userId?.phone || "",
    email: r.customerEmail || r.userId?.email || "",
    vehicle: r.vehicleId?.name || r.bookingId?.vehicles?.[0]?.vehicle?.name || "—",
    rating: r.rating,
    text: r.text || "",
    status: r.status,
    featured: Boolean(r.featured),
    adminCreated: Boolean(r.adminCreated),
    createdAt: r.createdAt,
  };
}

router.get("/", async (req, res) => {
  try {
    await connectToDatabase();
    const reviews = await Review.find({})
      .sort({ createdAt: -1 })
      .populate("userId", "name phone email")
      .populate("vehicleId", "name")
      .populate("bookingId", "bookingId vehicles")
      .lean();
    return res.json({ success: true, reviews: reviews.map(serializeReview) });
  } catch (err) {
    console.error("admin/reviews list error", err);
    return res.status(500).json({ success: false, error: "Failed to load reviews." });
  }
});

const createSchema = z.object({
  customerName: z.string().trim().min(2).max(120),
  customerPhone: z.string().trim().max(30).optional().or(z.literal("")),
  customerEmail: z.string().trim().email().optional().or(z.literal("")),
  rating: z.coerce.number().int().min(1).max(5),
  text: z.string().trim().min(2).max(2000),
  vehicleId: z.string().refine((v) => mongoose.Types.ObjectId.isValid(v), "Invalid vehicle.").optional().nullable().or(z.literal("")),
  status: z.enum(["PENDING", "APPROVED"]).default("APPROVED"),
  featured: z.boolean().default(true),
});

router.post("/admin-created", async (req, res) => {
  try {
    const parsed = createSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ success: false, error: parsed.error.issues[0]?.message || "Invalid review details." });
    await connectToDatabase();

    let vehicleId = null;
    if (parsed.data.vehicleId) {
      const vehicle = await Vehicle.findById(parsed.data.vehicleId).select("_id").lean();
      if (!vehicle) return res.status(404).json({ success: false, error: "Selected vehicle not found." });
      vehicleId = vehicle._id;
    }

    const review = await Review.create({
      bookingId: null,
      userId: req.session.userId,
      vehicleId,
      customerName: parsed.data.customerName,
      customerPhone: parsed.data.customerPhone || null,
      customerEmail: parsed.data.customerEmail || null,
      adminCreated: true,
      rating: parsed.data.rating,
      text: parsed.data.text,
      status: parsed.data.status,
      featured: parsed.data.status === "APPROVED" ? parsed.data.featured : false,
    });

    return res.status(201).json({
      success: true,
      review: serializeReview({
        ...review.toObject(),
        userId: { name: "Admin", phone: "", email: "" },
        vehicleId: vehicleId ? { name: "—" } : null,
      }),
    });
  } catch (err) {
    console.error("admin/reviews create error", err);
    return res.status(500).json({ success: false, error: "Failed to create review." });
  }
});

router.patch("/:id", async (req, res) => {
  const allowedStatus = ["PENDING", "APPROVED", "HIDDEN"];
  const update = {};
  if (typeof req.body?.featured === "boolean") update.featured = req.body.featured;
  if (allowedStatus.includes(req.body?.status)) update.status = req.body.status;
  if (Object.keys(update).length === 0) return res.status(400).json({ success: false, error: "Nothing to update." });

  try {
    await connectToDatabase();
    const review = await Review.findById(req.params.id);
    if (!review) return res.status(404).json({ success: false, error: "Review not found." });

    if (update.featured === true && review.status !== "APPROVED") {
      return res.status(422).json({ success: false, error: "Approve the review before featuring it." });
    }
    if (update.status === "HIDDEN" || update.status === "PENDING") update.featured = false;
    Object.assign(review, update);
    await review.save();

    return res.json({ success: true, review: { id: review._id.toString(), status: review.status, featured: review.featured } });
  } catch (err) {
    console.error("admin/reviews update error", err);
    return res.status(500).json({ success: false, error: "Failed to update review." });
  }
});

module.exports = router;
