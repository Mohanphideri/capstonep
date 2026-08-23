const express = require("express");
const { z } = require("zod");
const mongoose = require("mongoose");
const { connectToDatabase } = require("../lib/mongodb");
const { Vehicle } = require("../models/Vehicle");
const { VehicleCategory } = require("../models/VehicleCategory");
const { VehicleAmenity } = require("../models/VehicleAmenity");
const { requireSuperAdmin } = require("../middleware/requireAuth");
const { recordAuditLog } = require("../lib/auditLog");
const { buildAdminVehicleFilter } = require("../lib/vehicleFilters");
const { getStorageProvider } = require("../lib/storage/StorageService");
const { validateImageUpload, ImageValidationError } = require("../lib/imageValidation");

const router = express.Router();

// Every route below requires a super_admin session — vehicle
// administration is SUPER_ADMIN-only per the Phase 2 spec.
router.use(requireSuperAdmin);

function isValidId(id) {
  return mongoose.Types.ObjectId.isValid(id);
}

function serializeAdminVehicle(v, category, amenities) {
  return {
    id: v._id.toString(),
    name: v.name,
    category: category ? { id: category._id.toString(), name: category.name, slug: category.slug } : null,
    categoryId: v.categoryId?.toString() || null,
    capacity: v.capacity,
    acType: v.acType,
    seatType: v.seatType,
    amenities: amenities || [],
    amenityIds: (v.amenityIds || []).map((id) => id.toString()),
    photos: (v.photos || [])
      .slice()
      .sort((a, b) => Number(b.isPrimary) - Number(a.isPrimary) || a.order - b.order)
      .map((p) => ({
        id: p._id.toString(),
        url: p.url,
        order: p.order,
        isPrimary: !!p.isPrimary,
        showInPortal: p.showInPortal !== false,
        showOnLanding: !!p.showOnLanding,
      })),
    description: v.description,
    rentalInfo: v.rentalInfo || "",
    registrationNumber: v.registrationNumber || null,
    status: v.status,
    priority: v.priority,
    ratingAvg: v.ratingAvg,
    ratingCount: v.ratingCount,
    deletedAt: v.deletedAt,
    createdAt: v.createdAt,
    updatedAt: v.updatedAt,
  };
}

async function loadCategoryAndAmenities(vehicle) {
  const [category, amenityDocs] = await Promise.all([
    vehicle.categoryId ? VehicleCategory.findById(vehicle.categoryId).lean() : null,
    vehicle.amenityIds?.length
      ? VehicleAmenity.find({ _id: { $in: vehicle.amenityIds } }).lean()
      : [],
  ]);
  const amenityById = new Map(amenityDocs.map((a) => [a._id.toString(), a.name]));
  const amenities = (vehicle.amenityIds || []).map((id) => amenityById.get(id.toString())).filter(Boolean);
  return { category, amenities };
}

// --- List (search + filter + pagination) ---
router.get("/", async (req, res) => {
  try {
    await connectToDatabase();

    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 25));
    const filter = buildAdminVehicleFilter({
      status: req.query.status,
      categoryId: req.query.categoryId,
      search: req.query.search,
      includeDeleted: req.query.includeDeleted === "true",
    });

    const [items, total, categories, amenityDocs] = await Promise.all([
      Vehicle.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Vehicle.countDocuments(filter),
      VehicleCategory.find({}).lean(),
      VehicleAmenity.find({}).lean(),
    ]);

    const categoryById = new Map(categories.map((c) => [c._id.toString(), c]));
    const amenityById = new Map(amenityDocs.map((a) => [a._id.toString(), a.name]));

    return res.json({
      success: true,
      vehicles: items.map((v) =>
        serializeAdminVehicle(
          v,
          categoryById.get(v.categoryId?.toString()),
          (v.amenityIds || []).map((id) => amenityById.get(id.toString())).filter(Boolean)
        )
      ),
      page,
      limit,
      total,
    });
  } catch (err) {
    console.error("admin vehicle list error", err);
    return res.status(500).json({ success: false, error: "Failed to load vehicles." });
  }
});

// --- Detail ---
router.get("/:id", async (req, res) => {
  try {
    if (!isValidId(req.params.id)) {
      return res.status(400).json({ success: false, error: "Invalid vehicle id." });
    }
    await connectToDatabase();
    const vehicle = await Vehicle.findById(req.params.id).select("+registrationNumber").lean();
    if (!vehicle) {
      return res.status(404).json({ success: false, error: "Vehicle not found." });
    }
    const { category, amenities } = await loadCategoryAndAmenities(vehicle);
    return res.json({ success: true, vehicle: serializeAdminVehicle(vehicle, category, amenities) });
  } catch (err) {
    console.error("admin vehicle detail error", err);
    return res.status(500).json({ success: false, error: "Failed to load vehicle." });
  }
});

const objectId = z.string().refine(isValidId, "Invalid id.");

const vehicleWriteSchema = z.object({
  name: z.string().trim().min(2).max(150),
  categoryId: objectId,
  capacity: z.coerce.number().int().positive().max(200),
  acType: z.enum(["AC", "NON_AC"]),
  seatType: z.enum(["SEATER", "SLEEPER", "SEMI_SLEEPER"]),
  amenityIds: z.array(objectId).max(50).optional().default([]),
  description: z.string().trim().max(4000).optional().default(""),
  rentalInfo: z.string().trim().max(4000).optional().default(""),
  registrationNumber: z.string().trim().max(40).optional().nullable(),
  priority: z.coerce.number().int().min(-1000).max(1000).optional().default(0),
});

async function validateRefs(categoryId, amenityIds) {
  const category = await VehicleCategory.findById(categoryId).lean();
  if (!category) return "The selected category does not exist.";
  if (amenityIds?.length) {
    const count = await VehicleAmenity.countDocuments({ _id: { $in: amenityIds } });
    if (count !== amenityIds.length) return "One or more selected amenities do not exist.";
  }
  return null;
}

// --- Create ---
router.post("/", async (req, res) => {
  try {
    const parsed = vehicleWriteSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        error: parsed.error.issues[0]?.message ?? "Invalid vehicle details.",
      });
    }

    await connectToDatabase();

    const refError = await validateRefs(parsed.data.categoryId, parsed.data.amenityIds);
    if (refError) {
      return res.status(400).json({ success: false, error: refError });
    }

    const vehicle = await Vehicle.create({
      ...parsed.data,
      registrationNumber: parsed.data.registrationNumber || null,
      status: "AVAILABLE",
      photos: [],
    });

    await recordAuditLog({
      req,
      action: "VEHICLE_CREATED",
      entityType: "Vehicle",
      entityId: vehicle._id,
      metadata: { name: vehicle.name },
    });

    const full = await Vehicle.findById(vehicle._id).select("+registrationNumber").lean();
    const { category, amenities } = await loadCategoryAndAmenities(full);
    return res.status(201).json({ success: true, vehicle: serializeAdminVehicle(full, category, amenities) });
  } catch (err) {
    console.error("admin vehicle create error", err);
    return res.status(500).json({ success: false, error: "Failed to create vehicle." });
  }
});

// --- Edit ---
router.patch("/:id", async (req, res) => {
  try {
    if (!isValidId(req.params.id)) {
      return res.status(400).json({ success: false, error: "Invalid vehicle id." });
    }
    const parsed = vehicleWriteSchema.partial().safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        error: parsed.error.issues[0]?.message ?? "Invalid vehicle details.",
      });
    }

    await connectToDatabase();

    if (parsed.data.categoryId || parsed.data.amenityIds) {
      const refError = await validateRefs(
        parsed.data.categoryId || (await Vehicle.findById(req.params.id).lean())?.categoryId,
        parsed.data.amenityIds
      );
      if (refError) return res.status(400).json({ success: false, error: refError });
    }

    const update = { ...parsed.data };
    if ("registrationNumber" in update) update.registrationNumber = update.registrationNumber || null;

    const vehicle = await Vehicle.findByIdAndUpdate(req.params.id, update, { new: true })
      .select("+registrationNumber")
      .lean();
    if (!vehicle) {
      return res.status(404).json({ success: false, error: "Vehicle not found." });
    }

    await recordAuditLog({
      req,
      action: "VEHICLE_EDITED",
      entityType: "Vehicle",
      entityId: vehicle._id,
      metadata: { fields: Object.keys(parsed.data) },
    });

    const { category, amenities } = await loadCategoryAndAmenities(vehicle);
    return res.json({ success: true, vehicle: serializeAdminVehicle(vehicle, category, amenities) });
  } catch (err) {
    console.error("admin vehicle edit error", err);
    return res.status(500).json({ success: false, error: "Failed to update vehicle." });
  }
});

// --- Activate / deactivate ---
const statusSchema = z.object({ status: z.enum(["AVAILABLE", "INACTIVE"]) });

router.patch("/:id/status", async (req, res) => {
  try {
    if (!isValidId(req.params.id)) {
      return res.status(400).json({ success: false, error: "Invalid vehicle id." });
    }
    const parsed = statusSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ success: false, error: "Status must be AVAILABLE or INACTIVE." });
    }

    await connectToDatabase();
    const vehicle = await Vehicle.findOneAndUpdate(
      { _id: req.params.id, deletedAt: null },
      { status: parsed.data.status },
      { new: true }
    ).lean();
    if (!vehicle) {
      return res.status(404).json({ success: false, error: "Vehicle not found." });
    }

    await recordAuditLog({
      req,
      action: parsed.data.status === "AVAILABLE" ? "VEHICLE_ACTIVATED" : "VEHICLE_DEACTIVATED",
      entityType: "Vehicle",
      entityId: vehicle._id,
    });

    return res.json({ success: true, vehicle: { id: vehicle._id.toString(), status: vehicle.status } });
  } catch (err) {
    console.error("admin vehicle status error", err);
    return res.status(500).json({ success: false, error: "Failed to update vehicle status." });
  }
});

// --- Soft delete ---
router.delete("/:id", async (req, res) => {
  try {
    if (!isValidId(req.params.id)) {
      return res.status(400).json({ success: false, error: "Invalid vehicle id." });
    }
    await connectToDatabase();
    const vehicle = await Vehicle.findOneAndUpdate(
      { _id: req.params.id, deletedAt: null },
      { deletedAt: new Date(), status: "INACTIVE" },
      { new: true }
    ).lean();
    if (!vehicle) {
      return res.status(404).json({ success: false, error: "Vehicle not found." });
    }

    await recordAuditLog({
      req,
      action: "VEHICLE_SOFT_DELETED",
      entityType: "Vehicle",
      entityId: vehicle._id,
      metadata: { name: vehicle.name },
    });

    return res.json({ success: true, vehicle: { id: vehicle._id.toString() } });
  } catch (err) {
    console.error("admin vehicle delete error", err);
    return res.status(500).json({ success: false, error: "Failed to delete vehicle." });
  }
});

// --- Photos: upload ---
// Body is JSON with a base64 data URI or raw base64 string — there's no
// multipart/form-data parser in this project (no multer dependency), so
// uploads travel as JSON like everything else the frontend's apiFetch
// sends. See lib/imageValidation.js for the real content-based checks
// and lib/storage/ for where the bytes actually get written.
const photoUploadSchema = z.object({
  filename: z.string().trim().max(200).optional().default("photo"),
  mimeType: z.string().trim().min(1),
  dataBase64: z.string().min(1),
  showInPortal: z.boolean().optional().default(true),
  showOnLanding: z.boolean().optional().default(false),
});

router.post("/:id/photos", async (req, res) => {
  try {
    if (!isValidId(req.params.id)) {
      return res.status(400).json({ success: false, error: "Invalid vehicle id." });
    }
    const parsed = photoUploadSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ success: false, error: "A valid image file is required." });
    }

    await connectToDatabase();
    const vehicle = await Vehicle.findOne({ _id: req.params.id, deletedAt: null });
    if (!vehicle) {
      return res.status(404).json({ success: false, error: "Vehicle not found." });
    }

    // Strip a data: URI prefix if present ("data:image/png;base64,...").
    const raw = parsed.data.dataBase64.includes(",")
      ? parsed.data.dataBase64.slice(parsed.data.dataBase64.indexOf(",") + 1)
      : parsed.data.dataBase64;

    let buffer;
    try {
      buffer = Buffer.from(raw, "base64");
    } catch {
      return res.status(400).json({ success: false, error: "The uploaded file is not valid base64 data." });
    }

    let validated;
    try {
      validated = validateImageUpload({ buffer, declaredMimeType: parsed.data.mimeType });
    } catch (err) {
      if (err instanceof ImageValidationError) {
        return res.status(400).json({ success: false, error: err.message });
      }
      throw err;
    }

    const storage = getStorageProvider();
    const { url, key } = await storage.save({
      buffer,
      extension: validated.extension,
      folder: `vehicles/${vehicle._id}`,
    });

    const isFirstPhoto = vehicle.photos.length === 0;
    const nextOrder = vehicle.photos.reduce((max, p) => Math.max(max, p.order), -1) + 1;

    // A vehicle can have one primary/card image and one landing-page image.
    // The first uploaded image is the sensible default; later uploads use the
    // explicit visibility choices sent by the admin uploader.
    if (parsed.data.showOnLanding) {
      vehicle.photos.forEach((photo) => { photo.showOnLanding = false; });
    }
    vehicle.photos.push({
      url,
      key,
      order: nextOrder,
      isPrimary: isFirstPhoto,
      showInPortal: parsed.data.showInPortal,
      showOnLanding: parsed.data.showOnLanding,
    });
    await vehicle.save();

    await recordAuditLog({
      req,
      action: "VEHICLE_PHOTO_UPLOADED",
      entityType: "Vehicle",
      entityId: vehicle._id,
      metadata: { filename: parsed.data.filename },
    });

    const photo = vehicle.photos[vehicle.photos.length - 1];
    return res.status(201).json({
      success: true,
      photo: {
        id: photo._id.toString(),
        url: photo.url,
        order: photo.order,
        isPrimary: photo.isPrimary,
        showInPortal: photo.showInPortal !== false,
        showOnLanding: !!photo.showOnLanding,
      },
    });
  } catch (err) {
    console.error("admin vehicle photo upload error", err);
    return res.status(500).json({ success: false, error: "Failed to upload photo." });
  }
});

// --- Photos: delete ---
router.delete("/:id/photos/:photoId", async (req, res) => {
  try {
    if (!isValidId(req.params.id)) {
      return res.status(400).json({ success: false, error: "Invalid vehicle id." });
    }
    await connectToDatabase();
    const vehicle = await Vehicle.findOne({ _id: req.params.id, deletedAt: null });
    if (!vehicle) {
      return res.status(404).json({ success: false, error: "Vehicle not found." });
    }

    const photo = vehicle.photos.id(req.params.photoId);
    if (!photo) {
      return res.status(404).json({ success: false, error: "Photo not found." });
    }
    const wasPrimary = photo.isPrimary;
    const key = photo.key;
    photo.deleteOne();

    // If the deleted photo was primary, promote the next one (by order).
    if (wasPrimary && vehicle.photos.length > 0) {
      const next = [...vehicle.photos].sort((a, b) => a.order - b.order)[0];
      next.isPrimary = true;
    }

    await vehicle.save();

    const storage = getStorageProvider();
    await storage.delete(key);

    await recordAuditLog({
      req,
      action: "VEHICLE_PHOTO_DELETED",
      entityType: "Vehicle",
      entityId: vehicle._id,
      metadata: { photoId: req.params.photoId },
    });

    return res.json({ success: true });
  } catch (err) {
    console.error("admin vehicle photo delete error", err);
    return res.status(500).json({ success: false, error: "Failed to delete photo." });
  }
});


// --- Photos: landing-page selection / portal visibility ---
const visibilitySchema = z.object({
  showInPortal: z.boolean().optional(),
  showOnLanding: z.boolean().optional(),
});

router.patch("/:id/photos/:photoId/visibility", async (req, res) => {
  try {
    if (!isValidId(req.params.id)) {
      return res.status(400).json({ success: false, error: "Invalid vehicle id." });
    }
    const parsed = visibilitySchema.safeParse(req.body);
    if (!parsed.success || Object.keys(parsed.data).length === 0) {
      return res.status(400).json({ success: false, error: "Provide a visibility setting." });
    }

    await connectToDatabase();
    const vehicle = await Vehicle.findOne({ _id: req.params.id, deletedAt: null });
    if (!vehicle) return res.status(404).json({ success: false, error: "Vehicle not found." });

    const photo = vehicle.photos.id(req.params.photoId);
    if (!photo) return res.status(404).json({ success: false, error: "Photo not found." });

    if (parsed.data.showOnLanding === true) {
      // Landing page has one admin-selected hero/card image per vehicle.
      vehicle.photos.forEach((p) => { p.showOnLanding = p._id.toString() === req.params.photoId; });
      photo.isPrimary = true;
    } else if (parsed.data.showOnLanding === false) {
      photo.showOnLanding = false;
      // Never leave a vehicle without a landing image when other photos exist.
      if (vehicle.photos.length > 0 && !vehicle.photos.some((p) => p.showOnLanding)) {
        const fallback = [...vehicle.photos].sort((a, b) => a.order - b.order)[0];
        fallback.showOnLanding = true;
        fallback.isPrimary = true;
      }
    }

    if (typeof parsed.data.showInPortal === "boolean") photo.showInPortal = parsed.data.showInPortal;
    await vehicle.save();

    return res.json({
      success: true,
      photo: {
        id: photo._id.toString(),
        url: photo.url,
        order: photo.order,
        isPrimary: !!photo.isPrimary,
        showInPortal: photo.showInPortal !== false,
        showOnLanding: !!photo.showOnLanding,
      },
    });
  } catch (err) {
    console.error("admin vehicle photo visibility error", err);
    return res.status(500).json({ success: false, error: "Failed to update photo visibility." });
  }
});

// --- Photos: reorder ---
const reorderSchema = z.object({ order: z.array(objectId).min(1) });

router.patch("/:id/photos/reorder", async (req, res) => {
  try {
    if (!isValidId(req.params.id)) {
      return res.status(400).json({ success: false, error: "Invalid vehicle id." });
    }
    const parsed = reorderSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ success: false, error: "An ordered list of photo ids is required." });
    }

    await connectToDatabase();
    const vehicle = await Vehicle.findOne({ _id: req.params.id, deletedAt: null });
    if (!vehicle) {
      return res.status(404).json({ success: false, error: "Vehicle not found." });
    }

    const validIds = new Set(vehicle.photos.map((p) => p._id.toString()));
    const requestedIds = parsed.data.order;
    if (requestedIds.length !== validIds.size || !requestedIds.every((id) => validIds.has(id))) {
      return res.status(400).json({
        success: false,
        error: "The photo order must include every existing photo exactly once.",
      });
    }

    requestedIds.forEach((id, index) => {
      const photo = vehicle.photos.id(id);
      if (photo) photo.order = index;
    });
    await vehicle.save();

    await recordAuditLog({
      req,
      action: "VEHICLE_PHOTOS_REORDERED",
      entityType: "Vehicle",
      entityId: vehicle._id,
    });

    return res.json({ success: true });
  } catch (err) {
    console.error("admin vehicle photo reorder error", err);
    return res.status(500).json({ success: false, error: "Failed to reorder photos." });
  }
});

// --- Photos: set primary ---
router.patch("/:id/photos/:photoId/primary", async (req, res) => {
  try {
    if (!isValidId(req.params.id)) {
      return res.status(400).json({ success: false, error: "Invalid vehicle id." });
    }
    await connectToDatabase();
    const vehicle = await Vehicle.findOne({ _id: req.params.id, deletedAt: null });
    if (!vehicle) {
      return res.status(404).json({ success: false, error: "Vehicle not found." });
    }
    const target = vehicle.photos.id(req.params.photoId);
    if (!target) {
      return res.status(404).json({ success: false, error: "Photo not found." });
    }

    vehicle.photos.forEach((p) => {
      p.isPrimary = p._id.toString() === req.params.photoId;
    });
    await vehicle.save();

    await recordAuditLog({
      req,
      action: "VEHICLE_PHOTO_PRIMARY_CHANGED",
      entityType: "Vehicle",
      entityId: vehicle._id,
      metadata: { photoId: req.params.photoId },
    });

    return res.json({ success: true });
  } catch (err) {
    console.error("admin vehicle photo primary error", err);
    return res.status(500).json({ success: false, error: "Failed to set primary photo." });
  }
});

module.exports = router;
