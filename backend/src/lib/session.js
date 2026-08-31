const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const { env } = require("../env");

const SESSION_COOKIE = "kuwarji_session";
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 30; // 30 days

function createSessionToken(payload) {
  return jwt.sign(payload, env.authSecret, {
    algorithm: "HS256",
    expiresIn: SESSION_TTL_SECONDS,
  });
}

// Single source of truth for how a raw session JWT is hashed before it's
// stored/looked-up in UserSession. Used both when recording a login
// (routes/auth.js) and when checking revocation (lib/sessionRevocation.js)
// — keeping this in one place means the two can never drift out of sync
// and silently stop matching each other.
function hashToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

function verifySessionToken(token) {
  try {
    const payload = jwt.verify(token, env.authSecret);
    if (
      typeof payload.userId === "string" &&
      typeof payload.phone === "string" &&
      typeof payload.role === "string"
    ) {
      return { userId: payload.userId, phone: payload.phone, role: payload.role };
    }
    return null;
  } catch {
    return null;
  }
}

// Cross-origin (Vercel frontend <-> Render backend) requires
// SameSite=None + Secure so the browser will actually send the cookie
// back on API requests from a different domain.
//
// IMPORTANT: this used to key off `env.nodeEnv === "production"`, which
// silently breaks the whole OTP flow if NODE_ENV isn't explicitly set to
// "production" on the host (Render does NOT set this for you). That made
// the captcha/session cookies come back as SameSite=Lax, which browsers
// refuse to send on cross-site fetch() calls from the Vercel frontend —
// so /api/captcha/verify always returned 400 ("that code expired") and
// OTP could never be sent, and /api/auth/me always came back 401.
//
// Instead we derive it from the actual request: `req.secure` reflects
// the real scheme (Render terminates TLS and forwards it via
// `x-forwarded-proto`, which Express reads because of `trust proxy`).
// If the request came in over HTTPS, treat it as a cross-site deployment
// and require SameSite=None + Secure. Plain HTTP (local dev) falls back
// to SameSite=Lax, which doesn't require Secure.
function crossSiteFromReq(req) {
  if (req && typeof req.secure === "boolean") return req.secure;
  return env.nodeEnv === "production";
}

function sessionCookieOptions(req) {
  const crossSite = crossSiteFromReq(req);
  return {
    httpOnly: true,
    secure: crossSite,
    sameSite: crossSite ? "none" : "lax",
    path: "/",
    maxAge: SESSION_TTL_SECONDS * 1000,
  };
}

// --- Captcha challenge tokens ---
// Separate, much shorter-lived signed token so a captcha challenge can't
// be replayed or reused after it expires or is solved once.
const CAPTCHA_COOKIE = "kuwarji_captcha";
const CAPTCHA_TTL_SECONDS = 5 * 60; // 5 minutes

function createCaptchaToken(code) {
  return jwt.sign({ code }, env.authSecret, {
    algorithm: "HS256",
    expiresIn: CAPTCHA_TTL_SECONDS,
  });
}

function verifyCaptchaToken(token) {
  try {
    const payload = jwt.verify(token, env.authSecret);
    return typeof payload.code === "string" ? payload.code : null;
  } catch {
    return null;
  }
}

function captchaCookieOptions(req) {
  const crossSite = crossSiteFromReq(req);
  return {
    httpOnly: true,
    secure: crossSite,
    sameSite: crossSite ? "none" : "lax",
    path: "/",
    maxAge: CAPTCHA_TTL_SECONDS * 1000,
  };
}

module.exports = {
  SESSION_COOKIE,
  createSessionToken,
  verifySessionToken,
  sessionCookieOptions,
  hashToken,
  CAPTCHA_COOKIE,
  createCaptchaToken,
  verifyCaptchaToken,
  captchaCookieOptions,
};
