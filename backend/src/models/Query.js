import mongoose from 'mongoose';

const querySchema = new mongoose.Schema(
  {
    ticketId: {
      type: String,
      unique: true,
      index: true,
    },
    patientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Patient',
      required: true,
    },
    subject: {
      type: String,
      required: true,
    },
    message: {
      type: String,
      required: true,
    },
    // Status is managed by admin only.
    status: {
      type: String,
      enum: ['pending', 'in-progress', 'completed', 'closed'],
      default: 'pending',
    },
    // Ticket can be redirected to any staff member (doctor, nurse, receptionist,
    // pharmacist, accountant) - not just doctors. Set by admin only.
    assignedToId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    assignedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    assignedAt: Date,
    // Kept for backward compatibility (last staff reply) - the full back-and-forth now
    // lives in `messages` below.
    reply: String,
    repliedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    repliedAt: Date,
    // Full conversation thread: the patient's original message, any further replies they
    // send, and every staff/admin reply, in chronological order.
    messages: [
      {
        text: { type: String, required: true },
        // Who sent it - either the patient who owns the ticket, or a staff/admin user.
        senderModel: { type: String, enum: ['Patient', 'User'], required: true },
        sender: {
          type: mongoose.Schema.Types.ObjectId,
          refPath: 'messages.senderModel',
          required: true,
        },
        senderName: String,
        senderRole: String, // 'patient', 'admin', 'doctor', 'nurse', etc.
        createdAt: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true }
);

export default mongoose.model('Query', querySchema);
