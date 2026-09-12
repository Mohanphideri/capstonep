const express = require("express");
const { z } = require("zod");
const { randomUUID } = require("crypto");
const { connectToDatabase } = require("../lib/mongodb");
const { SiteSetting } = require("../models/SiteSetting");
const { SETTINGS_KEY, ensureSiteSettingsSeed } = require("../lib/siteSettings");
const { requireSuperAdmin } = require("../middleware/requireAuth");
const { recordAuditLog } = require("../lib/auditLog");
const { getStorageProvider } = require("../lib/storage/StorageService");
const { validateImageUpload, ImageValidationError } = require("../lib/imageValidation");

const router = express.Router();

function serializeBanner(settings) {
  const b = settings?.banner;
  if (!b) return null;
  return {
    id: b.id,
    enabled: !!b.enabled,
    imageUrl: b.imageUrl,
    title: b.title || "",
    message: b.message || "",
    buttonText: b.buttonText || "",
    buttonUrl: b.buttonUrl || "",
    altText: b.altText || "",
  };
}

// Public read: only non-sensitive banner fields are exposed.
router.get("/", async (req, res) => {
  try {
    await connectToDatabase();
    await ensureSiteSettingsSeed();
    const settings = await SiteSetting.findOne({ key: SETTINGS_KEY }).lean();
    return res.json({ success: true, banner: serializeBanner(settings) });
  } catch (err) {
    console.error("public banner get error", err);
    return res.status(500).json({ success: false, error: "Failed to load banner." });
  }
});

const uploadSchema = z.object({
  filename: z.string().trim().max(200).optional().default("banner"),
  mimeType: z.enum(["image/png", "image/jpeg", "image/webp"]),
  dataBase64: z.string().min(1),
});

router.post("/", requireSuperAdmin, async (req, res) => {
  try {
    const parsed = uploadSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ success: false, error: "A valid PNG, JPG, or WEBP banner image is required." });
    const raw = parsed.data.dataBase64.includes(",")
      ? parsed.data.dataBase64.slice(parsed.data.dataBase64.indexOf(",") + 1)
      : parsed.data.dataBase64;
    const buffer = Buffer.from(raw, "base64");
    let validated;
    try {
      validated = validateImageUpload({ buffer, declaredMimeType: parsed.data.mimeType });
    } catch (err) {
      if (err instanceof ImageValidationError) return res.status(400).json({ success: false, error: err.message });
      throw err;
    }

    await connectToDatabase();
    await ensureSiteSettingsSeed();
    const settings = await SiteSetting.findOne({ key: SETTINGS_KEY });
    const storage = getStorageProvider();
    const stored = await storage.save({ buffer, extension: validated.extension, folder: "banners" });
    const oldKey = settings.banner?.imageKey;

    settings.banner = {
      ...(settings.banner?.toObject ? settings.banner.toObject() : settings.banner || {}),
      id: randomUUID(),
      enabled: true,
      imageUrl: stored.url,
      imageKey: stored.key,
    };
    await settings.save();
    if (oldKey && oldKey !== stored.key) await storage.delete(oldKey);

    await recordAuditLog({
      req,
      action: "SITE_BANNER_UPLOADED",
      entityType: "SiteSetting",
      entityId: settings._id,
      metadata: { filename: parsed.data.filename },
    });

    return res.json({ success: true, banner: serializeBanner(settings) });
  } catch (err) {
    console.error("admin banner upload error", err);
    return res.status(500).json({ success: false, error: "Failed to upload banner." });
  }
});

router.delete("/", requireSuperAdmin, async (req, res) => {
  try {
    await connectToDatabase();
    await ensureSiteSettingsSeed();
    const settings = await SiteSetting.findOne({ key: SETTINGS_KEY });
    const oldKey = settings.banner?.imageKey;
    settings.banner = {
      id: null,
      enabled: false,
      imageUrl: null,
      imageKey: null,
      title: "",
      message: "",
      buttonText: "",
      buttonUrl: "",
      altText: "",
    };
    await settings.save();
    if (oldKey) await getStorageProvider().delete(oldKey);
    await recordAuditLog({ req, action: "SITE_BANNER_REMOVED", entityType: "SiteSetting", entityId: settings._id });
    return res.json({ success: true });
  } catch (err) {
    console.error("admin banner delete error", err);
    return res.status(500).json({ success: false, error: "Failed to remove banner." });
  }
});


module.exports = router;
