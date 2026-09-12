const { env } = require("../env");

// Matches the brand red used across the Kuwarji Travels PDFs/logo, so email
// and documents feel like the same company rather than two different looks.
const BRAND_RED = "#c31f14";

function escapeHtml(str = "") {
  return String(str).replace(/[&<>"']/g, (c) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  }[c]));
}

function formatDate(d) {
  if (!d) return "-";
  return new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function getFrontendBaseUrl() {
  const configured = String(env.frontendUrl || "").split(",")[0].trim();
  return configured.replace(/\/$/, "");
}

// A small, table-based CTA button — built this way (rather than a styled
// <a>/<button>) so it renders as a solid, clickable pill across Outlook,
// Gmail and other clients that strip modern CSS.
function button(label, url) {
  return `<table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:0 auto;">
    <tr>
      <td align="center" style="background:${BRAND_RED};border-radius:24px;">
        <a href="${escapeHtml(url)}" target="_blank" rel="noopener" style="display:inline-block;padding:11px 28px;font-size:13px;font-weight:700;color:#ffffff;text-decoration:none;letter-spacing:.02em;">${escapeHtml(label)}</a>
      </td>
    </tr>
  </table>`;
}

function wrap(bodyHtml, { preheader = "Kuwarji Travels notification", title = "Kuwarji Travels" } = {}) {
  const baseUrl = getFrontendBaseUrl();
  const logoUrl = `${baseUrl}/kuwarji-travels-logo.png`;
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(title)}</title>
</head>
<body style="margin:0;padding:0;background:#f0f2f8;font-family:Arial,Helvetica,sans-serif;color:#172033;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(preheader)}</div>
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#f0f2f8;">
    <tr><td align="center" style="padding:32px 12px;">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:600px;background:#ffffff;border:1px solid #e5eaf2;border-radius:14px;overflow:hidden;box-shadow:0 10px 32px rgba(19,43,79,.10);">
        <tr>
          <td style="background:#0b2a56;padding:22px 28px;">
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
              <tr>
                <td valign="middle">
                  <img src="${escapeHtml(logoUrl)}" alt="Kuwarji Travels" style="display:block;max-width:178px;height:auto;border:0;" />
                </td>
                <td align="right" valign="middle" style="font-size:11px;color:#a9c0e6;font-weight:700;letter-spacing:.08em;">TRAVEL &amp; VEHICLE RENTAL</td>
              </tr>
            </table>
          </td>
        </tr>
        <tr><td style="height:4px;background:${BRAND_RED};font-size:0;line-height:0;">&nbsp;</td></tr>
        <tr><td style="padding:32px 32px 8px;">${bodyHtml}</td></tr>
        <tr>
          <td style="padding:26px 32px 8px;" align="center">
            ${button("Visit our website", baseUrl || "#")}
          </td>
        </tr>
        <tr>
          <td style="padding:22px 32px 28px;">
            <div style="height:1px;background:#e7ebf2;margin-bottom:16px;"></div>
            <p style="margin:0 0 6px;font-size:13px;font-weight:700;color:#172033;">Kuwarji Travels</p>
            <p style="margin:0;font-size:12px;line-height:1.6;color:#718096;">This is an automated transactional email. Please reply to this message if you need assistance.</p>
          </td>
        </tr>
      </table>
      <p style="max-width:600px;margin:16px auto 0;font-size:11px;line-height:1.6;color:#9aa5b8;text-align:center;">&copy; ${new Date().getFullYear()} Kuwarji Travels, India. All rights reserved.</p>
    </td></tr>
  </table>
</body>
</html>`;
}

function heading(title, subtitle = "") {
  return `<h1 style="margin:0 0 8px;font-size:25px;line-height:1.25;color:#102a52;">${escapeHtml(title)}</h1>${subtitle ? `<p style="margin:0 0 24px;font-size:14px;line-height:1.65;color:#667085;">${escapeHtml(subtitle)}</p>` : ""}`;
}

function infoTable(rows) {
  return `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="border-collapse:collapse;background:#f8faff;border:1px solid #e5ebf5;border-radius:12px;overflow:hidden;font-size:13px;">${rows.map(([label, value, strong]) => `<tr><td style="padding:10px 12px;border-bottom:1px solid #e8edf5;color:#667085;width:38%;">${escapeHtml(label)}</td><td style="padding:10px 12px;border-bottom:1px solid #e8edf5;${strong ? `color:${BRAND_RED};font-weight:700;` : "color:#172033;"}">${value}</td></tr>`).join("")}</table>`;
}

function paragraph(html) {
  return `<p style="margin:0 0 16px;font-size:14px;line-height:1.7;color:#344054;">${html}</p>`;
}

function welcomeEmail({ name }) {
  return wrap(`
    ${heading(`Welcome, ${name}`, "Your Kuwarji Travels account is ready.")}
    ${paragraph("Thank you for choosing Kuwarji Travels. You can now browse vehicles, plan journeys and submit enquiries from your customer dashboard.")}
    <div style="padding:14px 16px;background:#eef6ff;border:1px solid #d6e8ff;border-radius:10px;color:#194b85;font-size:13px;">Your account has been successfully completed.</div>
  `, { preheader: "Welcome to Kuwarji Travels" });
}

function enquiryCustomerEmail({ enquiry }) {
  const vehicleNames = (enquiry.selectedVehicles || []).map((v) => v.vehicleSnapshot?.name).filter(Boolean).join(", ") || enquiry.vehicleType || "-";
  return wrap(`
    ${heading(`Enquiry received`, `Thank you, ${enquiry.name}. Our travel team will review your request and contact you soon.`)}
    ${infoTable([
      ["Enquiry ID", escapeHtml(enquiry.enquiryId), true],
      ["Vehicle(s)", escapeHtml(vehicleNames)],
      ["Pickup", escapeHtml(enquiry.pickupLocation || "-")],
      ["Destination", escapeHtml(enquiry.destination || "-")],
      ["Journey date", escapeHtml(enquiry.tripDate || "-")],
      ["Passengers", escapeHtml(enquiry.passengers ?? "-")],
    ])}
  `, { preheader: `Enquiry ${enquiry.enquiryId} received` });
}

function enquirySuperAdminEmail({ enquiry }) {
  const vehicleNames = (enquiry.selectedVehicles || []).map((v) => v.vehicleSnapshot?.name).filter(Boolean).join(", ") || enquiry.vehicleType || "-";
  return wrap(`
    ${heading("New vehicle enquiry", "A new customer enquiry has been submitted on the Kuwarji Travels website.")}
    ${infoTable([
      ["Enquiry ID", escapeHtml(enquiry.enquiryId), true],
      ["Customer", escapeHtml(enquiry.name)],
      ["Mobile", escapeHtml(enquiry.phone)],
      ["Email", escapeHtml(enquiry.email || "-")],
      ["Vehicle(s)", escapeHtml(vehicleNames)],
      ["Pickup", escapeHtml(enquiry.pickupLocation || "-")],
      ["Destination", escapeHtml(enquiry.destination || "-")],
      ["Journey date", escapeHtml(enquiry.tripDate || "-")],
      ["Return date", escapeHtml(enquiry.returnDate || "-")],
      ["Passengers", escapeHtml(enquiry.passengers ?? "-")],
      ["Message", escapeHtml(enquiry.message || "-")],
    ])}
  `, { preheader: `New enquiry ${enquiry.enquiryId}` });
}

function bookingConfirmationEmail({ booking }) {
  const j = booking.journey;
  const p = booking.pricing || {};
  const vehicleNames = (booking.vehicles || []).map((v) => v.vehicle?.name).filter(Boolean).join(", ");
  return wrap(`
    ${heading("Booking confirmed", `Thank you, ${booking.customerSnapshot.name}. Your Kuwarji Travels booking is confirmed.`)}
    ${infoTable([
      ["Booking ID", escapeHtml(booking.bookingId), true],
      ["Vehicle(s)", escapeHtml(vehicleNames || "-")],
      ["Pickup → Destination", `${escapeHtml(j.pickup)} → ${escapeHtml(j.destination)}`],
      ["Journey date", escapeHtml(`${formatDate(j.journeyStart)}${j.journeyEnd ? ` – ${formatDate(j.journeyEnd)}` : ""}`)],
      ["Passengers", escapeHtml(j.passengers ?? "-")],
      ...(p.totalAmount ? [["Total amount", `₹${escapeHtml(p.totalAmount)}`, true]] : []),
    ])}
    ${paragraph("Your booking confirmation PDF is attached to this email for your records.")}
  `, { preheader: `Booking ${booking.bookingId} confirmed` });
}


function adminPhoneChangeOtpEmail({ name, code }) {
  return wrap(`
    ${heading("Verify your admin mobile change", `Hello ${name || "Admin"}, use the verification code below to confirm your new mobile number.`)}
    <div style="margin:22px 0;padding:18px;text-align:center;background:#f5f8fc;border:1px solid #dfe7f2;border-radius:12px;">
      <div style="font-size:11px;color:#667085;text-transform:uppercase;letter-spacing:.12em;font-weight:700;">Verification code</div>
      <div style="margin-top:7px;font-size:32px;line-height:1;font-weight:800;letter-spacing:.18em;color:#102a52;">${escapeHtml(code)}</div>
      <div style="margin-top:9px;font-size:12px;color:#718096;">This code expires in 10 minutes.</div>
    </div>
    ${paragraph("If you did not request this change, do not share this code and review your admin account immediately.")}
  `, { preheader: "Kuwarji Travels admin mobile verification" });
}

function bookingCancellationEmail({ booking }) {
  return wrap(`
    ${heading("Booking cancelled", `Booking ${booking.bookingId} has been cancelled.`)}
    ${booking.cancellationReason ? paragraph(`<strong>Reason:</strong> ${escapeHtml(booking.cancellationReason)}`) : ""}
    ${paragraph("If you have any questions, please contact the Kuwarji Travels team.")}
  `, { preheader: `Booking ${booking.bookingId} cancelled` });
}

function invoiceEmail({ invoice }) {
  return wrap(`
    ${heading("Invoice available", `Your Kuwarji Travels invoice for ${invoice.invoiceNumber} is attached.`)}
    ${infoTable([
      ["Invoice number", escapeHtml(invoice.invoiceNumber), true],
      ["Invoice date", escapeHtml(formatDate(invoice.invoiceDate))],
      ["Total", `₹${escapeHtml(invoice.total)}`, true],
      ["Amount received", `₹${escapeHtml(invoice.amountReceived)}`],
      ["Balance due", `₹${escapeHtml(invoice.balance)}`, true],
    ])}
    ${paragraph("Please keep the attached PDF for your records. For any billing questions, reply to this email or contact Kuwarji Travels.")}
  `, { preheader: `Invoice ${invoice.invoiceNumber}` });
}

module.exports = {
  welcomeEmail,
  enquiryCustomerEmail,
  enquirySuperAdminEmail,
  bookingConfirmationEmail,
  bookingCancellationEmail,
  invoiceEmail,
  adminPhoneChangeOtpEmail,
};
