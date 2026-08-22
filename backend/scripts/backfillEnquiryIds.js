/**
 * MIGRATION — safe to run multiple times.
 *
 * Assigns a public-facing enquiryId (ENQ<date><seq>-style, same format
 * routes/enquiry.js now generates for new enquiries) to any pre-existing
 * Enquiry document that doesn't have one yet. Existing enquiries were
 * created before the enquiryId field existed, so it's null on them —
 * this script backfills it using each document's own createdAt date
 * (not "today") so IDs stay chronologically meaningful, without
 * renaming or touching any other field.
 *
 * Never deletes or overwrites data: documents that already have an
 * enquiryId are skipped entirely.
 *
 * Run with: node scripts/backfillEnquiryIds.js
 */
require("dotenv").config();
const { connectToDatabase } = require("../src/lib/mongodb");
const { Enquiry } = require("../src/models/Enquiry");
const { nextSequence } = require("../src/models/Counter");

function datePrefix(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}${m}${d}`;
}

async function run() {
  await connectToDatabase();

  const missing = await Enquiry.find({
    $or: [{ enquiryId: null }, { enquiryId: { $exists: false } }],
  }).sort({ createdAt: 1 });

  console.log(`[backfillEnquiryIds] Found ${missing.length} enquiry document(s) without an enquiryId.`);

  let updated = 0;
  for (const enquiry of missing) {
    const prefix = datePrefix(enquiry.createdAt || new Date());
    const seq = await nextSequence(`enquiry:${prefix}`);
    enquiry.enquiryId = `ENQ-${prefix}${String(seq).padStart(4, "0")}`;
    await enquiry.save();
    updated += 1;
  }

  console.log(`[backfillEnquiryIds] Updated ${updated} document(s). Done.`);
  process.exit(0);
}

run().catch((err) => {
  console.error("[backfillEnquiryIds] Migration failed:", err);
  process.exit(1);
});
