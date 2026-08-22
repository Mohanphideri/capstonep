const mongoose = require("mongoose");

// Additive audit/record of logins. The app's actual auth check
// (middleware/requireAuth.js) remains a stateless signed JWT cookie and is
// UNCHANGED by this model — that keeps existing sessions valid and avoids
// adding a DB round-trip to every authenticated request. This collection
// exists so a session has a durable row for "your devices" / "log out
// everywhere" / audit tooling in a later phase, and is written best-effort
// at login time (see lib/session.js callers in routes/auth.js).
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
