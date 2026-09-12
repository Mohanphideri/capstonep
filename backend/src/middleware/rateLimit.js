const { connectToDatabase } = require("../lib/mongodb");
const { RateLimitCounter } = require("../models/RateLimitCounter");

/**
 * Distributed fixed-window rate limiter backed by MongoDB.
 *
 * The counter key includes the exact time bucket, so atomic $inc works across
 * multiple Render instances/processes. MongoDB is already a required
 * production dependency for this application, avoiding a second stateful
 * service solely for throttling.
 */
function createRateLimiter({ windowMs, max, keyGenerator }) {
  const scope = `${windowMs}:${max}`;

  return function rateLimit(req, res, next) {
    (async () => {
      const now = Date.now();
      const bucket = Math.floor(now / windowMs);
      const resetAtMs = (bucket + 1) * windowMs;
      const baseKey = keyGenerator
        ? keyGenerator(req)
        : (req.headers["x-forwarded-for"]?.split(",")[0]?.trim() || req.ip || "unknown");
      const key = `${scope}:${String(baseKey).slice(0, 180)}:${bucket}`;

      await connectToDatabase();
      const counter = await RateLimitCounter.findOneAndUpdate(
        { _id: key },
        {
          $inc: { count: 1 },
          $setOnInsert: { expiresAt: new Date(resetAtMs + 60_000) },
        },
        { upsert: true, new: true }
      ).lean();

      if (counter.count > max) {
        const retryAfter = Math.max(1, Math.ceil((resetAtMs - now) / 1000));
        res.set("Retry-After", String(retryAfter));
        return res.status(429).json({
          success: false,
          error: "Too many requests. Please wait a moment.",
        });
      }
      return next();
    })().catch((err) => {
      console.error("[rateLimit] store failure:", err.message);
      // Fail closed: if the distributed limiter cannot be checked, do not
      // allow an authentication/security-sensitive endpoint to continue.
      return res.status(503).json({
        success: false,
        error: "Security controls are temporarily unavailable. Please try again.",
      });
    });
  };
}

module.exports = { createRateLimiter };
