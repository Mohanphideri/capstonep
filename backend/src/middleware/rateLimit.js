/**
 * Simple in-memory per-IP rate limiter. A production deployment with
 * multiple server instances should back this with Redis or similar —
 * this is a first line of defense, same as the original app.
 */
function createRateLimiter({ windowMs, max }) {
  const hits = new Map();

  return function rateLimit(req, res, next) {
    const ip = req.headers["x-forwarded-for"] || req.ip || "unknown";
    const now = Date.now();
    const entry = hits.get(ip);

    if (!entry || entry.resetAt < now) {
      hits.set(ip, { count: 1, resetAt: now + windowMs });
      return next();
    }

    entry.count += 1;
    if (entry.count > max) {
      return res.status(429).json({
        success: false,
        error: "Too many requests. Please wait a moment.",
      });
    }
    return next();
  };
}

module.exports = { createRateLimiter };
