const { Booking } = require("../models/Booking");
const { createBookingNotification } = require("./notify");

function completionDateForBooking(booking) {
  const base = booking?.journey?.journeyEnd || booking?.journey?.journeyStart;
  if (!base) return null;
  const date = new Date(base);
  if (Number.isNaN(date.getTime())) return null;

  const pickupTime = booking?.journey?.pickupTime;
  if (pickupTime && /^\d{1,2}:\d{2}$/.test(pickupTime)) {
    const [hours, minutes] = pickupTime.split(":").map(Number);
    date.setHours(hours, minutes, 0, 0);
  } else if (booking?.journey?.journeyEnd) {
    // For a round trip with no explicit pickup time, treat the return date
    // as the completion reference and use the end of that calendar day.
    date.setHours(23, 59, 59, 999);
  }

  return new Date(date.getTime() + 24 * 60 * 60 * 1000);
}

async function autoCompleteDueBookings(now = new Date()) {
  const candidates = await Booking.find({
    status: { $in: ["DRAFT", "CONFIRMED", "IN_PROGRESS"] },
  });

  const dueBookings = candidates.filter((booking) => {
    const completionAt = completionDateForBooking(booking);
    return completionAt && completionAt <= now;
  });
  const dueIds = dueBookings.map((booking) => booking._id);

  if (!dueIds.length) return 0;

  const result = await Booking.updateMany(
    { _id: { $in: dueIds }, status: { $in: ["DRAFT", "CONFIRMED", "IN_PROGRESS"] } },
    { $set: { status: "COMPLETED" } }
  );

  // Notify the customer for each booking the sweep actually completed.
  // Best-effort, same as every other notification call in the app — a
  // failure here never affects the sweep's own result.
  dueBookings.forEach((booking) => {
    createBookingNotification("COMPLETED", booking).catch(() => {});
  });

  return result.modifiedCount || 0;
}

module.exports = { autoCompleteDueBookings, completionDateForBooking };
