const mongoose = require("mongoose");

const FAQSchema = new mongoose.Schema(
  {
    question: { type: String, required: true, trim: true },
    answer: { type: String, required: true, trim: true },
    category: { type: String, trim: true, default: null, index: true },
    isActive: { type: Boolean, default: true, index: true },
    sortOrder: { type: Number, default: 0 },
  },
  { timestamps: true }
);

FAQSchema.index({ isActive: 1, sortOrder: 1 });

const FAQ = mongoose.models.FAQ || mongoose.model("FAQ", FAQSchema);

module.exports = { FAQ };
