const express = require("express");
const { z } = require("zod");
const mongoose = require("mongoose");
const { connectToDatabase } = require("../lib/mongodb");
const { VehicleCategory } = require("../models/VehicleCategory");
const { Vehicle } = require("../models/Vehicle");
const { requireSuperAdmin } = require("../middleware/requireAuth");
const { recordAuditLog } = require("../lib/auditLog");

const router = express.Router();

// Category administration is SUPER_ADMIN-only per the Phase 2 spec.
router.use(requireSuperAdmin);

function isValidId(id) {
  return mongoose.Types.ObjectId.isValid(id);
}

function slugify(name) {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

async function uniqueSlug(base, excludeId) {
  let slug = base;
  let n = 1;
  // Small collision space (admin-created categories are few), so a
  // simple incrementing suffix loop is plenty.
  while (
    await VehicleCategory.exists({ slug, ...(excludeId ? { _id: { $ne: excludeId } } : {}) })
  ) {
    n += 1;
    slug = `${base}-${n}`;
  }
  return slug;
}

function serialize(c) {
  return {
    id: c._id.toString(),
    name: c.name,
    slug: c.slug,
    description: c.description,
    icon: c.icon,
    isActive: c.isActive,
    sortOrder: c.sortOrder,
    createdAt: c.createdAt,
    updatedAt: c.updatedAt,
  };
}

// --- List (all categories, including inactive — admin view) ---
router.get("/", async (req, res) => {
  try {
    await connectToDatabase();
    const categories = await VehicleCategory.find({}).sort({ sortOrder: 1, name: 1 }).lean();
    return res.json({ success: true, categories: categories.map(serialize) });
  } catch (err) {
    console.error("admin category list error", err);
    return res.status(500).json({ success: false, error: "Failed to load categories." });
  }
});

const writeSchema = z.object({
  name: z.string().trim().min(2).max(80),
  slug: z.string().trim().min(2).max(80).optional(),
  description: z.string().trim().max(500).optional().default(""),
  icon: z.enum(["bus", "sleeper", "van", "luxury"]).optional().default("bus"),
});

// --- Create ---
router.post("/", async (req, res) => {
  try {
    const parsed = writeSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        error: parsed.error.issues[0]?.message ?? "Invalid category details.",
      });
    }

    await connectToDatabase();

    if (await VehicleCategory.exists({ name: parsed.data.name })) {
      return res.status(409).json({ success: false, error: "A category with this name already exists." });
    }

    const slug = await uniqueSlug(slugify(parsed.data.slug || parsed.data.name));
    const maxOrder = await VehicleCategory.findOne({}).sort({ sortOrder: -1 }).lean();

    const category = await VehicleCategory.create({
      name: parsed.data.name,
      slug,
      description: parsed.data.description,
      icon: parsed.data.icon,
      isActive: true,
      sortOrder: (maxOrder?.sortOrder ?? -1) + 1,
    });

    await recordAuditLog({
      req,
      action: "CATEGORY_CREATED",
      entityType: "VehicleCategory",
      entityId: category._id,
      metadata: { name: category.name },
    });

    return res.status(201).json({ success: true, category: serialize(category) });
  } catch (err) {
    console.error("admin category create error", err);
    return res.status(500).json({ success: false, error: "Failed to create category." });
  }
});

// --- Edit ---
router.patch("/:id", async (req, res) => {
  try {
    if (!isValidId(req.params.id)) {
      return res.status(400).json({ success: false, error: "Invalid category id." });
    }
    const parsed = writeSchema.partial().safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        error: parsed.error.issues[0]?.message ?? "Invalid category details.",
      });
    }

    await connectToDatabase();

    const update = { ...parsed.data };
    if (parsed.data.name && !parsed.data.slug) {
      // Renaming doesn't change the slug unless one is explicitly given —
      // slugs are stable identifiers other things could link to.
      delete update.name;
      update.name = parsed.data.name;
    }
    if (parsed.data.slug) {
      update.slug = await uniqueSlug(slugify(parsed.data.slug), req.params.id);
    }

    const category = await VehicleCategory.findByIdAndUpdate(req.params.id, update, { new: true }).lean();
    if (!category) {
      return res.status(404).json({ success: false, error: "Category not found." });
    }

    await recordAuditLog({
      req,
      action: "CATEGORY_EDITED",
      entityType: "VehicleCategory",
      entityId: category._id,
      metadata: { fields: Object.keys(parsed.data) },
    });

    return res.json({ success: true, category: serialize(category) });
  } catch (err) {
    console.error("admin category edit error", err);
    return res.status(500).json({ success: false, error: "Failed to update category." });
  }
});

// --- Activate / deactivate ---
// No hard-delete endpoint: vehicles reference categories by id, so a
// destructive delete could orphan them. Deactivating removes the
// category from customer-facing filters/browsing while preserving the
// relationship for any vehicle still pointing at it.
const statusSchema = z.object({ isActive: z.boolean() });

router.patch("/:id/status", async (req, res) => {
  try {
    if (!isValidId(req.params.id)) {
      return res.status(400).json({ success: false, error: "Invalid category id." });
    }
    const parsed = statusSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ success: false, error: "Invalid request." });
    }

    await connectToDatabase();

    if (!parsed.data.isActive) {
      const vehicleCount = await Vehicle.countDocuments({
        categoryId: req.params.id,
        deletedAt: null,
        status: "AVAILABLE",
      });
      if (vehicleCount > 0) {
        return res.status(409).json({
          success: false,
          error: `${vehicleCount} active vehicle(s) still use this category. Reassign them before deactivating it.`,
        });
      }
    }

    const category = await VehicleCategory.findByIdAndUpdate(
      req.params.id,
      { isActive: parsed.data.isActive },
      { new: true }
    ).lean();
    if (!category) {
      return res.status(404).json({ success: false, error: "Category not found." });
    }

    await recordAuditLog({
      req,
      action: parsed.data.isActive ? "CATEGORY_ACTIVATED" : "CATEGORY_DEACTIVATED",
      entityType: "VehicleCategory",
      entityId: category._id,
    });

    return res.json({ success: true, category: serialize(category) });
  } catch (err) {
    console.error("admin category status error", err);
    return res.status(500).json({ success: false, error: "Failed to update category status." });
  }
});

// --- Reorder ---
const objectId = z.string().refine(isValidId, "Invalid id.");
const reorderSchema = z.object({ order: z.array(objectId).min(1) });

router.patch("/reorder", async (req, res) => {
  try {
    const parsed = reorderSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ success: false, error: "An ordered list of category ids is required." });
    }

    await connectToDatabase();
    const existing = await VehicleCategory.find({ _id: { $in: parsed.data.order } }).lean();
    const validIds = new Set(existing.map((c) => c._id.toString()));
    if (parsed.data.order.length !== validIds.size || !parsed.data.order.every((id) => validIds.has(id))) {
      return res.status(400).json({
        success: false,
        error: "The order must include valid, existing category ids.",
      });
    }

    await Promise.all(
      parsed.data.order.map((id, index) => VehicleCategory.updateOne({ _id: id }, { sortOrder: index }))
    );

    await recordAuditLog({ req, action: "CATEGORY_REORDERED", entityType: "VehicleCategory" });

    return res.json({ success: true });
  } catch (err) {
    console.error("admin category reorder error", err);
    return res.status(500).json({ success: false, error: "Failed to reorder categories." });
  }
});

module.exports = router;
