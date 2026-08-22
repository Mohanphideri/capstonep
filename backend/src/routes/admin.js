const express = require("express");
const { z } = require("zod");
const { connectToDatabase } = require("../lib/mongodb");
const { User } = require("../models/User");
const { Enquiry } = require("../models/Enquiry");
const { Booking } = require("../models/Booking");
const { Vehicle } = require("../models/Vehicle");
const { requireAdmin } = require("../middleware/requireAuth");

const router = express.Router();

// Everything in this router requires a SuperAdmin session.
router.use(requireAdmin);

router.get("/me", (req, res) => {
  return res.json({ success: true, session: req.session });
});

// Real database-backed dashboard numbers (spec §39) — no fake statistics.
router.get("/stats", async (req, res) => {
  try {
    await connectToDatabase();
    const [
      totalCustomers,
      totalEnquiries,
      newEnquiries,
      inReviewEnquiries,
      convertedEnquiries,
      totalBookings,
      confirmedBookings,
      completedBookings,
      cancelledBookings,
      activeVehicles,
      maintenanceVehicles,
    ] = await Promise.all([
      User.countDocuments({ role: "customer" }),
      Enquiry.countDocuments({}),
      Enquiry.countDocuments({ status: "NEW" }),
      Enquiry.countDocuments({ status: { $in: ["IN_REVIEW", "CONTACTED", "QUOTED"] } }),
      Enquiry.countDocuments({ status: "CONVERTED" }),
      Booking.countDocuments({}),
      Booking.countDocuments({ status: "CONFIRMED" }),
      Booking.countDocuments({ status: "COMPLETED" }),
      Booking.countDocuments({ status: "CANCELLED" }),
      Vehicle.countDocuments({ status: "AVAILABLE", deletedAt: null }),
      Vehicle.countDocuments({ status: "MAINTENANCE", deletedAt: null }),
    ]);
    return res.json({
      success: true,
      stats: {
        totalCustomers,
        totalEnquiries,
        newEnquiries,
        inReviewEnquiries,
        convertedEnquiries,
        totalBookings,
        confirmedBookings,
        completedBookings,
        cancelledBookings,
        activeVehicles,
        maintenanceVehicles,
      },
    });
  } catch (err) {
    console.error("admin/stats error", err);
    return res.status(500).json({ success: false, error: "Failed to load stats." });
  }
});

router.get("/users", async (req, res) => {
  try {
    await connectToDatabase();
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 25));

    const [items, total] = await Promise.all([
      User.find({}).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
      User.countDocuments({}),
    ]);

    return res.json({
      success: true,
      users: items.map((u) => ({
        id: u._id.toString(),
        phone: u.phone,
        name: u.name,
        email: u.email,
        role: u.role,
        isActive: u.isActive,
        lastLoginAt: u.lastLoginAt,
        createdAt: u.createdAt,
      })),
      page,
      limit,
      total,
    });
  } catch (err) {
    console.error("admin/users error", err);
    return res.status(500).json({ success: false, error: "Failed to load users." });
  }
});

const toggleActiveSchema = z.object({ isActive: z.boolean() });

router.patch("/users/:id/active", async (req, res) => {
  // Only super_admin can deactivate/reactivate accounts.
  if (req.session.role !== "super_admin") {
    return res.status(403).json({ success: false, error: "Only a super admin can do that." });
  }

  const parsed = toggleActiveSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ success: false, error: "Invalid request." });
  }

  try {
    await connectToDatabase();
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { isActive: parsed.data.isActive },
      { new: true }
    ).lean();

    if (!user) {
      return res.status(404).json({ success: false, error: "User not found." });
    }

    return res.json({ success: true, user: { id: user._id.toString(), isActive: user.isActive } });
  } catch (err) {
    console.error("admin/users active toggle error", err);
    return res.status(500).json({ success: false, error: "Failed to update user." });
  }
});

module.exports = router;
