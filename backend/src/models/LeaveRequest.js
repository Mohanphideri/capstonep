import mongoose from 'mongoose';

const leaveRequestSchema = new mongoose.Schema(
  {
    staffId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    fromDate: {
      type: Date,
      required: true,
    },
    toDate: {
      type: Date,
      required: true,
    },
    reason: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
    },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    reviewedAt: Date,
  },
  { timestamps: true }
);

export default mongoose.model('LeaveRequest', leaveRequestSchema);
