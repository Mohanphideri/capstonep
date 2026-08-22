const bcrypt = require("bcryptjs");
const { env } = require("../env");
const { User } = require("../models/User");

/**
 * Makes sure a super_admin account exists so the /admin portal is never
 * locked out on a fresh database. Runs once at server startup.
 *
 * - If no user exists with ADMIN_PHONE, one is created with the
 *   ADMIN_PASSWORD, role "super_admin".
 * - If a user already exists with that phone but has no password set
 *   (e.g. they originally signed up as a customer via OTP), it is
 *   promoted to super_admin and given the configured password.
 * - If the account already has a password, it is left untouched — this
 *   never overwrites a password that was already changed from the admin
 *   portal.
 */
async function ensureAdminSeed() {
  const phone = env.adminPhone.replace(/\D/g, "").slice(-10);

  let user = await User.findOne({ phone }).select("+passwordHash");

  if (!user) {
    const passwordHash = await bcrypt.hash(env.adminPassword, 10);
    user = await User.create({
      phone,
      role: "super_admin",
      passwordHash,
      name: "Admin",
    });
    console.log(`[adminSeed] Created super_admin account for +91${phone}`);
    return;
  }

  if (!user.passwordHash) {
    user.passwordHash = await bcrypt.hash(env.adminPassword, 10);
    if (!["admin", "super_admin", "staff"].includes(user.role)) {
      user.role = "super_admin";
    }
    await user.save();
    console.log(`[adminSeed] Promoted +91${phone} to ${user.role} with a password`);
  }
}

module.exports = { ensureAdminSeed };
