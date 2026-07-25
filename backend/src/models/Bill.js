import mongoose from 'mongoose';

const billSchema = new mongoose.Schema(
  {
    billNumber: {
      type: String,
      unique: true,
      index: true,
    },
    appointmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Appointment',
      default: null,
    },
    // Set instead of appointmentId when this is an inpatient discharge bill.
    admissionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Admission',
      default: null,
    },
    patientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Patient',
      required: true,
    },
    prescriptionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Prescription',
      default: null,
    },
    // Individual line items - medicines actually dispensed, each priced at the
    // time the bill was cut (so later inventory price changes don't rewrite history).
    items: [
      {
        description: String,
        quantity: Number,
        unitPrice: Number,
        amount: Number,
      },
    ],
    medicinesTotal: {
      type: Number,
      default: 0,
    },
    // Doctor's consultation fee, charged whether or not the patient takes medicine.
    consultationFee: {
      type: Number,
      default: 0,
    },
    // Flat fee applied when the patient doesn't take any medicine (no line items) -
    // e.g. a simple visit/application charge.
    applicationFee: {
      type: Number,
      default: 0,
    },
    totalAmount: {
      type: Number,
      required: true,
    },
    paymentMethod: {
      type: String,
      enum: ['cash', 'card', 'upi', 'other'],
      default: 'cash',
    },
    status: {
      type: String,
      enum: ['unpaid', 'paid'],
      default: 'unpaid',
    },
    notes: String,
    generatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    paidAt: Date,
  },
  { timestamps: true }
);

export default mongoose.model('Bill', billSchema);
