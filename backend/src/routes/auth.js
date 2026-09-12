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
  hashToken,
  ACCESS_TTL_SECONDS,
  REFRESH_TTL_SECONDS,
  REFRESH_COOKIE,
  createRefreshToken,
  refreshCookieOptions,
} = require("../lib/session");
const { ConfigError } = require("../env");
const { createRateLimiter } = require("../middleware/rateLimit");
const { ADMIN_ROLES, requireAuth } = require("../middleware/requireAuth");
const { sendTransactionalEmail } = require("../lib/brevo");
const { welcomeEmail, adminPhoneChangeOtpEmail } = require("../lib/emailTemplates");
const { UserSession } = require("../models/UserSession");
const { AdminContactChange } = require("../models/AdminContactChange");
const { OtpVerification } = require("../models/OtpVerification");
const { revokeAllUserSessions } = require("../lib/sessionRevocation");
const crypto = require("crypto");
const { recordAuditLog } = require("../lib/auditLog");

const router = express.Router();

// Persist both halves of the session before sending the cookies. The access
// token is short-lived; the refresh token is opaque, httpOnly, and rotated.
async function recordLoginSession({ req, userId, accessToken, refreshToken, loginMethod }) {
  const ip = req.headers["x-forwarded-for"]?.split(",")[0]?.trim() || req.ip || null;
  const userAgent = req.headers["user-agent"] || null;
  await UserSession.create([
    { userId, tokenHash: hashToken(accessToken), ip, userAgent, loginMethod,
      sessionType: "access", expiresAt: new Date(Date.now() + ACCESS_TTL_SECONDS * 1000) },
    { userId, tokenHash: hashToken(refreshToken), ip, userAgent, loginMethod,
      sessionType: "refresh", expiresAt: new Date(Date.now() + REFRESH_TTL_SECONDS * 1000) },
  ]);
}

async function issueSession({ req, res, user, loginMethod = "PASSWORD" }) {
  const accessToken = createSessionToken({
    userId: user._id.toString(),
    phone: user.phone,
    role: user.role,
  });
  const refreshToken = createRefreshToken();
  await recordLoginSession({ req, userId: user._id, accessToken, refreshToken, loginMethod });
  resCookie(req, accessToken, refreshToken, res);
  return { accessToken, refreshToken };
}

function resCookie(req, accessToken, refreshToken, res) {
  if (!res) return;
  res.cookie(SESSION_COOKIE, accessToken, sessionCookieOptions(req));
  res.cookie(REFRESH_COOKIE, refreshToken, refreshCookieOptions(req));
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
    } else if (user.welcomeTourCompletedAt == null && user.createdAt) {
      // Existing accounts predate the persistent welcome-tour flag. Mark
      // those accounts as already onboarded so only genuinely new accounts
      // receive the first-time tour.
      user.welcomeTourCompletedAt = user.createdAt;
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
    const refreshToken = createRefreshToken();

    const needsProfile = !user.name || !user.email;

    await recordLoginSession({ req, userId: user._id, accessToken: token, refreshToken, loginMethod: "OTP" });
    OtpVerification.create({
      phone: user.phone,
      purpose: "LOGIN",
      verified: true,
      ip: req.headers["x-forwarded-for"] || req.ip || null,
      userAgent: req.headers["user-agent"] || null,
    }).catch((err) => console.error("otp verification log error", err));

    res.cookie(SESSION_COOKIE, token, sessionCookieOptions(req));
    res.cookie(REFRESH_COOKIE, refreshToken, refreshCookieOptions(req));
    return res.json({
      success: true,
      user: {
        id: user._id.toString(),
        phone: user.phone,
        name: user.name,
        email: user.email,
        role: user.role,
        welcomeTourCompleted: !!user.welcomeTourCompletedAt,
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
    const refreshToken = createRefreshToken();

    await recordLoginSession({ req, userId: user._id, accessToken: token, refreshToken, loginMethod: "PASSWORD" });

    res.cookie(SESSION_COOKIE, token, sessionCookieOptions(req));
    res.cookie(REFRESH_COOKIE, refreshToken, refreshCookieOptions(req));
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


// --- SuperAdmin profile and password management ---
const adminProfileSchema = z.object({
  name: z.string().trim().min(2, "Enter your full name.").max(120),
  phone: z.string().transform((v) => v.replace(/\D/g, "")).refine((v) => v.length === 10, "Enter a valid 10-digit mobile number."),
  email: z.string().trim().email("Enter a valid email address.").transform((v) => v.toLowerCase()).or(z.literal("")),
});

const adminContactRateLimit = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 5,
  keyGenerator: (req) => `${req.session?.userId || "anon"}:${req.headers["x-forwarded-for"]?.split(",")[0]?.trim() || req.ip || "unknown"}`,
});

const adminPhoneChangeRequestSchema = z.object({
  newPhone: z.string().transform((v) => v.replace(/\D/g, "")).refine((v) => v.length === 10, "Enter a valid 10-digit mobile number."),
});
const adminPhoneChangeVerifySchema = adminPhoneChangeRequestSchema.extend({
  code: z.string().regex(/^\d{6}$/, "Enter the 6-digit verification code."),
});
const adminEmailChangeSchema = z.object({
  newEmail: z.string().trim().email("Enter a valid email address.").transform((v) => v.toLowerCase()),
  accessToken: z.string().min(10, "A valid mobile verification token is required."),
});

router.get("/admin/profile", requireAuth, async (req, res) => {
  if (!ADMIN_ROLES.includes(req.session.role)) return res.status(403).json({ success:false, error:"Super admin access required." });
  try {
    await connectToDatabase();
    const user = await User.findById(req.session.userId).lean();
    if (!user) return res.status(404).json({ success:false, error:"Admin account not found." });
    return res.json({ success:true, profile:{ name:user.name || "", phone:user.phone || "", email:user.email || "" } });
  } catch (err) {
    console.error("admin/profile get error", err);
    return res.status(500).json({ success:false, error:"Failed to load admin profile." });
  }
});

router.patch("/admin/profile", requireAuth, async (req, res) => {
  if (!ADMIN_ROLES.includes(req.session.role)) return res.status(403).json({ success:false, error:"Super admin access required." });
  const parsed = adminProfileSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ success:false, error:parsed.error.issues[0]?.message || "Invalid profile." });
  try {
    await connectToDatabase();
    const user = await User.findById(req.session.userId).select("phone email name role isActive");
    if (!user) return res.status(404).json({ success:false, error:"Admin account not found." });
    const phoneChanged = parsed.data.phone !== user.phone;
    const emailChanged = parsed.data.email !== (user.email || "");
    if (phoneChanged || emailChanged) {
      return res.status(409).json({
        success:false,
        code: phoneChanged && emailChanged ? "ONE_CONTACT_CHANGE_AT_A_TIME" : (phoneChanged ? "PHONE_CHANGE_REQUIRES_VERIFICATION" : "EMAIL_CHANGE_REQUIRES_VERIFICATION"),
        error: phoneChanged && emailChanged ? "Change the mobile number or email separately so each new contact method can be verified." : "This contact change requires verification.",
      });
    }
    user.name = parsed.data.name;
    await user.save();
    await recordAuditLog({ req, action: "ADMIN_PROFILE_UPDATED", entityType: "User", entityId: user._id, metadata: { fields: ["name"] } });
    return res.json({ success:true, profile:{ name:user.name || "", phone:user.phone || "", email:user.email || "" } });
  } catch (err) {
    console.error("admin/profile update error", err);
    return res.status(500).json({ success:false, error:"Failed to update admin profile." });
  }
});

router.post("/admin/profile/request-phone-change", requireAuth, adminContactRateLimit, async (req, res) => {
  if (!ADMIN_ROLES.includes(req.session.role)) return res.status(403).json({ success:false, error:"Super admin access required." });
  const parsed = adminPhoneChangeRequestSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ success:false, error:parsed.error.issues[0]?.message || "Invalid mobile number." });
  try {
    await connectToDatabase();
    const user = await User.findById(req.session.userId).select("phone email name role isActive");
    if (!user) return res.status(404).json({ success:false, error:"Admin account not found." });
    if (!user.email) return res.status(400).json({ success:false, error:"Add a verified admin email before changing the mobile number." });
    if (parsed.data.newPhone === user.phone) return res.status(400).json({ success:false, error:"That is already your current mobile number." });
    const duplicate = await User.findOne({ phone: parsed.data.newPhone, _id: { $ne: user._id } }).select("_id").lean();
    if (duplicate) return res.status(409).json({ success:false, error:"That mobile number is already registered." });

    await AdminContactChange.deleteMany({ userId: user._id, kind: "PHONE_CHANGE", consumedAt: null });
    const code = String(crypto.randomInt(100000, 1000000));
    const codeHash = crypto.createHash("sha256").update(`${user._id}:${parsed.data.newPhone}:${code}`).digest("hex");
    const challenge = await AdminContactChange.create({
      userId: user._id, kind: "PHONE_CHANGE", targetValue: parsed.data.newPhone, codeHash, expiresAt: new Date(Date.now() + 10 * 60 * 1000),
    });
    const emailResult = await sendTransactionalEmail({
      to: user.email, toName: user.name || "Admin", subject: "Verify your Kuwarji Travels admin mobile change",
      htmlContent: adminPhoneChangeOtpEmail({ name: user.name, code }), template: "admin_phone_change_otp", userId: user._id.toString(),
    });
    if (!emailResult.sent) {
      await AdminContactChange.deleteOne({ _id: challenge._id });
      return res.status(503).json({ success:false, error:"We could not send the verification email. Please check email configuration and try again." });
    }
    return res.json({ success:true, message:`A verification code was sent to ${user.email.replace(/(^.).*(@.*$)/, "$1••••$2")}.`, expiresInSeconds: 600 });
  } catch (err) {
    console.error("admin phone change request error", err);
    return res.status(500).json({ success:false, error:"Unable to start mobile verification." });
  }
});

router.post("/admin/profile/verify-phone-change", requireAuth, adminContactRateLimit, async (req, res) => {
  if (!ADMIN_ROLES.includes(req.session.role)) return res.status(403).json({ success:false, error:"Super admin access required." });
  const parsed = adminPhoneChangeVerifySchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ success:false, error:parsed.error.issues[0]?.message || "Invalid verification code." });
  try {
    await connectToDatabase();
    const user = await User.findById(req.session.userId).select("phone email name role isActive");
    if (!user) return res.status(404).json({ success:false, error:"Admin account not found." });
    const challenge = await AdminContactChange.findOne({ userId: user._id, kind: "PHONE_CHANGE", targetValue: parsed.data.newPhone, consumedAt: null, expiresAt: { $gt: new Date() } }).sort({ createdAt: -1 });
    if (!challenge) return res.status(400).json({ success:false, error:"This verification code has expired. Request a new code." });
    const codeHash = crypto.createHash("sha256").update(`${user._id}:${parsed.data.newPhone}:${parsed.data.code}`).digest("hex");
    if (challenge.attempts >= 5 || challenge.codeHash !== codeHash) {
      challenge.attempts += 1;
      if (challenge.attempts >= 5) challenge.consumedAt = new Date();
      await challenge.save();
      return res.status(400).json({ success:false, error:challenge.attempts >= 5 ? "Too many incorrect codes. Request a new code." : "Incorrect verification code." });
    }

    const duplicate = await User.findOne({ phone: parsed.data.newPhone, _id: { $ne: user._id } }).select("_id").lean();
    if (duplicate) return res.status(409).json({ success:false, error:"That mobile number is already registered." });
    user.phone = parsed.data.newPhone;
    await user.save();
    challenge.consumedAt = new Date();
    await challenge.save();
    await revokeAllUserSessions(user._id);
    await issueSession({ req, res, user, loginMethod: "PASSWORD" });
    await recordAuditLog({ req, action: "ADMIN_PHONE_CHANGED", entityType: "User", entityId: user._id, metadata: { oldPhone: "redacted", newPhone: "redacted", verificationChannel: "EMAIL" } });
    return res.json({ success:true, profile:{ name:user.name || "", phone:user.phone || "", email:user.email || "" }, message:"Mobile number updated and all previous admin sessions were signed out." });
  } catch (err) {
    console.error("admin phone change verify error", err);
    return res.status(500).json({ success:false, error:"Unable to update the mobile number." });
  }
});

router.post("/admin/profile/verify-email-change", requireAuth, adminContactRateLimit, async (req, res) => {
  if (!ADMIN_ROLES.includes(req.session.role)) return res.status(403).json({ success:false, error:"Super admin access required." });
  const parsed = adminEmailChangeSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ success:false, error:parsed.error.issues[0]?.message || "Invalid email verification request." });
  try {
    const { verifiedIdentifier } = await verifyMsg91AccessToken(parsed.data.accessToken);
    const verifiedPhone = normalizePhone(verifiedIdentifier);
    await connectToDatabase();
    const user = await User.findById(req.session.userId).select("phone email name role isActive");
    if (!user) return res.status(404).json({ success:false, error:"Admin account not found." });
    if (verifiedPhone !== normalizePhone(user.phone || "")) return res.status(401).json({ success:false, error:"The OTP was verified for a different mobile number." });
    if (parsed.data.newEmail === (user.email || "")) return res.status(400).json({ success:false, error:"That is already your current email address." });
    user.email = parsed.data.newEmail;
    await user.save();
    await revokeAllUserSessions(user._id);
    await issueSession({ req, res, user, loginMethod: "PASSWORD" });
    await recordAuditLog({ req, action: "ADMIN_EMAIL_CHANGED", entityType: "User", entityId: user._id, metadata: { verificationChannel: "MOBILE" } });
    return res.json({ success:true, profile:{ name:user.name || "", phone:user.phone || "", email:user.email || "" }, message:"Email updated and all previous admin sessions were signed out." });
  } catch (err) {
    if (err instanceof Msg91VerificationError) return res.status(401).json({ success:false, error:err.message });
    console.error("admin email change verify error", err);
    return res.status(500).json({ success:false, error:"Unable to update the email address." });
  }
});

const adminPasswordSchema = z.object({ oldPassword:z.string().min(1), newPassword:z.string().min(8, "New password must be at least 8 characters.").max(128) });
router.post("/admin/change-password", requireAuth, async (req, res) => {
  if (!ADMIN_ROLES.includes(req.session.role)) return res.status(403).json({ success:false, error:"Super admin access required." });
  const parsed = adminPasswordSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ success:false, error:parsed.error.issues[0]?.message || "Invalid password." });
  try {
    await connectToDatabase();
    const user = await User.findById(req.session.userId).select("+passwordHash");
    if (!user || !user.passwordHash || !(await bcrypt.compare(parsed.data.oldPassword, user.passwordHash))) return res.status(401).json({ success:false, error:"Old password is incorrect." });
    user.passwordHash = await bcrypt.hash(parsed.data.newPassword, 12);
    await user.save();
    await revokeAllUserSessions(user._id);
    await recordAuditLog({ req, action: "ADMIN_PASSWORD_CHANGED", entityType: "User", entityId: user._id });
    return res.json({ success:true, message:"Password changed successfully. All existing admin sessions have been signed out." });
  } catch (err) {
    console.error("admin/change-password error", err);
    return res.status(500).json({ success:false, error:"Failed to change password." });
  }
});

const adminResetSchema = z.object({ accessToken:z.string().min(10), newPassword:z.string().min(8, "New password must be at least 8 characters.").max(128) });
router.post("/admin/reset-password", verifyRateLimit, async (req, res) => {
  const parsed = adminResetSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ success:false, error:parsed.error.issues[0]?.message || "Invalid reset request." });
  try {
    const { verifiedIdentifier } = await verifyMsg91AccessToken(parsed.data.accessToken);
    const phone = normalizePhone(verifiedIdentifier);
    await connectToDatabase();
    const user = await User.findOne({ phone, role: { $in: ADMIN_ROLES } }).select("+passwordHash");
    if (!user) return res.status(400).json({ success:false, error:"The verified mobile number is not registered for an admin account." });
    user.passwordHash = await bcrypt.hash(parsed.data.newPassword, 12);
    await user.save();
    await revokeAllUserSessions(user._id);
    await recordAuditLog({ req, action: "ADMIN_PASSWORD_RESET", entityType: "User", entityId: user._id, metadata: { verificationChannel: "MOBILE" } });
    return res.json({ success:true, message:"Password reset successfully. All existing admin sessions have been invalidated. You can now sign in." });
  } catch (err) {
    if (err instanceof Msg91VerificationError) return res.status(401).json({ success:false, error:err.message });
    console.error("admin/reset-password error", err);
    return res.status(500).json({ success:false, error:"Unable to reset the password. Please try again." });
  }
});

router.get("/me", requireAuth, async (req, res) => {
  try {
    const user = await User.findById(req.session.userId).lean();
    if (!user) return res.status(401).json({ success: false, user: null });
    return res.json({
      success: true,
      user: {
        id: req.session.userId, phone: user.phone, name: user.name,
        email: user.email, role: user.role, welcomeTourCompleted: !!user.welcomeTourCompletedAt,
      },
    });
  } catch (err) {
    console.error("auth/me error", err);
    return res.status(500).json({ success: false, user: null });
  }
});


router.post("/welcome-tour/complete", requireAuth, async (req, res) => {
  try {
    await connectToDatabase();
    const user = await User.findByIdAndUpdate(req.session.userId, { $set: { welcomeTourCompletedAt: new Date() } }, { new: true }).select("_id welcomeTourCompletedAt").lean();
    if (!user) return res.status(404).json({ success:false, error:"Account not found." });
    return res.json({ success:true, welcomeTourCompleted:true });
  } catch (err) {
    console.error("welcome tour completion error", err);
    return res.status(500).json({ success:false, error:"Unable to save tour progress." });
  }
});

router.post("/logout", async (req, res) => {
  const hashes = [req.cookies?.[SESSION_COOKIE], req.cookies?.[REFRESH_COOKIE]]
    .filter(Boolean).map(hashToken);
  try {
    if (hashes.length) {
      await connectToDatabase();
      await UserSession.updateMany(
        { tokenHash: { $in: hashes }, revokedAt: null },
        { $set: { revokedAt: new Date() } }
      );
    }
  } catch (err) {
    console.error("user session revoke error", err);
    res.cookie(SESSION_COOKIE, "", { ...sessionCookieOptions(req), maxAge: 0 });
    res.cookie(REFRESH_COOKIE, "", { ...refreshCookieOptions(req), maxAge: 0 });
    return res.status(503).json({ success: false, error: "Logout could not be fully confirmed. Please try again." });
  }
  res.cookie(SESSION_COOKIE, "", { ...sessionCookieOptions(req), maxAge: 0 });
  res.cookie(REFRESH_COOKIE, "", { ...refreshCookieOptions(req), maxAge: 0 });
  return res.json({ success: true });
});

router.post("/refresh", async (req, res) => {
  const presented = req.cookies?.[REFRESH_COOKIE];
  if (!presented) return res.status(401).json({ success: false, error: "Please log in." });

  try {
    await connectToDatabase();
    const now = new Date();
    const oldSession = await UserSession.findOneAndUpdate(
      { tokenHash: hashToken(presented), sessionType: "refresh", revokedAt: null, expiresAt: { $gt: now } },
      { $set: { revokedAt: now } },
      { new: true }
    ).lean();

    if (!oldSession) {
      res.cookie(SESSION_COOKIE, "", { ...sessionCookieOptions(req), maxAge: 0 });
      res.cookie(REFRESH_COOKIE, "", { ...refreshCookieOptions(req), maxAge: 0 });
      return res.status(401).json({ success: false, error: "Your session has expired. Please log in again." });
    }

    const user = await User.findById(oldSession.userId)
      .select("_id phone role isActive name email").lean();
    if (!user || user.isActive === false) {
      return res.status(401).json({ success: false, error: "Please log in again." });
    }

    const accessToken = createSessionToken({
      userId: user._id.toString(), phone: user.phone, role: user.role,
    });
    const refreshToken = createRefreshToken();
    const ip = req.headers["x-forwarded-for"]?.split(",")[0]?.trim() || req.ip || null;
    const userAgent = req.headers["user-agent"] || null;

    await UserSession.create([
      { userId: user._id, tokenHash: hashToken(accessToken), ip, userAgent,
        loginMethod: oldSession.loginMethod, sessionType: "access",
        expiresAt: new Date(Date.now() + ACCESS_TTL_SECONDS * 1000) },
      { userId: user._id, tokenHash: hashToken(refreshToken), ip, userAgent,
        loginMethod: oldSession.loginMethod, sessionType: "refresh",
        expiresAt: new Date(Date.now() + REFRESH_TTL_SECONDS * 1000) },
    ]);

    res.cookie(SESSION_COOKIE, accessToken, sessionCookieOptions(req));
    res.cookie(REFRESH_COOKIE, refreshToken, refreshCookieOptions(req));
    return res.json({
      success: true,
      user: {
        id: user._id.toString(), phone: user.phone, name: user.name,
        email: user.email, role: user.role,
      },
    });
  } catch (err) {
    console.error("auth/refresh error", err);
    return res.status(503).json({ success: false, error: "Unable to refresh the session right now." });
  }
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
