const mongoose = require("mongoose");

const STATUS_VALUES = ["NEW", "IN_REVIEW", "CONTACTED", "QUOTED", "SELECTED_FOR_BOOKING", "CONVERTED", "CLOSED", "CANCELLED"];

/**
 * Builds a Mongoose filter object for GET /api/admin/enquiries from
 * parsed query params. Pure function (no DB access) so it can be unit
 * tested directly — see test/enquiryFilters.test.js.
 *
 * @param {{ status?: string, vehicleId?: string, search?: string, tripDate?: string }} q
 * @returns {object}
 */
function buildEnquiryFilter(q = {}) {
  const filter = {};

  if (q.status && STATUS_VALUES.includes(q.status)) {
    filter.status = q.status;
  }

  if (q.vehicleId && mongoose.Types.ObjectId.isValid(q.vehicleId)) {
    filter.vehicleId = q.vehicleId;
  }

  if (q.tripDate && typeof q.tripDate === "string") {
    filter.tripDate = q.tripDate.trim();
  }

  if (q.search && typeof q.search === "string" && q.search.trim()) {
    const term = q.search.trim();
    // Simple case-insensitive partial match across the fields an admin
    // would realistically search by — name, phone, email, locations.
    // (A $text index also exists on the model for larger datasets, but
    // a regex here keeps short/partial queries like "981" for a phone
    // number working, which $text doesn't handle well.)
    const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const re = new RegExp(escaped, "i");
    filter.$or = [
      { name: re },
      { phone: re },
      { email: re },
      { pickupLocation: re },
      { destination: re },
      { enquiryId: re },
    ];
  }

  return filter;
}

module.exports = { buildEnquiryFilter, STATUS_VALUES };
