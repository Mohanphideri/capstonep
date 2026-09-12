const mongoose = require("mongoose");

const CustomerSnapshotSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    phone: { type: String, required: true },
    email: { type: String, default: null },
    address: { type: String, default: null },
  },
  { _id: false }
);

// Business details captured from SiteSettings at generation time — never
// re-read live, so a later change to the business profile can't rewrite
// history on an already-issued invoice (spec §49).
const BusinessSnapshotSchema = new mongoose.Schema(
  {
    name: { type: String, default: "Kuwarji Travels" },
    address: { type: String, default: null },
    phone: { type: String, default: null },
    whatsapp: { type: String, default: null },
    email: { type: String, default: null },
    logoUrl: { type: String, default: null },
    signatureUrl: { type: String, default: null },
    signatoryName: { type: String, default: null },
    signatoryDesignation: { type: String, default: null },
    gstNumber: { type: String, default: null },
  },
  { _id: false }
);

const LineItemSchema = new mongoose.Schema(
  {
    description: { type: String, required: true },
    amount: { type: Number, required: true },
  },
  { _id: false }
);

const InvoiceSchema = new mongoose.Schema(
  {
    // Public-facing number: KT-INV-YYYY-XXXX. Mongo _id is never exposed.
    invoiceNumber: { type: String, required: true, unique: true, index: true },
    bookingId: { type: mongoose.Schema.Types.ObjectId, ref: "Booking", required: true, index: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },

    invoiceDate: { type: Date, default: Date.now },

    customerSnapshot: { type: CustomerSnapshotSchema, required: true },
    businessSnapshot: { type: BusinessSnapshotSchema, default: () => ({}) },

    lineItems: { type: [LineItemSchema], default: [] },

    subtotal: { type: Number, required: true, min: 0 },
    discount: { type: Number, default: 0, min: 0 },
    tax: { type: Number, default: 0, min: 0 },
    total: { type: Number, required: true, min: 0 },
    amountReceived: { type: Number, default: 0, min: 0 },
    balance: { type: Number, default: 0, min: 0 },
    currency: { type: String, default: "INR" },

    terms: { type: String, default: null },

    status: {
      type: String,
      enum: ["GENERATED", "SENT", "VOID"],
      default: "GENERATED",
      index: true,
    },

    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  },
  { timestamps: true }
);

const Invoice = mongoose.models.Invoice || mongoose.model("Invoice", InvoiceSchema);

module.exports = { Invoice };
