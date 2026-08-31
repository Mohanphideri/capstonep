const mongoose = require("mongoose");

// Phase 2 only ever writes AVAILABLE/INACTIVE (see models/Vehicle.js
// comment), but admin search should still be able to find legacy
// BOOKED/MAINTENANCE rows left over from the old booking flow so they
// aren't invisible in the fleet list — hence all four are accepted here.
const STATUS_VALUES = ["AVAILABLE", "BOOKED", "MAINTENANCE", "INACTIVE"];

/**
 * Builds a Mongoose filter object for GET /api/admin/vehicles from
 * parsed query params. Pure function (no DB access) so it can be unit
 * tested directly — see test/vehicleFilters.test.js.
 *
 * @param {{ status?: string, categoryId?: string, search?: string, includeDeleted?: boolean }} q
 * @returns {object}
 */
function buildAdminVehicleFilter(q = {}) {
  const filter = {};

  if (!q.includeDeleted) {
    filter.deletedAt = null;
  }

  if (q.status && STATUS_VALUES.includes(q.status)) {
    filter.status = q.status;
  }

  if (q.categoryId && mongoose.Types.ObjectId.isValid(q.categoryId)) {
    filter.categoryId = q.categoryId;
  }

  if (q.search && typeof q.search === "string" && q.search.trim()) {
    const escaped = q.search.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    filter.name = new RegExp(escaped, "i");
  }

  return filter;
}

module.exports = { buildAdminVehicleFilter, STATUS_VALUES };
