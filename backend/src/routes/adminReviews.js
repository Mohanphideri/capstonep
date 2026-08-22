const express = require("express");
const { connectToDatabase } = require("../lib/mongodb");
const { Review } = require("../models/Review");
const { requireSuperAdmin } = require("../middleware/requireAuth");

const router = express.Router();
router.use(requireSuperAdmin);

router.get("/", async (req, res) => {
  try {
    await connectToDatabase();
    const reviews = await Review.find({})
      .sort({ createdAt: -1 })
      .populate("userId", "name phone email")
      .populate("vehicleId", "name")
      .populate("bookingId", "bookingId")
      .lean();
    return res.json({
      success: true,
      reviews: reviews.map((r) => ({
        id: r._id.toString(),
        bookingId: r.bookingId?.bookingId || "—",
        customer: r.userId?.name || "Customer",
        phone: r.userId?.phone || "",
        email: r.userId?.email || "",
        vehicle: r.vehicleId?.name || r.bookingId?.vehicles?.[0]?.vehicle?.name || "—",
        rating: r.rating,
        text: r.text || "",
        status: r.status,
        featured: Boolean(r.featured),
        createdAt: r.createdAt,
      })),
    });
  } catch (err) {
    console.error("admin/reviews list error", err);
    return res.status(500).json({ success: false, error: "Failed to load reviews." });
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
