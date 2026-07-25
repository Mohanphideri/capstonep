import mongoose from 'mongoose';

const batchSchema = new mongoose.Schema(
  {
    batchNumber: {
      type: String,
      required: true,
    },
    quantity: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
    price: {
      type: Number,
      required: true,
    },
    expiryDate: {
      type: Date,
      required: true,
    },
    receivedDate: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

const medicineSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    unit: {
      type: String,
      enum: ['tablets', 'ml', 'strips', 'vials', 'capsules'],
      default: 'tablets',
    },
    // Stock is tracked per batch/lot so each purchase keeps its own expiry
    // date and price - dispensing draws from the earliest-expiring batch
    // first (FEFO), and a medicine is only "available" if it has unexpired
    // stock in at least one batch.
    batches: [batchSchema],
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

medicineSchema.virtual('totalQuantity').get(function () {
  const now = new Date();
  return this.batches
    .filter((b) => b.expiryDate >= now)
    .reduce((sum, b) => sum + b.quantity, 0);
});

medicineSchema.virtual('isAvailable').get(function () {
  return this.totalQuantity > 0;
});

// The batch that would be dispensed next (soonest-expiring, in-stock batch) -
// used to show a representative price/expiry in list views.
medicineSchema.virtual('nextBatch').get(function () {
  const now = new Date();
  const usable = this.batches
    .filter((b) => b.expiryDate >= now && b.quantity > 0)
    .sort((a, b) => a.expiryDate - b.expiryDate);
  return usable[0] || null;
});

export default mongoose.model('Medicine', medicineSchema);
