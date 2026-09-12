const mongoose = require("mongoose");

const VehiclePhotoSchema = new mongoose.Schema({
  url: { type: String, required: true },
  // Storage-provider key (e.g. "vehicles/<id>/167...-abcd.jpg") — needed
  // to delete the underlying file, not just the DB row. Null for any
  // photo rows that predate photo management (imported/seeded via a
  // bare URL with no backing uploaded file).
  key: { type: String, default: null },
  order: { type: Number, default: 0 },
  isPrimary: { type: Boolean, default: false },
  // Admin-controlled visibility. Portal images can be shown in the customer
  // vehicle gallery, while landing images are explicitly selected by admin.
  showInPortal: { type: Boolean, default: true },
  showOnLanding: { type: Boolean, default: false },
});

const VehicleSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    categoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "VehicleCategory",
      required: true,
      index: true,
    },
    capacity: { type: Number, required: true, min: 1, index: true },
    acType: { type: String, enum: ["AC", "NON_AC"], required: true },
    seatType: { type: String, enum: ["SEATER", "SLEEPER", "SEMI_SLEEPER"], required: true },
    // Legacy free-text amenity labels — predates VehicleAmenity. Kept for
    // backward compatibility with existing seeded/imported vehicles and
    // as a display fallback when amenityIds is empty.
    amenities: { type: [String], default: [] },
    // Proper many-to-many relation to the VehicleAmenity master list
    // (Phase 2). This is the source of truth going forward — admin
    // assigns amenities from the database-driven picklist, never free
    // text. serializeVehicle() in routes/vehicles.js resolves these to
    // names for the public API.
    amenityIds: { type: [mongoose.Schema.Types.ObjectId], ref: "VehicleAmenity", default: [] },
    photos: { type: [VehiclePhotoSchema], default: [] },
    description: { type: String, trim: true, default: "" },
    // Free-text rental/terms info shown to admin and, optionally,
    // customers (e.g. minimum days, fuel policy) — not a price.
    rentalInfo: { type: String, trim: true, default: "" },

    // Registration / fleet identifiers — internal only, never sent to the
    // public API response.
    registrationNumber: { type: String, trim: true, default: null, select: false },

    // Phase 2 only ever sets/reads AVAILABLE or INACTIVE. BOOKED and
    // MAINTENANCE remain in the enum purely so pre-existing documents
    // written by the legacy booking/availability flow stay valid — no
    // destructive migration is performed on old data, but nothing in the
    // Phase 2 admin/customer workflow writes those two values.
    status: {
      type: String,
      enum: ["AVAILABLE", "BOOKED", "MAINTENANCE", "INACTIVE"],
      default: "AVAILABLE",
      index: true,
    },

    // Manual admin boost for the recommendation score (0 = neutral).
    priority: { type: Number, default: 0 },

    ratingAvg: { type: Number, default: 0 },
    ratingCount: { type: Number, default: 0 },

    deletedAt: { type: Date, default: null, index: true },
  },
  { timestamps: true }
);

VehicleSchema.index({ status: 1, deletedAt: 1 });
VehicleSchema.index({ categoryId: 1, status: 1, deletedAt: 1 });
VehicleSchema.index({ capacity: 1 });

const Vehicle = mongoose.models.Vehicle || mongoose.model("Vehicle", VehicleSchema);

module.exports = { Vehicle };
