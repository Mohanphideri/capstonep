const express = require("express");
const { z } = require("zod");
const bcrypt = require("bcryptjs");
const { connectToDatabase } = require("../lib/mongodb");
const { User } = require("../models/User");
const {
  verifyMsg91AccessToken,
  normalizePhone,
  Msg91VerificationError,
} = require("../lib/msg91");
const {
  createSessionToken,
  sessionCookieOptions,
  SESSION_COOKIE,
  verifySessionToken,
} = require("../lib/session");
const { ConfigError } = require("../env");
const { createRateLimiter } = require("../middleware/rateLimit");
const { ADMIN_ROLES, requireAuth } = require("../middleware/requireAuth");
const { sendTransactionalEmail } = require("../lib/brevo");
const { welcomeEmail } = require("../lib/emailTemplates");
const { UserSession } = require("../models/UserSession");
const { OtpVerification } = require("../models/OtpVerification");
const crypto = require("crypto");

const router = express.Router();

// Records a login as a durable UserSession row (device/IP audit trail)
// alongside the stateless JWT cookie that actually authenticates the
// user. Best-effort — never blocks or fails the login response, and
// never affects what the JWT itself can do (see models/UserSession.js).
function recordLoginSession({ req, userId, token, loginMethod }) {
  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
  UserSession.create({
    userId,
    tokenHash,
    ip: req.headers["x-forwarded-for"] || req.ip || null,
    userAgent: req.headers["user-agent"] || null,
    loginMethod,
    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
  }).catch((err) => console.error("user session log error", err));
}

const verifyBodySchema = z.object({
  accessToken: z.string().min(10, "A valid MSG91 access token is required."),
});

// Basic in-memory rate limiting per IP as a first line of defense.
const verifyRateLimit = createRateLimiter({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 10,
});

router.post("/verify", verifyRateLimit, async (req, res) => {
  try {
    const parsed = verifyBodySchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        error: parsed.error.issues[0]?.message ?? "Invalid request.",
      });
    }

    // 1. Verify the token server-side against MSG91. Never trust the client.
    const { verifiedIdentifier } = await verifyMsg91AccessToken(parsed.data.accessToken);
    const phone = normalizePhone(verifiedIdentifier);
    if (phone.length !== 10) {
      return res.status(422).json({
        success: false,
        error: "Verified identifier was not a valid mobile number.",
      });
    }

    // 2. Find or create the user.
    await connectToDatabase();
    let user = await User.findOne({ phone });
    if (!user) {
      user = await User.create({ phone });
    }
    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        error: "This account has been deactivated. Contact support.",
      });
    }
    user.lastLoginAt = new Date();
    await user.save();

    // 3. Issue a session cookie.
    const token = createSessionToken({
      userId: user._id.toString(),
      phone: user.phone,
      role: user.role,
    });

    const needsProfile = !user.name || !user.email;

    recordLoginSession({ req, userId: user._id, token, loginMethod: "OTP" });
    OtpVerification.create({
      phone: user.phone,
      purpose: "LOGIN",
      verified: true,
      ip: req.headers["x-forwarded-for"] || req.ip || null,
      userAgent: req.headers["user-agent"] || null,
    }).catch((err) => console.error("otp verification log error", err));

    res.cookie(SESSION_COOKIE, token, sessionCookieOptions(req));
    return res.json({
      success: true,
      user: {
        id: user._id.toString(),
        phone: user.phone,
        name: user.name,
        email: user.email,
        role: user.role,
      },
      needsProfile,
    });
  } catch (err) {
    if (err instanceof Msg91VerificationError) {
      return res.status(401).json({ success: false, error: err.message });
    }
    if (err instanceof ConfigError) {
      console.error(err.message);
      return res.status(500).json({
        success: false,
        error: "The server is missing required configuration. Please contact the site administrator.",
      });
    }
    console.error("auth/verify error", err);
    return res.status(500).json({
      success: false,
      error: "Something went wrong verifying your login. Please try again.",
    });
  }
});

// Staff / admin / super_admin login — mobile number + password. Kept
// completely separate from the customer OTP flow: never accessible to
// plain "customer" accounts, even if they somehow know a password field
// existed. Same session cookie shape, so /admin can reuse /api/auth/me.
const adminLoginBodySchema = z.object({
  phone: z
    .string()
    .transform((v) => v.replace(/\D/g, ""))
    .refine((v) => v.length === 10, "Enter a valid 10-digit mobile number."),
  password: z.string().min(1, "Password is required."),
});

const adminLoginRateLimit = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 8,
});

router.post("/admin-login", adminLoginRateLimit, async (req, res) => {
  try {
    const parsed = adminLoginBodySchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        error: parsed.error.issues[0]?.message ?? "Invalid request.",
      });
    }

    await connectToDatabase();

    const user = await User.findOne({ phone: parsed.data.phone }).select("+passwordHash");

    // Constant-shape response either way — don't reveal whether the
    // phone number exists.
    const invalidResponse = () =>
      res.status(401).json({ success: false, error: "Invalid mobile number or password." });

    if (!user || !user.passwordHash || !ADMIN_ROLES.includes(user.role)) {
      return invalidResponse();
    }

    const passwordOk = await bcrypt.compare(parsed.data.password, user.passwordHash);
    if (!passwordOk) {
      return invalidResponse();
    }

    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        error: "This account has been deactivated. Contact the super admin.",
      });
    }

    user.lastLoginAt = new Date();
    await user.save();

    const token = createSessionToken({
      userId: user._id.toString(),
      phone: user.phone,
      role: user.role,
    });

    recordLoginSession({ req, userId: user._id, token, loginMethod: "PASSWORD" });

    res.cookie(SESSION_COOKIE, token, sessionCookieOptions(req));
    return res.json({
      success: true,
      user: {
        id: user._id.toString(),
        phone: user.phone,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (err) {
    if (err instanceof ConfigError) {
      console.error(err.message);
      return res.status(500).json({
        success: false,
        error: "The server is missing required configuration. Please contact the site administrator.",
      });
    }
    console.error("auth/admin-login error", err);
    return res.status(500).json({
      success: false,
      error: "Something went wrong logging you in. Please try again.",
    });
  }
});

router.get("/me", async (req, res) => {
  const token = req.cookies?.[SESSION_COOKIE];
  if (!token) {
    return res.status(401).json({ success: false, user: null });
  }

  const session = verifySessionToken(token);
  if (!session) {
    return res.status(401).json({ success: false, user: null });
  }

  try {
    await connectToDatabase();
    const user = await User.findById(session.userId).lean();
    if (!user) {
      return res.status(401).json({ success: false, user: null });
    }

    return res.json({
      success: true,
      user: {
        id: session.userId,
        phone: user.phone,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (err) {
    console.error("auth/me error", err);
    return res.status(500).json({ success: false, user: null });
  }
});

router.post("/logout", (req, res) => {
  const token = req.cookies?.[SESSION_COOKIE];
  if (token) {
    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
    UserSession.updateOne({ tokenHash }, { revokedAt: new Date() }).catch((err) =>
      console.error("user session revoke error", err)
    );
  }
  res.cookie(SESSION_COOKIE, "", { ...sessionCookieOptions(req), maxAge: 0 });
  return res.json({ success: true });
});

// --- Complete profile (name required, email optional-until-booking) ---
//
// Shown as a modal right after first login whenever name or email is
// missing. Sends the Brevo welcome email exactly once — the very first
// time a customer completes their profile, never on subsequent edits or
// logins (per spec §12).
const profileBodySchema = z.object({
  name: z.string().trim().min(2, "Enter your full name.").max(120),
  email: z.string().trim().email("Enter a valid email.").optional().or(z.literal("")).nullable(),
});

router.patch("/profile", requireAuth, async (req, res) => {
  try {
    const parsed = profileBodySchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        error: parsed.error.issues[0]?.message ?? "Invalid profile details.",
      });
    }

    await connectToDatabase();
    const user = await User.findById(req.session.userId);
    if (!user) {
      return res.status(401).json({ success: false, error: "Please log in again." });
    }

    const wasIncomplete = !user.profileCompletedAt;

    user.name = parsed.data.name;
    if (parsed.data.email) user.email = parsed.data.email;
    if (!user.profileCompletedAt && user.name && user.email) {
      user.profileCompletedAt = new Date();
    }
    await user.save();

    if (wasIncomplete && user.profileCompletedAt && user.email) {
      // Never blocks the response — email delivery is logged, not awaited
      // to matter for the API result.
      sendTransactionalEmail({
        to: user.email,
        toName: user.name,
        subject: "Welcome to Kuwarji Travels",
        htmlContent: welcomeEmail({ name: user.name }),
        template: "welcome",
        userId: user._id.toString(),
      }).catch((err) => console.error("welcome email error", err));
    }

    return res.json({
      success: true,
      user: {
        id: user._id.toString(),
        phone: user.phone,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (err) {
    console.error("auth/profile update error", err);
    return res.status(500).json({ success: false, error: "Failed to update profile." });
  }
});

module.exports = router;
