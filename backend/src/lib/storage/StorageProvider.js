/**
 * @typedef {Object} StoredFile
 * @property {string} url - Publicly reachable URL for the stored file.
 * @property {string} key - Provider-specific key/path, used to delete later.
 */

/**
 * Contract every storage provider implements. Business logic (vehicle
 * photo management in routes/adminVehicles.js) depends only on this
 * interface via StorageService, never on a specific provider — so
 * swapping in S3/Cloudinary later means implementing this same shape,
 * with zero changes to vehicle photo logic. Mirrors the existing
 * lib/payments/PaymentProvider.js pattern.
 *
 * @interface
 */
class StorageProvider {
  /**
   * @param {{ buffer: Buffer, mimeType: string, extension: string, folder: string }} params
   * @returns {Promise<StoredFile>}
   */
  // eslint-disable-next-line no-unused-vars
  async save(params) {
    throw new Error("Not implemented");
  }

  /**
   * @param {string} key
   * @returns {Promise<void>}
   */
  // eslint-disable-next-line no-unused-vars
  async delete(key) {
    throw new Error("Not implemented");
  }
}

module.exports = { StorageProvider };
