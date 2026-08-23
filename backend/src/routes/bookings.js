const express = require("express");
const { connectToDatabase } = require("../lib/mongodb");
const { Booking } = require("../models/Booking");
const { Invoice } = require("../models/Invoice");
const { generateBookingPdf } = require("../lib/pdf");
const { getSiteSettings } = require("../lib/siteSettings");
const { requireAuth } = require("../middleware/requireAuth");

const router = express.Router();

// Customer-facing bookings API.
//
// There is NO customer checkout here — bookings are created only by the
// SuperAdmin (see routes/adminBookings.js). Everything below is
// read-only from the customer's point of view, and every query is
// scoped to req.session.userId so a customer can never see another
// customer's booking (spec §38/§68).

function serializeBooking(b, invoiceSummary) {
  return {
    bookingId: b.bookingId,
    status: b.status,
    vehicles: (b.vehicles || []).map((v) => v.vehicle),
    journey: b.journey,
    pricing: b.pricing,
    bookingDate: b.bookingDate,
    terms: b.terms,
    invoice: invoiceSummary || null,
    createdAt: b.createdAt,
  };
}

// --- Authenticated: list own bookings ---
router.get("/", requireAuth, async (req, res) => {
  try {
    await connectToDatabase();
    const filter = { userId: req.session.userId };
    const scope = req.query.scope;
    const now = new Date();
    if (scope === "upcoming") {
      filter["journey.journeyStart"] = { $gte: now };
      filter.status = { $in: ["DRAFT", "CONFIRMED", "IN_PROGRESS"] };
    } else if (scope === "past" || scope === "completed") {
      filter.status = { $in: ["COMPLETED"] };
    } else if (scope === "cancelled") {
      filter.status = { $in: ["CANCELLED"] };
    }

    const bookings = await Booking.find(filter).sort({ createdAt: -1 }).lean();
    const invoices = await Invoice.find({ bookingId: { $in: bookings.map((b) => b._id) } })
      .select("invoiceNumber bookingId total balance status")
      .lean();
    const invoiceByBooking = new Map(invoices.map((i) => [i.bookingId.toString(), i]));

    return res.json({
      success: true,
      bookings: bookings.map((b) =>
        serializeBooking(b, invoiceByBooking.get(b._id.toString()) || null)
      ),
    });
  } catch (err) {
    console.error("booking list error", err);
    return res.status(500).json({ success: false, error: "Failed to load bookings." });
  }
});

// --- Authenticated: booking detail (ownership enforced) ---
router.get("/:bookingId", requireAuth, async (req, res) => {
  try {
    await connectToDatabase();
    const booking = await Booking.findOne({ bookingId: req.params.bookingId }).lean();
    if (!booking || booking.userId.toString() !== req.session.userId) {
      return res.status(404).json({ success: false, error: "Booking not found." });
    }
    const invoice = await Invoice.findOne({ bookingId: booking._id })
      .select("invoiceNumber bookingId total balance status")
      .lean();
    return res.json({ success: true, booking: serializeBooking(booking, invoice) });
  } catch (err) {
    console.error("booking detail error", err);
    return res.status(500).json({ success: false, error: "Failed to load booking." });
  }
});

// --- Authenticated: download booking PDF (ownership enforced) ---
router.get("/:bookingId/pdf", requireAuth, async (req, res) => {
  try {
    await connectToDatabase();
    const booking = await Booking.findOne({ bookingId: req.params.bookingId }).lean();
    if (!booking || booking.userId.toString() !== req.session.userId) {
      return res.status(404).json({ success: false, error: "Booking not found." });
    }
    const pdfSettings = await getSiteSettings();
    booking.businessSnapshot = { ...(booking.businessSnapshot || {}), authorizedSignatory: pdfSettings.authorizedSignatory ? { ...pdfSettings.authorizedSignatory, signatureUrl: pdfSettings.signatureUrl } : null };
    const pdfBuffer = await generateBookingPdf(booking);
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${booking.bookingId}.pdf"`);
    return res.send(pdfBuffer);
  } catch (err) {
    console.error("booking pdf error", err);
    return res.status(500).json({ success: false, error: "Failed to generate PDF." });
  }
});

module.exports = router;
