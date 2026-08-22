const mongoose = require("mongoose");

const ReviewSchema = new mongoose.Schema(
  {
    bookingId: { type: mongoose.Schema.Types.ObjectId, ref: "Booking", required: true, unique: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    vehicleId: { type: mongoose.Schema.Types.ObjectId, ref: "Vehicle", required: true, index: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    text: { type: String, trim: true, default: "" },
    status: { type: String, enum: ["PENDING", "APPROVED", "HIDDEN"], default: "PENDING", index: true },
    featured: { type: Boolean, default: false, index: true },
  },
  { timestamps: true }
);

const Review = mongoose.models.Review || mongoose.model("Review", ReviewSchema);

module.exports = { Review };
