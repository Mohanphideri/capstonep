const mongoose = require("mongoose");

const TourPackageSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true, maxlength: 160 },
  slug: { type: String, required: true, unique: true, index: true },
  destination: { type: String, required: true, trim: true, maxlength: 160 },
  durationDays: { type: Number, required: true, min: 1, max: 90 },
  priceFrom: { type: Number, min: 0, default: 0 },
  description: { type: String, trim: true, default: "" },
  itinerary: { type: [String], default: [] },
  inclusions: { type: [String], default: [] },
  exclusions: { type: [String], default: [] },
  imageUrl: { type: String, trim: true, default: "" },
  isActive: { type: Boolean, default: true, index: true },
  featured: { type: Boolean, default: false, index: true },
  priority: { type: Number, default: 0 },
}, { timestamps: true });

TourPackageSchema.index({ isActive: 1, featured: 1, priority: -1 });
const TourPackage = mongoose.models.TourPackage || mongoose.model("TourPackage", TourPackageSchema);
module.exports = { TourPackage };
