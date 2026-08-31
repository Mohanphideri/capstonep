const mongoose = require("mongoose");

// Configurable discount codes. Applying a coupon (validation + usage
// tracking) is Phase 2 work — this phase only lays down the schema so a
// coupon can be created/read, per the spec ("do not implement the
// complete admin UI yet").
const CouponSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, trim: true, uppercase: true, unique: true, index: true },
    discountType: { type: String, enum: ["PERCENT", "FLAT"], required: true },
    discountValue: { type: Number, required: true, min: 0 },
    minAmount: { type: Number, default: 0, min: 0 },
    maxDiscount: { type: Number, default: null, min: 0 },

    validFrom: { type: Date, default: null },
    validUntil: { type: Date, default: null },

    usageLimit: { type: Number, default: null, min: 0 },
    perUserLimit: { type: Number, default: null, min: 0 },
    usageCount: { type: Number, default: 0, min: 0 },

    isActive: { type: Boolean, default: true, index: true },
  },
  { timestamps: true }
);

CouponSchema.index({ isActive: 1, validFrom: 1, validUntil: 1 });

const Coupon = mongoose.models.Coupon || mongoose.model("Coupon", CouponSchema);

module.exports = { Coupon };
