const express = require("express");
const { z } = require("zod");
const mongoose = require("mongoose");
const { connectToDatabase } = require("../lib/mongodb");
const { VehicleAmenity } = require("../models/VehicleAmenity");
const { Vehicle } = require("../models/Vehicle");
const { requireSuperAdmin } = require("../middleware/requireAuth");
const { recordAuditLog } = require("../lib/auditLog");

const router = express.Router();

// Amenity administration is SUPER_ADMIN-only per the Phase 2 spec.
router.use(requireSuperAdmin);

function isValidId(id) {
  return mongoose.Types.ObjectId.isValid(id);
}

function serialize(a) {
  return {
    id: a._id.toString(),
    name: a.name,
    icon: a.icon,
    isActive: a.isActive,
    sortOrder: a.sortOrder,
    createdAt: a.createdAt,
    updatedAt: a.updatedAt,
  };
}

// --- List (all amenities, including inactive — admin view) ---
router.get("/", async (req, res) => {
  try {
    await connectToDatabase();
    const amenities = await VehicleAmenity.find({}).sort({ sortOrder: 1, name: 1 }).lean();
    return res.json({ success: true, amenities: amenities.map(serialize) });
  } catch (err) {
    console.error("admin amenity list error", err);
    return res.status(500).json({ success: false, error: "Failed to load amenities." });
  }
});

const writeSchema = z.object({
  name: z.string().trim().min(2).max(60),
  icon: z.string().trim().max(60).optional().nullable(),
});

// --- Create ---
router.post("/", async (req, res) => {
  try {
    const parsed = writeSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        error: parsed.error.issues[0]?.message ?? "Invalid amenity details.",
      });
    }

    await connectToDatabase();

    if (await VehicleAmenity.exists({ name: parsed.data.name })) {
      return res.status(409).json({ success: false, error: "An amenity with this name already exists." });
    }

    const maxOrder = await VehicleAmenity.findOne({}).sort({ sortOrder: -1 }).lean();

    const amenity = await VehicleAmenity.create({
      name: parsed.data.name,
      icon: parsed.data.icon || null,
      isActive: true,
      sortOrder: (maxOrder?.sortOrder ?? -1) + 1,
    });

    await recordAuditLog({
      req,
      action: "AMENITY_CREATED",
      entityType: "VehicleAmenity",
      entityId: amenity._id,
      metadata: { name: amenity.name },
    });

    return res.status(201).json({ success: true, amenity: serialize(amenity) });
  } catch (err) {
    console.error("admin amenity create error", err);
    return res.status(500).json({ success: false, error: "Failed to create amenity." });
  }
});

// --- Edit ---
router.patch("/:id", async (req, res) => {
  try {
    if (!isValidId(req.params.id)) {
      return res.status(400).json({ success: false, error: "Invalid amenity id." });
    }
    const parsed = writeSchema.partial().safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        error: parsed.error.issues[0]?.message ?? "Invalid amenity details.",
      });
    }

    await connectToDatabase();

    if (parsed.data.name && (await VehicleAmenity.exists({ name: parsed.data.name, _id: { $ne: req.params.id } }))) {
      return res.status(409).json({ success: false, error: "An amenity with this name already exists." });
    }

    const amenity = await VehicleAmenity.findByIdAndUpdate(req.params.id, parsed.data, { new: true }).lean();
    if (!amenity) {
      return res.status(404).json({ success: false, error: "Amenity not found." });
    }

    await recordAuditLog({
      req,
      action: "AMENITY_EDITED",
      entityType: "VehicleAmenity",
      entityId: amenity._id,
      metadata: { fields: Object.keys(parsed.data) },
    });

    return res.json({ success: true, amenity: serialize(amenity) });
  } catch (err) {
    console.error("admin amenity edit error", err);
    return res.status(500).json({ success: false, error: "Failed to update amenity." });
  }
});

// --- Activate / deactivate ---
// No hard-delete endpoint: vehicles reference amenities by id
// (Vehicle.amenityIds), so a destructive delete could silently drop
// amenities off existing vehicles. Deactivating removes it from the
// picklist for new assignments while preserving existing relationships.
const statusSchema = z.object({ isActive: z.boolean() });

router.patch("/:id/status", async (req, res) => {
  try {
    if (!isValidId(req.params.id)) {
      return res.status(400).json({ success: false, error: "Invalid amenity id." });
    }
    const parsed = statusSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ success: false, error: "Invalid request." });
    }

    await connectToDatabase();
    const amenity = await VehicleAmenity.findByIdAndUpdate(
      req.params.id,
      { isActive: parsed.data.isActive },
      { new: true }
    ).lean();
    if (!amenity) {
      return res.status(404).json({ success: false, error: "Amenity not found." });
    }

    await recordAuditLog({
      req,
      action: parsed.data.isActive ? "AMENITY_ACTIVATED" : "AMENITY_DEACTIVATED",
      entityType: "VehicleAmenity",
      entityId: amenity._id,
    });

    return res.json({ success: true, amenity: serialize(amenity) });
  } catch (err) {
    console.error("admin amenity status error", err);
    return res.status(500).json({ success: false, error: "Failed to update amenity status." });
  }
});

// Referenced by adminVehicles.js form UI to show "used by N vehicles" —
// kept here since it's amenity-scoped read data, not a vehicle mutation.
router.get("/:id/usage", async (req, res) => {
  try {
    if (!isValidId(req.params.id)) {
      return res.status(400).json({ success: false, error: "Invalid amenity id." });
    }
    await connectToDatabase();
    const count = await Vehicle.countDocuments({ amenityIds: req.params.id, deletedAt: null });
    return res.json({ success: true, count });
  } catch (err) {
    console.error("admin amenity usage error", err);
    return res.status(500).json({ success: false, error: "Failed to load amenity usage." });
  }
});

module.exports = router;
