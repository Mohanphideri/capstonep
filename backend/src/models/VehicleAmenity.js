const mongoose = require("mongoose");

// Master picklist for amenity names shown on vehicle cards/detail pages.
// Vehicle.amenities stays a plain string array (unchanged, backward
// compatible) — this collection just lets admin manage the list of valid
// amenity labels/icons instead of them being hard-coded in the frontend.
const VehicleAmenitySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, unique: true },
    icon: { type: String, trim: true, default: null },
    isActive: { type: Boolean, default: true, index: true },
    sortOrder: { type: Number, default: 0 },
  },
  { timestamps: true }
);

VehicleAmenitySchema.index({ isActive: 1, sortOrder: 1 });

const VehicleAmenity =
  mongoose.models.VehicleAmenity || mongoose.model("VehicleAmenity", VehicleAmenitySchema);

module.exports = { VehicleAmenity };
