const express = require("express");
const mongoose = require("mongoose");
const { connectToDatabase } = require("../lib/mongodb");
const { Booking } = require("../models/Booking");
const Invoice = require("../models/Invoice");
const { requireSuperAdmin } = require("../middleware/requireAuth");
const { recordAuditLog } = require("../lib/auditLog");

const router = express.Router();
router.use(requireSuperAdmin);

function validId(id) {
  return mongoose.Types.ObjectId.isValid(id);
}

function serialize(b) {
  const pricing = b.pricing || {};
  const total = Number(pricing.totalAmount || 0);
  const received = Number(pricing.amountReceived || 0);
  return {
    id: b._id.toString(),
    bookingId: b.bookingId,
    customer: {
      name: b.customerSnapshot?.name || "—",
      phone: b.customerSnapshot?.phone || "—",
      email: b.customerSnapshot?.email || null,
    },
    totalAmount: total,
    amountReceived: received,
    balanceAmount: Math.max(0, Number(pricing.balanceAmount ?? total - received)),
    status: b.status,
    bookingDate: b.bookingDate,
  };
}

router.get("/", async (req, res) => {
  try {
    await connectToDatabase();
    const search = String(req.query.search || "").trim();
    const filter = { "pricing.balanceAmount": { $gt: 0 }, status: { $ne: "CANCELLED" } };
    if (search) {
      const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const re = new RegExp(escaped, "i");
      filter.$or = [
        { bookingId: re },
        { "customerSnapshot.name": re },
        { "customerSnapshot.phone": re },
      ];
    }
    const bookings = await Booking.find(filter).sort({ createdAt: -1 }).lean();
    const totalOutstanding = bookings.reduce((sum, b) => sum + Number(b.pricing?.balanceAmount || 0), 0);
    return res.json({
      success: true,
      balances: bookings.map(serialize),
      totalOutstanding,
      count: bookings.length,
    });
  } catch (err) {
    console.error("admin balance sheet list error", err);
    return res.status(500).json({ success: false, error: "Failed to load balance sheet." });
  }
});

router.post("/:id/mark-paid", async (req, res) => {
  try {
    if (!validId(req.params.id)) return res.status(400).json({ success: false, error: "Invalid booking id." });
    await connectToDatabase();
    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ success: false, error: "Booking not found." });
    if (booking.status === "CANCELLED") return res.status(400).json({ success: false, error: "Cancelled bookings cannot be marked paid." });

    const total = Number(booking.pricing?.totalAmount || 0);
    booking.pricing.amountReceived = total;
    booking.pricing.balanceAmount = 0;
    await booking.save();

    // Keep an already-generated invoice financially in sync with the booking.
    await Invoice.updateMany(
      { bookingId: booking._id, status: { $ne: "VOID" } },
      { $set: { amountReceived: total, balance: 0 } }
    );

    await recordAuditLog({
      req,
      action: "BOOKING_PAYMENT_MARKED_PAID",
      entityType: "Booking",
      entityId: booking._id,
      metadata: { bookingId: booking.bookingId, amountPaid: total },
    });

    return res.json({ success: true, balance: serialize(booking.toObject()), message: "Booking marked as paid." });
  } catch (err) {
    console.error("admin mark booking paid error", err);
    return res.status(500).json({ success: false, error: "Failed to mark booking as paid." });
  }
});

module.exports = router;
