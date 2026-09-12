const mongoose = require("mongoose");

const RateLimitCounterSchema = new mongoose.Schema(
  {
    _id: { type: String, required: true },
    count: { type: Number, required: true, default: 0 },
    expiresAt: { type: Date, required: true, index: true },
  },
  { versionKey: false }
);

RateLimitCounterSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const RateLimitCounter =
  mongoose.models.RateLimitCounter ||
  mongoose.model("RateLimitCounter", RateLimitCounterSchema);

module.exports = { RateLimitCounter };
