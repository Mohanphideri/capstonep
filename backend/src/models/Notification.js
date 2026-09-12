const mongoose = require("mongoose");

// In-app / logged notification record. Sending the notification over a
// given channel (email is already handled separately by EmailLog; SMS/
// push are future work) is not implemented in this phase — this is the
// storage model so booking/enquiry/complaint/refund events have somewhere
// to write a notification record to.
const NotificationSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    type: { type: String, required: true, trim: true },
    channel: {
      type: String,
      enum: ["IN_APP", "EMAIL", "SMS", "WHATSAPP"],
      default: "IN_APP",
    },
    title: { type: String, required: true, trim: true },
    message: { type: String, required: true, trim: true },

    bookingId: { type: mongoose.Schema.Types.ObjectId, ref: "Booking", default: null, index: true },
    enquiryId: { type: mongoose.Schema.Types.ObjectId, ref: "Enquiry", default: null },
    complaintId: { type: mongoose.Schema.Types.ObjectId, ref: "Complaint", default: null },
    refundId: { type: mongoose.Schema.Types.ObjectId, ref: "Refund", default: null },

    status: {
      type: String,
      enum: ["PENDING", "SENT", "FAILED", "READ"],
      default: "PENDING",
      index: true,
    },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
    readAt: { type: Date, default: null },
  },
  { timestamps: true }
);

NotificationSchema.index({ userId: 1, status: 1, createdAt: -1 });

const Notification = mongoose.models.Notification || mongoose.model("Notification", NotificationSchema);

module.exports = { Notification };
