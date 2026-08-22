const express = require("express");
const { connectToDatabase } = require("../lib/mongodb");
const { Enquiry } = require("../models/Enquiry");
const { User } = require("../models/User");
const { requireAuth } = require("../middleware/requireAuth");

const router = express.Router();

// Customer portal — enquiry history (spec §14). Only enquiries submitted
// while the customer was logged in are tied to their account via
// userId; ownership is always verified against req.session.userId,
// never a client-supplied identifier.

function serialize(e) {
  return {
    id: e._id.toString(),
    enquiryId: e.enquiryId,
    selectedVehicles: (e.selectedVehicles || []).map((v) => v.vehicleSnapshot?.name).filter(Boolean),
    vehicleType: e.vehicleType,
    pickupLocation: e.pickupLocation,
    destination: e.destination,
    tripDate: e.tripDate,
    returnDate: e.returnDate,
    passengers: e.passengers,
    status: e.status,
    convertedToBookingId: e.convertedToBookingId ? e.convertedToBookingId.toString() : null,
    createdAt: e.createdAt,
    updatedAt: e.updatedAt,
  };
}

router.get("/", requireAuth, async (req, res) => {
  try {
    await connectToDatabase();
    const user = await User.findById(req.session.userId).select("phone").lean();
    const phone = user?.phone || req.session.phone || null;
    const ownership = [{ userId: req.session.userId }];
    if (phone) ownership.push({ phone });
    const enquiries = await Enquiry.find({ $or: ownership }).sort({ createdAt: -1 }).lean();
    return res.json({ success: true, enquiries: enquiries.map(serialize) });
  } catch (err) {
    console.error("my-enquiries list error", err);
    return res.status(500).json({ success: false, error: "Failed to load enquiries." });
  }
});

router.get("/:id", requireAuth, async (req, res) => {
  try {
    await connectToDatabase();
    const user = await User.findById(req.session.userId).select("phone").lean();
    const enquiry = await Enquiry.findOne({
      $or: [{ _id: req.params.id }, { enquiryId: req.params.id }],
    }).lean();
    const ownsByUser = enquiry?.userId && enquiry.userId.toString() === req.session.userId;
    const ownsByPhone = !!enquiry && !!user?.phone && enquiry.phone === user.phone;
    if (!enquiry || (!ownsByUser && !ownsByPhone)) {
      return res.status(404).json({ success: false, error: "Enquiry not found." });
    }
    return res.json({ success: true, enquiry: serialize(enquiry) });
  } catch (err) {
    console.error("my-enquiries detail error", err);
    return res.status(500).json({ success: false, error: "Failed to load enquiry." });
  }
});

module.exports = router;
