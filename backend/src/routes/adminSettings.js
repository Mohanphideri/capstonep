const express = require("express");
const { z } = require("zod");
const { randomUUID } = require("crypto");
const { connectToDatabase } = require("../lib/mongodb");
const { SiteSetting } = require("../models/SiteSetting");
const { VehicleCategory } = require("../models/VehicleCategory");
const { SETTINGS_KEY, ensureSiteSettingsSeed, getSiteSettings } = require("../lib/siteSettings");
const { requireSuperAdmin } = require("../middleware/requireAuth");
const { recordAuditLog } = require("../lib/auditLog");
const { getStorageProvider } = require("../lib/storage/StorageService");
const { validateImageUpload, ImageValidationError } = require("../lib/imageValidation");

const router = express.Router();

// Business/site configuration is SUPER_ADMIN-only, same as every other
// admin surface — there is no staff role that can touch this.
router.use(requireSuperAdmin);

function serialize(s) {
  return {
    businessName: s.businessName,
    address: s.address,
    phone: s.phone,
    email: s.email,
    whatsappNumber: s.whatsappNumber,
    defaultWhatsappMessage: s.defaultWhatsappMessage,
    bookingWhatsappMessage: s.bookingWhatsappMessage,
    logoUrl: s.logoUrl,
    signatureUrl: s.signatureUrl,
    authorizedSignatory: {
      fullName: s.authorizedSignatory?.fullName || "",
      designation: s.authorizedSignatory?.designation || "",
      department: s.authorizedSignatory?.department || "",
      email: s.authorizedSignatory?.email || "",
      phone: s.authorizedSignatory?.phone || "",
      active: s.authorizedSignatory?.active !== false,
      isDefault: s.authorizedSignatory?.isDefault !== false,
    },
    banner: s.banner ? {
      id: s.banner.id,
      enabled: !!s.banner.enabled,
      imageUrl: s.banner.imageUrl,
      title: s.banner.title || "",
      message: s.banner.message || "",
      buttonText: s.banner.buttonText || "",
      buttonUrl: s.banner.buttonUrl || "",
      altText: s.banner.altText || "",
    } : null,
    currency: s.currency,
    gst: s.gst,
    bookingSettings: s.bookingSettings,
    cancellationPolicyText: s.cancellationPolicyText,
    refundPolicyText: s.refundPolicyText,
    termsText: s.termsText,
    privacyPolicyText: s.privacyPolicyText,
    bookingPolicyText: s.bookingPolicyText,
    cookiePolicyText: s.cookiePolicyText,
    mapEmbedUrl: s.mapEmbedUrl || "",
    whyUs: {
      title: s.whyUs?.title || "",
      intro: s.whyUs?.intro || "",
      imageUrl: s.whyUs?.imageUrl || null,
      items: Array.isArray(s.whyUs?.items) && s.whyUs.items.length ? s.whyUs.items.map((x) => ({ title: x.title || "", body: x.body || "" })) : [
        { title: "Reliable fleet", body: "Well-presented vehicles for local, outstation and group journeys." },
        { title: "Simple trip planning", body: "Tell us your route and requirements and we help match the right vehicle." },
        { title: "Human support", body: "Get practical help before, during and after your journey." },
      ],
    },
    fleetGallery: Array.isArray(s.fleetGallery) ? s.fleetGallery.map((x) => ({ id: x.id, imageUrl: x.imageUrl, categoryId: x.categoryId?.toString?.() || x.categoryId || null, categoryName: x.categoryName || "Other", altText: x.altText || "Kuwarji Travels fleet" })) : [],
    socialLinks: s.socialLinks,
    updatedAt: s.updatedAt,
  };
}

// --- Read current settings ---
router.get("/", async (req, res) => {
  try {
    await connectToDatabase();
    const settings = await ensureSiteSettingsSeed().then(() => getSiteSettings());
    return res.json({ success: true, settings: serialize(settings) });
  } catch (err) {
    console.error("admin settings get error", err);
    return res.status(500).json({ success: false, error: "Failed to load settings." });
  }
});

const gstSchema = z.object({
  number: z.string().trim().max(30).nullable().optional(),
  applicable: z.boolean().optional(),
});

const bookingSettingsSchema = z.object({
  minAdvanceHours: z.number().min(0).max(720).optional(),
  maxAdvanceDays: z.number().min(1).max(730).optional(),
  holdDurationMinutes: z.number().min(0).max(1440).optional(),
});

const bannerSchema = z.object({
  id: z.string().trim().max(200).optional(),
  enabled: z.boolean().optional(),
  imageUrl: z.string().trim().max(2000).nullable().optional(),
  title: z.string().trim().max(200).optional(),
  message: z.string().trim().max(500).optional(),
  buttonText: z.string().trim().max(100).optional(),
  buttonUrl: z.string().trim().max(1000).optional(),
  altText: z.string().trim().max(300).optional(),
});

const socialLinksSchema = z.object({
  facebook: z.string().trim().max(300).nullable().optional(),
  instagram: z.string().trim().max(300).nullable().optional(),
  twitter: z.string().trim().max(300).nullable().optional(),
  youtube: z.string().trim().max(300).nullable().optional(),
});

// Every field optional — this is always a partial update against the
// singleton document, never a full replace (so a client only sending
// the fields it edited can never wipe the rest).
const updateSchema = z.object({
  businessName: z.string().trim().min(1).max(150).optional(),
  address: z.string().trim().max(500).optional(),
  phone: z.string().trim().max(30).optional(),
  email: z.string().trim().email().max(150).optional().or(z.literal("")),
  whatsappNumber: z.string().trim().max(30).optional(),
  defaultWhatsappMessage: z.string().trim().max(500).optional(),
  bookingWhatsappMessage: z.string().trim().max(500).optional(),
  logoUrl: z.string().trim().max(1000).nullable().optional(),
  signatureUrl: z.string().trim().max(1000).nullable().optional(),
  signatureKey: z.string().trim().max(1000).nullable().optional(),
  authorizedSignatory: z.object({
    fullName: z.string().trim().max(150).optional(),
    designation: z.string().trim().max(150).optional(),
    department: z.string().trim().max(150).optional(),
    email: z.string().trim().email().max(150).optional().or(z.literal("")),
    phone: z.string().trim().max(30).optional(),
    active: z.boolean().optional(),
    isDefault: z.boolean().optional(),
  }).optional(),
  banner: bannerSchema.optional(),
  currency: z.string().trim().max(10).optional(),
  gst: gstSchema.optional(),
  bookingSettings: bookingSettingsSchema.optional(),
  mapEmbedUrl: z.string().trim().max(2000).optional(),
  whyUs: z.object({
    title: z.string().trim().max(200).optional(),
    intro: z.string().trim().max(1000).optional(),
    items: z.array(z.object({ title: z.string().trim().max(200), body: z.string().trim().max(2000) })).max(12).optional(),
  }).optional(),
});


const signatureUploadSchema = z.object({
  filename: z.string().trim().max(200).optional().default("signature"),
  mimeType: z.string().trim().min(1),
  dataBase64: z.string().min(1),
});

router.post("/signature", async (req, res) => {
  try {
    const parsed = signatureUploadSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ success: false, error: "A valid signature image is required." });
    const raw = parsed.data.dataBase64.includes(",") ? parsed.data.dataBase64.slice(parsed.data.dataBase64.indexOf(",") + 1) : parsed.data.dataBase64;
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
    const stored = await storage.save({ buffer, extension: validated.extension, folder: "settings" });
    const oldKey = settings.signatureKey;
    settings.signatureUrl = stored.url;
    settings.signatureKey = stored.key;
    await settings.save();
    if (oldKey && oldKey !== stored.key) await storage.delete(oldKey);
    await recordAuditLog({ req, action: "SITE_SIGNATURE_UPLOADED", entityType: "SiteSetting", entityId: settings._id, metadata: { filename: parsed.data.filename } });
    return res.json({ success: true, signatureUrl: settings.signatureUrl });
  } catch (err) {
    console.error("admin signature upload error", err);
    return res.status(500).json({ success: false, error: "Failed to upload signature." });
  }
});

router.delete("/signature", async (req, res) => {
  try {
    await connectToDatabase();
    await ensureSiteSettingsSeed();
    const settings = await SiteSetting.findOne({ key: SETTINGS_KEY });
    const oldKey = settings.signatureKey;
    settings.signatureUrl = null;
    settings.signatureKey = null;
    await settings.save();
    if (oldKey) await getStorageProvider().delete(oldKey);
    await recordAuditLog({ req, action: "SITE_SIGNATURE_REMOVED", entityType: "SiteSetting", entityId: settings._id });
    return res.json({ success: true });
  } catch (err) {
    console.error("admin signature delete error", err);
    return res.status(500).json({ success: false, error: "Failed to remove signature." });
  }
});


const contentImageUploadSchema = z.object({
  filename: z.string().trim().max(200).optional().default("image"),
  mimeType: z.enum(["image/png", "image/jpeg", "image/webp"]),
  dataBase64: z.string().min(1),
  altText: z.string().trim().max(300).optional().default("Kuwarji Travels fleet"),
  categoryId: z.string().trim().nullable().optional(),
});

async function decodeImage(body) {
  const parsed = contentImageUploadSchema.safeParse(body);
  if (!parsed.success) throw new ImageValidationError("A valid PNG, JPG, or WEBP image is required.");
  const raw = parsed.data.dataBase64.includes(",") ? parsed.data.dataBase64.slice(parsed.data.dataBase64.indexOf(",") + 1) : parsed.data.dataBase64;
  const buffer = Buffer.from(raw, "base64");
  const validated = validateImageUpload({ buffer, declaredMimeType: parsed.data.mimeType });
  return { parsed: parsed.data, buffer, validated };
}

router.post("/why-us-image", async (req, res) => {
  try {
    const { parsed, buffer, validated } = await decodeImage(req.body);
    await connectToDatabase(); await ensureSiteSettingsSeed();
    const settings = await SiteSetting.findOne({ key: SETTINGS_KEY });
    const storage = getStorageProvider();
    const stored = await storage.save({ buffer, extension: validated.extension, folder: "why-us" });
    const oldKey = settings.whyUs?.imageKey;
    settings.whyUs = { ...(settings.whyUs?.toObject ? settings.whyUs.toObject() : settings.whyUs || {}), imageUrl: stored.url, imageKey: stored.key };
    await settings.save();
    if (oldKey && oldKey !== stored.key) await storage.delete(oldKey);
    await recordAuditLog({ req, action: "WHY_US_IMAGE_UPLOADED", entityType: "SiteSetting", entityId: settings._id, metadata: { filename: parsed.filename } });
    return res.json({ success: true, imageUrl: stored.url, settings: serialize(settings) });
  } catch (err) {
    console.error("why us image upload error", err);
    return res.status(400).json({ success: false, error: err.message || "Failed to upload Why Us image." });
  }
});

router.delete("/why-us-image", async (req, res) => {
  try {
    await connectToDatabase(); await ensureSiteSettingsSeed();
    const settings = await SiteSetting.findOne({ key: SETTINGS_KEY });
    const oldKey = settings.whyUs?.imageKey;
    settings.whyUs = { ...(settings.whyUs?.toObject ? settings.whyUs.toObject() : settings.whyUs || {}), imageUrl: null, imageKey: null };
    await settings.save();
    if (oldKey) await getStorageProvider().delete(oldKey);
    return res.json({ success: true });
  } catch (err) { return res.status(500).json({ success: false, error: "Failed to remove Why Us image." }); }
});

router.post("/fleet-gallery", async (req, res) => {
  try {
    const { parsed, buffer, validated } = await decodeImage(req.body);
    await connectToDatabase(); await ensureSiteSettingsSeed();
    const settings = await SiteSetting.findOne({ key: SETTINGS_KEY });
    if ((settings.fleetGallery || []).length >= 60) return res.status(400).json({ success: false, error: "Fleet gallery can contain up to 60 photos." });
    let category = null;
    if (parsed.categoryId) {
      category = await VehicleCategory.findById(parsed.categoryId).select("name").lean();
      if (!category) return res.status(400).json({ success: false, error: "Selected fleet category does not exist." });
    }
    const storage = getStorageProvider();
    const stored = await storage.save({ buffer, extension: validated.extension, folder: "fleet-gallery" });
    const item = { id: randomUUID(), imageUrl: stored.url, imageKey: stored.key, categoryId: category?._id || null, categoryName: category?.name || "Other", altText: parsed.altText || `${category?.name || "Fleet"} photo` };
    settings.fleetGallery = [...(settings.fleetGallery || []), item];
    await settings.save();
    return res.json({ success: true, item: { id: item.id, imageUrl: item.imageUrl, categoryId: item.categoryId?.toString?.() || null, categoryName: item.categoryName, altText: item.altText } });
  } catch (err) {
    console.error("fleet gallery upload error", err);
    return res.status(400).json({ success: false, error: err.message || "Failed to upload fleet photo." });
  }
});

router.delete("/fleet-gallery/:id", async (req, res) => {
  try {
    await connectToDatabase(); await ensureSiteSettingsSeed();
    const settings = await SiteSetting.findOne({ key: SETTINGS_KEY });
    const item = (settings.fleetGallery || []).find((x) => x.id === req.params.id);
    if (!item) return res.status(404).json({ success: false, error: "Fleet photo not found." });
    settings.fleetGallery = (settings.fleetGallery || []).filter((x) => x.id !== req.params.id);
    await settings.save();
    if (item.imageKey) await getStorageProvider().delete(item.imageKey);
    return res.json({ success: true });
  } catch (err) { return res.status(500).json({ success: false, error: "Failed to remove fleet photo." }); }
});

// --- Update settings (partial) ---
router.patch("/", async (req, res) => {
  try {
    const parsed = updateSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        error: parsed.error.issues[0]?.message ?? "Invalid settings.",
      });
    }

    await connectToDatabase();
    await ensureSiteSettingsSeed();

    // Nested objects (gst, bookingSettings, socialLinks) are merged
    // field-by-field with $set on dotted paths, so patching e.g. just
    // gst.applicable never clobbers gst.number.
    const set = {};
    for (const [key, value] of Object.entries(parsed.data)) {
      if (value && typeof value === "object" && !Array.isArray(value)) {
        for (const [subKey, subValue] of Object.entries(value)) {
          set[`${key}.${subKey}`] = subValue;
        }
      } else {
        set[key] = value;
      }
    }

    const settings = await SiteSetting.findOneAndUpdate(
      { key: SETTINGS_KEY },
      { $set: set },
      { new: true }
    ).lean();

    await recordAuditLog({
      req,
      action: "SITE_SETTINGS_UPDATED",
      entityType: "SiteSetting",
      entityId: settings._id,
      metadata: { fields: Object.keys(parsed.data) },
    });

    return res.json({ success: true, settings: serialize(settings) });
  } catch (err) {
    console.error("admin settings update error", err);
    return res.status(500).json({ success: false, error: "Failed to update settings." });
  }
});

module.exports = router;
