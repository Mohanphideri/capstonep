const mongoose = require("mongoose");

const EmailLogSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null, index: true },
    bookingId: { type: mongoose.Schema.Types.ObjectId, ref: "Booking", default: null, index: true },
    recipient: { type: String, required: true },
    template: { type: String, required: true },
    status: { type: String, enum: ["SENT", "FAILED"], required: true },
    providerMessageId: { type: String, default: null },
    sentAt: { type: Date, default: null },
    failureReason: { type: String, default: null },
  },
  { timestamps: true }
);

const EmailLog = mongoose.models.EmailLog || mongoose.model("EmailLog", EmailLogSchema);

module.exports = { EmailLog };
