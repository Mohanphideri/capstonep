require("dotenv").config();

const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const helmet = require("helmet");

const { env } = require("./src/env");
const authRoutes = require("./src/routes/auth");
const captchaRoutes = require("./src/routes/captcha");
const enquiryRoutes = require("./src/routes/enquiry");
const adminRoutes = require("./src/routes/admin");
const adminVehicleRoutes = require("./src/routes/adminVehicles");
const adminCategoryRoutes = require("./src/routes/adminCategories");
const adminAmenityRoutes = require("./src/routes/adminAmenities");
const adminEnquiryRoutes = require("./src/routes/adminEnquiries");
const adminBookingRoutes = require("./src/routes/adminBookings");
const adminInvoiceRoutes = require("./src/routes/adminInvoices");
const adminSettingsRoutes = require("./src/routes/adminSettings");
const bannerRoutes = require("./src/routes/banner");
const siteContentRoutes = require("./src/routes/siteContent");
const adminReportRoutes = require("./src/routes/adminReports");
const adminBalanceSheetRoutes = require("./src/routes/adminBalanceSheet");
const vehicleRoutes = require("./src/routes/vehicles");
const bookingRoutes = require("./src/routes/bookings");
const invoiceRoutes = require("./src/routes/invoices");
const myEnquiryRoutes = require("./src/routes/myEnquiries");
const complaintRoutes = require("./src/routes/complaints");
const adminComplaintRoutes = require("./src/routes/adminComplaints");
const reviewRoutes = require("./src/routes/reviews");
const faqRoutes = require("./src/routes/faqs");
const tourPackageRoutes = require("./src/routes/tourPackages");
const tripPlannerRoutes = require("./src/routes/tripPlanner");
const chatbotRoutes = require("./src/routes/chatbot");
const notificationRoutes = require("./src/routes/notifications");
const locationRoutes = require("./src/routes/locations");
const adminReviewRoutes = require("./src/routes/adminReviews");
const { connectToDatabase } = require("./src/lib/mongodb");
const { UPLOAD_ROOT } = require("./src/lib/storage/LocalStorageProvider");
const { getStorageProvider } = require("./src/lib/storage/StorageService");
const { ensureAdminSeed } = require("./src/lib/adminSeed");
const { ensureSiteSettingsSeed } = require("./src/lib/siteSettings");
const { autoCompleteDueBookings } = require("./src/lib/bookingCompletion");
const { Review } = require("./src/models/Review");
const { Enquiry } = require("./src/models/Enquiry");

const app = express();

// Render sits behind a proxy — needed so `secure` cookies and
// `x-forwarded-for` IPs behave correctly.
app.set("trust proxy", 1);

// Standard security headers (X-Content-Type-Options, X-Frame-Options, etc.).
// CSP is left off here — this is a JSON API, not the page that renders
// HTML, so a CSP belongs on the frontend host (Vercel) instead.
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false,
  referrerPolicy: { policy: "strict-origin-when-cross-origin" },
}));

// Allow the deployed Vercel frontend (and local dev) to call this API
// with credentials (cookies) attached.
const allowedOrigins = env.frontendUrl.split(",").map((s) => s.trim());
app.use(
  cors({
    origin(origin, callback) {
      // Allow non-browser tools (no Origin header) and configured origins.
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
  })
);

// Keep normal API bodies small. Vehicle-photo uploads currently use
// base64 JSON and therefore receive a larger limit only on that dedicated
// endpoint; the rest of the API is capped at 1 MB.
app.use((req, res, next) => {
  const isVehiclePhotoUpload =
    req.method === "POST" &&
    /^\/api\/admin\/vehicles\/[^/]+\/photos\/?$/.test(req.path);
  return express.json({ limit: isVehiclePhotoUpload ? "10mb" : "1mb", strict: true })(req, res, next);
});
app.use(express.urlencoded({ extended: false, limit: "256kb" }));
app.use(cookieParser());

// Lightweight request correlation. The ID is safe to return to clients and
// makes production logs much easier to trace without logging request bodies.
app.use((req, res, next) => {
  const requestId = req.get("x-request-id") || require("crypto").randomUUID();
  req.requestId = requestId;
  res.setHeader("X-Request-ID", requestId);
  next();
});

// Cookie-authenticated state-changing requests must prove they originated
// from one of the configured frontend origins. This is required because the
// deployed Vercel -> Render setup uses SameSite=None cookies.
const stateChangingMethods = new Set(["POST", "PUT", "PATCH", "DELETE"]);
app.use((req, res, next) => {
  if (!stateChangingMethods.has(req.method)) return next();

  const origin = req.get("origin");
  const hasSessionCookie = Boolean(req.cookies?.kuwarji_session || req.cookies?.kuwarji_refresh);

  // Non-browser clients may omit Origin. Once a browser sends cookies, however,
  // an absent Origin is not accepted for a state-changing request.
  if (hasSessionCookie && (!origin || !allowedOrigins.includes(origin))) {
    return res.status(403).json({ success: false, error: "Request origin is not allowed." });
  }

  if (origin && !allowedOrigins.includes(origin)) {
    return res.status(403).json({ success: false, error: "Request origin is not allowed." });
  }
  return next();
});

app.get("/", (req, res) => {
  res.json({ ok: true, service: "kuwarji-travels-backend" });
});

app.get("/api/health", (req, res) => {
  res.status(200).json({ ok: true, service: "kuwarji-travels-backend", environment: env.nodeEnv });
});

// Readiness endpoint for Render/load balancers. It verifies that MongoDB is
// reachable without exposing connection details.
app.get("/api/ready", async (req, res) => {
  try {
    await connectToDatabase();
    return res.status(200).json({ ok: true, database: "connected" });
  } catch {
    return res.status(503).json({ ok: false, database: "unavailable" });
  }
});

// Locally-stored vehicle photos (see lib/storage/LocalStorageProvider.js).
app.use("/uploads", express.static(UPLOAD_ROOT));

app.use("/api/auth", authRoutes);
app.use("/api/captcha", captchaRoutes);
app.use("/api/enquiry", enquiryRoutes);
// The generic "/api/admin" router (adminRoutes) is mounted LAST among the
// /api/admin/* registrations below, on purpose: Express matches mounted
// routers in registration order, and "/api/admin" as a prefix would also
// match "/api/admin/customers", "/api/admin/audit-logs", etc. Mounting it
// first would let its own requireAdmin gate intercept every admin
// sub-route before the more specific routers below ever ran their own
// (often stricter, e.g. requireSuperAdmin) auth check — silently making
// those checks unreachable dead code for any rejected request. Keeping
// the specific routers first ensures each one's own auth middleware is
// the one that actually runs.
app.use("/api/admin/vehicles", adminVehicleRoutes);
app.use("/api/admin/categories", adminCategoryRoutes);
app.use("/api/admin/amenities", adminAmenityRoutes);
app.use("/api/admin/enquiries", adminEnquiryRoutes);
app.use("/api/admin/bookings", adminBookingRoutes);
app.use("/api/admin/invoices", adminInvoiceRoutes);
app.use("/api/admin/settings", adminSettingsRoutes);
app.use("/api/banner", bannerRoutes);
app.use("/api/site-content", siteContentRoutes);
app.use("/api/admin/banner", bannerRoutes);
app.use("/api/admin/reports", adminReportRoutes);
app.use("/api/admin/balance-sheet", adminBalanceSheetRoutes);
app.use("/api/admin/reviews", adminReviewRoutes);
app.use("/api/admin/issues", adminComplaintRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/vehicles", vehicleRoutes);
app.use("/api/bookings", bookingRoutes);
app.use("/api/invoices", invoiceRoutes);
app.use("/api/my-enquiries", myEnquiryRoutes);
app.use("/api/complaints", complaintRoutes);
app.use("/api/reviews", reviewRoutes);
app.use("/api/faqs", faqRoutes);
app.use("/api/tour-packages", tourPackageRoutes);
app.use("/api/trip-planner", tripPlannerRoutes);
app.use("/api/chatbot", chatbotRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/locations", locationRoutes);

// 404 fallback
app.use((req, res) => {
  res.status(404).json({ success: false, error: "Not found" });
});

// Central error handler (e.g. CORS rejection)
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  const status = Number.isInteger(err.status) ? err.status : 500;
  const isProduction = env.nodeEnv === "production";
  console.error(`[${req.requestId || "no-request-id"}]`, err);
  res.status(status).json({
    success: false,
    error: status >= 500 && isProduction ? "Something went wrong. Please try again." : (err.message || "Something went wrong."),
    requestId: req.requestId,
  });
});

process.on("unhandledRejection", (reason) => {
  console.error("Unhandled promise rejection:", reason);
});
process.on("uncaughtException", (error) => {
  console.error("Uncaught exception:", error);
  process.exit(1);
});

connectToDatabase()
  .then(async () => {
    await ensureAdminSeed();
    await ensureSiteSettingsSeed();
    // Backward-compatible enquiry status migration. Existing records are
    // preserved while legacy workflow values are normalized to the new
    // production lifecycle required by the update specification.
    try {
      await Enquiry.updateMany({ status: { $in: ["IN_REVIEW", "CONTACTED", "QUOTED"] } }, { $set: { status: "BOOKED" } });
      await Enquiry.updateMany({ status: "SELECTED_FOR_BOOKING" }, { $set: { status: "BOOKED" } });
      await Enquiry.updateMany({ status: "CONVERTED" }, { $set: { status: "BOOKING" } });
    } catch (migrationError) { console.error("[enquiry migration] skipped:", migrationError.message); }
    // Older deployments used a non-sparse unique bookingId index on reviews.
    // Remove it once so admin-created reviews (which have no booking) can coexist.
    try {
      const reviewIndexes = await Review.collection.indexes();
      if (reviewIndexes.some((idx) => idx.name === "bookingId_1" && idx.unique)) {
        await Review.collection.dropIndex("bookingId_1");
      }
    } catch (err) {
      console.error("[reviews] legacy index cleanup skipped:", err.message);
    }
    // Automatically complete due bookings every five minutes. Admin status
    // edits remain authoritative until a booking becomes due.
    await autoCompleteDueBookings().catch((err) => console.error("[booking completion] initial sweep failed:", err.message));
    setInterval(() => {
      autoCompleteDueBookings().catch((err) => console.error("[booking completion] sweep failed:", err.message));
    }, 5 * 60 * 1000);
  })
  .catch((err) => {
    console.error("[startup] Admin seed skipped — database not reachable yet:", err.message);
  })
  .finally(() => {
    const server = app.listen(env.port, () => {
      console.log(`Kuwarji Travels backend listening on port ${env.port}`);
    });

    const shutdown = (signal) => {
      console.log(`${signal} received; shutting down gracefully.`);
      server.close(() => {
        const mongoose = require("mongoose");
        mongoose.connection.close(false).finally(() => process.exit(0));
      });
      setTimeout(() => process.exit(1), 10000).unref();
    };
    process.once("SIGTERM", () => shutdown("SIGTERM"));
    process.once("SIGINT", () => shutdown("SIGINT"));
  });
