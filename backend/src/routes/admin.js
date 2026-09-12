const express = require("express");
const { z } = require("zod");
const { connectToDatabase } = require("../lib/mongodb");
const { User } = require("../models/User");
const { Enquiry } = require("../models/Enquiry");
const { Booking } = require("../models/Booking");
const { Vehicle } = require("../models/Vehicle");
const { Review } = require("../models/Review");
const { Complaint } = require("../models/Complaint");
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
      approvedReviews,
      pendingReviews,
      draftBookings,
      openComplaints,
    ] = await Promise.all([
      User.countDocuments({ role: "customer" }),
      Enquiry.countDocuments({}),
      Enquiry.countDocuments({ status: "NEW" }),
      Enquiry.countDocuments({ status: { $in: ["BOOKED", "BOOKING"] } }),
      Enquiry.countDocuments({ status: "BOOKING" }),
      Booking.countDocuments({}),
      Booking.countDocuments({ status: "CONFIRMED" }),
      Booking.countDocuments({ status: "COMPLETED" }),
      Booking.countDocuments({ status: "CANCELLED" }),
      Vehicle.countDocuments({ status: "AVAILABLE", deletedAt: null }),
      Vehicle.countDocuments({ status: "MAINTENANCE", deletedAt: null }),
      Review.countDocuments({ status: "APPROVED" }),
      Review.countDocuments({ status: "PENDING" }),
      Booking.countDocuments({ status: "DRAFT" }),
      Complaint.countDocuments({ status: { $in: ["OPEN", "IN_REVIEW", "IN_PROGRESS"] } }),
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
        approvedReviews,
        pendingReviews,
        draftBookings,
        openComplaints,
        notificationCount: newEnquiries + pendingReviews + draftBookings + maintenanceVehicles,
      },
    });
  } catch (err) {
    console.error("admin/stats error", err);
    return res.status(500).json({ success: false, error: "Failed to load stats." });
  }
});

// Real 7-day dashboard series from database records. No synthetic chart points.
router.get("/analytics", async (req, res) => {
  try {
    await connectToDatabase();
    const days = Math.min(31, Math.max(7, Number.parseInt(req.query.days, 10) || 7));
    const end = new Date();
    end.setHours(23, 59, 59, 999);
    const start = new Date(end);
    start.setDate(start.getDate() - (days - 1));
    start.setHours(0, 0, 0, 0);
    const [enquirySeries, bookingSeries] = await Promise.all([
      Enquiry.aggregate([
        { $match: { createdAt: { $gte: start, $lte: end } } },
        { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt", timezone: "Asia/Kolkata" } }, count: { $sum: 1 } } },
        { $sort: { _id: 1 } },
      ]),
      Booking.aggregate([
        { $match: { bookingDate: { $gte: start, $lte: end } } },
        { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$bookingDate", timezone: "Asia/Kolkata" } }, count: { $sum: 1 } } },
        { $sort: { _id: 1 } },
      ]),
    ]);
    const enquiryMap = new Map(enquirySeries.map((x) => [x._id, x.count]));
    const bookingMap = new Map(bookingSeries.map((x) => [x._id, x.count]));
    const series = [];
    for (let i = 0; i < days; i += 1) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      const key = d.toISOString().slice(0, 10);
      series.push({
        date: key,
        label: d.toLocaleDateString("en-IN", { day: "2-digit", month: "short" }),
        enquiries: enquiryMap.get(key) || 0,
        bookings: bookingMap.get(key) || 0,
      });
    }
    return res.json({ success: true, days, series });
  } catch (err) {
    console.error("admin/analytics error", err);
    return res.status(500).json({ success: false, error: "Failed to load dashboard analytics." });
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
