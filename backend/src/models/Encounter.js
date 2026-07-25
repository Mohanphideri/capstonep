import mongoose from 'mongoose';

// A single clinical encounter - one per doctor visit, whether outpatient
// (tied to an Appointment) or inpatient (tied to an Admission). This is the
// actual EMR record: vitals, diagnosis, notes - separate from the
// Prescription (medicines), which can exist alongside it.
const encounterSchema = new mongoose.Schema(
  {
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
    type: {
      type: String,
      enum: ['opd', 'ipd'],
      required: true,
    },
    appointmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Appointment',
      default: null,
    },
    admissionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Admission',
      default: null,
    },
    vitals: {
      temperatureF: Number,
      bloodPressure: String, // e.g. "120/80"
      pulseBpm: Number,
      respiratoryRate: Number,
      spo2: Number,
      weightKg: Number,
      heightCm: Number,
    },
    chiefComplaint: String,
    diagnosis: [
      {
        description: { type: String, required: true },
        icdCode: String,
      },
    ],
    clinicalNotes: String,
    followUpDate: Date,
  },
  { timestamps: true }
);

encounterSchema.index({ patientId: 1, createdAt: -1 });

export default mongoose.model('Encounter', encounterSchema);
