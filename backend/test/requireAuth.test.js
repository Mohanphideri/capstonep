process.env.AUTH_SECRET = process.env.AUTH_SECRET || "test-secret-for-unit-tests-only";
process.env.MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/test";
process.env.MSG91_AUTH_KEY = process.env.MSG91_AUTH_KEY || "test-key";

const test = require("node:test");
const assert = require("node:assert/strict");
const { createSessionToken, SESSION_COOKIE } = require("../src/lib/session");
const { requireAdmin, requireSuperAdmin, requireAuth } = require("../src/middleware/requireAuth");

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

test("requireAuth rejects an unauthenticated request with 401", () => {
  const req = mockReq(null);
  const res = mockRes();
  let nextCalled = false;
  requireAuth(req, res, () => (nextCalled = true));
  assert.equal(nextCalled, false);
  assert.equal(res.statusCode, 401);
});

test("requireAuth allows any authenticated role through", () => {
  const req = mockReq("customer");
  const res = mockRes();
  let nextCalled = false;
  requireAuth(req, res, () => (nextCalled = true));
  assert.equal(nextCalled, true);
});

test("requireAdmin rejects an unauthenticated request", () => {
  const req = mockReq(null);
  const res = mockRes();
  let nextCalled = false;
  requireAdmin(req, res, () => (nextCalled = true));
  assert.equal(nextCalled, false);
  assert.equal(res.statusCode, 403);
});

test("requireAdmin rejects a plain customer session", () => {
  const req = mockReq("customer");
  const res = mockRes();
  let nextCalled = false;
  requireAdmin(req, res, () => (nextCalled = true));
  assert.equal(nextCalled, false);
  assert.equal(res.statusCode, 403);
});

test("requireAdmin rejects staff/admin — only super_admin exists (spec #2)", () => {
  for (const role of ["staff", "admin"]) {
    const req = mockReq(role);
    const res = mockRes();
    let nextCalled = false;
    requireAdmin(req, res, () => (nextCalled = true));
    assert.equal(nextCalled, false, `expected role "${role}" to be rejected by requireAdmin`);
  }
});

test("requireAdmin allows super_admin through", () => {
  const req = mockReq("super_admin");
  const res = mockRes();
  let nextCalled = false;
  requireAdmin(req, res, () => (nextCalled = true));
  assert.equal(nextCalled, true);
});

test("requireSuperAdmin rejects an unauthenticated request with 401", () => {
  const req = mockReq(null);
  const res = mockRes();
  let nextCalled = false;
  requireSuperAdmin(req, res, () => (nextCalled = true));
  assert.equal(nextCalled, false);
  assert.equal(res.statusCode, 401);
});

test("requireSuperAdmin rejects staff and admin (Phase 2: no ADMIN/STAFF access)", () => {
  for (const role of ["staff", "admin", "customer"]) {
    const req = mockReq(role);
    const res = mockRes();
    let nextCalled = false;
    requireSuperAdmin(req, res, () => (nextCalled = true));
    assert.equal(nextCalled, false, `expected role "${role}" to be rejected by requireSuperAdmin`);
    assert.equal(res.statusCode, 403);
  }
});

test("requireSuperAdmin allows only super_admin through", () => {
  const req = mockReq("super_admin");
  const res = mockRes();
  let nextCalled = false;
  requireSuperAdmin(req, res, () => (nextCalled = true));
  assert.equal(nextCalled, true);
});

test("requireSuperAdmin rejects a forged/garbage session cookie", () => {
  const req = { cookies: { [SESSION_COOKIE]: "not-a-real-jwt" }, headers: {}, ip: "127.0.0.1" };
  const res = mockRes();
  let nextCalled = false;
  requireSuperAdmin(req, res, () => (nextCalled = true));
  assert.equal(nextCalled, false);
  assert.equal(res.statusCode, 401);
});
