const mongoose = require("mongoose");

// Content model for the "Services" section of the site (e.g. "Wedding car
// rental", "Corporate travel", "Outstation trips") — admin-editable
// instead of hard-coded marketing copy.
const ServiceSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    slug: { type: String, required: true, trim: true, lowercase: true, unique: true, index: true },
    description: { type: String, trim: true, default: "" },
    icon: { type: String, trim: true, default: null },
    isActive: { type: Boolean, default: true, index: true },
    sortOrder: { type: Number, default: 0 },
  },
  { timestamps: true }
);

ServiceSchema.index({ isActive: 1, sortOrder: 1 });

const Service = mongoose.models.Service || mongoose.model("Service", ServiceSchema);

module.exports = { Service };
