import mongoose from 'mongoose';

const prescriptionSchema = new mongoose.Schema(
  {
    appointmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Appointment',
      required: true,
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
    medicines: [
      {
        medicineId: mongoose.Schema.Types.ObjectId,
        name: String,
        dosage: String,
        quantity: Number,
        availability: {
          type: String,
          enum: ['pending', 'available', 'unavailable'],
          default: 'pending',
        },
      },
    ],
  },
  { timestamps: true }
);

export default mongoose.model('Prescription', prescriptionSchema);
