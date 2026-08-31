const { SESSION_COOKIE, verifySessionToken, hashToken } = require("../lib/session");
const { isTokenRevoked } = require("../lib/sessionRevocation");

// Only SUPER_ADMIN exists as an administrative role (spec §2) — "staff"
// and "admin" are not authorized here even if a legacy user document
// still carries one of those role values.
const ADMIN_ROLES = ["super_admin"];

/**
 * Reads and verifies the session cookie, attaching `req.session` on
 * success. Does not itself reject the request — combine with
 * `requireAuth` / `requireAdmin` below.
 *
 * Also checks the token against UserSession.revokedAt so that logging
 * out (or a future "log out all devices") actually takes effect
 * immediately instead of only being reflected in an audit log while the
 * JWT itself stays valid until it expires. See lib/sessionRevocation.js
 * for why this fails open rather than closed.
 */
async function readSession(req) {
  const token = req.cookies?.[SESSION_COOKIE];
  if (!token) return null;

  const session = verifySessionToken(token);
  if (!session) return null;

  const revoked = await isTokenRevoked(hashToken(token));
  if (revoked) return null;

  return session;
}

async function requireAuth(req, res, next) {
  const session = await readSession(req);
  if (!session) {
    return res.status(401).json({ success: false, error: "Please log in." });
  }
  req.session = session;
  return next();
}

// requireAdmin and requireSuperAdmin are now equivalent — kept as two
// names only so existing route files don't all need renaming imports.
// Every admin surface in this app requires SUPER_ADMIN (spec §2).
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
  if (!session) {
    return res.status(401).json({ success: false, error: "Please log in." });
  }
  if (session.role !== "super_admin") {
    return res.status(403).json({ success: false, error: "Super admin access required." });
  }
  req.session = session;
  return next();
}

/**
 * Attaches req.session if a valid cookie is present, but never rejects
 * the request either way. For routes that behave the same for guests and
 * logged-in users but want to attribute the action when possible (e.g.
 * enquiry submission).
 */
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
};
