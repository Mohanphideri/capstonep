const express = require("express");
const { connectToDatabase } = require("../lib/mongodb");
const { FAQ } = require("../models/FAQ");

const router = express.Router();

router.get("/", async (req, res) => {
  try {
    await connectToDatabase();
    const faqs = await FAQ.find({ isActive: true })
      .sort({ sortOrder: 1, createdAt: 1 })
      .select("question answer category sortOrder")
      .lean();
    return res.json({ success: true, faqs: faqs.map((f) => ({ id: f._id.toString(), question: f.question, answer: f.answer, category: f.category || null })) });
  } catch (err) {
    console.error("public FAQ list error", err);
    return res.status(500).json({ success: false, error: "Failed to load FAQs." });
  }
});

module.exports = router;
