const mongoose = require("mongoose");

const ComplaintMessageSchema = new mongoose.Schema(
  {
    authorId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    authorRole: { type: String, enum: ["customer", "staff", "admin", "super_admin"], required: true },
    message: { type: String, required: true, trim: true },
    isInternalNote: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const ComplaintSchema = new mongoose.Schema(
  {
    ticketId: { type: String, required: true, unique: true, index: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    bookingId: { type: mongoose.Schema.Types.ObjectId, ref: "Booking", required: true, index: true },
    // Optional vehicle snapshot for bookings containing multiple vehicles.
    // The booking remains the primary issue scope; this only identifies which
    // vehicle the customer is reporting when more than one was booked.
    vehicleIndex: { type: Number, min: 0, default: null },
    vehicleName: { type: String, trim: true, default: "" },
    category: {
      type: String,
      enum: [
        "DRIVER_ISSUE",
        "VEHICLE_CONDITION",
        "DELAY",
        "PICKUP_ISSUE",
        "DROP_ISSUE",
        "PAYMENT_ISSUE",
        "STAFF_BEHAVIOUR",
        "OTHER",
      ],
      required: true,
    },
    subject: { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true },
    attachments: { type: [String], default: [] },
    status: {
      type: String,
      enum: ["OPEN", "IN_REVIEW", "IN_PROGRESS", "RESOLVED", "CLOSED"],
      default: "OPEN",
      index: true,
    },
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    messages: { type: [ComplaintMessageSchema], default: [] },
  },
  { timestamps: true }
);

const Complaint = mongoose.models.Complaint || mongoose.model("Complaint", ComplaintSchema);

module.exports = { Complaint };
