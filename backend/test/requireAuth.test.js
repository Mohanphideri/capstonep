process.env.AUTH_SECRET = process.env.AUTH_SECRET || "test-secret-for-unit-tests-only";
process.env.MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/test";
process.env.MSG91_AUTH_KEY = process.env.MSG91_AUTH_KEY || "test-key";

const test = require("node:test");
const assert = require("node:assert/strict");
const { createSessionToken, SESSION_COOKIE } = require("../src/lib/session");
const { requireAdmin, requireSuperAdmin, requireAuth } = require("../src/middleware/requireAuth");

// NOTE: requireAuth/requireAdmin/requireSuperAdmin are async — besides
// verifying the JWT, they now also check UserSession.revokedAt (see
// lib/sessionRevocation.js) so logout actually revokes a token instead of
// only logging it. That check fails OPEN (treats the session as valid)
// whenever Mongo isn't connected, which is exactly this test file's
// situation — no real DB is spun up here — so these tests exercise the
// JWT-only behavior (signature, expiry, role) without needing a live
// MongoDB, and every middleware call below must be awaited.

function mockReq(role) {
  const cookies = {};
  if (role) {
    cookies[SESSION_COOKIE] = createSessionToken({ userId: "u1", phone: "9999999999", role });
  }
  return { cookies, headers: {}, ip: "127.0.0.1" };
}

function mockRes() {
  const res = { statusCode: 200, body: null };
  res.status = (code) => {
    res.statusCode = code;
    return res;
  };
  res.json = (body) => {
    res.body = body;
    return res;
  };
  return res;
}

test("requireAuth rejects an unauthenticated request with 401", async () => {
  const req = mockReq(null);
  const res = mockRes();
  let nextCalled = false;
  await requireAuth(req, res, () => (nextCalled = true));
  assert.equal(nextCalled, false);
  assert.equal(res.statusCode, 401);
});

test("requireAuth allows any authenticated role through", async () => {
  const req = mockReq("customer");
  const res = mockRes();
  let nextCalled = false;
  await requireAuth(req, res, () => (nextCalled = true));
  assert.equal(nextCalled, true);
});

test("requireAdmin rejects an unauthenticated request", async () => {
  const req = mockReq(null);
  const res = mockRes();
  let nextCalled = false;
  await requireAdmin(req, res, () => (nextCalled = true));
  assert.equal(nextCalled, false);
  assert.equal(res.statusCode, 403);
});

test("requireAdmin rejects a plain customer session", async () => {
  const req = mockReq("customer");
  const res = mockRes();
  let nextCalled = false;
  await requireAdmin(req, res, () => (nextCalled = true));
  assert.equal(nextCalled, false);
  assert.equal(res.statusCode, 403);
});

test("requireAdmin rejects staff/admin — only super_admin exists (spec #2)", async () => {
  for (const role of ["staff", "admin"]) {
    const req = mockReq(role);
    const res = mockRes();
    let nextCalled = false;
    await requireAdmin(req, res, () => (nextCalled = true));
    assert.equal(nextCalled, false, `expected role "${role}" to be rejected by requireAdmin`);
  }
});

test("requireAdmin allows super_admin through", async () => {
  const req = mockReq("super_admin");
  const res = mockRes();
  let nextCalled = false;
  await requireAdmin(req, res, () => (nextCalled = true));
  assert.equal(nextCalled, true);
});

test("requireSuperAdmin rejects an unauthenticated request with 401", async () => {
  const req = mockReq(null);
  const res = mockRes();
  let nextCalled = false;
  await requireSuperAdmin(req, res, () => (nextCalled = true));
  assert.equal(nextCalled, false);
  assert.equal(res.statusCode, 401);
});

test("requireSuperAdmin rejects staff and admin (Phase 2: no ADMIN/STAFF access)", async () => {
  for (const role of ["staff", "admin", "customer"]) {
    const req = mockReq(role);
    const res = mockRes();
    let nextCalled = false;
    await requireSuperAdmin(req, res, () => (nextCalled = true));
    assert.equal(nextCalled, false, `expected role "${role}" to be rejected by requireSuperAdmin`);
    assert.equal(res.statusCode, 403);
  }
});

test("requireSuperAdmin allows only super_admin through", async () => {
  const req = mockReq("super_admin");
  const res = mockRes();
  let nextCalled = false;
  await requireSuperAdmin(req, res, () => (nextCalled = true));
  assert.equal(nextCalled, true);
});

test("requireSuperAdmin rejects a forged/garbage session cookie", async () => {
  const req = { cookies: { [SESSION_COOKIE]: "not-a-real-jwt" }, headers: {}, ip: "127.0.0.1" };
  const res = mockRes();
  let nextCalled = false;
  await requireSuperAdmin(req, res, () => (nextCalled = true));
  assert.equal(nextCalled, false);
  assert.equal(res.statusCode, 401);
});

test("requireAuth denies a valid JWT whose session has been revoked", async () => {
  const mongoose = require("mongoose");
  const { isTokenRevoked } = require("../src/lib/sessionRevocation");
  const originalReadyState = mongoose.connection.readyState;
  const originalFindOne = require("../src/models/UserSession").UserSession.findOne;

  // Simulate "connected to Mongo, and this token's row is revoked" without
  // needing a live database: fake readyState=1 and stub findOne's chain.
  Object.defineProperty(mongoose.connection, "readyState", { value: 1, configurable: true });
  require("../src/models/UserSession").UserSession.findOne = () => ({
    select: () => ({
      maxTimeMS: () => ({
        lean: async () => ({ revokedAt: new Date() }),
      }),
    }),
  });

  try {
    const req = mockReq("customer");
    const res = mockRes();
    let nextCalled = false;
    await requireAuth(req, res, () => (nextCalled = true));
    assert.equal(nextCalled, false);
    assert.equal(res.statusCode, 401);

    // Sanity-check the revocation helper directly too.
    const revoked = await isTokenRevoked("any-hash");
    assert.equal(revoked, true);
  } finally {
    Object.defineProperty(mongoose.connection, "readyState", {
      value: originalReadyState,
      configurable: true,
    });
    require("../src/models/UserSession").UserSession.findOne = originalFindOne;
  }
});

