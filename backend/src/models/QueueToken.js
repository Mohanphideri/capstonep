import mongoose from 'mongoose';

const queueTokenSchema = new mongoose.Schema(
  {
    patientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Patient',
      required: true,
    },
    department: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Department',
      required: true,
    },
    tokenNumber: {
      type: Number,
      required: true,
    },
    status: {
      type: String,
      enum: ['waiting', 'in-progress', 'done'],
      default: 'waiting',
    },
    position: Number,
    estimatedWaitTime: Number, // in minutes
  },
  { timestamps: true }
);

export default mongoose.model('QueueToken', queueTokenSchema);
