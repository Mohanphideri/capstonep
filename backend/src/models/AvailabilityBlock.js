const mongoose = require("mongoose");

// Admin-created "vehicle unavailable" windows (maintenance, owner's own
// use, etc.) that must block new bookings the same way an existing
// Booking/BookingHold does. Kept as its own collection (rather than
// bolted onto Vehicle) so a vehicle can have many blocked ranges over
// time and each one is independently auditable.
const AvailabilityBlockSchema = new mongoose.Schema(
  {
    vehicleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Vehicle",
      required: true,
      index: true,
    },
    start: { type: Date, required: true },
    end: { type: Date, required: true },
    reason: { type: String, trim: true, default: null },
    status: {
      type: String,
      enum: ["ACTIVE", "CANCELLED"],
      default: "ACTIVE",
      index: true,
    },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

// Mirrors the overlap-check compound index used on Booking/BookingHold so
// lib/availability.js can query blocks the same cheap way.
AvailabilityBlockSchema.index({ vehicleId: 1, status: 1, start: 1, end: 1 });

const AvailabilityBlock =
  mongoose.models.AvailabilityBlock || mongoose.model("AvailabilityBlock", AvailabilityBlockSchema);

module.exports = { AvailabilityBlock };
