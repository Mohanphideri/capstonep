const { Notification } = require("../models/Notification");

/**
 * Best-effort notification write. Never throws — callers fire-and-forget
 * this so a notification failure can never break the booking/refund/
 * complaint flow that triggered it (same philosophy as EmailLog).
 */
async function createNotification({
  userId,
  type,
  channel = "IN_APP",
  title,
  message,
  bookingId = null,
  enquiryId = null,
  complaintId = null,
  refundId = null,
  metadata = {},
}) {
  try {
    return await Notification.create({
      userId,
      type,
      channel,
      title,
      message,
      bookingId,
      enquiryId,
      complaintId,
      refundId,
      metadata,
      status: "SENT",
    });
  } catch (err) {
    console.error("[notify] failed to create notification", err.message);
    return null;
  }
}

module.exports = { createNotification };
