const { LocalStorageProvider } = require("./LocalStorageProvider");
const { CloudinaryStorageProvider } = require("./CloudinaryStorageProvider");
const { env } = require("../../env");

// LOCAL writes to backend/uploads/ on disk (development/persistent-disk only).
// CLOUDINARY uploads to Cloudinary instead — set STORAGE_PROVIDER=CLOUDINARY
// and the CLOUDINARY_* vars in .env. Nothing in routes/adminVehicles.js
// needs to change either way, since both implement the same
// StorageProvider interface. Mirrors lib/payments/PaymentService.js.
//
// Providers are built lazily (not at module load) so that a LOCAL-only
// deployment never has to set CLOUDINARY_* env vars just because the
// Cloudinary provider class exists.
const builders = {
  LOCAL: () => new LocalStorageProvider(),
  CLOUDINARY: () => new CloudinaryStorageProvider(),
};

const instances = {};

function getStorageProvider(mode = env.storageProvider) {
  const key = String(mode || env.storageProvider).toUpperCase();
  if (env.nodeEnv === "production" && key === "LOCAL" && process.env.ALLOW_EPHEMERAL_LOCAL_STORAGE !== "true") {
    throw new Error("LOCAL storage is disabled in production. Set STORAGE_PROVIDER=CLOUDINARY or explicitly configure persistent storage.");
  }
  const build = builders[key];
  if (!build) {
    throw new Error(`Unknown storage provider "${mode}". Valid options: ${Object.keys(builders).join(", ")}.`);
  }
  if (!instances[key]) {
    instances[key] = build();
  }
  return instances[key];
}

module.exports = { getStorageProvider };
