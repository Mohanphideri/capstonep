/**
 * Central place to read server-only environment variables.
 * Throws a clear, actionable error instead of failing silently or
 * with a cryptic downstream stack trace.
 */

class ConfigError extends Error {
  constructor(missingVar) {
    super(
      `Missing required environment variable "${missingVar}". Add it to your .env file (see .env.example) and restart the server.`
    );
    this.name = "ConfigError";
    this.missingVar = missingVar;
  }
}

function required(name) {
  const value = process.env[name];
  if (!value || value.trim() === "") {
    throw new ConfigError(name);
  }
  return value;
}

const env = {
  get mongodbUri() {
    return required("MONGODB_URI");
  },
  get authSecret() {
    return required("AUTH_SECRET");
  },
  get msg91AuthKey() {
    return required("MSG91_AUTH_KEY");
  },
  // Bootstrap admin account — seeded into MongoDB on server startup if no
  // account with this phone number exists yet. Set both on the host
  // (Render → Environment) and redeploy; edit the account's password from
  // the admin portal afterwards rather than relying on these long-term.
  //
  // SECURITY: no hardcoded fallback here on purpose. A default password
  // baked into the repo (previously "admin@123") is a publicly-known
  // credential the moment the code is public — required() throws instead,
  // and adminSeed.js's caller already logs+skips the seed if it's unset,
  // so a missing value fails loudly rather than silently creating a
  // guessable super_admin account.
  get adminPhone() {
    return required("ADMIN_PHONE");
  },
  get adminPassword() {
    return required("ADMIN_PASSWORD");
  },
  get frontendUrl() {
    return process.env.FRONTEND_URL || "http://localhost:5173";
  },
  get port() {
    return process.env.PORT || 4000;
  },
  get nodeEnv() {
    return process.env.NODE_ENV || "development";
  },
  // Brevo (transactional email) — optional. If unset, the email service
  // logs an EmailLog with status FAILED and the booking/enquiry flow that
  // triggered it continues normally (never blocks a booking on email).
  get brevoApiKey() {
    return process.env.BREVO_API_KEY || null;
  },
  get brevoSenderEmail() {
    return process.env.BREVO_SENDER_EMAIL || null;
  },
  get brevoSenderName() {
    return process.env.BREVO_SENDER_NAME || "Kuwarji Travels";
  },
  get brevoReplyToEmail() {
    return process.env.BREVO_REPLY_TO_EMAIL || process.env.BREVO_SENDER_EMAIL || null;
  },
  get brevoReplyToName() {
    return process.env.BREVO_REPLY_TO_NAME || process.env.BREVO_SENDER_NAME || "Kuwarji Travels";
  },
  // Business/SuperAdmin notification email — read from configuration,
  // never hard-coded (spec §31/§53).
  get superAdminEmail() {
    return process.env.SUPERADMIN_EMAIL || null;
  },
  get whatsappNumber() {
    return process.env.WHATSAPP_NUMBER || null;
  },
  get appUrl() {
    return process.env.NEXT_PUBLIC_APP_URL || process.env.FRONTEND_URL || "http://localhost:5173";
  },
  // Publicly reachable base URL of THIS backend — used to build absolute
  // URLs for uploaded vehicle photos (LocalStorageProvider). Set this to
  // the deployed Render URL in production; falls back to localhost for
  // local dev.
  get backendPublicUrl() {
    const url = process.env.BACKEND_PUBLIC_URL || `http://localhost:${this.port}`;
    return url.replace(/\/$/, "");
  },
  // Which storage provider to use for uploaded files (vehicle photos).
  // "LOCAL" (default) writes to backend/uploads/ on disk. "CLOUDINARY"
  // uploads to Cloudinary instead — set this when deploying somewhere
  // with an ephemeral filesystem (Render, Railway, Heroku, etc.).
  get storageProvider() {
    return (process.env.STORAGE_PROVIDER || "LOCAL").toUpperCase();
  },
  // Cloudinary — only required when storageProvider is "CLOUDINARY".
  get cloudinaryCloudName() {
    return required("CLOUDINARY_CLOUD_NAME");
  },
  get cloudinaryApiKey() {
    return required("CLOUDINARY_API_KEY");
  },
  get cloudinaryApiSecret() {
    return required("CLOUDINARY_API_SECRET");
  },
  // Optional folder prefix so uploads from different environments
  // (local/staging/prod) don't collide in the same Cloudinary account.
  get cloudinaryFolderPrefix() {
    return process.env.CLOUDINARY_FOLDER_PREFIX || "kuwarji-travels";
  },
};

module.exports = { env, ConfigError };
