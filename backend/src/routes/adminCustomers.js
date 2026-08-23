const express = require("express");
const { z } = require("zod");
const mongoose = require("mongoose");
const { connectToDatabase } = require("../lib/mongodb");
const { User } = require("../models/User");
const { Enquiry } = require("../models/Enquiry");
const { Booking } = require("../models/Booking");
const { Invoice } = require("../models/Invoice");
const { Complaint } = require("../models/Complaint");
const { requireSuperAdmin } = require("../middleware/requireAuth");
const { recordAuditLog } = require("../lib/auditLog");

const router = express.Router();

// Customer records and their activity are SUPER_ADMIN-only, same as
// every other admin surface.
router.use(requireSuperAdmin);

function isValidId(id) {
  return mongoose.Types.ObjectId.isValid(id);
}

function serializeCustomer(u) {
  return {
    id: u._id.toString(),
    name: u.name,
    phone: u.phone,
    email: u.email,
    isActive: u.isActive,
    profileCompletedAt: u.profileCompletedAt,
    lastLoginAt: u.lastLoginAt,
    createdAt: u.createdAt,
  };
}

// --- List customers (search + pagination) ---
// This is the dedicated Phase 2 customers surface — richer than the
// legacy /api/admin/users list (which the old AdminDashboard "Users"
// tab still uses), adding search and a per-customer activity view.
router.get("/", async (req, res) => {
  try {
    await connectToDatabase();
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 25));

    const filter = { role: "customer" };
    if (req.query.status === "active") filter.isActive = true;
    if (req.query.status === "inactive") filter.isActive = false;
    if (req.query.search) {
      const term = req.query.search.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const re = new RegExp(term, "i");
      filter.$or = [{ name: re }, { phone: re }, { email: re }];
    }

    const [items, total] = await Promise.all([
      User.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
      User.countDocuments(filter),
    ]);

    return res.json({
      success: true,
      customers: items.map(serializeCustomer),
      page,
      limit,
      total,
    });
  } catch (err) {
    console.error("admin customers list error", err);
    return res.status(500).json({ success: false, error: "Failed to load customers." });
  }
});

// --- Customer detail: profile + activity summary across the platform ---
router.get("/:id", async (req, res) => {
  try {
    if (!isValidId(req.params.id)) {
      return res.status(400).json({ success: false, error: "Invalid customer id." });
    }

    await connectToDatabase();
    const customer = await User.findOne({ _id: req.params.id, role: "customer" }).lean();
    if (!customer) {
      return res.status(404).json({ success: false, error: "Customer not found." });
    }

    const [
      enquiryCount,
      bookingCount,
      completedBookingCount,
      invoiceAgg,
      complaintCount,
      recentEnquiries,
      recentBookings,
      recentComplaints,
    ] = await Promise.all([
      Enquiry.countDocuments({ userId: customer._id }),
      Booking.countDocuments({ userId: customer._id }),
      Booking.countDocuments({ userId: customer._id, status: "COMPLETED" }),
      Invoice.aggregate([
        { $match: { userId: customer._id } },
        { $group: { _id: null, totalBilled: { $sum: "$total" }, totalReceived: { $sum: "$amountReceived" } } },
      ]),
      Complaint.countDocuments({ userId: customer._id }),
      Enquiry.find({ userId: customer._id }).sort({ createdAt: -1 }).limit(5).select("enquiryId status createdAt").lean(),
      Booking.find({ userId: customer._id })
        .sort({ createdAt: -1 })
        .limit(5)
        .select("bookingId status pricing.totalAmount journey.pickup journey.destination createdAt")
        .lean(),
      Complaint.find({ userId: customer._id }).sort({ createdAt: -1 }).limit(5).select("ticketId subject status createdAt").lean(),
    ]);

    const billing = invoiceAgg[0] || { totalBilled: 0, totalReceived: 0 };

    return res.json({
      success: true,
      customer: serializeCustomer(customer),
      summary: {
        enquiryCount,
        bookingCount,
        completedBookingCount,
        complaintCount,
        totalBilled: billing.totalBilled,
        totalReceived: billing.totalReceived,
      },
      recentEnquiries: recentEnquiries.map((e) => ({
        id: e._id.toString(),
        enquiryId: e.enquiryId,
        status: e.status,
        createdAt: e.createdAt,
      })),
      recentBookings: recentBookings.map((b) => ({
        id: b._id.toString(),
        bookingId: b.bookingId,
        status: b.status,
        totalAmount: b.pricing?.totalAmount ?? 0,
        pickup: b.journey?.pickup,
        destination: b.journey?.destination,
        createdAt: b.createdAt,
      })),
      recentComplaints: recentComplaints.map((c) => ({
        id: c._id.toString(),
        ticketId: c.ticketId,
        subject: c.subject,
        status: c.status,
        createdAt: c.createdAt,
      })),
    });
  } catch (err) {
    console.error("admin customer detail error", err);
    return res.status(500).json({ success: false, error: "Failed to load customer." });
  }
});

const statusSchema = z.object({ isActive: z.boolean() });

// --- Activate / deactivate a customer account ---
router.patch("/:id/status", async (req, res) => {
  try {
    if (!isValidId(req.params.id)) {
      return res.status(400).json({ success: false, error: "Invalid customer id." });
    }
    const parsed = statusSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ success: false, error: "Invalid request." });
    }

    await connectToDatabase();
    const customer = await User.findOneAndUpdate(
      { _id: req.params.id, role: "customer" },
      { isActive: parsed.data.isActive },
      { new: true }
    ).lean();
    if (!customer) {
      return res.status(404).json({ success: false, error: "Customer not found." });
    }

    await recordAuditLog({
      req,
      action: parsed.data.isActive ? "CUSTOMER_ACTIVATED" : "CUSTOMER_DEACTIVATED",
      entityType: "User",
      entityId: customer._id,
    });

    return res.json({ success: true, customer: serializeCustomer(customer) });
  } catch (err) {
    console.error("admin customer status error", err);
    return res.status(500).json({ success: false, error: "Failed to update customer." });
  }
});

module.exports = router;
