const test = require("node:test");
const assert = require("node:assert/strict");
const { validateImageUpload, ImageValidationError, MAX_FILE_SIZE_BYTES } = require("../src/lib/imageValidation");

const PNG_SIG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const JPEG_SIG = Buffer.from([0xff, 0xd8, 0xff, 0xe0]);
const WEBP_BUF = Buffer.concat([
  Buffer.from("RIFF", "ascii"),
  Buffer.from([0, 0, 0, 0]),
  Buffer.from("WEBP", "ascii"),
  Buffer.from([0, 0, 0, 0]),
]);

test("accepts a valid PNG buffer with matching declared mime type", () => {
  const buf = Buffer.concat([PNG_SIG, Buffer.alloc(20)]);
  const result = validateImageUpload({ buffer: buf, declaredMimeType: "image/png" });
  assert.equal(result.extension, "png");
});

test("accepts a valid JPEG buffer", () => {
  const buf = Buffer.concat([JPEG_SIG, Buffer.alloc(20)]);
  const result = validateImageUpload({ buffer: buf, declaredMimeType: "image/jpeg" });
  assert.equal(result.extension, "jpg");
});

test("accepts a valid WEBP buffer", () => {
  const result = validateImageUpload({ buffer: WEBP_BUF, declaredMimeType: "image/webp" });
  assert.equal(result.extension, "webp");
});

test("rejects an unsupported declared MIME type", () => {
  const buf = Buffer.concat([PNG_SIG, Buffer.alloc(20)]);
  assert.throws(
    () => validateImageUpload({ buffer: buf, declaredMimeType: "application/octet-stream" }),
    ImageValidationError
  );
});

test("rejects a file whose bytes don't match its declared MIME type (spoofed executable)", () => {
  // An .exe (MZ header) claiming to be a PNG.
  const fakeExe = Buffer.from([0x4d, 0x5a, 0x90, 0x00, 0x03, 0x00, 0x00, 0x00]);
  assert.throws(
    () => validateImageUpload({ buffer: fakeExe, declaredMimeType: "image/png" }),
    ImageValidationError
  );
});

test("rejects a file that exceeds the max size", () => {
  const big = Buffer.concat([PNG_SIG, Buffer.alloc(MAX_FILE_SIZE_BYTES + 1)]);
  assert.throws(() => validateImageUpload({ buffer: big, declaredMimeType: "image/png" }), ImageValidationError);
});

test("rejects an empty buffer", () => {
  assert.throws(
    () => validateImageUpload({ buffer: Buffer.alloc(0), declaredMimeType: "image/png" }),
    ImageValidationError
  );
});

test("rejects SVG (not in the allowed type list, script risk)", () => {
  const svg = Buffer.from("<svg><script>alert(1)</script></svg>", "utf8");
  assert.throws(
    () => validateImageUpload({ buffer: svg, declaredMimeType: "image/svg+xml" }),
    ImageValidationError
  );
});
