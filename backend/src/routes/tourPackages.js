const express = require("express");
const mongoose = require("mongoose");
const { z } = require("zod");
const { connectToDatabase } = require("../lib/mongodb");
const { TourPackage } = require("../models/TourPackage");
const { requireSuperAdmin } = require("../middleware/requireAuth");
const { recordAuditLog } = require("../lib/auditLog");

const router = express.Router();
const isId = (v) => mongoose.Types.ObjectId.isValid(v);
const slugify = (v) => v.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 120);

function serialize(p) {
  return { id: p._id.toString(), title: p.title, slug: p.slug, destination: p.destination, durationDays: p.durationDays, priceFrom: p.priceFrom, description: p.description, itinerary: p.itinerary || [], inclusions: p.inclusions || [], exclusions: p.exclusions || [], imageUrl: p.imageUrl || "", isActive: p.isActive, featured: p.featured, priority: p.priority, createdAt: p.createdAt, updatedAt: p.updatedAt };
}

const writeSchema = z.object({
  title: z.string().trim().min(2).max(160),
  destination: z.string().trim().min(2).max(160),
  durationDays: z.coerce.number().int().min(1).max(90),
  priceFrom: z.coerce.number().min(0).max(100000000).default(0),
  description: z.string().trim().max(5000).default(""),
  itinerary: z.array(z.string().trim().min(1).max(500)).max(60).default([]),
  inclusions: z.array(z.string().trim().min(1).max(300)).max(60).default([]),
  exclusions: z.array(z.string().trim().min(1).max(300)).max(60).default([]),
  imageUrl: z.string().trim().max(1000).default(""),
  isActive: z.boolean().default(true),
  featured: z.boolean().default(false),
  priority: z.coerce.number().int().min(-1000).max(1000).default(0),
});

// Admin routes
const admin = express.Router();
admin.use(requireSuperAdmin);
admin.get("/", async (req, res) => {
  try {
    await connectToDatabase();
    const packages = await TourPackage.find({}).sort({ priority: -1, createdAt: -1 }).lean();
    res.json({ success: true, packages: packages.map(serialize) });
  } catch (err) { res.status(500).json({ success: false, error: "Failed to load tour packages." }); }
});
admin.post("/", async (req, res) => {
  try {
    const parsed = writeSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ success: false, error: parsed.error.issues[0]?.message || "Invalid package." });
    await connectToDatabase();
    let slug = slugify(parsed.data.title);
    const exists = await TourPackage.findOne({ slug });
    if (exists) slug = `${slug}-${Date.now().toString(36)}`;
    const p = await TourPackage.create({ ...parsed.data, slug });
    await recordAuditLog(req, { action: "CREATE", entityType: "TourPackage", entityId: p._id.toString(), metadata: { title: p.title } }).catch(() => {});
    res.status(201).json({ success: true, package: serialize(p) });
  } catch (err) { console.error(err); res.status(500).json({ success: false, error: "Failed to create tour package." }); }
});
admin.patch("/:id", async (req, res) => {
  try {
    if (!isId(req.params.id)) return res.status(400).json({ success: false, error: "Invalid package id." });
    const parsed = writeSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ success: false, error: parsed.error.issues[0]?.message || "Invalid package." });
    await connectToDatabase();
    const p = await TourPackage.findByIdAndUpdate(req.params.id, { ...parsed.data, slug: slugify(parsed.data.title) }, { new: true, runValidators: true }).lean();
    if (!p) return res.status(404).json({ success: false, error: "Tour package not found." });
    res.json({ success: true, package: serialize(p) });
  } catch (err) { console.error(err); res.status(500).json({ success: false, error: "Failed to update tour package." }); }
});
admin.delete("/:id", async (req, res) => {
  try {
    if (!isId(req.params.id)) return res.status(400).json({ success: false, error: "Invalid package id." });
    await connectToDatabase();
    const p = await TourPackage.findByIdAndDelete(req.params.id);
    if (!p) return res.status(404).json({ success: false, error: "Tour package not found." });
    res.json({ success: true });
  } catch (err) { res.status(500).json({ success: false, error: "Failed to delete tour package." }); }
});


router.use("/admin", admin);

// Public routes
router.get("/", async (req, res) => {
  try {
    await connectToDatabase();
    const filter = req.query.all === "true" ? {} : { isActive: true };
    if (req.query.search) {
      const term = req.query.search.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      if (term) {
        const re = new RegExp(term, "i");
        filter.$or = [{ title: re }, { destination: re }, { description: re }];
      }
    }
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 50));
    const packages = await TourPackage.find(filter).sort({ featured: -1, priority: -1, createdAt: -1 }).limit(limit).lean();
    res.json({ success: true, packages: packages.map(serialize) });
  } catch (err) {
    console.error("tour package list error", err);
    res.status(500).json({ success: false, error: "Failed to load tour packages." });
  }
});

router.get("/:idOrSlug", async (req, res) => {
  try {
    await connectToDatabase();
    const filter = isId(req.params.idOrSlug) ? { _id: req.params.idOrSlug } : { slug: req.params.idOrSlug };
    const p = await TourPackage.findOne({ ...filter, isActive: true }).lean();
    if (!p) return res.status(404).json({ success: false, error: "Tour package not found." });
    res.json({ success: true, package: serialize(p) });
  } catch (err) {
    console.error("tour package detail error", err);
    res.status(500).json({ success: false, error: "Failed to load tour package." });
  }
});


module.exports = router;