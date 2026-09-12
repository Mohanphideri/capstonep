const mongoose = require("mongoose");
const { SESSION_COOKIE, verifySessionToken, hashToken } = require("../lib/session");
const { isTokenRevoked } = require("../lib/sessionRevocation");
const { User } = require("../models/User");

const ADMIN_ROLES = ["super_admin"];

/**
 * Authentication is intentionally fail-closed:
 *  - JWT signature/expiry must be valid.
 *  - The durable session must exist and not be revoked.
 *  - The current User document must still exist, be active, and have the
 *    same role as the token. This prevents stale JWT privileges after an
 *    account deactivation or role change.
 *
 * This costs one small indexed DB read per authenticated request, which is
 * the correct trade-off for a security-sensitive cookie session.
 */
async function readSession(req) {
  const token = req.cookies?.[SESSION_COOKIE];
  if (!token) return null;

  const session = verifySessionToken(token);
  if (!session) return null;

  try {
    if (await isTokenRevoked(hashToken(token))) return null;

    if (mongoose.connection.readyState !== 1) return null;
    const user = await User.findById(session.userId)
      .select("_id phone role isActive")
      .maxTimeMS(2000)
      .lean();

    if (!user || user.isActive === false) return null;
    if (user.role !== session.role) return null;

    // Phone is not an authorization claim, but keeping the session aligned
    // with the current account avoids stale identity after a phone change.
    if (user.phone && user.phone !== session.phone) return null;

    return {
      userId: user._id.toString(),
      phone: user.phone,
      role: user.role,
    };
  } catch (err) {
    console.error("[auth] session validation failed closed:", err.message);
    return null;
  }
}

async function requireAuth(req, res, next) {
  const session = await readSession(req);
  if (!session) return res.status(401).json({ success: false, error: "Please log in." });
  req.session = session;
  return next();
}

async function requireAdmin(req, res, next) {
  const session = await readSession(req);
  if (!session || !ADMIN_ROLES.includes(session.role)) {
    return res.status(403).json({ success: false, error: "SuperAdmin access required." });
  }
  req.session = session;
  return next();
}

async function requireSuperAdmin(req, res, next) {
  const session = await readSession(req);
  if (!session) return res.status(401).json({ success: false, error: "Please log in." });
  if (session.role !== "super_admin") {
    return res.status(403).json({ success: false, error: "Super admin access required." });
  }
  req.session = session;
  return next();
}

async function attachSessionIfPresent(req, res, next) {
  req.session = await readSession(req);
  return next();
}

module.exports = {
  requireAuth,
  requireAdmin,
  requireSuperAdmin,
  ADMIN_ROLES,
  attachSessionIfPresent,
  readSession,
};
