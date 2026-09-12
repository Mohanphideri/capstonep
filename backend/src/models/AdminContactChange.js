const mongoose = require("mongoose");

const AdminContactChangeSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    kind: { type: String, enum: ["PHONE_CHANGE"], required: true },
    targetValue: { type: String, required: true, trim: true },
    codeHash: { type: String, required: true },
    attempts: { type: Number, default: 0 },
    expiresAt: { type: Date, required: true },
    consumedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

AdminContactChangeSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
AdminContactChangeSchema.index({ userId: 1, kind: 1, createdAt: -1 });

const AdminContactChange = mongoose.models.AdminContactChange || mongoose.model("AdminContactChange", AdminContactChangeSchema);

module.exports = { AdminContactChange };
