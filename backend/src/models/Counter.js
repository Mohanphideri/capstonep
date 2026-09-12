const mongoose = require("mongoose");

// Backs atomic sequence generation for public-facing IDs (bookingId,
// enquiry-style IDs, ticketId, refundId). One document per counter key
// (e.g. "booking:20260819"), incremented with a single atomic
// findOneAndUpdate so two concurrent requests can never get the same
// sequence number.
const CounterSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  seq: { type: Number, default: 0 },
});

const Counter = mongoose.models.Counter || mongoose.model("Counter", CounterSchema);

async function nextSequence(key) {
  const doc = await Counter.findByIdAndUpdate(
    key,
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );
  return doc.seq;
}

module.exports = { Counter, nextSequence };
