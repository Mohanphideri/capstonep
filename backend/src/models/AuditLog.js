const mongoose = require("mongoose");

// Append-only trail of admin/staff actions. Written best-effort (never
// blocks the action it's logging) via lib/auditLog.js.
const AuditLogSchema = new mongoose.Schema(
  {
    actorId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null, index: true },
    actorRole: { type: String, default: null },
    action: { type: String, required: true, trim: true, index: true },
    entityType: { type: String, required: true, trim: true, index: true },
    entityId: { type: String, default: null },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
    ip: { type: String, default: null },
    userAgent: { type: String, default: null },
  },
  {
    // timestamp per spec item #9 — no updatedAt needed for an append-only
    // log, so createdAt only.
    timestamps: { createdAt: true, updatedAt: false },
  }
);

AuditLogSchema.index({ entityType: 1, entityId: 1, createdAt: -1 });

const AuditLog = mongoose.models.AuditLog || mongoose.model("AuditLog", AuditLogSchema);

module.exports = { AuditLog };
