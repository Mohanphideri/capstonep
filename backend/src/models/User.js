const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema(
  {
    phone: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },
    name: { type: String, trim: true, default: null },
    email: { type: String, trim: true, lowercase: true, default: null, index: true },
    // Only two roles exist: "customer" and "super_admin" — there is no
    // admin/staff hierarchy (spec §2). "staff" and "admin" remain valid
    // here purely so pre-existing seeded documents don't fail validation;
    // nothing in the app creates or authorizes those roles going forward.
    role: {
      type: String,
      enum: ["customer", "staff", "admin", "super_admin"],
      default: "customer",
    },
    // Only ever set for the super_admin account. Customers log in with
    // OTP only and never have a password.
    passwordHash: { type: String, default: null, select: false },
    isActive: { type: Boolean, default: true },
    profileCompletedAt: { type: Date, default: null },
    lastLoginAt: { type: Date, default: null },
  },
  { timestamps: true }
);

const User = mongoose.models.User || mongoose.model("User", UserSchema);

module.exports = { User };
