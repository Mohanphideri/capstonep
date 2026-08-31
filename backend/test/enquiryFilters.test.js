const test = require("node:test");
const assert = require("node:assert/strict");
const mongoose = require("mongoose");
const { buildEnquiryFilter } = require("../src/lib/enquiryFilters");

test("returns an empty filter for no query params", () => {
  assert.deepEqual(buildEnquiryFilter({}), {});
});

test("filters by a valid status", () => {
  assert.deepEqual(buildEnquiryFilter({ status: "NEW" }), { status: "NEW" });
});

test("ignores an invalid status value rather than passing it through", () => {
  assert.deepEqual(buildEnquiryFilter({ status: "not_a_real_status" }), {});
});

test("filters by a valid vehicleId", () => {
  const id = new mongoose.Types.ObjectId().toString();
  assert.deepEqual(buildEnquiryFilter({ vehicleId: id }), { vehicleId: id });
});

test("ignores an invalid vehicleId", () => {
  assert.deepEqual(buildEnquiryFilter({ vehicleId: "not-an-object-id" }), {});
});

test("filters by tripDate", () => {
  assert.deepEqual(buildEnquiryFilter({ tripDate: "2026-09-01" }), { tripDate: "2026-09-01" });
});

test("builds a case-insensitive $or search across expected fields", () => {
  const filter = buildEnquiryFilter({ search: "Priya" });
  assert.ok(Array.isArray(filter.$or));
  assert.ok(filter.$or.some((clause) => clause.name instanceof RegExp));
  assert.ok(filter.$or[0].name.test("priya sharma"));
});

test("escapes regex special characters in the search term", () => {
  const filter = buildEnquiryFilter({ search: "a.b*c" });
  // Should not throw, and should treat the term literally.
  assert.doesNotThrow(() => filter.$or[0].name.test("a.b*c"));
  assert.equal(filter.$or[0].name.test("axbyc"), false);
});

test("combines status + vehicleId + search into one filter", () => {
  const id = new mongoose.Types.ObjectId().toString();
  const filter = buildEnquiryFilter({ status: "BOOKED", vehicleId: id, search: "delhi" });
  assert.equal(filter.status, "BOOKED");
  assert.equal(filter.vehicleId, id);
  assert.ok(filter.$or);
});
