function wrap(bodyHtml) {
  return `
  <div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto; color: #1a2033;">
    <h2 style="margin-bottom: 4px;">Kuwarji Travels</h2>
    <div style="border-top: 1px solid #ddd; margin: 12px 0;"></div>
    ${bodyHtml}
    <div style="border-top: 1px solid #ddd; margin: 24px 0 12px;"></div>
    <p style="font-size: 12px; color: #777;">This is an automated message from Kuwarji Travels.</p>
  </div>`;
}

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

function welcomeEmail({ name }) {
  return wrap(`
    <p>Hi ${escapeHtml(name)},</p>
    <p>Thank you for showing interest in Kuwarji Travels.</p>
    <p>Your profile is now set up — you can browse our fleet and submit an enquiry anytime.</p>
  `);
}

// --- Enquiry emails (spec §29/§30) ---

function enquiryCustomerEmail({ enquiry }) {
  const vehicleNames = (enquiry.selectedVehicles || [])
    .map((v) => v.vehicleSnapshot?.name)
    .filter(Boolean)
    .join(", ") || enquiry.vehicleType || "-";
  return wrap(`
    <p>Hi ${escapeHtml(enquiry.name)},</p>
    <p>Thank you for showing interest in Kuwarji Travels. We have received your enquiry. Our team will connect with you soon.</p>
    <table style="width:100%; border-collapse: collapse; font-size: 14px;">
      <tr><td style="padding:4px 0; color:#666;">Enquiry ID</td><td style="padding:4px 0; font-weight:bold;">${escapeHtml(enquiry.enquiryId)}</td></tr>
      <tr><td style="padding:4px 0; color:#666;">Vehicle(s)</td><td style="padding:4px 0;">${escapeHtml(vehicleNames)}</td></tr>
      <tr><td style="padding:4px 0; color:#666;">Pickup</td><td style="padding:4px 0;">${escapeHtml(enquiry.pickupLocation || "-")}</td></tr>
      <tr><td style="padding:4px 0; color:#666;">Destination</td><td style="padding:4px 0;">${escapeHtml(enquiry.destination || "-")}</td></tr>
      <tr><td style="padding:4px 0; color:#666;">Journey date</td><td style="padding:4px 0;">${escapeHtml(enquiry.tripDate || "-")}</td></tr>
      <tr><td style="padding:4px 0; color:#666;">Passengers</td><td style="padding:4px 0;">${enquiry.passengers ?? "-"}</td></tr>
    </table>
  `);
}

function enquirySuperAdminEmail({ enquiry }) {
  const vehicleNames = (enquiry.selectedVehicles || [])
    .map((v) => v.vehicleSnapshot?.name)
    .filter(Boolean)
    .join(", ") || enquiry.vehicleType || "-";
  return wrap(`
    <p>A new vehicle enquiry has been submitted.</p>
    <table style="width:100%; border-collapse: collapse; font-size: 14px;">
      <tr><td style="padding:4px 0; color:#666;">Enquiry ID</td><td style="padding:4px 0; font-weight:bold;">${escapeHtml(enquiry.enquiryId)}</td></tr>
      <tr><td style="padding:4px 0; color:#666;">Customer</td><td style="padding:4px 0;">${escapeHtml(enquiry.name)}</td></tr>
      <tr><td style="padding:4px 0; color:#666;">Mobile</td><td style="padding:4px 0;">${escapeHtml(enquiry.phone)}</td></tr>
      <tr><td style="padding:4px 0; color:#666;">Email</td><td style="padding:4px 0;">${escapeHtml(enquiry.email || "-")}</td></tr>
      <tr><td style="padding:4px 0; color:#666;">Vehicle(s)</td><td style="padding:4px 0;">${escapeHtml(vehicleNames)}</td></tr>
      <tr><td style="padding:4px 0; color:#666;">Pickup</td><td style="padding:4px 0;">${escapeHtml(enquiry.pickupLocation || "-")}</td></tr>
      <tr><td style="padding:4px 0; color:#666;">Destination</td><td style="padding:4px 0;">${escapeHtml(enquiry.destination || "-")}</td></tr>
      <tr><td style="padding:4px 0; color:#666;">Journey date</td><td style="padding:4px 0;">${escapeHtml(enquiry.tripDate || "-")}</td></tr>
      <tr><td style="padding:4px 0; color:#666;">Return date</td><td style="padding:4px 0;">${escapeHtml(enquiry.returnDate || "-")}</td></tr>
      <tr><td style="padding:4px 0; color:#666;">Passengers</td><td style="padding:4px 0;">${enquiry.passengers ?? "-"}</td></tr>
      <tr><td style="padding:4px 0; color:#666;">Message</td><td style="padding:4px 0;">${escapeHtml(enquiry.message || "-")}</td></tr>
    </table>
  `);
}

// --- Booking emails (spec §29) — admin-created bookings, no payment ---

function bookingConfirmationEmail({ booking }) {
  const j = booking.journey;
  const p = booking.pricing || {};
  const vehicleNames = (booking.vehicles || []).map((v) => v.vehicle?.name).filter(Boolean).join(", ");
  return wrap(`
    <p>Hi ${escapeHtml(booking.customerSnapshot.name)},</p>
    <p>Your Kuwarji Travels booking is confirmed. Details are below, and a full confirmation is attached as a PDF.</p>
    <table style="width:100%; border-collapse: collapse; font-size: 14px;">
      <tr><td style="padding:4px 0; color:#666;">Booking ID</td><td style="padding:4px 0; font-weight:bold;">${escapeHtml(booking.bookingId)}</td></tr>
      <tr><td style="padding:4px 0; color:#666;">Vehicle(s)</td><td style="padding:4px 0;">${escapeHtml(vehicleNames)}</td></tr>
      <tr><td style="padding:4px 0; color:#666;">Pickup → Destination</td><td style="padding:4px 0;">${escapeHtml(j.pickup)} → ${escapeHtml(j.destination)}</td></tr>
      <tr><td style="padding:4px 0; color:#666;">Journey date</td><td style="padding:4px 0;">${formatDate(j.journeyStart)}${j.journeyEnd ? ` – ${formatDate(j.journeyEnd)}` : ""}</td></tr>
      <tr><td style="padding:4px 0; color:#666;">Passengers</td><td style="padding:4px 0;">${j.passengers}</td></tr>
      ${p.totalAmount ? `<tr><td style="padding:4px 0; color:#666;">Total amount</td><td style="padding:4px 0; font-weight:bold;">₹${p.totalAmount}</td></tr>` : ""}
    </table>
    <p style="margin-top:16px;">If an invoice has been generated for this booking, it will be sent separately and is also available in your customer portal.</p>
  `);
}

function bookingCancellationEmail({ booking }) {
  return wrap(`
    <p>Hi ${escapeHtml(booking.customerSnapshot.name)},</p>
    <p>Your booking <strong>${escapeHtml(booking.bookingId)}</strong> has been cancelled.</p>
    ${booking.cancellationReason ? `<p>Reason: ${escapeHtml(booking.cancellationReason)}</p>` : ""}
    <p>If you have any questions, please contact our team.</p>
  `);
}

// --- Invoice email (spec §27/§29) ---

function invoiceEmail({ invoice }) {
  return wrap(`
    <p>Hi ${escapeHtml(invoice.customerSnapshot.name)},</p>
    <p>Please find your invoice for booking-related services from Kuwarji Travels attached as a PDF.</p>
    <table style="width:100%; border-collapse: collapse; font-size: 14px;">
      <tr><td style="padding:4px 0; color:#666;">Invoice number</td><td style="padding:4px 0; font-weight:bold;">${escapeHtml(invoice.invoiceNumber)}</td></tr>
      <tr><td style="padding:4px 0; color:#666;">Invoice date</td><td style="padding:4px 0;">${formatDate(invoice.invoiceDate)}</td></tr>
      <tr><td style="padding:4px 0; color:#666;">Total</td><td style="padding:4px 0; font-weight:bold;">₹${invoice.total}</td></tr>
      <tr><td style="padding:4px 0; color:#666;">Amount received</td><td style="padding:4px 0;">₹${invoice.amountReceived}</td></tr>
      <tr><td style="padding:4px 0; color:#666;">Balance due</td><td style="padding:4px 0;">₹${invoice.balance}</td></tr>
    </table>
  `);
}

module.exports = {
  welcomeEmail,
  enquiryCustomerEmail,
  enquirySuperAdminEmail,
  bookingConfirmationEmail,
  bookingCancellationEmail,
  invoiceEmail,
};
