const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { StorageProvider } = require("./StorageProvider");
const { env } = require("../../env");

// backend/uploads — served statically by server.js at /uploads. This
// directory is created lazily so a fresh checkout doesn't need it
// committed (uploads are runtime data, not source).
const UPLOAD_ROOT = path.join(__dirname, "..", "..", "..", "uploads");

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

/**
 * Default storage provider: writes files to local disk under
 * backend/uploads/. Works out of the box with zero external
 * configuration, which is why it's the default — see StorageService.js
 * for how to swap in a different provider later (S3, Cloudinary, etc.)
 * without touching any calling code.
 *
 * NOTE: on a host with an ephemeral filesystem (e.g. most PaaS deploys
 * that don't mount a persistent disk), files written here do not
 * survive a redeploy. That's a deployment/infra concern, not a code
 * concern — the abstraction here is what lets that be swapped later.
 */
class LocalStorageProvider extends StorageProvider {
  async save({ buffer, extension, folder }) {
    const dir = path.join(UPLOAD_ROOT, folder);
    ensureDir(dir);

    const filename = `${Date.now()}-${crypto.randomBytes(8).toString("hex")}.${extension}`;
    const filePath = path.join(dir, filename);
    await fs.promises.writeFile(filePath, buffer);

    const key = `${folder}/${filename}`;
    return { url: `${env.backendPublicUrl}/uploads/${key}`, key };
  }

  async delete(key) {
    if (!key) return;
    const filePath = path.join(UPLOAD_ROOT, key);
    // Never let a missing file (already deleted, bad key, etc.) throw —
    // deletion is best-effort cleanup, not a critical path.
    await fs.promises.unlink(filePath).catch(() => {});
  }
}

module.exports = { LocalStorageProvider, UPLOAD_ROOT };
