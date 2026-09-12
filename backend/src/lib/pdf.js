const PDFDocument = require("pdfkit");
const QRCode = require("qrcode");
const path = require("path");

const BRAND_LOGO_PATH = path.join(__dirname, "../../assets/kuwarji-travels-logo.png");
const BRAND_ICON_PATH = path.join(__dirname, "../../assets/kuwarji-travels-icon.png");

const PAGE_WIDTH = 595;
const PAGE_HEIGHT = 842;
const MARGIN_X = 46;
const CONTENT_BOTTOM = 745; // leave room for the (taller, well-structured) footer band below this
const FOOTER_TOP = 752;

const BRAND_RED = "#c31f14";
const BRAND_RED_DARK = "#9c190f";
const INK = "#1b1f2a";
const INK_SOFT = "#4c5876";
const MUTED = "#7a8398";
const HAIRLINE = "#e3e6ee";
const TINT_RED = "#fdf1f0";
const TINT_NAVY = "#f2f4f8";
const PANEL = "#f7f8fb";

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

function formatDateTime(d) {
  if (!d) return "-";
  return new Date(d).toLocaleString("en-IN", {
    day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

function money(value) {
  const n = Number(value || 0);
  return `Rs. ${n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function drawWatermark(doc) {
  doc.save();
  doc.rotate(-32, { origin: [PAGE_WIDTH / 2, PAGE_HEIGHT / 2] });
  doc.font("Helvetica-Bold").fontSize(64).fillColor(BRAND_RED).fillOpacity(0.035);
  doc.text("KUWARJI TRAVELS", -60, 300, { width: PAGE_WIDTH + 120, align: "center" });
  doc.fillOpacity(1);
  doc.restore();
}

function drawPageFrame(doc) {
  doc.rect(14, 14, PAGE_WIDTH - 28, PAGE_HEIGHT - 28).lineWidth(0.75).strokeColor("#dfe3ec").stroke();
}

// Simplified, decluttered header: brand mark on the left, contact details on
// the right, and the document title as a solid tab in the corner. No
// subtitle line, no address line, and no "computer generated" badge here —
// that housekeeping note now lives in the footer where it belongs.
function drawHeader(doc, title, business = {}) {
  drawPageFrame(doc);
  drawWatermark(doc);

  doc.rect(0, 0, PAGE_WIDTH, 92).fill("#ffffff");
  doc.rect(0, 0, PAGE_WIDTH, 5).fill(BRAND_RED);
  try {
    doc.image(BRAND_LOGO_PATH, 42, 30, { fit: [180, 38], align: "left", valign: "center" });
  } catch {
    doc.fillColor(BRAND_RED).font("Helvetica-Bold").fontSize(18).text(business.name || "Kuwarji Travels", 46, 34);
  }

  doc.roundedRect(388, 26, 161, 28, 6).fill(BRAND_RED);
  doc.font("Helvetica-Bold").fontSize(11.5).fillColor("#ffffff").text(title, 388, 36, { width: 161, align: "center" });

  const contactBits = [business.phone ? `Phone: ${business.phone}` : null, business.email ? `Email: ${business.email}` : null].filter(Boolean);
  if (contactBits.length) {
    doc.font("Helvetica").fontSize(7.4).fillColor(MUTED).text(contactBits.join("   \u2022   "), 279, 62, { width: 270, align: "right" });
  }

  doc.moveTo(46, 92).lineTo(549, 92).strokeColor(HAIRLINE).lineWidth(1).stroke();
}

function sectionTitle(doc, title, y) {
  doc.rect(MARGIN_X, y + 1, 3, 10).fill(BRAND_RED);
  doc.font("Helvetica-Bold").fontSize(10).fillColor(INK).text(title.toUpperCase(), MARGIN_X + 10, y, { characterSpacing: 0.4 });
  doc.moveTo(MARGIN_X, y + 15).lineTo(549, y + 15).strokeColor(HAIRLINE).stroke();
  return y + 30;
}

// A taller, clearly organised footer: a closing message, then a three-column
// meta row (reference / generated timestamp / page number), then the
// "computer generated" disclaimer sitting at the very bottom where it stays
// out of the way of the main content.
function drawFooter(doc, text, pageLabel, docNumber, disclaimer) {
  const top = FOOTER_TOP;
  doc.moveTo(MARGIN_X, top).lineTo(549, top).strokeColor(HAIRLINE).lineWidth(1).stroke();

  doc.font("Helvetica").fontSize(8).fillColor(INK_SOFT).text(text, MARGIN_X, top + 10, { width: 503, align: "center", lineGap: 1 });
  const msgHeight = doc.heightOfString(text, { width: 503, lineGap: 1 });

  const metaY = top + 16 + msgHeight;
  doc.moveTo(MARGIN_X, metaY - 6).lineTo(549, metaY - 6).strokeColor(HAIRLINE).dash(1.5, { space: 1.5 }).stroke();
  doc.undash();

  const colWidth = 503 / 3;
  doc.font("Helvetica-Bold").fontSize(7).fillColor(MUTED)
    .text(docNumber ? `REF: ${docNumber}` : "", MARGIN_X, metaY, { width: colWidth, align: "left", characterSpacing: 0.3 });
  doc.font("Helvetica").fontSize(7).fillColor(MUTED)
    .text(`Generated ${formatDateTime(new Date())}`, MARGIN_X + colWidth, metaY, { width: colWidth, align: "center" });
  doc.font("Helvetica-Bold").fontSize(7).fillColor(MUTED)
    .text(pageLabel || "", MARGIN_X + colWidth * 2, metaY, { width: colWidth, align: "right", characterSpacing: 0.3 });

  const bottomY = metaY + 16;
  doc.font("Helvetica-Oblique").fontSize(6.6).fillColor("#adb4c4")
    .text(disclaimer || "Kuwarji Travels, India \u2014 this is a computer generated document.", MARGIN_X, bottomY, { width: 503, align: "center" });
}

function finalizeFooters(doc, text, docNumber, disclaimer) {
  const range = doc.bufferedPageRange();
  for (let i = 0; i < range.count; i++) {
    doc.switchToPage(range.start + i);
    drawFooter(doc, text, range.count > 1 ? `Page ${i + 1} of ${range.count}` : "Page 1 of 1", docNumber, disclaimer);
  }
}

function drawPolicyBox(doc, { x, width, y, heading, items, tint, dot }) {
  const lineHeight = 13;
  const wrapped = items.map((item) => ({
    item,
    lines: Math.ceil(doc.font("Helvetica").fontSize(8.5).heightOfString(item, { width: width - 34 }) / lineHeight) || 1,
  }));
  const bodyHeight = wrapped.reduce((sum, w) => sum + w.lines * lineHeight + 4, 0);
  const boxHeight = 34 + bodyHeight + 10;

  doc.roundedRect(x, y, width, boxHeight, 8).fill(tint);
  doc.roundedRect(x, y, width, boxHeight, 8).lineWidth(0.75).strokeColor(dot === BRAND_RED ? "#f2c9c4" : "#c9d3ea").stroke();
  doc.font("Helvetica-Bold").fontSize(9.5).fillColor(INK).text(heading, x + 16, y + 14, { width: width - 32 });

  let iy = y + 34;
  wrapped.forEach(({ item, lines }) => {
    doc.circle(x + 20, iy + 5, 2.6).fill(dot);
    doc.font("Helvetica").fontSize(8.5).fillColor(INK_SOFT).text(item, x + 32, iy, { width: width - 48, lineGap: 1 });
    iy += lines * lineHeight + 4;
  });

  return y + boxHeight;
}

function drawSignatureBlock(doc, { x, width, y, imageBuffer, name, designation }) {
  const boxBottom = y + 54;
  if (imageBuffer) {
    try {
      doc.image(imageBuffer, x, y, { fit: [width, 44], align: "center", valign: "bottom" });
    } catch {}
  }
  doc.moveTo(x + width * 0.15, boxBottom).lineTo(x + width * 0.85, boxBottom).strokeColor("#c7cee0").stroke();
  doc.font("Helvetica-Bold").fontSize(9).fillColor(INK).text(name || "", x, boxBottom + 6, { width, align: "center" });
  doc.font("Helvetica").fontSize(7.5).fillColor(MUTED).text(designation || "Authorised Signatory", x, boxBottom + 19, { width, align: "center" });
}

async function generateQrBuffer(text) {
  try {
    return await QRCode.toBuffer(text, {
      type: "png",
      errorCorrectionLevel: "H", // high redundancy so the centre logo doesn't hurt scannability
      margin: 1,
      scale: 8,
      color: { dark: "#1b1f2a", light: "#ffffff" },
    });
  } catch {
    return null;
  }
}

// QR block, anchored to the bottom-left corner of the content area, with
// the Kuwarji Travels icon dropped into the middle of the code on a small
// white plate (the "H" error-correction level above tolerates this).
function drawQrBlock(doc, { x, y, size = 74, buffer, caption = "Scan to verify" }) {
  if (!buffer) return;
  const padding = 9;
  const boxWidth = size + padding * 2;
  const boxHeight = size + padding * 2 + 14;
  doc.roundedRect(x, y, boxWidth, boxHeight, 8).fill(PANEL);
  doc.roundedRect(x, y, boxWidth, boxHeight, 8).lineWidth(0.75).strokeColor(HAIRLINE).stroke();
  try {
    doc.image(buffer, x + padding, y + padding, { fit: [size, size] });
  } catch {}

  try {
    const logoSize = Math.round(size * 0.3);
    const plateSize = logoSize + 8;
    const cx = x + padding + size / 2;
    const cy = y + padding + size / 2;
    doc.roundedRect(cx - plateSize / 2, cy - plateSize / 2, plateSize, plateSize, 4).fill("#ffffff");
    doc.image(BRAND_ICON_PATH, cx - logoSize / 2, cy - logoSize / 2, { fit: [logoSize, logoSize] });
  } catch {}

  doc.font("Helvetica-Bold").fontSize(6.6).fillColor(MUTED)
    .text(caption.toUpperCase(), x, y + padding + size + 3, { width: boxWidth, align: "center", characterSpacing: 0.6 });
}

function ensureSpace(doc, y, needed, headerFn) {
  if (y + needed > CONTENT_BOTTOM) {
    doc.addPage();
    if (headerFn) headerFn();
    return 104;
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

  const j = booking.journey || {};
  const p = booking.pricing || {};
  const customer = booking.customerSnapshot || {};
  const statusUp = String(booking.status || "CONFIRMED").toUpperCase();
  const qrText = [
    "KUWARJI TRAVELS - BOOKING VOUCHER",
    `Booking ID: ${booking.bookingId || "-"}`,
    `Customer: ${customer.name || "-"}`,
    `Phone: ${customer.phone ? `+91 ${customer.phone}` : "-"}`,
    `Route: ${j.pickup || "-"} -> ${j.destination || "-"}`,
    `Journey Date: ${formatDate(j.journeyStart)}`,
    `Passengers: ${j.passengers ?? "-"}`,
    `Total Amount: ${money(p.totalAmount)}`,
    `Status: ${statusUp}`,
  ].join("\n");
  const qrBuffer = await generateQrBuffer(qrText);

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margin: 0, bufferPages: true, info: { Title: `Booking Voucher ${booking.bookingId || ""}`.trim(), Author: "Kuwarji Travels" } });
    const chunks = [];
    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const renderHeader = () => drawHeader(doc, "BOOKING VOUCHER", booking.businessSnapshot || {});
    renderHeader();

    doc.fillColor(INK).font("Helvetica-Bold").fontSize(9).text("BOOKING ID", 46, 104);
    doc.font("Helvetica-Bold").fontSize(16).fillColor(INK).text(booking.bookingId || "-", 46, 118);
    doc.font("Helvetica").fontSize(9).fillColor(INK_SOFT).text(`Booked on ${formatDate(booking.bookingDate || booking.createdAt)}`, 46, 142);

    const statusColors = { CONFIRMED: ["#e4f6f3", "#0b7d72"], CANCELLED: ["#fdecea", "#b3261e"], COMPLETED: ["#eef1fb", "#2e3a8c"], PENDING: ["#fff6e5", "#96650a"] };
    const [badgeBg, badgeFg] = statusColors[statusUp] || ["#f0f4fb", INK_SOFT];
    doc.roundedRect(414, 108, 135, 34, 17).fill(badgeBg);
    doc.fillColor(badgeFg).font("Helvetica-Bold").fontSize(9).text(statusUp, 414, 120, { width: 135, align: "center" });

    let y = sectionTitle(doc, "Customer", 174);
    doc.font("Helvetica-Bold").fontSize(10).fillColor(INK).text(customer.name || "-", 46, y);
    doc.font("Helvetica").fontSize(9).fillColor(INK_SOFT).text(`Mobile: ${customer.phone ? `+91 ${customer.phone}` : "-"}`, 46, y + 17);
    if (customer.email) doc.text(`Email: ${customer.email}`, 46, y + 32);

    y = sectionTitle(doc, "Journey", y + 55);
    y = drawJourneyPanel(doc, { x: 46, y, width: 503, journey: j });

    y = sectionTitle(doc, "Vehicle(s)", y + 15);
    (booking.vehicles || []).forEach((bv) => {
      y = ensureSpace(doc, y, 48, renderHeader);
      const v = bv.vehicle || {};
      doc.roundedRect(46, y - 4, 503, 39, 7).fill(PANEL);
      doc.roundedRect(46, y - 4, 3, 39).fill(BRAND_RED);
      doc.font("Helvetica-Bold").fontSize(9).fillColor(INK).text(v.name || "-", 58, y + 3, { width: 300 });
      doc.font("Helvetica").fontSize(8).fillColor(MUTED).text(`${v.category || "-"} \u00b7 ${v.capacity || "-"} seats \u00b7 ${v.acType || "-"}`, 58, y + 18, { width: 400 });
      y += 48;
    });
    if (!(booking.vehicles || []).length) {
      doc.font("Helvetica").fontSize(9).fillColor(MUTED).text("Vehicle details unavailable", 46, y);
      y += 30;
    }

    y = ensureSpace(doc, y, 150, renderHeader);
    y = sectionTitle(doc, "Amount summary", y + 6);
    doc.font("Helvetica").fontSize(9).fillColor(INK_SOFT).text("Total trip amount", 46, y);
    doc.font("Helvetica").fontSize(9).fillColor(INK).text(money(p.totalAmount), 380, y, { width: 169, align: "right" });
    y += 20;
    doc.font("Helvetica").fontSize(9).fillColor(INK_SOFT).text("Amount received", 46, y);
    doc.font("Helvetica").fontSize(9).fillColor(INK).text(money(p.amountReceived), 380, y, { width: 169, align: "right" });
    y += 22;

    doc.moveTo(46, y).lineTo(549, y).strokeColor(HAIRLINE).lineWidth(1).stroke();
    y += 12;
    doc.font("Helvetica-Bold").fontSize(11).fillColor(BRAND_RED_DARK).text("BALANCE DUE", 46, y);
    doc.font("Helvetica-Bold").fontSize(14).fillColor(BRAND_RED_DARK).text(money(p.balanceAmount), 330, y - 2, { width: 219, align: "right" });
    y += 26;

    if (signatory?.active !== false && (signatureBuffer || signatory?.fullName || signatory?.designation)) {
      y = ensureSpace(doc, y, 112, renderHeader);
      drawSignatureBlock(doc, { x: 390, width: 150, y: y + 20, imageBuffer: signatureBuffer, name: signatory.fullName, designation: signatory.designation });
      drawQrBlock(doc, { x: 46, y, buffer: qrBuffer, caption: "Scan to verify" });
    }

    doc.addPage();
    drawHeader(doc, "BOOKING VOUCHER", booking.businessSnapshot || {});
    y = 108;

    if (booking.terms) {
      y = sectionTitle(doc, "Terms & notes", y + 4);
      doc.font("Helvetica").fontSize(8.5).fillColor(INK_SOFT).text(booking.terms, 46, y, { width: 503, lineGap: 2 });
      y += doc.heightOfString(booking.terms, { width: 503, lineGap: 2 }) + 15;
    }

    const prohibited = booking.policies?.prohibited?.length ? booking.policies.prohibited : DEFAULT_PROHIBITED;
    const notes = booking.policies?.notes?.length ? booking.policies.notes : DEFAULT_NOTES;
    y = ensureSpace(doc, y, 60, renderHeader);
    y = sectionTitle(doc, "Booking policies", y + 6);
    const colWidth = (503 - 16) / 2;
    const bottomLeft = drawPolicyBox(doc, {
      x: 46, width: colWidth, y, heading: "Not permitted", items: prohibited, tint: TINT_RED, dot: BRAND_RED,
    });
    const bottomRight = drawPolicyBox(doc, {
      x: 46 + colWidth + 16, width: colWidth, y, heading: "Please note", items: notes, tint: TINT_NAVY, dot: "#244a9b",
    });
    y = Math.max(bottomLeft, bottomRight) + 24;

    finalizeFooters(
      doc,
      "Thank you for choosing Kuwarji Travels. This voucher is your proof of booking — please carry a printed or digital copy during your trip.",
      booking.bookingId,
      "Kuwarji Travels, India \u2014 this is a computer generated document and requires no physical signature."
    );
    doc.end();
  });
}

// A clearer journey block: pickup and destination are drawn as two ends of
// a route line, with the matching date/time sitting directly beneath each
// end so "from" pairs visually with pickup and "to" pairs with destination.
function drawJourneyPanel(doc, { x, y, width, journey: j }) {
  const height = 118;
  doc.roundedRect(x, y, width, height, 8).fill(PANEL);
  doc.roundedRect(x, y, width, height, 8).lineWidth(0.75).strokeColor(HAIRLINE).stroke();

  const leftX = x + 14;
  const rightX = x + width / 2 + 10;
  const colWidth = width / 2 - 28;
  const routeY = y + 15;
  const pillWidth = 62;
  const routeRightEnd = x + width - 16;

  // A slim route line linking the two stops, with a passenger-count pill
  // sitting on top of it at the midpoint — a single visual thread that
  // makes clear pickup and destination are two ends of one trip.
  doc.circle(leftX + 3, routeY, 3.2).lineWidth(1.2).strokeColor(BRAND_RED).stroke();
  doc.moveTo(leftX + 10, routeY).lineTo(x + width / 2 - pillWidth / 2 - 6, routeY)
    .strokeColor("#c9d3ea").dash(2, { space: 2 }).lineWidth(1).stroke();
  doc.moveTo(x + width / 2 + pillWidth / 2 + 6, routeY).lineTo(routeRightEnd - 9, routeY)
    .strokeColor("#c9d3ea").dash(2, { space: 2 }).lineWidth(1).stroke();
  doc.undash();
  doc.polygon([routeRightEnd - 9, routeY - 4], [routeRightEnd - 1, routeY], [routeRightEnd - 9, routeY + 4]).fill(BRAND_RED);
  doc.circle(routeRightEnd + 3, routeY, 3.2).fill(BRAND_RED);

  doc.roundedRect(x + width / 2 - pillWidth / 2, routeY - 9, pillWidth, 18, 9).fill("#ffffff");
  doc.roundedRect(x + width / 2 - pillWidth / 2, routeY - 9, pillWidth, 18, 9).lineWidth(0.75).strokeColor(HAIRLINE).stroke();
  doc.font("Helvetica-Bold").fontSize(7.6).fillColor(INK).text(`${j.passengers ?? "-"} PAX`, x + width / 2 - pillWidth / 2, routeY - 4, { width: pillWidth, align: "center" });

  const labelY = y + 32;
  const cityY = y + 44;
  doc.font("Helvetica-Bold").fontSize(8).fillColor(MUTED).text("PICKUP", leftX, labelY, { characterSpacing: 0.4 });
  doc.font("Helvetica-Bold").fontSize(12.5).fillColor(INK).text(j.pickup || "-", leftX, cityY, { width: colWidth });

  doc.font("Helvetica-Bold").fontSize(8).fillColor(MUTED).text("DESTINATION", rightX, labelY, { width: colWidth, align: "right", characterSpacing: 0.4 });
  doc.font("Helvetica-Bold").fontSize(12.5).fillColor(INK).text(j.destination || "-", rightX, cityY, { width: colWidth, align: "right" });

  doc.moveTo(x + 14, y + 74).lineTo(x + width - 14, y + 74).strokeColor(HAIRLINE).stroke();

  doc.font("Helvetica-Bold").fontSize(7.6).fillColor(MUTED).text("DEPARTS", leftX, y + 84, { characterSpacing: 0.4 });
  doc.font("Helvetica-Bold").fontSize(10.5).fillColor(INK_SOFT).text(`${formatDate(j.journeyStart)}${j.pickupTime ? `  \u00b7  ${j.pickupTime}` : ""}`, leftX, y + 97, { width: colWidth });

  doc.font("Helvetica-Bold").fontSize(7.6).fillColor(MUTED).text(j.journeyEnd ? "RETURNS" : "TRIP TYPE", rightX, y + 84, { width: colWidth, align: "right", characterSpacing: 0.4 });
  doc.font("Helvetica-Bold").fontSize(10.5).fillColor(INK_SOFT).text(j.journeyEnd ? formatDate(j.journeyEnd) : "One way", rightX, y + 97, { width: colWidth, align: "right" });

  return y + height;
}

async function generateInvoicePdf(invoice) {
  const signatureBuffer = await fetchImageBuffer(invoice.businessSnapshot?.signatureUrl);

  const biz = invoice.businessSnapshot || {};
  const cust = invoice.customerSnapshot || {};
  const qrText = [
    "KUWARJI TRAVELS - PROFORMA INVOICE",
    `Invoice No: ${invoice.invoiceNumber || "-"}`,
    `Date: ${formatDate(invoice.invoiceDate)}`,
    `Bill To: ${cust.name || "-"}`,
    `Total: ${money(invoice.total)}`,
    `Amount Received: ${money(invoice.amountReceived)}`,
    `Balance Due: ${money(invoice.balance)}`,
  ].join("\n");
  const qrBuffer = await generateQrBuffer(qrText);

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margin: 0, bufferPages: true, info: { Title: `Proforma Invoice ${invoice.invoiceNumber || ""}`.trim(), Author: "Kuwarji Travels" } });
    const chunks = [];
    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const renderHeader = () => drawHeader(doc, "PROFORMA INVOICE", biz);
    renderHeader();

    doc.font("Helvetica-Bold").fontSize(9).fillColor(INK).text("INVOICE NUMBER", 46, 112);
    doc.font("Helvetica-Bold").fontSize(13).fillColor(INK).text(invoice.invoiceNumber || "-", 46, 128);
    doc.font("Helvetica-Bold").fontSize(9).fillColor(INK).text("INVOICE DATE", 400, 112, { width: 149, align: "right" });
    doc.font("Helvetica").fontSize(10).fillColor(INK_SOFT).text(formatDate(invoice.invoiceDate), 400, 128, { width: 149, align: "right" });

    const drawTableHeaderRow = (top) => {
      doc.roundedRect(46, top, 503, 25, 4).fill(BRAND_RED);
      doc.font("Helvetica-Bold").fontSize(8).fillColor("#ffffff").text("DESCRIPTION", 58, top + 8);
      doc.text("AMOUNT", 430, top + 8, { width: 108, align: "right" });
      return top + 25;
    };

    let y = sectionTitle(doc, "Business", 172);
    doc.font("Helvetica-Bold").fontSize(10).fillColor(INK).text(biz.name || "Kuwarji Travels", 46, y);
    doc.font("Helvetica").fontSize(8.5).fillColor(INK_SOFT);
    let by = y + 15;
    [biz.address, biz.phone ? `Phone: ${biz.phone}` : null, biz.email ? `Email: ${biz.email}` : null, biz.gstNumber ? `GSTIN: ${biz.gstNumber}` : null]
      .filter(Boolean).forEach((line) => { doc.text(line, 46, by); by += 13; });

    y = sectionTitle(doc, "Bill to", Math.max(by + 12, y + 80));
    doc.font("Helvetica-Bold").fontSize(10).fillColor(INK).text(cust.name || "-", 46, y);
    doc.font("Helvetica").fontSize(8.5).fillColor(INK_SOFT);
    let cy = y + 15;
    [cust.phone ? `Mobile: ${cust.phone}` : null, cust.email, cust.address].filter(Boolean).forEach((line) => { doc.text(line, 46, cy); cy += 13; });

    y = sectionTitle(doc, "Line items", Math.max(cy + 12, y + 54));
    let iy = drawTableHeaderRow(y);
    (invoice.lineItems || []).forEach((item, idx) => {
      const rowH = 24;
      if (iy + rowH > CONTENT_BOTTOM) {
        doc.addPage();
        renderHeader();
        y = sectionTitle(doc, "Line items (continued)", 108);
        iy = drawTableHeaderRow(y);
      }
      if (idx % 2 === 0) doc.rect(46, iy, 503, rowH).fill(PANEL);
      doc.font("Helvetica").fontSize(9).fillColor(INK).text(item.description || "-", 58, iy + 7, { width: 350 });
      doc.text(money(item.amount), 430, iy + 7, { width: 108, align: "right" });
      iy += rowH;
    });
    doc.moveTo(46, iy).lineTo(549, iy).strokeColor(HAIRLINE).stroke();

    let summaryY = iy + 15;
    if (summaryY + 130 > CONTENT_BOTTOM) {
      doc.addPage();
      renderHeader();
      summaryY = 118;
    }
    doc.font("Helvetica").fontSize(9).fillColor(INK_SOFT).text("Subtotal", 330, summaryY);
    doc.font("Helvetica").fontSize(9).fillColor(INK).text(money(invoice.subtotal), 430, summaryY, { width: 108, align: "right" });
    let sy = summaryY + 19;
    if (invoice.discount) {
      doc.font("Helvetica").fontSize(9).fillColor(INK_SOFT).text("Discount", 330, sy);
      doc.font("Helvetica").fontSize(9).fillColor(INK).text(`-${money(invoice.discount)}`, 430, sy, { width: 108, align: "right" });
      sy += 19;
    }
    if (invoice.tax) {
      doc.font("Helvetica").fontSize(9).fillColor(INK_SOFT).text("Tax", 330, sy);
      doc.font("Helvetica").fontSize(9).fillColor(INK).text(money(invoice.tax), 430, sy, { width: 108, align: "right" });
      sy += 19;
    }

    sy += 6;
    doc.moveTo(318, sy).lineTo(549, sy).strokeColor(HAIRLINE).lineWidth(1).stroke();
    sy += 12;
    doc.font("Helvetica-Bold").fontSize(11).fillColor(INK).text("TOTAL", 318, sy);
    doc.font("Helvetica-Bold").fontSize(12.5).fillColor(INK).text(money(invoice.total), 400, sy - 1, { width: 149, align: "right" });

    sy += 30;
    doc.font("Helvetica").fontSize(9).fillColor(INK_SOFT).text("Amount received", 318, sy);
    doc.font("Helvetica").fontSize(9).fillColor(INK).text(money(invoice.amountReceived), 400, sy, { width: 149, align: "right" });
    sy += 20;
    doc.moveTo(318, sy - 4).lineTo(549, sy - 4).strokeColor(HAIRLINE).stroke();
    doc.font("Helvetica-Bold").fontSize(11).fillColor(BRAND_RED_DARK).text("BALANCE DUE", 318, sy + 4);
    doc.font("Helvetica-Bold").fontSize(13).fillColor(BRAND_RED_DARK).text(money(invoice.balance), 396, sy + 3, { width: 153, align: "right" });
    sy += 26;

    if (signatureBuffer || biz.signatoryName || biz.signatoryDesignation) {
      sy = ensureSpace(doc, sy, 112, renderHeader);
      drawSignatureBlock(doc, { x: 390, width: 150, y: sy + 20, imageBuffer: signatureBuffer, name: biz.signatoryName, designation: biz.signatoryDesignation });
      drawQrBlock(doc, { x: 46, y: sy, buffer: qrBuffer, caption: "Scan to verify" });
    }

    doc.addPage();
    drawHeader(doc, "PROFORMA INVOICE", biz);
    let y2 = 108;
    if (invoice.terms) {
      y2 = sectionTitle(doc, "Terms & conditions", y2 + 4);
      doc.font("Helvetica").fontSize(8.5).fillColor(INK_SOFT).text(invoice.terms, 46, y2, { width: 503, lineGap: 2 });
      y2 += doc.heightOfString(invoice.terms, { width: 503, lineGap: 2 }) + 15;
    }
    y2 = ensureSpace(doc, y2, 60, renderHeader);
    doc.roundedRect(46, y2, 503, 34, 6).fill(TINT_NAVY);
    doc.font("Helvetica").fontSize(8).fillColor(INK_SOFT).text("This invoice is issued subject to Kuwarji Travels' Terms & Conditions and Booking Policies (pets, alcohol, smoking and other on-board rules), shared with your booking voucher.", 60, y2 + 10, { width: 475, align: "center" });
    y2 += 48;

    if (signatureBuffer || biz.signatoryName || biz.signatoryDesignation) {
      y2 = ensureSpace(doc, y2, 90, renderHeader);
      y2 = sectionTitle(doc, "Authorised signatory", y2 + 6);
      drawSignatureBlock(doc, { x: 369, width: 180, y: y2 + 6, imageBuffer: signatureBuffer, name: biz.signatoryName, designation: biz.signatoryDesignation });
    }

    finalizeFooters(
      doc,
      "This is a system-generated proforma invoice from Kuwarji Travels and does not require a physical signature.",
      invoice.invoiceNumber,
      "Kuwarji Travels, India \u2014 this is a computer generated document and requires no physical signature."
    );
    doc.end();
  });
}

module.exports = { generateBookingPdf, generateInvoicePdf };
