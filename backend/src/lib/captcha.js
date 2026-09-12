// Unambiguous character set — no 0/O, 1/I/l, etc.
const CAPTCHA_CHARS = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
const CAPTCHA_LENGTH = 5;

function generateCaptchaCode() {
  let code = "";
  for (let i = 0; i < CAPTCHA_LENGTH; i++) {
    code += CAPTCHA_CHARS[Math.floor(Math.random() * CAPTCHA_CHARS.length)];
  }
  return code;
}

function rand(min, max) {
  return Math.random() * (max - min) + min;
}

/**
 * Renders the challenge as an inline SVG string — no canvas, no external
 * captcha service, nothing to load from a third-party domain. Distortion
 * (per-character rotation/offset + noise lines/dots) makes it resistant
 * to naive OCR without relying on JS-heavy client challenges.
 */
function renderCaptchaSvg(code) {
  const width = 180;
  const height = 60;
  const colors = ["#101B33", "#2A3A5C", "#B22E38", "#C9820A"];

  const noiseLines = Array.from({ length: 5 }, () => {
    const x1 = rand(0, width);
    const y1 = rand(0, height);
    const x2 = rand(0, width);
    const y2 = rand(0, height);
    return `<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(
      1
    )}" y2="${y2.toFixed(1)}" stroke="#DDE2E8" stroke-width="1.5" />`;
  }).join("");

  const noiseDots = Array.from({ length: 24 }, () => {
    const cx = rand(0, width);
    const cy = rand(0, height);
    return `<circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="1" fill="#DDE2E8" />`;
  }).join("");

  const slotWidth = width / code.length;
  const chars = code
    .split("")
    .map((char, i) => {
      const x = slotWidth * i + slotWidth / 2 + rand(-4, 4);
      const y = height / 2 + rand(-4, 4);
      const rotation = rand(-22, 22).toFixed(1);
      const color = colors[i % colors.length];
      const size = Math.round(rand(26, 32));
      return `<text x="${x.toFixed(1)}" y="${y.toFixed(1)}" transform="rotate(${rotation} ${x.toFixed(
        1
      )} ${y.toFixed(1)})" font-family="'IBM Plex Mono', monospace" font-weight="600" font-size="${size}" fill="${color}" text-anchor="middle" dominant-baseline="middle">${char}</text>`;
    })
    .join("");

  return `<svg viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Captcha challenge image">
    <rect width="${width}" height="${height}" fill="#F2F4F6" />
    ${noiseLines}
    ${noiseDots}
    ${chars}
  </svg>`;
}

module.exports = { generateCaptchaCode, renderCaptchaSvg };
