const mongoose = require("mongoose");

// Reusable pickup/drop location list — admin-managed, so city/route
// dropdowns across the app (enquiry form, booking form, admin filters)
// share one source of truth instead of free-text everywhere.
const LocationSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    city: { type: String, trim: true, default: null, index: true },
    state: { type: String, trim: true, default: null },
    country: { type: String, trim: true, default: "India" },
    coordinates: {
      lat: { type: Number, default: null },
      lng: { type: Number, default: null },
    },
    isActive: { type: Boolean, default: true, index: true },
  },
  { timestamps: true }
);

LocationSchema.index({ isActive: 1, city: 1 });

const Location = mongoose.models.Location || mongoose.model("Location", LocationSchema);

module.exports = { Location };
