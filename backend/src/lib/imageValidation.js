/**
 * Validates uploaded vehicle photos without depending on any third-party
 * image library — just a Buffer and the magic bytes every real image
 * format starts with. This is what "actual file content where
 * practical" (Phase 2 spec §10) means in practice: we don't trust the
 * client-reported MIME type or file extension, we check the bytes.
 */

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB

const ALLOWED_TYPES = {
  "image/jpeg": { extension: "jpg", check: isJpeg },
  "image/png": { extension: "png", check: isPng },
  "image/webp": { extension: "webp", check: isWebp },
};

function isJpeg(buf) {
  return buf.length > 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff;
}

function isPng(buf) {
  const sig = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  return buf.length > sig.length && sig.every((b, i) => buf[i] === b);
}

function isWebp(buf) {
  return (
    buf.length > 12 &&
    buf.slice(0, 4).toString("ascii") === "RIFF" &&
    buf.slice(8, 12).toString("ascii") === "WEBP"
  );
}

class ImageValidationError extends Error {
  constructor(message) {
    super(message);
    this.name = "ImageValidationError";
  }
}

/**
 * @param {{ buffer: Buffer, declaredMimeType: string }} params
 * @returns {{ extension: string, mimeType: string }}
 * @throws {ImageValidationError}
 */
function validateImageUpload({ buffer, declaredMimeType }) {
  if (!Buffer.isBuffer(buffer) || buffer.length === 0) {
    throw new ImageValidationError("The uploaded file is empty or unreadable.");
  }

  if (buffer.length > MAX_FILE_SIZE_BYTES) {
    throw new ImageValidationError("Images must be 5MB or smaller.");
  }

  const declared = ALLOWED_TYPES[declaredMimeType];
  if (!declared) {
    throw new ImageValidationError(
      "Unsupported file type. Upload a JPEG, PNG, or WEBP image."
    );
  }

  // The declared MIME type must also match what the file's own bytes say
  // it is — this is what catches a renamed .exe or an SVG with a spoofed
  // Content-Type, not just a client-side <input accept> hint.
  if (!declared.check(buffer)) {
    throw new ImageValidationError(
      "The file's content doesn't match a valid image of the declared type."
    );
  }

  return { extension: declared.extension, mimeType: declaredMimeType };
}

module.exports = { validateImageUpload, ImageValidationError, MAX_FILE_SIZE_BYTES, ALLOWED_TYPES };
