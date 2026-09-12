const { nextSequence } = require("../models/Counter");

const ALPHANUMERIC = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

function datePrefix(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}${m}${d}`;
}

function randomCode(length = 4) {
  let out = "";
  for (let i = 0; i < length; i += 1) {
    out += ALPHANUMERIC[Math.floor(Math.random() * ALPHANUMERIC.length)];
  }
  return out;
}

/**
 * Generates a booking ID in the required format KT-YYYYMMDD-XXXX, where
 * XXXX is a random 4-character alphanumeric code (spec §17). Never derived
 * from the Mongo _id and never accepted from the client — always
 * generated here, server-side, at booking-creation time.
 *
 * Collisions are checked against the live Booking collection and a new
 * code is drawn if one occurs (extremely unlikely at 36^4 ~= 1.68M
 * combinations per day, but checked defensively per spec).
 */
async function generateBookingId() {
  // Lazy require to avoid a circular dependency (Booking model doesn't
  // depend on this file, but keeping this local is cheap and safe).
  const { Booking } = require("../models/Booking");
  const prefix = datePrefix();
  for (let attempt = 0; attempt < 10; attempt += 1) {
    const candidate = `KT-${prefix}-${randomCode(4)}`;
    // eslint-disable-next-line no-await-in-loop
    const existing = await Booking.findOne({ bookingId: candidate }).select("_id").lean();
    if (!existing) return candidate;
  }
  throw new Error("Could not generate a unique booking ID. Please try again.");
}

async function generateTicketId() {
  const prefix = datePrefix();
  const seq = await nextSequence(`complaint:${prefix}`);
  return `CMP-${prefix}${String(seq).padStart(4, "0")}`;
}

async function generateEnquiryId() {
  const prefix = datePrefix();
  const seq = await nextSequence(`enquiry:${prefix}`);
  return `ENQ-${prefix}${String(seq).padStart(4, "0")}`;
}

/**
 * Generates an invoice number in the format KT-INV-YYYY-XXXX, sequential
 * within the calendar year (spec §26). Never derived from the Mongo _id.
 */
async function generateInvoiceNumber() {
  const year = new Date().getFullYear();
  const seq = await nextSequence(`invoice:${year}`);
  return `KT-INV-${year}-${String(seq).padStart(4, "0")}`;
}

module.exports = {
  generateBookingId,
  generateTicketId,
  generateEnquiryId,
  generateInvoiceNumber,
};
