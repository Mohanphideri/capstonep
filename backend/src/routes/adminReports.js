const express = require("express");
const { connectToDatabase } = require("../lib/mongodb");
const { User } = require("../models/User");
const { Enquiry } = require("../models/Enquiry");
const { Booking } = require("../models/Booking");
const { Invoice } = require("../models/Invoice");
const { Vehicle } = require("../models/Vehicle");
const { requireSuperAdmin } = require("../middleware/requireAuth");

const router = express.Router();

// Reporting is SUPER_ADMIN-only, same as every other admin surface —
// entirely read-only aggregation over existing collections.
router.use(requireSuperAdmin);

// --- High-level summary: the numbers a SuperAdmin would check daily ---
router.get("/summary", async (req, res) => {
  try {
    await connectToDatabase();

    const [
      totalCustomers,
      enquiriesByStatus,
      bookingsByStatus,
      invoiceAgg,
      activeVehicles,
    ] = await Promise.all([
      User.countDocuments({ role: "customer" }),
      Enquiry.aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }]),
      Booking.aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }]),
      Invoice.aggregate([
        {
          $group: {
            _id: null,
            totalBilled: { $sum: "$total" },
            totalReceived: { $sum: "$amountReceived" },
            totalOutstanding: { $sum: "$balance" },
            invoiceCount: { $sum: 1 },
          },
        },
      ]),
      Vehicle.countDocuments({ status: "AVAILABLE", deletedAt: null }),
    ]);

    const toMap = (rows) => rows.reduce((acc, r) => ({ ...acc, [r._id || "UNKNOWN"]: r.count }), {});
    const billing = invoiceAgg[0] || { totalBilled: 0, totalReceived: 0, totalOutstanding: 0, invoiceCount: 0 };
    const enquiryTotals = toMap(enquiriesByStatus);
    const totalEnquiries = Object.values(enquiryTotals).reduce((a, b) => a + b, 0);
    const convertedEnquiries = enquiryTotals.CONVERTED || 0;

    return res.json({
      success: true,
      summary: {
        totalCustomers,
        activeVehicles,
        enquiriesByStatus: enquiryTotals,
        totalEnquiries,
        // Share of enquiries that became a booking — the single most
        // useful funnel number for a rental enquiry business.
        conversionRate: totalEnquiries > 0 ? Number(((convertedEnquiries / totalEnquiries) * 100).toFixed(1)) : 0,
        bookingsByStatus: toMap(bookingsByStatus),
        billing: {
          totalBilled: billing.totalBilled,
          totalReceived: billing.totalReceived,
          totalOutstanding: billing.totalOutstanding,
          invoiceCount: billing.invoiceCount,
        },
      },
    });
  } catch (err) {
    console.error("admin reports summary error", err);
    return res.status(500).json({ success: false, error: "Failed to load report summary." });
  }
});

// --- Monthly revenue trend, based on invoice date ---
router.get("/revenue", async (req, res) => {
  try {
    await connectToDatabase();
    const months = Math.min(24, Math.max(1, parseInt(req.query.months, 10) || 6));
    const since = new Date();
    since.setMonth(since.getMonth() - (months - 1));
    since.setDate(1);
    since.setHours(0, 0, 0, 0);

    const rows = await Invoice.aggregate([
      { $match: { invoiceDate: { $gte: since } } },
      {
        $group: {
          _id: { year: { $year: "$invoiceDate" }, month: { $month: "$invoiceDate" } },
          billed: { $sum: "$total" },
          received: { $sum: "$amountReceived" },
          invoiceCount: { $sum: 1 },
        },
      },
      { $sort: { "_id.year": 1, "_id.month": 1 } },
    ]);

    return res.json({
      success: true,
      revenue: rows.map((r) => ({
        year: r._id.year,
        month: r._id.month,
        billed: r.billed,
        received: r.received,
        invoiceCount: r.invoiceCount,
      })),
    });
  } catch (err) {
    console.error("admin reports revenue error", err);
    return res.status(500).json({ success: false, error: "Failed to load revenue report." });
  }
});

// --- Most-booked vehicles ---
router.get("/top-vehicles", async (req, res) => {
  try {
    await connectToDatabase();
    const limit = Math.min(20, Math.max(1, parseInt(req.query.limit, 10) || 5));

    // vehicles is an array of booked-vehicle line items, each holding a
    // snapshot (not a live reference) — unwind + group by the snapshot's
    // vehicleId so a vehicle later edited or deleted still shows up
    // under the name it had at booking time.
    const rows = await Booking.aggregate([
      { $match: { status: { $ne: "CANCELLED" } } },
      { $unwind: "$vehicles" },
      {
        $group: {
          _id: "$vehicles.vehicle.vehicleId",
          name: { $first: "$vehicles.vehicle.name" },
          bookingCount: { $sum: 1 },
        },
      },
      { $sort: { bookingCount: -1 } },
      { $limit: limit },
    ]);

    return res.json({
      success: true,
      vehicles: rows.map((r) => ({
        vehicleId: r._id ? r._id.toString() : null,
        name: r.name || "Unknown vehicle",
        bookingCount: r.bookingCount,
      })),
    });
  } catch (err) {
    console.error("admin reports top-vehicles error", err);
    return res.status(500).json({ success: false, error: "Failed to load top vehicles." });
  }
});


// --- Management report: daily / weekly / monthly ---
function periodBounds(period) {
  const now = new Date();
  const end = new Date(now);
  end.setHours(23, 59, 59, 999);
  const start = new Date(now);
  if (period === "daily") {
    start.setHours(0, 0, 0, 0);
  } else if (period === "weekly") {
    const day = start.getDay();
    const diff = day === 0 ? 6 : day - 1; // Monday-start week
    start.setDate(start.getDate() - diff);
    start.setHours(0, 0, 0, 0);
  } else {
    start.setDate(1);
    start.setHours(0, 0, 0, 0);
  }
  return { start, end };
}

async function buildManagementReport(period) {
  const safePeriod = ["daily", "weekly", "monthly"].includes(period) ? period : "daily";
  const { start, end } = periodBounds(safePeriod);
  await connectToDatabase();

  const [enquiriesByStatus, bookingCount, bookingMoney, invoiceMoney] = await Promise.all([
    Enquiry.aggregate([
      { $match: { createdAt: { $gte: start, $lte: end } } },
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]),
    Booking.countDocuments({ createdAt: { $gte: start, $lte: end }, status: { $ne: "CANCELLED" } }),
    Booking.aggregate([
      { $match: { createdAt: { $gte: start, $lte: end }, status: { $ne: "CANCELLED" } } },
      { $group: {
        _id: null,
        amountReceived: { $sum: "$pricing.amountReceived" },
        amountPending: { $sum: "$pricing.balanceAmount" },
      } },
    ]),
    Invoice.aggregate([
      { $match: { invoiceDate: { $gte: start, $lte: end }, status: { $ne: "VOID" } } },
      { $group: {
        _id: null,
        amountReceived: { $sum: "$amountReceived" },
        amountPending: { $sum: "$balance" },
      } },
    ]),
  ]);

  const statusMap = enquiriesByStatus.reduce((acc, row) => {
    acc[row._id || "UNKNOWN"] = row.count;
    return acc;
  }, {});
  const money = bookingMoney[0] || {};
  const invoice = invoiceMoney[0] || {};
  return {
    period: safePeriod,
    from: start.toISOString(),
    to: end.toISOString(),
    enquiries: Object.values(statusMap).reduce((a, b) => a + b, 0),
    acceptedForBooking: (statusMap.SELECTED_FOR_BOOKING || 0) + (statusMap.CONVERTED || 0),
    bookingsDone: bookingCount,
    amountReceived: invoice.amountReceived ?? money.amountReceived ?? 0,
    amountPending: invoice.amountPending ?? money.amountPending ?? 0,
    enquiriesByStatus: statusMap,
  };
}

router.get("/management", async (req, res) => {
  try {
    const report = await buildManagementReport(req.query.period || "daily");
    return res.json({ success: true, report });
  } catch (err) {
    console.error("admin management report error", err);
    return res.status(500).json({ success: false, error: "Failed to generate management report." });
  }
});

router.get("/management.csv", async (req, res) => {
  try {
    const report = await buildManagementReport(req.query.period || "daily");
    const rows = [
      ["Period", "From", "To", "Enquiries", "Accepted for Booking", "Bookings Done", "Amount Received (INR)", "Amount Pending (INR)"],
      [report.period, report.from, report.to, report.enquiries, report.acceptedForBooking, report.bookingsDone, report.amountReceived, report.amountPending],
    ];
    const csv = rows.map((row) => row.map((value) => `"${String(value ?? "").replace(/"/g, '""')}"`).join(",")).join("\n");
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="kuwarji-management-${report.period}.csv"`);
    return res.send(csv);
  } catch (err) {
    console.error("admin management csv error", err);
    return res.status(500).json({ success: false, error: "Failed to export management report." });
  }
});

module.exports = router;
