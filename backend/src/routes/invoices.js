const express = require("express");
const mongoose = require("mongoose");
const { connectToDatabase } = require("../lib/mongodb");
const { Invoice } = require("../models/Invoice");
const { generateInvoicePdf } = require("../lib/pdf");
const { requireAuth } = require("../middleware/requireAuth");

const router = express.Router();

// Customer-facing invoice API — view + download only. Invoices are only
// ever created by the SuperAdmin (routes/adminInvoices.js). Ownership is
// always verified server-side against req.session.userId; a customer-
// supplied invoice ID never proves ownership by itself (spec §28/§38).

function isValidId(id) {
  return mongoose.Types.ObjectId.isValid(id);
}

function serializeInvoice(inv) {
  return {
    id: inv._id.toString(),
    invoiceNumber: inv.invoiceNumber,
    bookingId: inv.bookingId?.toString(),
    invoiceDate: inv.invoiceDate,
    lineItems: inv.lineItems,
    subtotal: inv.subtotal,
    discount: inv.discount,
    tax: inv.tax,
    total: inv.total,
    amountReceived: inv.amountReceived,
    balance: inv.balance,
    status: inv.status,
  };
}

router.get("/", requireAuth, async (req, res) => {
  try {
    await connectToDatabase();
    const invoices = await Invoice.find({ userId: req.session.userId }).sort({ createdAt: -1 }).lean();
    return res.json({ success: true, invoices: invoices.map(serializeInvoice) });
  } catch (err) {
    console.error("invoice list error", err);
    return res.status(500).json({ success: false, error: "Failed to load invoices." });
  }
});

router.get("/:id", requireAuth, async (req, res) => {
  try {
    const query = isValidId(req.params.id) ? { _id: req.params.id } : { invoiceNumber: req.params.id };
    await connectToDatabase();
    const invoice = await Invoice.findOne(query).lean();
    if (!invoice || invoice.userId.toString() !== req.session.userId) {
      return res.status(404).json({ success: false, error: "Invoice not found." });
    }
    return res.json({ success: true, invoice: serializeInvoice(invoice) });
  } catch (err) {
    console.error("invoice detail error", err);
    return res.status(500).json({ success: false, error: "Failed to load invoice." });
  }
});

router.get("/:id/pdf", requireAuth, async (req, res) => {
  try {
    const query = isValidId(req.params.id) ? { _id: req.params.id } : { invoiceNumber: req.params.id };
    await connectToDatabase();
    const invoice = await Invoice.findOne(query).lean();
    if (!invoice || invoice.userId.toString() !== req.session.userId) {
      return res.status(404).json({ success: false, error: "Invoice not found." });
    }
    const pdfBuffer = await generateInvoicePdf(invoice);
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${invoice.invoiceNumber}.pdf"`);
    return res.send(pdfBuffer);
  } catch (err) {
    console.error("invoice pdf error", err);
    return res.status(500).json({ success: false, error: "Failed to generate PDF." });
  }
});

module.exports = router;
