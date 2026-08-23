const express = require("express");
const { z } = require("zod");
const mongoose = require("mongoose");
const { connectToDatabase } = require("../lib/mongodb");
const { Invoice } = require("../models/Invoice");
const { Booking } = require("../models/Booking");
const { requireSuperAdmin } = require("../middleware/requireAuth");
const { recordAuditLog } = require("../lib/auditLog");
const { generateInvoiceNumber } = require("../lib/publicIds");
const { generateInvoicePdf } = require("../lib/pdf");
const { getSiteSettings } = require("../lib/siteSettings");
const { sendTransactionalEmail } = require("../lib/brevo");
const { invoiceEmail } = require("../lib/emailTemplates");

const router = express.Router();

// Only the SuperAdmin generates or edits invoices (spec §25/§68).
router.use(requireSuperAdmin);

function isValidId(id) {
  return mongoose.Types.ObjectId.isValid(id);
}

function serializeInvoice(inv) {
  return {
    id: inv._id.toString(),
    invoiceNumber: inv.invoiceNumber,
    bookingId: inv.bookingId?.toString(),
    userId: inv.userId?.toString(),
    invoiceDate: inv.invoiceDate,
    customer: inv.customerSnapshot,
    business: inv.businessSnapshot,
    lineItems: inv.lineItems,
    subtotal: inv.subtotal,
    discount: inv.discount,
    tax: inv.tax,
    total: inv.total,
    amountReceived: inv.amountReceived,
    balance: inv.balance,
    status: inv.status,
    terms: inv.terms,
    createdAt: inv.createdAt,
  };
}

// --- List invoices ---
router.get("/", async (req, res) => {
  try {
    await connectToDatabase();
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 25));
    const filter = {};
    if (req.query.bookingId && isValidId(req.query.bookingId)) filter.bookingId = req.query.bookingId;
    if (req.query.search) {
      const term = req.query.search.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      filter.$or = [{ invoiceNumber: new RegExp(term, "i") }, { "customerSnapshot.name": new RegExp(term, "i") }];
    }
    const [items, total] = await Promise.all([
      Invoice.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
      Invoice.countDocuments(filter),
    ]);
    return res.json({ success: true, invoices: items.map(serializeInvoice), page, limit, total });
  } catch (err) {
    console.error("admin invoice list error", err);
    return res.status(500).json({ success: false, error: "Failed to load invoices." });
  }
});

// --- Detail ---
router.get("/:id", async (req, res) => {
  try {
    const query = isValidId(req.params.id) ? { _id: req.params.id } : { invoiceNumber: req.params.id };
    await connectToDatabase();
    const invoice = await Invoice.findOne(query).lean();
    if (!invoice) return res.status(404).json({ success: false, error: "Invoice not found." });
    return res.json({ success: true, invoice: serializeInvoice(invoice) });
  } catch (err) {
    console.error("admin invoice detail error", err);
    return res.status(500).json({ success: false, error: "Failed to load invoice." });
  }
});

// --- Generate an invoice from a booking ---
const lineItemSchema = z.object({ description: z.string().trim().min(1).max(200), amount: z.coerce.number() });
const generateSchema = z.object({
  bookingId: z.string().refine(isValidId, "Invalid booking reference."),
  lineItems: z.array(lineItemSchema).optional(),
  discount: z.coerce.number().min(0).optional(),
  tax: z.coerce.number().min(0).optional(),
  amountReceived: z.coerce.number().min(0).optional(),
  terms: z.string().trim().max(2000).optional().nullable(),
  customerAddress: z.string().trim().max(500).optional().nullable(),
  sendEmail: z.boolean().optional().default(false),
});

router.post("/", async (req, res) => {
  try {
    const parsed = generateSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ success: false, error: parsed.error.issues[0]?.message ?? "Invalid request." });
    }
    const d = parsed.data;
    await connectToDatabase();

    const booking = await Booking.findById(d.bookingId).lean();
    if (!booking) return res.status(404).json({ success: false, error: "Booking not found." });

    // Idempotency (spec §66): one invoice per booking, generated once.
    const existingInvoice = await Invoice.findOne({ bookingId: booking._id }).lean();
    if (existingInvoice) {
      return res.json({ success: true, invoice: serializeInvoice(existingInvoice), alreadyGenerated: true });
    }

    const lineItems =
      d.lineItems && d.lineItems.length
        ? d.lineItems
        : [
            { description: "Rental amount", amount: booking.pricing.rentalAmount || 0 },
            ...(booking.pricing.additionalCharges
              ? [{ description: "Additional charges", amount: booking.pricing.additionalCharges }]
              : []),
          ];
    const subtotal = lineItems.reduce((sum, i) => sum + i.amount, 0);
    const discount = d.discount ?? booking.pricing.discount ?? 0;
    const tax = d.tax ?? booking.pricing.taxAmount ?? 0;
    const total = Math.max(0, subtotal - discount + tax);
    const amountReceived = Math.min(d.amountReceived ?? booking.pricing.amountReceived ?? 0, total);
    const balance = Math.max(0, total - amountReceived);

    const settings = await getSiteSettings();
    const invoiceNumber = await generateInvoiceNumber();

    const invoice = await Invoice.create({
      invoiceNumber,
      bookingId: booking._id,
      userId: booking.userId,
      customerSnapshot: {
        name: booking.customerSnapshot.name,
        phone: booking.customerSnapshot.phone,
        email: booking.customerSnapshot.email,
        address: d.customerAddress || null,
      },
      businessSnapshot: {
        name: settings.businessName,
        address: settings.address,
        phone: settings.phone,
        whatsapp: settings.whatsappNumber,
        email: settings.email,
        logoUrl: settings.logoUrl,
        signatureUrl: settings.signatureUrl,
        signatoryName: settings.authorizedSignatory?.active !== false ? (settings.authorizedSignatory?.fullName || null) : null,
        signatoryDesignation: settings.authorizedSignatory?.active !== false ? (settings.authorizedSignatory?.designation || null) : null,
        gstNumber: settings.gst?.applicable ? settings.gst?.number : null,
      },
      lineItems,
      subtotal,
      discount,
      tax,
      total,
      amountReceived,
      balance,
      terms: d.terms || settings.termsText || null,
      status: "GENERATED",
      createdBy: req.session.userId,
    });

    await recordAuditLog({
      req,
      action: "INVOICE_CREATED",
      entityType: "Invoice",
      entityId: invoice._id,
      metadata: { invoiceNumber: invoice.invoiceNumber, bookingId: booking._id.toString() },
    });

    let emailResult = null;
    if (d.sendEmail && invoice.customerSnapshot.email) {
      try {
        const invoiceObj = invoice.toObject();
        const pdfBuffer = await generateInvoicePdf(invoiceObj);
        emailResult = await sendTransactionalEmail({
          to: invoice.customerSnapshot.email,
          toName: invoice.customerSnapshot.name,
          subject: `Your Kuwarji Travels Invoice — ${invoice.invoiceNumber}`,
          htmlContent: invoiceEmail({ invoice: invoiceObj }),
          template: "invoice_email",
          userId: invoice.userId.toString(),
          bookingId: booking._id.toString(),
          attachments: [{ name: `${invoice.invoiceNumber}.pdf`, content: pdfBuffer.toString("base64") }],
        });
        if (emailResult.sent) await Invoice.updateOne({ _id: invoice._id }, { status: "SENT" });
      } catch (err) {
        console.error("invoice email error", err);
        emailResult = { sent: false, reason: err.message || "Failed to prepare/send invoice email." };
      }
    }

    return res.status(201).json({
      success: true,
      invoice: serializeInvoice(invoice.toObject()),
      email: emailResult ? { sent: !!emailResult.sent, reason: emailResult.reason || null } : null,
    });
  } catch (err) {
    console.error("admin invoice generate error", err);
    return res.status(500).json({ success: false, error: "Failed to generate invoice." });
  }
});

// --- Edit an invoice before finalization ---
const updateSchema = z.object({
  lineItems: z.array(lineItemSchema).optional(),
  discount: z.coerce.number().min(0).optional(),
  tax: z.coerce.number().min(0).optional(),
  amountReceived: z.coerce.number().min(0).optional(),
  terms: z.string().trim().max(2000).optional().nullable(),
  status: z.enum(["GENERATED", "SENT", "VOID"]).optional(),
});

router.patch("/:id", async (req, res) => {
  try {
    if (!isValidId(req.params.id)) return res.status(400).json({ success: false, error: "Invalid invoice id." });
    const parsed = updateSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ success: false, error: parsed.error.issues[0]?.message ?? "Invalid request." });
    }
    const d = parsed.data;
    await connectToDatabase();
    const invoice = await Invoice.findById(req.params.id);
    if (!invoice) return res.status(404).json({ success: false, error: "Invoice not found." });

    if (d.lineItems) {
      invoice.lineItems = d.lineItems;
      invoice.subtotal = d.lineItems.reduce((sum, i) => sum + i.amount, 0);
    }
    if (d.discount !== undefined) invoice.discount = d.discount;
    if (d.tax !== undefined) invoice.tax = d.tax;
    invoice.total = Math.max(0, invoice.subtotal - invoice.discount + invoice.tax);
    if (d.amountReceived !== undefined) invoice.amountReceived = Math.min(d.amountReceived, invoice.total);
    invoice.balance = Math.max(0, invoice.total - invoice.amountReceived);
    if (d.terms !== undefined) invoice.terms = d.terms;
    if (d.status) invoice.status = d.status;

    await invoice.save();

    await recordAuditLog({
      req,
      action: "INVOICE_MODIFIED",
      entityType: "Invoice",
      entityId: invoice._id,
    });

    return res.json({ success: true, invoice: serializeInvoice(invoice.toObject()) });
  } catch (err) {
    console.error("admin invoice update error", err);
    return res.status(500).json({ success: false, error: "Failed to update invoice." });
  }
});

// --- Download PDF ---
router.get("/:id/pdf", async (req, res) => {
  try {
    const query = isValidId(req.params.id) ? { _id: req.params.id } : { invoiceNumber: req.params.id };
    await connectToDatabase();
    const invoice = await Invoice.findOne(query).lean();
    if (!invoice) return res.status(404).json({ success: false, error: "Invoice not found." });
    const pdfBuffer = await generateInvoicePdf(invoice);
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${invoice.invoiceNumber}.pdf"`);
    return res.send(pdfBuffer);
  } catch (err) {
    console.error("admin invoice pdf error", err);
    return res.status(500).json({ success: false, error: "Failed to generate PDF." });
  }
});

// --- Re-send invoice email ---
router.post("/:id/email", async (req, res) => {
  try {
    if (!isValidId(req.params.id)) return res.status(400).json({ success: false, error: "Invalid invoice id." });
    await connectToDatabase();
    const invoice = await Invoice.findById(req.params.id).lean();
    if (!invoice) return res.status(404).json({ success: false, error: "Invoice not found." });
    if (!invoice.customerSnapshot.email) {
      return res.status(400).json({ success: false, error: "This customer has no email on file." });
    }
    const pdfBuffer = await generateInvoicePdf(invoice);
    const result = await sendTransactionalEmail({
      to: invoice.customerSnapshot.email,
      toName: invoice.customerSnapshot.name,
      subject: `Your Kuwarji Travels Invoice — ${invoice.invoiceNumber}`,
      htmlContent: invoiceEmail({ invoice }),
      template: "invoice_email_resend",
      userId: invoice.userId.toString(),
      bookingId: invoice.bookingId.toString(),
      attachments: [{ name: `${invoice.invoiceNumber}.pdf`, content: pdfBuffer.toString("base64") }],
    });
    await recordAuditLog({ req, action: "INVOICE_EMAILED", entityType: "Invoice", entityId: invoice._id });
    if (!result.sent) {
      return res.status(502).json({ success: false, sent: false, error: result.reason || "Brevo failed to send the email." });
    }
    return res.json({ success: true, sent: true, messageId: result.messageId || null });
  } catch (err) {
    console.error("admin invoice email error", err);
    return res.status(500).json({ success: false, error: "Failed to email invoice." });
  }
});

module.exports = router;
