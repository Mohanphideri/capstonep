const { Notification } = require("../models/Notification");
const { User } = require("../models/User");

/**
 * Low-level, best-effort notification write. Never throws — callers
 * fire-and-forget this so a notification failure can never break the
 * booking/refund/complaint flow that triggered it (same philosophy as
 * EmailLog). Silently no-ops when there's no account to notify (e.g. a
 * guest enquiry submitted without logging in).
 *
 * Prefer the event-shaped helpers below (notifyCustomer / notifyAdmin /
 * createBookingNotification / createEnquiryNotification /
 * createComplaintNotification / createReviewNotification) over calling
 * this directly — they keep the "what happened" -> "what the customer
 * sees" mapping in one place instead of duplicated at each call site.
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
  if (!userId) return null;
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

/**
 * Notify a single customer. Thin, named wrapper around createNotification
 * so call sites read as "an event happened" rather than a raw DB write.
 */
async function notifyCustomer(opts) {
  return createNotification(opts);
}

/**
 * Notify every SuperAdmin account (the only admin role — see
 * models/User.js) about an event staff should see in their own bell
 * menu: a new enquiry, a new complaint, a customer-initiated
 * cancellation, and so on. Cheap fan-out; there is only ever a
 * handful of admin accounts.
 */
async function notifyAdmin({ type, title, message, bookingId = null, enquiryId = null, complaintId = null, refundId = null, metadata = {} }) {
  try {
    const admins = await User.find({ role: "super_admin", isActive: true }).select("_id").lean();
    await Promise.all(
      admins.map((a) =>
        createNotification({ userId: a._id, type, channel: "IN_APP", title, message, bookingId, enquiryId, complaintId, refundId, metadata })
      )
    );
  } catch (err) {
    console.error("[notify] failed to notify admins", err.message);
  }
}

// --- Booking events -------------------------------------------------
// One place that knows what a booking-lifecycle event should say to the
// customer. Routes just say *what happened* (event name + the booking
// document) instead of writing their own title/message every time.
const BOOKING_EVENT_COPY = {
  CREATED: (b) => ({ title: "Booking received", message: `Your booking ${b.bookingId} has been created by Kuwarji Travels.` }),
  CONFIRMED: (b) => ({ title: "Booking confirmed", message: `Your booking ${b.bookingId} has been confirmed by Kuwarji Travels.` }),
  CANCELLED: (b) => ({
    title: "Booking cancelled",
    message:
      b.refundAmount > 0
        ? `Your booking ${b.bookingId} has been cancelled. Your refundable amount will be processed within ${b.refundExpectedDays || "5–7 business days"}.`
        : `Your booking ${b.bookingId} has been cancelled.`,
  }),
  IN_PROGRESS: (b) => ({ title: "Journey started", message: `Your journey for booking ${b.bookingId} is now underway. Have a safe trip!` }),
  COMPLETED: (b) => ({ title: "Journey completed", message: `Your journey for booking ${b.bookingId} is complete. We'd love to hear how it went — you can leave a review anytime.` }),
  ADVANCE_RECEIVED: (b) => ({ title: "Advance received", message: `We've recorded your advance payment for booking ${b.bookingId}.` }),
};

async function createBookingNotification(event, booking, extra = {}) {
  const build = BOOKING_EVENT_COPY[event];
  if (!build || !booking) return null;
  const { title, message } = build(booking);
  return notifyCustomer({
    userId: booking.userId,
    type: `BOOKING_${event}`,
    title,
    message,
    bookingId: booking._id,
    ...extra,
  });
}

// --- Enquiry events --------------------------------------------------
// Only statuses that mean something to the customer get a copy entry —
// e.g. nothing is sent for the initial NEW status (the confirmation
// email already covers that) or for the internal BOOKING status (the
// booking-created notification covers that instead).
const ENQUIRY_STATUS_COPY = {
  BOOKED: (e) => ({ title: "Enquiry update", message: `Your enquiry ${e.enquiryId} has received a quotation from our team — we'll be in touch shortly.` }),
  CLOSED: (e) => ({ title: "Enquiry closed", message: `Your enquiry ${e.enquiryId} has been closed.` }),
  CANCELLED: (e) => ({ title: "Enquiry cancelled", message: `Your enquiry ${e.enquiryId} has been cancelled.` }),
};

async function createEnquiryNotification(event, enquiry, extra = {}) {
  if (!enquiry) return null;
  if (event === "STATUS_UPDATED") {
    const build = ENQUIRY_STATUS_COPY[enquiry.status];
    if (!build) return null;
    const { title, message } = build(enquiry);
    return notifyCustomer({ userId: enquiry.userId, type: `ENQUIRY_${enquiry.status}`, title, message, enquiryId: enquiry._id, ...extra });
  }
  if (event === "NOTE_ADDED") {
    return notifyCustomer({
      userId: enquiry.userId,
      type: "ENQUIRY_REPLY",
      title: "Enquiry update",
      message: `Our team replied to your enquiry ${enquiry.enquiryId}.`,
      enquiryId: enquiry._id,
      ...extra,
    });
  }
  return null;
}

// --- Complaint events --------------------------------------------------
const COMPLAINT_EVENT_COPY = {
  CREATED: (c) => ({ title: "Complaint received", message: `Your ticket ${c.ticketId} has been logged.` }),
  STATUS_UPDATED: (c) => ({ title: "Issue updated", message: `Your issue ${c.ticketId} is now ${String(c.status).replace(/_/g, " ").toLowerCase()}.` }),
  MESSAGE_ADDED: (c) => ({ title: "Kuwarji support replied", message: `There is a new reply on issue ${c.ticketId}.` }),
};

async function createComplaintNotification(event, complaint, extra = {}) {
  const build = COMPLAINT_EVENT_COPY[event];
  if (!build || !complaint) return null;
  const { title, message } = build(complaint);
  const userId = complaint.userId?._id || complaint.userId;
  return notifyCustomer({
    userId,
    type: `COMPLAINT_${event}`,
    title,
    message,
    complaintId: complaint._id,
    bookingId: complaint.bookingId?._id || complaint.bookingId || null,
    ...extra,
  });
}

// --- Review events --------------------------------------------------
const REVIEW_EVENT_COPY = {
  SUBMITTED: () => ({ title: "Review submitted", message: "Thanks for your review — it will appear once it's been moderated." }),
  APPROVED: () => ({ title: "Your review is live", message: "Your review has been approved and is now visible to other travellers." }),
};

async function createReviewNotification(event, review, extra = {}) {
  const build = REVIEW_EVENT_COPY[event];
  if (!build || !review) return null;
  const { title, message } = build(review);
  return notifyCustomer({
    userId: review.userId,
    type: `REVIEW_${event}`,
    title,
    message,
    metadata: { reviewId: review._id?.toString?.() },
    ...extra,
  });
}

module.exports = {
  createNotification,
  notifyCustomer,
  notifyAdmin,
  createBookingNotification,
  createEnquiryNotification,
  createComplaintNotification,
  createReviewNotification,
};
