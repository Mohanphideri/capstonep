const { v2: cloudinary } = require("cloudinary");
const { StorageProvider } = require("./StorageProvider");
const { env } = require("../../env");

let configured = false;
function ensureConfigured() {
  if (configured) return;
  cloudinary.config({
    cloud_name: env.cloudinaryCloudName,
    api_key: env.cloudinaryApiKey,
    api_secret: env.cloudinaryApiSecret,
    secure: true,
  });
  configured = true;
}

/**
 * Cloudinary-backed storage provider. Same interface as
 * LocalStorageProvider (see StorageProvider.js), so nothing in
 * routes/adminVehicles.js needs to change to use this — just set
 * STORAGE_PROVIDER=CLOUDINARY (see env.js / .env.example).
 *
 * Unlike local disk storage, files uploaded here survive redeploys and
 * are served directly from Cloudinary's CDN, so `key` here is the
 * Cloudinary `public_id` (used to delete later) rather than a file path.
 */
class CloudinaryStorageProvider extends StorageProvider {
  async save({ buffer, folder }) {
    ensureConfigured();

    const cloudFolder = `${env.cloudinaryFolderPrefix}/${folder}`;

    const result = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          folder: cloudFolder,
          resource_type: "image",
          // Auto-format/quality keeps delivered images small without
          // us having to manually resize on upload.
          transformation: [{ quality: "auto", fetch_format: "auto" }],
        },
        (err, res) => (err ? reject(err) : resolve(res))
      );
      stream.end(buffer);
    });

    return { url: result.secure_url, key: result.public_id };
  }

  async delete(key) {
    if (!key) return;
    // Best-effort cleanup, same contract as LocalStorageProvider — a
    // failed delete (already removed, bad key, etc.) must never throw.
    ensureConfigured();
    await cloudinary.uploader.destroy(key).catch(() => {});
  }
}

module.exports = { CloudinaryStorageProvider };
