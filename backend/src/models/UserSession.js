const mongoose = require("mongoose");

// Durable record of logins, used for two things:
//  1. Audit trail ("your devices" / admin session review).
//  2. Real revocation — middleware/requireAuth.js checks `revokedAt` here
//     on every request (see lib/sessionRevocation.js), so logout actually
//     invalidates the cookie instead of only marking a log row. The check
//     fails OPEN (treats the session as valid) if Mongo isn't connected,
//     so a DB outage degrades to "logout doesn't immediately propagate"
//     rather than locking every logged-in user out — same best-effort
//     philosophy as the rest of this collection.
const UserSessionSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    // Not the JWT itself — a hash, so a leaked DB row can't be replayed
    // as a session cookie.
    tokenHash: { type: String, required: true, index: true },
    ip: { type: String, default: null },
    userAgent: { type: String, default: null },
    loginMethod: { type: String, enum: ["OTP", "PASSWORD"], required: true },
    expiresAt: { type: Date, required: true },
    revokedAt: { type: Date, default: null },
    lastSeenAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

UserSessionSchema.index({ userId: 1, revokedAt: 1 });
// Background cleanup only, same TTL pattern as BookingHold — never relied
// on for correctness, just housekeeping.
UserSessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const UserSession = mongoose.models.UserSession || mongoose.model("UserSession", UserSessionSchema);

module.exports = { UserSession };
