const PDFDocument = require("pdfkit");
const path = require("path");

const BRAND_LOGO_PATH = path.join(__dirname, "../../assets/kuwarji-travels-logo.png");

const PAGE_WIDTH = 595;
const MARGIN_X = 46;
const CONTENT_BOTTOM = 748; // leave room for the footer band below this

// Standard "do's and don'ts" every Kuwarji Travels booking carries. Kept
// here (not per-booking data) so every voucher is consistent; pass
// `booking.policies = { prohibited: [...], notes: [...] }` from the DB to
// override/extend per booking if ever needed.
const DEFAULT_PROHIBITED = [
  "Pets or animals are not allowed inside the vehicle.",
  "Consumption of alcohol/liquor on board is strictly prohibited.",
  "Smoking or chewing tobacco inside the vehicle is not permitted.",
  "Carrying firearms, explosives or other hazardous material is prohibited.",
];
const DEFAULT_NOTES = [
  "A valid photo ID is required for the lead passenger during the trip.",
  "Please be at the pickup point at least 15 minutes before departure.",
  "Any damage caused to the vehicle will be charged to the customer.",
  "Route, halts and driving hours are at the driver's discretion for safety.",
];

function formatDate(d) {
  if (!d) return "-";
  return new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

// pdfkit's built-in Helvetica uses WinAnsi encoding, which has no glyph for
// the Rupee sign (U+20B9) — it silently drops to a blank/.notdef box. "Rs."
// is plain ASCII and always renders correctly without embedding a font.
function money(value) {
  const n = Number(value || 0);
  return `Rs. ${n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function drawHeader(doc, title, subtitle, business = {}) {
  doc.rect(0, 0, PAGE_WIDTH, 104).fill("#ffffff");
  doc.rect(0, 0, PAGE_WIDTH, 5).fill("#244a9b");
  try {
    doc.image(BRAND_LOGO_PATH, 42, 32, { fit: [225, 42], align: "left", valign: "center" });
  } catch {
    doc.fillColor("#244a9b").font("Helvetica-Bold").fontSize(18).text(business.name || "Kuwarji Travels", 46, 28);
  }
  doc.font("Helvetica").fontSize(8.5).fillColor("#6f7890").text(subtitle || "Travel & vehicle rental", 46, 91);

  doc.roundedRect(345, 26, 204, 30, 6).fill("#f0f4fb");
  doc.font("Helvetica-Bold").fontSize(13).fillColor("#16213a").text(title, 345, 35, { width: 204, align: "center" });

  doc.moveTo(46, 104).lineTo(549, 104).strokeColor("#e8ebf1").stroke();
}

function sectionTitle(doc, title, y) {
  doc.font("Helvetica-Bold").fontSize(10).fillColor("#16213a").text(title.toUpperCase(), MARGIN_X, y);
  doc.moveTo(MARGIN_X, y + 15).lineTo(549, y + 15).strokeColor("#e3e6ee").stroke();
  return y + 30;
}

function drawFooter(doc, text, pageLabel) {
  const y = 770;
  doc.moveTo(MARGIN_X, y).lineTo(549, y).strokeColor("#e3e6ee").stroke();
  doc.font("Helvetica").fontSize(8).fillColor("#7a8398").text(text, MARGIN_X, y + 9, { width: 503, align: "center" });
  if (pageLabel) {
    doc.font("Helvetica").fontSize(7.5).fillColor("#9aa4b8").text(pageLabel, MARGIN_X, y + 22, { width: 503, align: "center" });
  }
}

// Stamps a footer (with "Page X of Y") on every buffered page. Must be
// called right before doc.end() since it relies on bufferPages: true.
function finalizeFooters(doc, text) {
  const range = doc.bufferedPageRange();
  for (let i = 0; i < range.count; i++) {
    doc.switchToPage(range.start + i);
    drawFooter(doc, text, range.count > 1 ? `Page ${i + 1} of ${range.count}` : null);
  }
}

// Draws a bullet list inside a tinted rounded box. Returns the y position
// just below the box.
function drawPolicyBox(doc, { x, width, y, heading, items, tint, dot }) {
  const lineHeight = 13;
  const wrapped = items.map((item) => ({
    item,
    lines: Math.ceil(doc.font("Helvetica").fontSize(8.5).heightOfString(item, { width: width - 34 }) / lineHeight) || 1,
  }));
  const bodyHeight = wrapped.reduce((sum, w) => sum + w.lines * lineHeight + 4, 0);
  const boxHeight = 34 + bodyHeight + 10;

  doc.roundedRect(x, y, width, boxHeight, 8).fill(tint);
  doc.font("Helvetica-Bold").fontSize(9.5).fillColor("#16213a").text(heading, x + 16, y + 14, { width: width - 32 });

  let iy = y + 34;
  wrapped.forEach(({ item, lines }) => {
    doc.circle(x + 20, iy + 5, 2.6).fill(dot);
    doc.font("Helvetica").fontSize(8.5).fillColor("#3c4658").text(item, x + 32, iy, { width: width - 48, lineGap: 1 });
    iy += lines * lineHeight + 4;
  });

  return y + boxHeight;
}

function ensureSpace(doc, y, needed, headerFn) {
  if (y + needed > CONTENT_BOTTOM) {
    doc.addPage();
    if (headerFn) headerFn();
    return 116;
  }
  return y;
}

async function fetchImageBuffer(url) {
  if (!url) return null;
  try {
    const response = await fetch(url);
    if (!response.ok) return null;
    return Buffer.from(await response.arrayBuffer());
  } catch {
    return null;
  }
}

async function generateBookingPdf(booking) {
  const signatory = booking.businessSnapshot?.authorizedSignatory;
  const signatureBuffer = await fetchImageBuffer(signatory?.signatureUrl);
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margin: 0, bufferPages: true });
    const chunks = [];
    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const j = booking.journey || {};
    const p = booking.pricing || {};
    const customer = booking.customerSnapshot || {};
    const renderHeader = () => drawHeader(doc, "BOOKING VOUCHER", "Official trip confirmation document");
    renderHeader();

    doc.fillColor("#16213a").font("Helvetica-Bold").fontSize(9).text("BOOKING ID", 46, 112);
    doc.font("Helvetica-Bold").fontSize(16).text(booking.bookingId || "-", 46, 126);
    doc.font("Helvetica").fontSize(9).fillColor("#4c5876").text(`Booked on ${formatDate(booking.bookingDate || booking.createdAt)}`, 46, 150);
    doc.roundedRect(414, 116, 135, 34, 17).fill("#e4f6f3");
    doc.fillColor("#0b7d72").font("Helvetica-Bold").fontSize(9).text(String(booking.status || "CONFIRMED").toUpperCase(), 414, 128, { width: 135, align: "center" });

    let y = sectionTitle(doc, "Customer", 182);
    doc.font("Helvetica-Bold").fontSize(10).fillColor("#16213a").text(customer.name || "-", 46, y);
    doc.font("Helvetica").fontSize(9).fillColor("#4c5876").text(`Mobile: ${customer.phone ? `+91 ${customer.phone}` : "-"}`, 46, y + 17);
    if (customer.email) doc.text(`Email: ${customer.email}`, 46, y + 32);

    y = sectionTitle(doc, "Journey", y + 55);
    const journeyRows = [
      ["Pickup", j.pickup || "-"],
      ["Destination", j.destination || "-"],
      ["Journey date", `${formatDate(j.journeyStart)}${j.pickupTime ? ` \u00b7 ${j.pickupTime}` : ""}`],
      ["Return date", j.journeyEnd ? formatDate(j.journeyEnd) : "One way"],
      ["Passengers", String(j.passengers ?? "-")],
    ];
    journeyRows.forEach(([label, value]) => {
      doc.font("Helvetica-Bold").fontSize(9).fillColor("#16213a").text(label, 46, y, { width: 105 });
      doc.font("Helvetica").fillColor("#4c5876").text(value, 155, y, { width: 394 });
      y += 19;
    });

    y = sectionTitle(doc, "Vehicle(s)", y + 15);
    (booking.vehicles || []).forEach((bv) => {
      const v = bv.vehicle || {};
      doc.roundedRect(46, y - 4, 503, 39, 7).fill("#f7f8fb");
      doc.font("Helvetica-Bold").fontSize(9).fillColor("#16213a").text(v.name || "-", 58, y + 3, { width: 300 });
      doc.font("Helvetica").fontSize(8).fillColor("#7a8398").text(`${v.category || "-"} \u00b7 ${v.capacity || "-"} seats \u00b7 ${v.acType || "-"}`, 58, y + 18, { width: 400 });
      y += 48;
    });
    if (!(booking.vehicles || []).length) {
      doc.font("Helvetica").fontSize(9).fillColor("#7a8398").text("Vehicle details unavailable", 46, y);
      y += 30;
    }

    y = ensureSpace(doc, y, 130, renderHeader);
    y = sectionTitle(doc, "Amount summary", y + 6);
    const amounts = [
      ["Total trip amount", p.totalAmount],
      ["Amount received", p.amountReceived],
      ["Balance due", p.balanceAmount],
    ];
    amounts.forEach(([label, value], i) => {
      doc.font(i === 2 ? "Helvetica-Bold" : "Helvetica").fontSize(i === 2 ? 11 : 9).fillColor(i === 2 ? "#16213a" : "#4c5876").text(label, 46, y);
      doc.text(money(value), 380, y, { width: 169, align: "right" });
      y += 20;
    });

    if (booking.terms) {
      y = ensureSpace(doc, y, 60, renderHeader);
      y = sectionTitle(doc, "Terms & notes", y + 10);
      doc.font("Helvetica").fontSize(8.5).fillColor("#4c5876").text(booking.terms, 46, y, { width: 503, lineGap: 2 });
      y += doc.heightOfString(booking.terms, { width: 503, lineGap: 2 }) + 15;
    }

    // --- Booking policies: two side-by-side cards, "not permitted" vs "please note" ---
    const prohibited = booking.policies?.prohibited?.length ? booking.policies.prohibited : DEFAULT_PROHIBITED;
    const notes = booking.policies?.notes?.length ? booking.policies.notes : DEFAULT_NOTES;
    y = ensureSpace(doc, y, 150, renderHeader);
    y = sectionTitle(doc, "Booking policies", y + 10);
    const colWidth = (503 - 16) / 2;
    const bottomLeft = drawPolicyBox(doc, {
      x: 46, width: colWidth, y, heading: "Not permitted", items: prohibited, tint: "#fdf1f1", dot: "#c1230f",
    });
    const bottomRight = drawPolicyBox(doc, {
      x: 46 + colWidth + 16, width: colWidth, y, heading: "Please note", items: notes, tint: "#f0f4fb", dot: "#244a9b",
    });
    y = Math.max(bottomLeft, bottomRight) + 18;

    if (signatory?.active !== false && (signatureBuffer || signatory?.fullName || signatory?.designation)) {
      y = ensureSpace(doc, y, 100, renderHeader);
      y = sectionTitle(doc, "Authorised signatory", y);
      if (signatureBuffer) { try { doc.image(signatureBuffer, 414, y + 8, { fit: [110, 48], align: "right", valign: "center" }); } catch { /* invalid signature image should never block the PDF */ } }
      doc.font("Helvetica-Bold").fontSize(8.5).fillColor("#16213a").text(signatory.fullName || "", 390, y + 60, { width: 159, align: "right" });
      doc.font("Helvetica").fontSize(8).fillColor("#4c5876").text(signatory.designation || "Authorised Signatory", 390, y + 75, { width: 159, align: "right" });
    }

    finalizeFooters(doc, "Thank you for choosing Kuwarji Travels.");
    doc.end();
  });
}

async function generateInvoicePdf(invoice) {
  const signatureBuffer = await fetchImageBuffer(invoice.businessSnapshot?.signatureUrl);
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margin: 0, bufferPages: true });
    const chunks = [];
    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const biz = invoice.businessSnapshot || {};
    const cust = invoice.customerSnapshot || {};
    const renderHeader = () => drawHeader(doc, "TAX INVOICE", "Invoice / receipt", biz);
    renderHeader();

    doc.font("Helvetica-Bold").fontSize(9).fillColor("#16213a").text("INVOICE NUMBER", 46, 124);
    doc.font("Helvetica").fontSize(11).text(invoice.invoiceNumber || "-", 46, 140);
    doc.font("Helvetica-Bold").fontSize(9).text("INVOICE DATE", 400, 124, { width: 149, align: "right" });
    doc.font("Helvetica").fontSize(10).text(formatDate(invoice.invoiceDate), 400, 140, { width: 149, align: "right" });

    let y = sectionTitle(doc, "Business", 184);
    doc.font("Helvetica-Bold").fontSize(10).fillColor("#16213a").text(biz.name || "Kuwarji Travels", 46, y);
    doc.font("Helvetica").fontSize(8.5).fillColor("#4c5876");
    let by = y + 16;
    [biz.address, biz.phone ? `Phone: ${biz.phone}` : null, biz.email ? `Email: ${biz.email}` : null, biz.gstNumber ? `GSTIN: ${biz.gstNumber}` : null]
      .filter(Boolean).forEach((line) => { doc.text(line, 46, by); by += 14; });

    y = sectionTitle(doc, "Bill to", Math.max(by + 14, y + 90));
    doc.font("Helvetica-Bold").fontSize(10).fillColor("#16213a").text(cust.name || "-", 46, y);
    doc.font("Helvetica").fontSize(8.5).fillColor("#4c5876");
    let cy = y + 16;
    [cust.phone ? `Mobile: ${cust.phone}` : null, cust.email, cust.address].filter(Boolean).forEach((line) => { doc.text(line, 46, cy); cy += 14; });

    y = sectionTitle(doc, "Line items", Math.max(cy + 14, y + 60));
    const tableTop = y;
    doc.roundedRect(46, tableTop, 503, 25, 4).fill("#244a9b");
    doc.font("Helvetica-Bold").fontSize(8).fillColor("#ffffff");
    doc.text("DESCRIPTION", 58, tableTop + 8);
    doc.text("AMOUNT", 430, tableTop + 8, { width: 108, align: "right" });
    let iy = tableTop + 25;
    (invoice.lineItems || []).forEach((item, idx) => {
      const rowH = 25;
      if (idx % 2 === 0) doc.rect(46, iy, 503, rowH).fill("#f7f9fc");
      doc.font("Helvetica").fontSize(9).fillColor("#16213a").text(item.description || "-", 58, iy + 7, { width: 350 });
      doc.text(money(item.amount), 430, iy + 7, { width: 108, align: "right" });
      iy += rowH;
    });
    doc.moveTo(46, iy).lineTo(549, iy).strokeColor("#e3e6ee").stroke();

    const summaryY = iy + 15;
    doc.font("Helvetica").fontSize(9).fillColor("#4c5876").text("Subtotal", 330, summaryY);
    doc.text(money(invoice.subtotal), 430, summaryY, { width: 108, align: "right" });
    let sy = summaryY + 19;
    if (invoice.discount) {
      doc.text("Discount", 330, sy);
      doc.text(`-${money(invoice.discount)}`, 430, sy, { width: 108, align: "right" });
      sy += 19;
    }
    if (invoice.tax) {
      doc.text("Tax", 330, sy);
      doc.text(money(invoice.tax), 430, sy, { width: 108, align: "right" });
      sy += 19;
    }
    doc.roundedRect(318, sy + 8, 231, 38, 6).fill("#16213a");
    doc.font("Helvetica-Bold").fontSize(11).fillColor("#ffffff").text("TOTAL", 330, sy + 21);
    doc.text(money(invoice.total), 430, sy + 21, { width: 108, align: "right" });

    sy += 52;
    doc.font("Helvetica").fontSize(9).fillColor("#4c5876").text("Amount received", 330, sy);
    doc.text(money(invoice.amountReceived), 430, sy, { width: 108, align: "right" });
    sy += 19;
    doc.font("Helvetica-Bold").fillColor("#16213a").text("Balance due", 330, sy);
    doc.text(money(invoice.balance), 430, sy, { width: 108, align: "right" });

    let y2 = sy + 24;
    if (invoice.terms) {
      y2 = ensureSpace(doc, y2, 60, renderHeader);
      y2 = sectionTitle(doc, "Terms & conditions", y2 + 10);
      doc.font("Helvetica").fontSize(8.5).fillColor("#4c5876").text(invoice.terms, 46, y2, { width: 503, lineGap: 2 });
      y2 += doc.heightOfString(invoice.terms, { width: 503, lineGap: 2 }) + 15;
    } else {
      y2 += 10;
    }
    y2 = ensureSpace(doc, y2, 45, renderHeader);
    doc.roundedRect(46, y2, 503, 30, 6).fill("#f0f4fb");
    doc.font("Helvetica").fontSize(8).fillColor("#4c5876").text("This invoice is issued subject to Kuwarji Travels' Terms & Conditions and Booking Policies (pets, alcohol, smoking and other on-board rules), shared with your booking voucher.", 60, y2 + 9, { width: 475, align: "center" });
    y2 += 45;

    if (signatureBuffer) {
      y2 = ensureSpace(doc, y2, 90, renderHeader);
      y2 = sectionTitle(doc, "Authorised signatory", y2);
      try {
        doc.image(signatureBuffer, 414, y2 + 8, { fit: [110, 48], align: "right", valign: "center" });
      } catch {
        // Invalid/unsupported image data should never prevent invoice generation.
      }
      doc.font("Helvetica-Bold").fontSize(8).fillColor("#16213a").text(biz.signatoryName || "", 390, y2 + 60, { width: 159, align: "right" });
      doc.font("Helvetica").fontSize(7.5).fillColor("#4c5876").text(biz.signatoryDesignation || "Authorised Signatory", 390, y2 + 74, { width: 159, align: "right" });
    }

    finalizeFooters(doc, "This is a system-generated invoice from Kuwarji Travels.");
    doc.end();
  });
}

module.exports = { generateBookingPdf, generateInvoicePdf };
