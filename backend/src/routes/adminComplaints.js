const express = require("express");
const { z } = require("zod");
const { connectToDatabase } = require("./../lib/mongodb");
const { Complaint } = require("../models/Complaint");
const { requireAdmin } = require("../middleware/requireAuth");
const { createNotification } = require("../lib/notify");

const router = express.Router();
router.use(requireAdmin);

function serialize(c) {
  const b = c.bookingId && typeof c.bookingId === "object" ? c.bookingId : null;
  const u = c.userId && typeof c.userId === "object" ? c.userId : null;
  return {
    ticketId: c.ticketId,
    bookingId: b?.bookingId || c.bookingId,
    customer: { name: u?.name || b?.customerSnapshot?.name || "Customer", mobile: u?.phone || b?.customerSnapshot?.phone || "—", email: u?.email || b?.customerSnapshot?.email || "—" },
    journey: b?.journey || null,
    bookingStatus: b?.status || null,
    category: c.category,
    vehicleIndex: c.vehicleIndex ?? null,
    vehicleName: c.vehicleName || "",
    subject: c.subject,
    description: c.description,
    attachments: c.attachments || [],
    status: c.status,
    messages: (c.messages || []).filter(m => !m.isInternalNote),
    createdAt: c.createdAt,
    updatedAt: c.updatedAt,
  };
}

const statusSchema = z.object({ status: z.enum(["OPEN", "IN_REVIEW", "IN_PROGRESS", "RESOLVED", "CLOSED"]) });
const messageSchema = z.object({ message: z.string().trim().min(1).max(2000) });

async function findComplaint(ticketId) {
  await connectToDatabase();
  return Complaint.findOne({ ticketId })
    .populate("bookingId", "bookingId customerSnapshot journey status vehicles")
    .populate("userId", "name phone email");
}

router.get("/", async (req, res) => {
  try {
    const filter = {};
    if (req.query.status && req.query.status !== "ALL") filter.status = req.query.status;
    await connectToDatabase();
    const complaints = await Complaint.find(filter)
      .populate("bookingId", "bookingId customerSnapshot journey status vehicles")
      .populate("userId", "name phone email")
      .sort({ updatedAt: -1 })
      .lean();
    res.json({ success: true, complaints: complaints.map(serialize) });
  } catch (err) {
    console.error("admin complaints list error", err);
    res.status(500).json({ success: false, error: "Failed to load issues." });
  }
});

router.get("/:ticketId", async (req, res) => {
  try {
    const complaint = await findComplaint(req.params.ticketId);
    if (!complaint) return res.status(404).json({ success: false, error: "Issue not found." });
    res.json({ success: true, complaint: serialize(complaint.toObject()) });
  } catch (err) {
    console.error("admin complaint detail error", err);
    res.status(500).json({ success: false, error: "Failed to load issue." });
  }
});

router.patch("/:ticketId/status", async (req, res) => {
  try {
    const parsed = statusSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ success: false, error: "Invalid issue status." });
    const complaint = await findComplaint(req.params.ticketId);
    if (!complaint) return res.status(404).json({ success: false, error: "Issue not found." });
    complaint.status = parsed.data.status;
    await complaint.save();
    createNotification({ userId: complaint.userId?._id || complaint.userId, type: "COMPLAINT_UPDATED", channel: "IN_APP", title: "Issue updated", message: `Your issue ${complaint.ticketId} is now ${parsed.data.status.replace(/_/g, " ")}.`, complaintId: complaint._id, bookingId: complaint.bookingId?._id || complaint.bookingId });
    res.json({ success: true, complaint: serialize(complaint.toObject()) });
  } catch (err) {
    console.error("admin complaint status error", err);
    res.status(500).json({ success: false, error: "Failed to update issue." });
  }
});

router.post("/:ticketId/messages", async (req, res) => {
  try {
    const parsed = messageSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ success: false, error: "Message can't be empty." });
    const complaint = await findComplaint(req.params.ticketId);
    if (!complaint) return res.status(404).json({ success: false, error: "Issue not found." });
    complaint.messages.push({ authorId: req.session.userId, authorRole: "super_admin", message: parsed.data.message, isInternalNote: false });
    if (["OPEN", "IN_REVIEW"].includes(complaint.status)) complaint.status = "IN_PROGRESS";
    await complaint.save();
    createNotification({ userId: complaint.userId?._id || complaint.userId, type: "COMPLAINT_MESSAGE", channel: "IN_APP", title: "Kuwarji support replied", message: `There is a new reply on issue ${complaint.ticketId}.`, complaintId: complaint._id, bookingId: complaint.bookingId?._id || complaint.bookingId });
    res.json({ success: true, complaint: serialize(complaint.toObject()) });
  } catch (err) {
    console.error("admin complaint message error", err);
    res.status(500).json({ success: false, error: "Failed to send reply." });
  }
});

module.exports = router;
