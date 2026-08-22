const mongoose = require("mongoose");

// Snapshots — copied at booking-creation time by the SuperAdmin, never
// re-read from the live Vehicle document afterwards. Editing a vehicle
// later must never alter what a customer sees on an existing booking.
const VehicleSnapshotSchema = new mongoose.Schema(
  {
    vehicleId: { type: mongoose.Schema.Types.ObjectId, ref: "Vehicle", default: null },
    name: String,
    category: String,
    capacity: Number,
    acType: String,
    seatType: String,
    amenities: [String],
    photoUrl: { type: String, default: null },
  },
  { _id: false }
);

// A booking may cover one or several vehicles (spec §21) — a single
// booking record with multiple booked-vehicle line items.
const BookedVehicleSchema = new mongoose.Schema(
  {
    vehicle: { type: VehicleSnapshotSchema, required: true },
    notes: { type: String, default: null },
  },
  { _id: false }
);

const CustomerSnapshotSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    phone: { type: String, required: true },
    email: { type: String, default: null },
  },
  { _id: false }
);

// SuperAdmin-entered financial record. This is NOT a payment gateway
// transaction — it's a manual ledger the SuperAdmin fills in after the
// deal is completed outside the system (spec §24).
const PricingSchema = new mongoose.Schema(
  {
    rentalAmount: { type: Number, default: 0, min: 0 },
    additionalCharges: { type: Number, default: 0, min: 0 },
    discount: { type: Number, default: 0, min: 0 },
    taxAmount: { type: Number, default: 0, min: 0 },
    totalAmount: { type: Number, default: 0, min: 0 },
    amountReceived: { type: Number, default: 0, min: 0 },
    balanceAmount: { type: Number, default: 0, min: 0 },
    currency: { type: String, default: "INR" },
  },
  { _id: false }
);

const BookingSchema = new mongoose.Schema(
  {
    // Public-facing ID: KT-YYYYMMDD-XXXX. Mongo _id is never exposed and
    // the frontend/customer never controls this value — always generated
    // server-side (see lib/publicIds.js).
    bookingId: { type: String, required: true, unique: true, index: true },

    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },

    // Optional link back to the enquiry this booking was converted from.
    // A booking may also be created standalone by the SuperAdmin without
    // a prior enquiry.
    enquiryId: { type: mongoose.Schema.Types.ObjectId, ref: "Enquiry", default: null, index: true },

    customerSnapshot: { type: CustomerSnapshotSchema, required: true },
    vehicles: { type: [BookedVehicleSchema], required: true, validate: (v) => v.length > 0 },

    journey: {
      pickup: { type: String, required: true },
      destination: { type: String, required: true },
      journeyStart: { type: Date, required: true },
      journeyEnd: { type: Date, default: null },
      pickupTime: { type: String, default: null },
      passengers: { type: Number, required: true },
      notes: { type: String, default: null },
    },

    pricing: { type: PricingSchema, default: () => ({}) },

    // Admin-managed statuses only — no payment-dependent states, since
    // there is no online payment system (spec §22).
    status: {
      type: String,
      enum: ["DRAFT", "CONFIRMED", "IN_PROGRESS", "COMPLETED", "CANCELLED"],
      default: "DRAFT",
      index: true,
    },

    bookingDate: { type: Date, default: Date.now },
    terms: { type: String, default: null },

    cancelledAt: { type: Date, default: null },
    cancellationReason: { type: String, default: null },

    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },

    adminNotes: [
      {
        note: String,
        addedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        addedAt: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true }
);

BookingSchema.index({ userId: 1, status: 1 });
BookingSchema.index({ "journey.journeyStart": 1 });
BookingSchema.index({ "journey.journeyEnd": 1 });

const Booking = mongoose.models.Booking || mongoose.model("Booking", BookingSchema);

module.exports = { Booking };
