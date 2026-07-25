import mongoose from 'mongoose';

const patientSchema = new mongoose.Schema(
  {
    phone: {
      type: String,
      unique: true,
      required: true,
    },
    name: String,
    age: Number,
    gender: String,
    email: String,
  },
  { timestamps: true }
);

export default mongoose.model('Patient', patientSchema);
