import mongoose from 'mongoose';

const salarySlipSchema = new mongoose.Schema(
  {
    staffId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    month: {
      type: Number, // 1-12
      required: true,
      min: 1,
      max: 12,
    },
    year: {
      type: Number,
      required: true,
    },
    basicSalary: {
      type: Number,
      required: true,
    },
    bonus: {
      type: Number,
      default: 0,
    },
    deductions: {
      type: Number,
      default: 0,
    },
    netPay: {
      type: Number,
      required: true,
    },
    status: {
      type: String,
      enum: ['pending', 'paid'],
      default: 'pending',
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

// One slip per staff member per month/year
salarySlipSchema.index({ staffId: 1, month: 1, year: 1 }, { unique: true });

export default mongoose.model('SalarySlip', salarySlipSchema);
