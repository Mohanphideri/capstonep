const PDFDocument = require("pdfkit");
const path = require("path");

const BRAND_LOGO_PATH = path.join(__dirname, "../../assets/kuwarji-travels-logo.png");

function formatDate(d) {
  if (!d) return "-";
  return new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function money(value) {
  const n = Number(value || 0);
  return `₹${n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function drawHeader(doc, title, subtitle, business = {}) {
  doc.rect(0, 0, 595, 104).fill("#ffffff");
  doc.rect(0, 0, 595, 5).fill("#b51f2a");
  try {
    doc.image(BRAND_LOGO_PATH, 42, 17, { fit: [205, 78], align: "left", valign: "center" });
  } catch {
    doc.fillColor("#b51f2a").font("Helvetica-Bold").fontSize(18).text(business.name || "Kuwarji Travels", 46, 28);
  }
  doc.font("Helvetica").fontSize(8.5).fillColor("#6f7890").text(subtitle || "Travel & vehicle rental", 46, 91);
  doc.font("Helvetica-Bold").fontSize(15).fillColor("#16213a").text(title, 345, 32, { width: 204, align: "right" });
  doc.moveTo(46, 104).lineTo(549, 104).strokeColor("#e8ebf1").stroke();
}

function sectionTitle(doc, title, y) {
  doc.font("Helvetica-Bold").fontSize(10).fillColor("#16213a").text(title.toUpperCase(), 46, y);
  doc.moveTo(46, y + 15).lineTo(549, y + 15).strokeColor("#e3e6ee").stroke();
}

function drawFooter(doc, text = "Thank you for choosing Kuwarji Travels.") {
  const y = 770;
  doc.moveTo(46, y).lineTo(549, y).strokeColor("#e3e6ee").stroke();
  doc.font("Helvetica").fontSize(8).fillColor("#7a8398").text(text, 46, y + 9, { width: 503, align: "center" });
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
    drawHeader(doc, "BOOKING CONFIRMATION", "Official trip document");

    doc.fillColor("#16213a").font("Helvetica-Bold").fontSize(10).text("BOOKING ID", 46, 112);
    doc.font("Helvetica-Bold").fontSize(15).text(booking.bookingId || "-", 46, 128);
    doc.font("Helvetica").fontSize(9).fillColor("#4c5876").text(`Booked on ${formatDate(booking.bookingDate || booking.createdAt)}`, 46, 150);
    doc.roundedRect(424, 116, 125, 34, 17).fill("#e4f6f3");
    doc.fillColor("#0b7d72").font("Helvetica-Bold").fontSize(9).text(String(booking.status || "CONFIRMED"), 424, 128, { width: 125, align: "center" });

    sectionTitle(doc, "Customer", 182);
    doc.font("Helvetica-Bold").fontSize(10).fillColor("#16213a").text(customer.name || "-", 46, 207);
    doc.font("Helvetica").fontSize(9).fillColor("#4c5876").text(`Mobile: ${customer.phone ? `+91 ${customer.phone}` : "-"}`, 46, 224);
    if (customer.email) doc.text(`Email: ${customer.email}`, 46, 239);

    sectionTitle(doc, "Journey", 273);
    const journeyRows = [
      ["Pickup", j.pickup || "-"],
      ["Destination", j.destination || "-"],
      ["Journey date", `${formatDate(j.journeyStart)}${j.pickupTime ? ` · ${j.pickupTime}` : ""}`],
      ["Return date", j.journeyEnd ? formatDate(j.journeyEnd) : "One way"],
      ["Passengers", String(j.passengers ?? "-")],
    ];
    let y = 298;
    journeyRows.forEach(([label, value]) => {
      doc.font("Helvetica-Bold").fontSize(9).fillColor("#16213a").text(label, 46, y, { width: 105 });
      doc.font("Helvetica").fillColor("#4c5876").text(value, 155, y, { width: 394 });
      y += 19;
    });

    sectionTitle(doc, "Vehicle(s)", 408);
    y = 433;
    (booking.vehicles || []).forEach((bv) => {
      const v = bv.vehicle || {};
      doc.roundedRect(46, y - 4, 503, 39, 7).fill("#f7f8fb");
      doc.font("Helvetica-Bold").fontSize(9).fillColor("#16213a").text(v.name || "-", 58, y + 3, { width: 300 });
      doc.font("Helvetica").fontSize(8).fillColor("#7a8398").text(`${v.category || "-"} · ${v.capacity || "-"} seats · ${v.acType || "-"}`, 58, y + 18, { width: 400 });
      y += 48;
    });
    if (!(booking.vehicles || []).length) {
      doc.font("Helvetica").fontSize(9).fillColor("#7a8398").text("Vehicle details unavailable", 46, y);
      y += 30;
    }

    const amountY = Math.min(y + 8, 620);
    sectionTitle(doc, "Amount summary", amountY);
    let ay = amountY + 28;
    const amounts = [
      ["Total trip amount", p.totalAmount],
      ["Amount received", p.amountReceived],
      ["Balance due", p.balanceAmount],
    ];
    amounts.forEach(([label, value], i) => {
      doc.font(i === 2 ? "Helvetica-Bold" : "Helvetica").fontSize(i === 2 ? 11 : 9).fillColor(i === 2 ? "#16213a" : "#4c5876").text(label, 46, ay);
      doc.text(money(value), 430, ay, { width: 119, align: "right" });
      ay += 20;
    });

    if (booking.terms) {
      const termsY = ay + 14;
      sectionTitle(doc, "Terms & notes", termsY);
      doc.font("Helvetica").fontSize(8.5).fillColor("#4c5876").text(booking.terms, 46, termsY + 25, { width: 503, lineGap: 2 });
    }

    if (signatory?.active !== false && (signatureBuffer || signatory?.fullName || signatory?.designation)) {
      const signatureY = 660;
      sectionTitle(doc, "Authorised signatory", signatureY);
      if (signatureBuffer) { try { doc.image(signatureBuffer, 414, signatureY + 23, { fit: [110, 48], align: "right", valign: "center" }); } catch {} }
      doc.font("Helvetica-Bold").fontSize(8.5).fillColor("#16213a").text(signatory.fullName || "", 390, signatureY + 75, { width: 159, align: "right" });
      doc.font("Helvetica").fontSize(8).fillColor("#4c5876").text(signatory.designation || "Authorised Signatory", 390, signatureY + 90, { width: 159, align: "right" });
    }

    drawFooter(doc);
    doc.end();
  });
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
    drawHeader(doc, "TAX INVOICE", "Invoice / receipt", biz);

    doc.font("Helvetica-Bold").fontSize(9).fillColor("#16213a").text("INVOICE NUMBER", 46, 124);
    doc.font("Helvetica").fontSize(11).text(invoice.invoiceNumber || "-", 46, 140);
    doc.font("Helvetica-Bold").fontSize(9).text("INVOICE DATE", 400, 124, { width: 149, align: "right" });
    doc.font("Helvetica").fontSize(10).text(formatDate(invoice.invoiceDate), 400, 140, { width: 149, align: "right" });

    sectionTitle(doc, "Business", 184);
    doc.font("Helvetica-Bold").fontSize(10).fillColor("#16213a").text(biz.name || "Kuwarji Travels", 46, 209);
    doc.font("Helvetica").fontSize(8.5).fillColor("#4c5876");
    let by = 225;
    [biz.address, biz.phone ? `Phone: ${biz.phone}` : null, biz.email ? `Email: ${biz.email}` : null, biz.gstNumber ? `GSTIN: ${biz.gstNumber}` : null]
      .filter(Boolean).forEach((line) => { doc.text(line, 46, by); by += 14; });

    sectionTitle(doc, "Bill to", 282);
    doc.font("Helvetica-Bold").fontSize(10).fillColor("#16213a").text(cust.name || "-", 46, 307);
    doc.font("Helvetica").fontSize(8.5).fillColor("#4c5876");
    let cy = 323;
    [cust.phone ? `Mobile: ${cust.phone}` : null, cust.email, cust.address].filter(Boolean).forEach((line) => { doc.text(line, 46, cy); cy += 14; });

    sectionTitle(doc, "Line items", 367);
    const tableTop = 394;
    doc.rect(46, tableTop, 503, 25).fill("#f0f4fb");
    doc.font("Helvetica-Bold").fontSize(8).fillColor("#4c5876");
    doc.text("DESCRIPTION", 58, tableTop + 8);
    doc.text("AMOUNT", 430, tableTop + 8, { width: 108, align: "right" });
    let iy = tableTop + 35;
    (invoice.lineItems || []).forEach((item) => {
      doc.font("Helvetica").fontSize(9).fillColor("#16213a").text(item.description || "-", 58, iy, { width: 350 });
      doc.text(money(item.amount), 430, iy, { width: 108, align: "right" });
      doc.moveTo(46, iy + 18).lineTo(549, iy + 18).strokeColor("#edf0f5").stroke();
      iy += 25;
    });

    const summaryY = Math.max(iy + 15, 500);
    doc.font("Helvetica").fontSize(9).fillColor("#4c5876").text("Subtotal", 330, summaryY);
    doc.text(money(invoice.subtotal), 430, summaryY, { width: 108, align: "right" });
    if (invoice.discount) {
      doc.text("Discount", 330, summaryY + 19);
      doc.text(`-${money(invoice.discount)}`, 430, summaryY + 19, { width: 108, align: "right" });
    }
    if (invoice.tax) {
      doc.text("Tax", 330, summaryY + 38);
      doc.text(money(invoice.tax), 430, summaryY + 38, { width: 108, align: "right" });
    }
    doc.roundedRect(318, summaryY + 62, 231, 38, 6).fill("#16213a");
    doc.font("Helvetica-Bold").fontSize(11).fillColor("#ffffff").text("TOTAL", 330, summaryY + 75);
    doc.text(money(invoice.total), 430, summaryY + 75, { width: 108, align: "right" });

    doc.font("Helvetica").fontSize(9).fillColor("#4c5876").text("Amount received", 330, summaryY + 113);
    doc.text(money(invoice.amountReceived), 430, summaryY + 113, { width: 108, align: "right" });
    doc.font("Helvetica-Bold").fillColor("#16213a").text("Balance due", 330, summaryY + 132);
    doc.text(money(invoice.balance), 430, summaryY + 132, { width: 108, align: "right" });

    if (invoice.terms) {
      const termsY = Math.min(summaryY + 175, 675);
      sectionTitle(doc, "Terms & conditions", termsY);
      doc.font("Helvetica").fontSize(8.5).fillColor("#4c5876").text(invoice.terms, 46, termsY + 25, { width: 503, lineGap: 2 });
    }

    if (signatureBuffer) {
      const signatureY = Math.min(summaryY + 205, 685);
      sectionTitle(doc, "Authorised signatory", signatureY);
      try {
        doc.image(signatureBuffer, 414, signatureY + 24, { fit: [110, 48], align: "right", valign: "center" });
      } catch {
        // Invalid/unsupported image data should never prevent invoice generation.
      }
      doc.font("Helvetica-Bold").fontSize(8).fillColor("#16213a").text(biz.signatoryName || "", 390, signatureY + 76, { width: 159, align: "right" });
      doc.font("Helvetica").fontSize(7.5).fillColor("#4c5876").text(biz.signatoryDesignation || "Authorised Signatory", 390, signatureY + 90, { width: 159, align: "right" });
    }

    drawFooter(doc, "This is a system-generated invoice from Kuwarji Travels.");
    doc.end();
  });
}

module.exports = { generateBookingPdf, generateInvoicePdf };
