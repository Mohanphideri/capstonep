const { LocalStorageProvider } = require("./LocalStorageProvider");
const { CloudinaryStorageProvider } = require("./CloudinaryStorageProvider");
const { env } = require("../../env");

// LOCAL writes to backend/uploads/ on disk (default, zero config).
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
  const key = String(mode || "LOCAL").toUpperCase();
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
