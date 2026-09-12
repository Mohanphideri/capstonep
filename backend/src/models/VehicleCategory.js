const mongoose = require("mongoose");

// Categories (Volvo, AC Bus, Sleeper, ...) are data, not code — admin can
// create/edit/activate/deactivate/reorder them. Nothing in the app should
// hard-code a fixed category list; this collection is the source of truth.
const VehicleCategorySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, unique: true },
    slug: { type: String, required: true, trim: true, lowercase: true, unique: true, index: true },
    description: { type: String, trim: true, default: "" },
    icon: {
      type: String,
      enum: ["bus", "sleeper", "van", "luxury"],
      default: "bus",
    },
    isActive: { type: Boolean, default: true, index: true },
    sortOrder: { type: Number, default: 0 },
  },
  { timestamps: true }
);

VehicleCategorySchema.index({ isActive: 1, sortOrder: 1 });

const VehicleCategory =
  mongoose.models.VehicleCategory || mongoose.model("VehicleCategory", VehicleCategorySchema);

module.exports = { VehicleCategory };
