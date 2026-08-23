const mongoose = require("mongoose");

// Internal admin-only notes on an enquiry. Same shape as
// Complaint.messages (authorId/authorRole/message/createdAt) — every row
// written here is always an internal note (never shown to the customer),
// so unlike ComplaintMessageSchema there's no isInternalNote flag to check.
const EnquiryNoteSchema = new mongoose.Schema(
  {
    authorId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    authorRole: { type: String, default: null },
    message: { type: String, required: true, trim: true },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

// A single vehicle selected as part of a multi-vehicle enquiry (spec §7).
// vehicleSnapshot preserves the vehicle's information at the moment the
// enquiry was submitted — it is never re-read from the live Vehicle
// document, so a later edit to the vehicle doesn't rewrite what the
// customer actually saw when they enquired.
const SelectedVehicleSchema = new mongoose.Schema(
  {
    vehicleId: { type: mongoose.Schema.Types.ObjectId, ref: "Vehicle", required: true },
    vehicleSnapshot: {
      name: String,
      category: String,
      capacity: Number,
      acType: String,
      seatType: String,
      amenities: [String],
      photoUrl: { type: String, default: null },
    },
  },
  { _id: false }
);

const EnquirySchema = new mongoose.Schema(
  {
    // Public-facing ID (ENQ20260819001-style), same pattern as
    // bookingId/ticketId. Sparse so any legacy row without one (from
    // before this field existed) doesn't violate the unique index — the
    // creation route (routes/enquiry.js) always sets one for new rows.
    enquiryId: { type: String, default: null, unique: true, sparse: true, index: true },
    // Set only when the enquiry was submitted by a logged-in customer.
    // Most enquiries are from guests, so this stays optional.
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null, index: true },

    // Legacy single-vehicle reference — kept for backward compatibility
    // with enquiries created before multi-vehicle selection existed, and
    // as a convenience mirror of selectedVehicles[0] for single-vehicle
    // enquiries submitted from a vehicle detail page.
    vehicleId: { type: mongoose.Schema.Types.ObjectId, ref: "Vehicle", default: null, index: true },
    packageId: { type: mongoose.Schema.Types.ObjectId, ref: "TourPackage", default: null, index: true },
    packageSnapshot: { title: String, destination: String, durationDays: Number, priceFrom: Number },

    // Multi-vehicle enquiry support (spec §7): a customer can select and
    // enquire about several vehicles in a single submission.
    selectedVehicles: { type: [SelectedVehicleSchema], default: [] },

    name: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true, index: true },
    email: { type: String, trim: true, lowercase: true, default: null },

    // Legacy free-text vehicle preference field (predates vehicleId).
    // Left in place for the general contact enquiry, and also used as a
    // human-readable fallback label when vehicleId is set.
    vehicleType: { type: String, trim: true, default: null },

    // Trip details (Phase 2 vehicle enquiry fields).
    pickupLocation: { type: String, trim: true, default: null },
    destination: { type: String, trim: true, default: null },
    tripDate: { type: String, trim: true, default: null }, // journey date, YYYY-MM-DD
    returnDate: { type: String, trim: true, default: null }, // optional, YYYY-MM-DD
    pickupTime: { type: String, trim: true, default: null },
    passengers: { type: Number, default: null, min: 1, max: 500 },
    tripType: {
      type: String,
      enum: ["ONE_WAY", "ROUND_TRIP", "LOCAL", "OUTSTATION", null],
      default: null,
    },

    message: { type: String, trim: true, default: null }, // additional requirements

    // Every enquiry is created only after the phone number was verified
    // with a real SMS OTP (MSG91 widget, checked server-side) — this is
    // not user-supplied, it's set once by the /api/enquiry route itself.
    phoneVerified: { type: Boolean, default: true },

    // Status set per spec §14: the full admin-managed lifecycle from
    // first submission through to a completed deal (or closure).
    status: {
      type: String,
      enum: ["NEW", "IN_REVIEW", "CONTACTED", "QUOTED", "SELECTED_FOR_BOOKING", "CONVERTED", "CLOSED", "CANCELLED"],
      default: "NEW",
      index: true,
    },

    // Set once the SuperAdmin converts this enquiry into a booking —
    // makes conversion idempotent and lets the customer portal link the
    // enquiry to the resulting booking.
    convertedToBookingId: { type: mongoose.Schema.Types.ObjectId, ref: "Booking", default: null },

    // Internal admin-only notes — never shown to the customer.
    notes: { type: [EnquiryNoteSchema], default: [] },
  },
  { timestamps: true }
);

EnquirySchema.index({ status: 1, createdAt: -1 });
EnquirySchema.index({ vehicleId: 1, createdAt: -1 });
EnquirySchema.index({ tripDate: 1 });
EnquirySchema.index({ name: "text", phone: "text", email: "text", pickupLocation: "text", destination: "text" });

const Enquiry = mongoose.models.Enquiry || mongoose.model("Enquiry", EnquirySchema);

module.exports = { Enquiry };
