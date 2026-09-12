const mongoose = require("mongoose");

const ReviewSchema = new mongoose.Schema(
  {
    // Customer reviews point to their booking. Admin-created reviews are
    // intentionally not tied to a booking and use the snapshot fields below.
    bookingId: { type: mongoose.Schema.Types.ObjectId, ref: "Booking", default: null },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null, index: true },
    vehicleId: { type: mongoose.Schema.Types.ObjectId, ref: "Vehicle", default: null, index: true },
    customerName: { type: String, trim: true, default: null },
    customerPhone: { type: String, trim: true, default: null },
    customerEmail: { type: String, trim: true, lowercase: true, default: null },
    state: { type: String, trim: true, default: null },
    district: { type: String, trim: true, default: null },
    adminCreated: { type: Boolean, default: false, index: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    text: { type: String, trim: true, default: "" },
    status: { type: String, enum: ["PENDING", "APPROVED", "HIDDEN"], default: "PENDING", index: true },
    featured: { type: Boolean, default: false, index: true },
  },
  { timestamps: true }
);

ReviewSchema.index({ bookingId: 1 }, { unique: true, sparse: true, name: "review_booking_unique_sparse" });

const Review = mongoose.models.Review || mongoose.model("Review", ReviewSchema);

module.exports = { Review };
