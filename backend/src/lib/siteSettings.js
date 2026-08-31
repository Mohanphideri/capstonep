const { SiteSetting } = require("../models/SiteSetting");

const SETTINGS_KEY = "default";

/**
 * Ensures the singleton SiteSetting document exists (created with schema
 * defaults if missing). Safe to call repeatedly — never overwrites an
 * existing document, so admin edits are never clobbered by a restart.
 * Called once at server startup, same pattern as ensureAdminSeed().
 */
async function ensureSiteSettingsSeed() {
  const existing = await SiteSetting.findOne({ key: SETTINGS_KEY }).lean();
  if (existing) return existing;

  const created = await SiteSetting.create({ key: SETTINGS_KEY });
  console.log("[siteSettings] Created default SiteSetting document.");
  return created.toObject();
}

/**
 * Reads the current site settings. Falls back to schema defaults (via an
 * unsaved document) if the seed hasn't run yet, so callers never have to
 * null-check.
 */
async function getSiteSettings() {
  const doc = await SiteSetting.findOne({ key: SETTINGS_KEY }).lean();
  if (doc) return doc;
  return new SiteSetting({ key: SETTINGS_KEY }).toObject();
}

module.exports = { SETTINGS_KEY, ensureSiteSettingsSeed, getSiteSettings };
