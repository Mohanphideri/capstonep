import mongoose from 'mongoose';

const admissionSchema = new mongoose.Schema(
  {
    patientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Patient',
      required: true,
    },
    wardId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Ward',
      required: true,
    },
    // Subdocument _id of the specific bed inside ward.beds
    bedId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
    admittingDoctorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    // If this admission followed an OPD visit, link back to it.
    originatingAppointmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Appointment',
      default: null,
    },
    admissionDate: {
      type: Date,
      default: Date.now,
    },
    dischargeDate: Date,
    status: {
      type: String,
      enum: ['admitted', 'discharged'],
      default: 'admitted',
    },
    reasonForAdmission: {
      type: String,
      required: true,
    },
    diagnosis: String,
    dischargeSummary: {
      summary: String,
      followUpInstructions: String,
      dischargedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      dischargedAt: Date,
    },
    transfers: [
      {
        fromWardId: { type: mongoose.Schema.Types.ObjectId, ref: 'Ward' },
        fromBedId: mongoose.Schema.Types.ObjectId,
        toWardId: { type: mongoose.Schema.Types.ObjectId, ref: 'Ward' },
        toBedId: mongoose.Schema.Types.ObjectId,
        reason: String,
        transferredBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        transferredAt: { type: Date, default: Date.now },
      },
    ],
    admittedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  { timestamps: true }
);

export default mongoose.model('Admission', admissionSchema);
