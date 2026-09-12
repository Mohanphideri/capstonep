const test = require("node:test");
const assert = require("node:assert/strict");
const mongoose = require("mongoose");
const { buildAdminVehicleFilter } = require("../src/lib/vehicleFilters");

test("excludes soft-deleted vehicles by default", () => {
  assert.deepEqual(buildAdminVehicleFilter({}), { deletedAt: null });
});

test("includes soft-deleted vehicles when explicitly requested", () => {
  assert.deepEqual(buildAdminVehicleFilter({ includeDeleted: true }), {});
});

test("filters by a valid status (AVAILABLE/INACTIVE and legacy values)", () => {
  assert.deepEqual(buildAdminVehicleFilter({ status: "AVAILABLE" }), {
    deletedAt: null,
    status: "AVAILABLE",
  });
  assert.deepEqual(buildAdminVehicleFilter({ status: "INACTIVE" }), {
    deletedAt: null,
    status: "INACTIVE",
  });
});

test("ignores an invalid status", () => {
  assert.deepEqual(buildAdminVehicleFilter({ status: "BOOKED_NOW" }), { deletedAt: null });
});

test("filters by a valid categoryId", () => {
  const id = new mongoose.Types.ObjectId().toString();
  assert.deepEqual(buildAdminVehicleFilter({ categoryId: id }), { deletedAt: null, categoryId: id });
});

test("builds a case-insensitive name search", () => {
  const filter = buildAdminVehicleFilter({ search: "Volvo" });
  assert.ok(filter.name instanceof RegExp);
  assert.ok(filter.name.test("volvo 9600"));
});
