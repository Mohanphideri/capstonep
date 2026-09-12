const mongoose = require("mongoose");

// The actual OTP code is never generated, stored, or seen by this
// backend — MSG91's widget owns send + verify, and this server only
// re-checks the resulting access token against MSG91 (see lib/msg91.js).
// So this is NOT an OTP store; it's an audit trail of verification
// events (who verified, for what purpose, when), written best-effort so
// it never blocks the auth/enquiry flow it's logging.
const OtpVerificationSchema = new mongoose.Schema(
  {
    phone: { type: String, required: true, trim: true, index: true },
    purpose: {
      type: String,
      enum: ["LOGIN", "ENQUIRY", "PROFILE_UPDATE"],
      required: true,
    },
    verified: { type: Boolean, default: true },
    ip: { type: String, default: null },
    userAgent: { type: String, default: null },
  },
  { timestamps: true }
);

OtpVerificationSchema.index({ phone: 1, createdAt: -1 });

const OtpVerification =
  mongoose.models.OtpVerification || mongoose.model("OtpVerification", OtpVerificationSchema);

module.exports = { OtpVerification };
