const express = require("express");
const { connectToDatabase } = require("../lib/mongodb");
const { SiteSetting } = require("../models/SiteSetting");
const { SETTINGS_KEY, ensureSiteSettingsSeed } = require("../lib/siteSettings");

const router = express.Router();
router.get("/", async (req, res) => {
  try {
    await connectToDatabase();
    await ensureSiteSettingsSeed();
    const s = await SiteSetting.findOne({ key: SETTINGS_KEY }).lean();
    return res.json({ success: true, settings: {
      businessName: s.businessName,
      address: s.address,
      phone: s.phone,
      email: s.email,
      whatsappNumber: s.whatsappNumber,
      mapEmbedUrl: s.mapEmbedUrl || "",
      whyUs: {
        title: s.whyUs?.title || "Why travellers choose Kuwarji Travels",
        intro: s.whyUs?.intro || "Reliable vehicles, clear communication and support from planning to return.",
        imageUrl: s.whyUs?.imageUrl || null,
        items: Array.isArray(s.whyUs?.items) ? s.whyUs.items : [],
      },
      fleetGallery: Array.isArray(s.fleetGallery) ? s.fleetGallery.map((x) => ({ id: x.id, imageUrl: x.imageUrl, altText: x.altText || "Kuwarji Travels fleet" })) : [],
      privacyPolicyText: s.privacyPolicyText || "",
      cookiePolicyText: s.cookiePolicyText || "",
      termsText: s.termsText || "",
      cancellationPolicyText: s.cancellationPolicyText || "",
      refundPolicyText: s.refundPolicyText || "",
      bookingPolicyText: s.bookingPolicyText || "",
      socialLinks: s.socialLinks || {},
    }});
  } catch (err) {
    console.error("site content get error", err);
    return res.status(500).json({ success: false, error: "Failed to load site content." });
  }
});
module.exports = router;
