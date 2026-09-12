const mongoose = require("mongoose");
const { UserSession } = require("../models/UserSession");

/**
 * Fail-closed revocation lookup.
 */
async function isTokenRevoked(tokenHash) {
  if (mongoose.connection.readyState !== 1) {
    throw new Error("Session revocation store is unavailable");
  }

  const session = await UserSession.findOne({ tokenHash })
    .select("revokedAt expiresAt")
    .maxTimeMS(2000)
    .lean();

  if (!session) return true;
  if (session.expiresAt && session.expiresAt.getTime() <= Date.now()) return true;
  return Boolean(session.revokedAt);
}

async function revokeAllUserSessions(userId) {
  if (!userId) return { modifiedCount: 0 };
  if (mongoose.connection.readyState !== 1) {
    throw new Error("Session revocation store is unavailable");
  }
  return UserSession.updateMany(
    { userId, revokedAt: null },
    { $set: { revokedAt: new Date() } }
  );
}

module.exports = { isTokenRevoked, revokeAllUserSessions };
