const express = require("express");
const mongoose = require("mongoose");
const { connectToDatabase } = require("../lib/mongodb");
const { AuditLog } = require("../models/AuditLog");
const { requireSuperAdmin } = require("../middleware/requireAuth");

const router = express.Router();

// Read-only trail of admin actions — SUPER_ADMIN only, and there is no
// write endpoint here at all: entries are only ever created internally
// via lib/auditLog.js from other routes.
router.use(requireSuperAdmin);

function isValidId(id) {
  return mongoose.Types.ObjectId.isValid(id);
}

// entry.actorId is a populated {_id, name, phone} doc (or null) after
// the .populate() call in the list route below — never a bare ObjectId.
function serialize(entry) {
  return {
    id: entry._id.toString(),
    actorId: entry.actorId?._id ? entry.actorId._id.toString() : null,
    actorName: entry.actorId?.name || null,
    actorPhone: entry.actorId?.phone || null,
    actorRole: entry.actorRole,
    action: entry.action,
    entityType: entry.entityType,
    entityId: entry.entityId,
    metadata: entry.metadata,
    ip: entry.ip,
    createdAt: entry.createdAt,
  };
}

// --- List audit log entries (filter + pagination) ---
router.get("/", async (req, res) => {
  try {
    await connectToDatabase();
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(200, Math.max(1, parseInt(req.query.limit, 10) || 50));

    const filter = {};
    if (req.query.action) filter.action = req.query.action;
    if (req.query.entityType) filter.entityType = req.query.entityType;
    if (req.query.entityId) filter.entityId = req.query.entityId;
    if (req.query.actorId && isValidId(req.query.actorId)) filter.actorId = req.query.actorId;

    if (req.query.dateFrom || req.query.dateTo) {
      filter.createdAt = {};
      if (req.query.dateFrom) filter.createdAt.$gte = new Date(req.query.dateFrom);
      if (req.query.dateTo) filter.createdAt.$lte = new Date(req.query.dateTo);
    }

    const [items, total, actions, entityTypes] = await Promise.all([
      AuditLog.find(filter)
        .populate("actorId", "name phone")
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      AuditLog.countDocuments(filter),
      // Distinct value lists power the filter dropdowns on the admin
      // page without hard-coding every action name the app can emit.
      AuditLog.distinct("action"),
      AuditLog.distinct("entityType"),
    ]);

    return res.json({
      success: true,
      logs: items.map(serialize),
      page,
      limit,
      total,
      filters: {
        actions: actions.sort(),
        entityTypes: entityTypes.sort(),
      },
    });
  } catch (err) {
    console.error("admin audit logs list error", err);
    return res.status(500).json({ success: false, error: "Failed to load audit logs." });
  }
});

module.exports = router;
