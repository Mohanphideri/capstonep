const express = require("express");
const { z } = require("zod");
const { generateCaptchaCode, renderCaptchaSvg } = require("../lib/captcha");
const {
  createCaptchaToken,
  captchaCookieOptions,
  CAPTCHA_COOKIE,
  verifyCaptchaToken,
} = require("../lib/session");
const { createRateLimiter } = require("../middleware/rateLimit");

const router = express.Router();

// Cheap per-IP throttle so this can't be hammered to fill up logs/CPU with
// SVG renders.
const generateRateLimit = createRateLimiter({ windowMs: 60 * 1000, max: 20 });
const verifyRateLimit = createRateLimiter({ windowMs: 10 * 60 * 1000, max: 15 });

router.get("/", generateRateLimit, (req, res) => {
  const code = generateCaptchaCode();
  const svg = renderCaptchaSvg(code);
  const token = createCaptchaToken(code.toLowerCase());

  res.cookie(CAPTCHA_COOKIE, token, captchaCookieOptions(req));
  return res.json({ success: true, svg });
});

const verifyBodySchema = z.object({
  answer: z.string().min(1, "Enter the code shown in the image."),
});

router.post("/verify", verifyRateLimit, (req, res) => {
  const parsed = verifyBodySchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      success: false,
      error: parsed.error.issues[0]?.message ?? "Invalid request.",
    });
  }

  const token = req.cookies?.[CAPTCHA_COOKIE];
  if (!token) {
    res.cookie(CAPTCHA_COOKIE, "", { ...captchaCookieOptions(req), maxAge: 0 });
    return res.status(400).json({
      success: false,
      error: "That code expired. Please try the new one.",
    });
  }

  const expectedCode = verifyCaptchaToken(token);
  const submitted = parsed.data.answer.trim().toLowerCase();
  const matched = Boolean(expectedCode) && expectedCode === submitted;

  // Single-use: clear the challenge whether it passes or fails.
  res.cookie(CAPTCHA_COOKIE, "", { ...captchaCookieOptions(req), maxAge: 0 });

  if (matched) {
    return res.json({ success: true });
  }
  return res.status(400).json({
    success: false,
    error: "That code didn't match. Please try the new one.",
  });
});

module.exports = router;
