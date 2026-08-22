require("dotenv").config();

const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");

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
const adminCustomerRoutes = require("./src/routes/adminCustomers");
const adminSettingsRoutes = require("./src/routes/adminSettings");
const bannerRoutes = require("./src/routes/banner");
const siteContentRoutes = require("./src/routes/siteContent");
const adminAuditLogRoutes = require("./src/routes/adminAuditLogs");
const adminReportRoutes = require("./src/routes/adminReports");
const adminBalanceSheetRoutes = require("./src/routes/adminBalanceSheet");
const vehicleRoutes = require("./src/routes/vehicles");
const bookingRoutes = require("./src/routes/bookings");
const invoiceRoutes = require("./src/routes/invoices");
const myEnquiryRoutes = require("./src/routes/myEnquiries");
const complaintRoutes = require("./src/routes/complaints");
const reviewRoutes = require("./src/routes/reviews");
const adminReviewRoutes = require("./src/routes/adminReviews");
const { connectToDatabase } = require("./src/lib/mongodb");
const { UPLOAD_ROOT } = require("./src/lib/storage/LocalStorageProvider");
const { ensureAdminSeed } = require("./src/lib/adminSeed");
const { ensureSiteSettingsSeed } = require("./src/lib/siteSettings");

const app = express();

// Render sits behind a proxy — needed so `secure` cookies and
// `x-forwarded-for` IPs behave correctly.
app.set("trust proxy", 1);

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

// 10mb covers base64-encoded vehicle photo uploads (5MB image ≈ 6.7MB as
// base64) — see routes/adminVehicles.js. Everything else in this app
// sends small JSON payloads, so this stays a generous but bounded limit
// rather than unlimited.
app.use(express.json({ limit: "10mb" }));
app.use(cookieParser());

app.get("/", (req, res) => {
  res.json({ ok: true, service: "kuwarji-travels-backend" });
});

app.get("/api/health", (req, res) => {
  res.json({ ok: true });
});

// Locally-stored vehicle photos (see lib/storage/LocalStorageProvider.js).
app.use("/uploads", express.static(UPLOAD_ROOT));

app.use("/api/auth", authRoutes);
app.use("/api/captcha", captchaRoutes);
app.use("/api/enquiry", enquiryRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/admin/vehicles", adminVehicleRoutes);
app.use("/api/admin/categories", adminCategoryRoutes);
app.use("/api/admin/amenities", adminAmenityRoutes);
app.use("/api/admin/enquiries", adminEnquiryRoutes);
app.use("/api/admin/bookings", adminBookingRoutes);
app.use("/api/admin/invoices", adminInvoiceRoutes);
app.use("/api/admin/customers", adminCustomerRoutes);
app.use("/api/admin/settings", adminSettingsRoutes);
app.use("/api/banner", bannerRoutes);
app.use("/api/site-content", siteContentRoutes);
app.use("/api/admin/banner", bannerRoutes);
app.use("/api/admin/audit-logs", adminAuditLogRoutes);
app.use("/api/admin/reports", adminReportRoutes);
app.use("/api/admin/balance-sheet", adminBalanceSheetRoutes);
app.use("/api/admin/reviews", adminReviewRoutes);
app.use("/api/vehicles", vehicleRoutes);
app.use("/api/bookings", bookingRoutes);
app.use("/api/invoices", invoiceRoutes);
app.use("/api/my-enquiries", myEnquiryRoutes);
app.use("/api/complaints", complaintRoutes);
app.use("/api/reviews", reviewRoutes);

// 404 fallback
app.use((req, res) => {
  res.status(404).json({ success: false, error: "Not found" });
});

// Central error handler (e.g. CORS rejection)
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.status || 500).json({
    success: false,
    error: err.message || "Something went wrong.",
  });
});

connectToDatabase()
  .then(async () => {
    await ensureAdminSeed();
    await ensureSiteSettingsSeed();
  })
  .catch((err) => {
    console.error("[startup] Admin seed skipped — database not reachable yet:", err.message);
  })
  .finally(() => {
    app.listen(env.port, () => {
      console.log(`Kuwarji Travels backend listening on port ${env.port}`);
    });
  });
