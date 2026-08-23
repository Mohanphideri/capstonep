const mongoose = require("mongoose");

// Singleton document (key: "default") — every business-facing value that
// used to risk being hard-coded in the frontend/backend lives here
// instead. Secrets (API keys) stay in env vars; this is public/business
// configuration only. Read/write via ../lib/siteSettings.js, never
// directly, so there's one place that knows the singleton key + defaults.
const SiteSettingSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true, default: "default" },

    businessName: { type: String, default: "Kuwarji Travels" },
    address: { type: String, default: "" },
    phone: { type: String, default: "" },
    email: { type: String, default: "" },
    whatsappNumber: { type: String, default: "" },
    defaultWhatsappMessage: { type: String, default: "" },
    bookingWhatsappMessage: { type: String, default: "" },
    logoUrl: { type: String, default: null },
    signatureUrl: { type: String, default: null },
    signatureKey: { type: String, default: null },
    authorizedSignatory: {
      fullName: { type: String, default: "" },
      designation: { type: String, default: "" },
      department: { type: String, default: "" },
      email: { type: String, default: "" },
      phone: { type: String, default: "" },
      active: { type: Boolean, default: true },
      isDefault: { type: Boolean, default: true },
    },

    banner: {
      id: { type: String, default: null },
      enabled: { type: Boolean, default: false },
      imageUrl: { type: String, default: null },
      imageKey: { type: String, default: null },
      title: { type: String, default: "" },
      message: { type: String, default: "" },
      buttonText: { type: String, default: "" },
      buttonUrl: { type: String, default: "" },
      altText: { type: String, default: "" },
    },

    currency: { type: String, default: "INR" },
    gst: {
      number: { type: String, default: null },
      applicable: { type: Boolean, default: false },
    },

    bookingSettings: {
      minAdvanceHours: { type: Number, default: 0 },
      maxAdvanceDays: { type: Number, default: 180 },
      holdDurationMinutes: { type: Number, default: 10 },
    },

    cancellationPolicyText: { type: String, default: "" },
    refundPolicyText: { type: String, default: "" },
    termsText: { type: String, default: "" },
    privacyPolicyText: { type: String, default: "" },
    bookingPolicyText: { type: String, default: "" },
    cookiePolicyText: { type: String, default: "" },
    mapEmbedUrl: { type: String, default: "" },

    whyUs: {
      title: { type: String, default: "Why travellers choose Kuwarji Travels" },
      intro: { type: String, default: "Reliable vehicles, clear communication and support from planning to return." },
      imageUrl: { type: String, default: null },
      imageKey: { type: String, default: null },
      items: {
        type: [{
          title: { type: String, default: "" },
          body: { type: String, default: "" },
        }],
        default: [
          { title: "Reliable fleet", body: "Well-presented vehicles for local, outstation and group journeys." },
          { title: "Simple trip planning", body: "Tell us your route and requirements and we help match the right vehicle." },
          { title: "Human support", body: "Get practical help before, during and after your journey." },
        ],
      },
    },
    fleetGallery: {
      type: [{
        id: { type: String, required: true },
        imageUrl: { type: String, required: true },
        imageKey: { type: String, default: null },
        categoryId: { type: mongoose.Schema.Types.ObjectId, ref: "VehicleCategory", default: null },
        categoryName: { type: String, default: "Other" },
        altText: { type: String, default: "Kuwarji Travels fleet" },
      }],
      default: [],
    },

    socialLinks: {
      facebook: { type: String, default: null },
      instagram: { type: String, default: null },
      twitter: { type: String, default: null },
      youtube: { type: String, default: null },
    },
  },
  { timestamps: true }
);

const SiteSetting = mongoose.models.SiteSetting || mongoose.model("SiteSetting", SiteSettingSchema);

module.exports = { SiteSetting };
