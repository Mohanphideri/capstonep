const { AuditLog } = require("../models/AuditLog");

/**
 * Best-effort audit trail write. Never throws — an audit-log failure must
 * never block the admin action it's recording.
 */
async function recordAuditLog({
  req,
  action,
  entityType,
  entityId = null,
  metadata = {},
}) {
  try {
    const session = req?.session || null;
    await AuditLog.create({
      actorId: session?.userId || null,
      actorRole: session?.role || null,
      action,
      entityType,
      entityId: entityId ? String(entityId) : null,
      metadata,
      ip: req?.headers?.["x-forwarded-for"] || req?.ip || null,
      userAgent: req?.headers?.["user-agent"] || null,
    });
  } catch (err) {
    console.error("[auditLog] failed to write entry", err.message);
  }
}

module.exports = { recordAuditLog };
