const { env } = require("../env");
const { EmailLog } = require("../models/EmailLog");

/**
 * Sends a transactional email through Brevo's API and always records an
 * EmailLog, whether it succeeds or fails. Never throws — a failed email
 * must never block the booking/enquiry flow that triggered it (per spec
 * §38/§32). If BREVO_API_KEY / BREVO_SENDER_EMAIL aren't configured, this
 * logs FAILED with a clear reason instead of silently pretending success.
 *
 * @param {{
 *   to: string, toName?: string, subject: string, htmlContent: string,
 *   template: string, userId?: string, bookingId?: string,
 *   attachments?: { name: string, content: string }[] // content = base64
 * }} params
 */
async function sendTransactionalEmail({
  to,
  toName,
  subject,
  htmlContent,
  template,
  userId = null,
  bookingId = null,
  attachments,
}) {
  const logBase = { userId, bookingId, recipient: to, template };

  const apiKey = String(env.brevoApiKey || "").trim();
  const senderEmail = String(env.brevoSenderEmail || "").trim();
  const senderName = String(env.brevoSenderName || "Kuwarji Travels").trim();
  const replyToEmail = String(env.brevoReplyToEmail || senderEmail).trim();
  const replyToName = String(env.brevoReplyToName || senderName).trim();

  if (!apiKey || !senderEmail) {
    await EmailLog.create({
      ...logBase,
      status: "FAILED",
      failureReason: "Brevo is not configured (missing BREVO_API_KEY / BREVO_SENDER_EMAIL).",
    });
    return { sent: false, reason: "not_configured" };
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    const response = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        "api-key": apiKey,
      },
      signal: controller.signal,
      body: JSON.stringify({
        sender: { email: senderEmail, name: senderName },
        replyTo: { email: replyToEmail, name: replyToName },
        to: [{ email: to, name: toName || to }],
        subject,
        htmlContent,
        ...(attachments?.length ? { attachment: attachments } : {}),
      }),
    });

    const raw = await response.text();
    clearTimeout(timeout);
    let data = {};
    try { data = raw ? JSON.parse(raw) : {}; } catch { data = { message: raw }; }

    if (!response.ok) {
      await EmailLog.create({
        ...logBase,
        status: "FAILED",
        failureReason: data?.message || `Brevo responded with status ${response.status}.`,
      });
      return { sent: false, reason: data?.message || "brevo_error" };
    }

    await EmailLog.create({
      ...logBase,
      status: "SENT",
      providerMessageId: data?.messageId || null,
      sentAt: new Date(),
    });
    return { sent: true, messageId: data?.messageId || null };
  } catch (err) {
    const failureReason = err?.name === "AbortError"
      ? "Brevo request timed out after 15 seconds."
      : (err.message || "Network error contacting Brevo.");
    await EmailLog.create({
      ...logBase,
      status: "FAILED",
      failureReason,
    });
    return { sent: false, reason: failureReason };
  }
}

module.exports = { sendTransactionalEmail };
