const bcrypt = require("bcryptjs");
const { env } = require("../env");
const { User } = require("../models/User");

/**
 * Ensures a super_admin account exists without treating ADMIN_PHONE as the
 * permanent identity. Once the admin changes the phone in the profile, the
 * database value is authoritative and startup must not create a duplicate
 * account for the old bootstrap number.
 */
async function ensureAdminSeed() {
  const configuredPhone = env.adminPhone.replace(/\D/g, "").slice(-10);
  const configuredEmail = env.adminEmail?.trim().toLowerCase() || env.superAdminEmail?.trim().toLowerCase() || null;
  let user = await User.findOne({ role: "super_admin" }).select("+passwordHash").sort({ createdAt: 1 });

  if (!user) {
    user = await User.findOne({ phone: configuredPhone }).select("+passwordHash");
  }

  if (!user) {
    const passwordHash = await bcrypt.hash(env.adminPassword, 12);
    user = await User.create({
      phone: configuredPhone,
      role: "super_admin",
      passwordHash,
      name: "Admin",
      email: configuredEmail,
    });
    console.log(`[adminSeed] Created super_admin account for +91${configuredPhone}`);
    return;
  }

  let changed = false;
  if (!user.passwordHash) {
    user.passwordHash = await bcrypt.hash(env.adminPassword, 12);
    user.role = "super_admin";
    changed = true;
  }
  if (!user.email && configuredEmail) {
    user.email = configuredEmail;
    changed = true;
  }
  if (changed) {
    await user.save();
    console.log(`[adminSeed] Synchronized bootstrap fields for existing super_admin +91${user.phone}`);
  }
}

module.exports = { ensureAdminSeed };
