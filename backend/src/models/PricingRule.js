const mongoose = require("mongoose");

// One vehicle can have many PricingRule documents over time — only one is
// `isActive` at once. Editing a price never mutates an old rule; instead a
// new rule is inserted and the previous one is deactivated. Bookings store
// the rule's _id + version in their pricingSnapshot, so changing today's
// rates can never alter the total on a booking made last month.
const PricingRuleSchema = new mongoose.Schema(
  {
    vehicleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Vehicle",
      required: true,
      index: true,
    },
    version: { type: Number, required: true, default: 1 },
    isActive: { type: Boolean, default: true, index: true },

    // Primary pricing unit — Kuwarji rents buses per day, not per km, since
    // there's no distance/maps service configured to compute route km.
    perDayRate: { type: Number, required: true, min: 0 },

    // Optional per-km mode, only used if admin sets it and the booking
    // form collects a customer-declared distance estimate.
    perKmRate: { type: Number, default: null, min: 0 },
    minKm: { type: Number, default: null, min: 0 },
    extraKmRate: { type: Number, default: null, min: 0 },

    perHourRate: { type: Number, default: null, min: 0 },
    extraHourRate: { type: Number, default: null, min: 0 },

    driverAllowancePerDay: { type: Number, default: 0, min: 0 },
    tollDefault: { type: Number, default: 0, min: 0 },
    parkingDefault: { type: Number, default: 0, min: 0 },
    taxPercent: { type: Number, default: 5, min: 0, max: 100 },

    // Cancellation policy attached to the rule so it can also be
    // versioned/snapshotted per booking.
    cancellationPolicy: {
      // Refund % the customer gets back, keyed by "days before journey".
      // Evaluated in order; first matching threshold wins.
      tiers: {
        type: [
          {
            minDaysBeforeJourney: { type: Number, required: true },
            refundPercent: { type: Number, required: true, min: 0, max: 100 },
          },
        ],
        default: [
          { minDaysBeforeJourney: 7, refundPercent: 90 },
          { minDaysBeforeJourney: 3, refundPercent: 50 },
          { minDaysBeforeJourney: 0, refundPercent: 0 },
        ],
      },
    },
  },
  { timestamps: true }
);

PricingRuleSchema.index({ vehicleId: 1, isActive: 1 });

const PricingRule = mongoose.models.PricingRule || mongoose.model("PricingRule", PricingRuleSchema);

module.exports = { PricingRule };
