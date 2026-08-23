const mongoose = require("mongoose");
const { UserSession } = require("../models/UserSession");

/**
 * Real revocation check for logout: makes /api/auth/logout actually
 * invalidate the JWT cookie instead of only marking an audit-log row,
 * without turning every authenticated request into a blocking DB
 * round-trip on the happy path.
 *
 * FAILS OPEN on purpose:
 *  - If Mongo isn't connected yet (readyState !== 1), we skip the query
 *    entirely rather than attempting a fresh connection here — startup
 *    (server.js) already connects before the server accepts traffic, so
 *    this only trips during an outage. In that case we treat the token as
 *    NOT revoked. A DB outage should degrade to "logged-out users might
 *    stay logged in a little longer," never to "nobody can use the app."
 *  - If the query itself throws or the UserSession row simply doesn't
 *    exist (e.g. a token issued before this feature, or the best-effort
 *    write on login failed), we also treat it as not revoked.
 *
 * This means revocation is a best-effort *additional* check layered on
 * top of the JWT's own signature + expiry check — it can deny a request
 * for a token it knows was revoked, but a missing/unreachable record can
 * never itself deny a request.
 */
async function isTokenRevoked(tokenHash) {
  if (mongoose.connection.readyState !== 1) {
    return false;
  }

  try {
    const session = await UserSession.findOne({ tokenHash })
      .select("revokedAt")
      .maxTimeMS(2000)
      .lean();
    return Boolean(session?.revokedAt);
  } catch (err) {
    console.error("[sessionRevocation] revocation check failed, failing open:", err.message);
    return false;
  }
}

module.exports = { isTokenRevoked };
