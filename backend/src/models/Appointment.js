import mongoose from 'mongoose';

const appointmentSchema = new mongoose.Schema(
  {
    appointmentCode: {
      type: String,
      unique: true,
      sparse: true,
      index: true,
    },
    patientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Patient',
      required: true,
    },
    doctorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    department: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Department',
      required: true,
    },
    slotTime: {
      type: Date,
      required: true,
    },
    status: {
      type: String,
      enum: ['booked', 'completed', 'cancelled', 'no-show'],
      default: 'booked',
    },
    notes: String,
    cancelReason: String,
    cancelNote: String,
    cancelledBy: {
      type: mongoose.Schema.Types.ObjectId,
      refPath: 'cancelledByModel',
    },
    cancelledByModel: {
      type: String,
      enum: ['Patient', 'User'],
    },
    cancelledAt: Date,
  },
  { timestamps: true }
);

export default mongoose.model('Appointment', appointmentSchema);
