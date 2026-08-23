# Kuwarji Travels — Backend (Express API, deploy to Render)

Plain JavaScript Express API. Same behavior as the original Next.js API
routes (OTP login via MSG91, server-rendered captcha, signed session
cookie, MongoDB `User` model) — just extracted into a standalone server
so it can be deployed separately from the frontend.

## Endpoints

- `GET /api/health` — health check
- `GET /api/captcha` — issue a new captcha challenge (SVG + cookie)
- `POST /api/captcha/verify` — check a typed captcha answer `{ answer }`
- `POST /api/auth/verify` — verify an MSG91 access token `{ accessToken }`, creates/logs in the user, sets the session cookie
- `GET /api/auth/me` — returns the current logged-in user (reads the session cookie)
- `POST /api/auth/logout` — clears the session cookie
- `POST /api/auth/admin-login` — staff/admin login `{ phone, password }`, sets the same session cookie with an admin role
- `POST /api/enquiry` — public enquiry form submission, requires an OTP-verified `accessToken` (same MSG91 widget as login)
- `GET /api/enquiry` — list enquiries (admin only)
- `PATCH /api/enquiry/:id/status` — update an enquiry's status (admin only)
- `GET /api/admin/stats` — dashboard counts (admin only)
- `GET /api/admin/users` — list customer/staff accounts (admin only)
- `PATCH /api/admin/users/:id/active` — activate/deactivate an account (super_admin only)

## 1. Install

```bash
npm install
```

## 2. Configure environment variables

```bash
cp .env.example .env
```

| Variable | Notes |
|---|---|
| `MONGODB_URI` | Your MongoDB connection string (Atlas or self-hosted) |
| `MSG91_AUTH_KEY` | MSG91 dashboard → API → Auth Key. Server-only, never expose this to the frontend. |
| `AUTH_SECRET` | Any long random string — e.g. `openssl rand -base64 48` |
| `FRONTEND_URL` | The deployed frontend origin (e.g. `https://kuwarji-travels.vercel.app`). Comma-separate multiple origins if needed. |
| `PORT` | Defaults to `4000` locally; Render sets this automatically. |
| `NODE_ENV` | `development` locally, `production` on Render. Not required for cookies to work anymore (see below), but still good practice to set. |
| `ADMIN_PHONE` | 10-digit mobile number for the bootstrap admin account. Required. |
| `ADMIN_PASSWORD` | Password for the bootstrap admin account. Required. |
| `BREVO_API_KEY` | Brevo API key for transactional email. Keep server-only. |
| `BREVO_SENDER_EMAIL` | Verified Brevo sender email address. Required for email delivery. |
| `BREVO_SENDER_NAME` | Sender display name; defaults to `Kuwarji Travels`. |
| `BREVO_REPLY_TO_EMAIL` | Optional reply-to address; defaults to the sender email. |
| `BREVO_REPLY_TO_NAME` | Optional reply-to display name; defaults to the sender name. |
| `SUPERADMIN_EMAIL` | Email address that receives new customer-enquiry notifications. |


## Transactional email / Brevo

The project uses Brevo's transactional SMTP API with a branded Kuwarji Travels HTML template. The sender is always taken from the server environment, never from a browser request. The email design uses the same premium hospital-style visual language used by the dashboard: navy header, white cards, subtle borders, clear information hierarchy and compact status/detail tables.

Emails currently wired into the backend include:

- Welcome email after profile completion
- Customer enquiry confirmation
- SuperAdmin enquiry notification
- Booking confirmation with booking PDF attachment
- Booking cancellation notification
- Invoice email with invoice PDF attachment
- Manual booking-email resend
- Manual invoice-email resend

Before deploying, add a **verified sender** in Brevo and set `BREVO_API_KEY`, `BREVO_SENDER_EMAIL`, and `BREVO_SENDER_NAME` in Render. If these values are missing, the API intentionally records the failed delivery in `EmailLog` instead of pretending that the email was sent.

Customer replies can be routed through `BREVO_REPLY_TO_EMAIL`.

## 3. Run locally

```bash
npm run dev
```

Runs on `http://localhost:4000` by default.

## Deploying to Render

1. Push this `backend/` folder to its own Git repo (or a subfolder of a monorepo — set Render's "Root Directory" to `backend`).
2. Create a new **Web Service** on Render pointing at the repo.
3. Build command: `npm install`
4. Start command: `npm start`
5. Add the environment variables above in Render's dashboard (**do not** upload a `.env` file — Render doesn't need one).
6. Once deployed, copy the Render service URL (e.g. `https://kuwarji-travels-api.onrender.com`) — you'll set this as `VITE_API_URL` on the frontend.
7. Set `FRONTEND_URL` on Render to your Vercel URL once you have it, then redeploy (CORS needs the exact origin).

## Cross-origin cookies

Because the frontend (Vercel) and backend (Render) are on different
domains, the session and captcha cookies are set with
`SameSite=None; Secure` so the browser will send them back on API calls
from the frontend. Whether to use `None; Secure` vs `Lax` is now decided
per-request from whether the request arrived over HTTPS (`req.secure`,
via `trust proxy`) rather than from the `NODE_ENV` variable — so this
works correctly even if you forget to set `NODE_ENV=production` on
Render (a common cause of "OTP never sends" / captcha always says
"expired", since Render doesn't set `NODE_ENV` for you automatically).

This still requires:

- The frontend to call `fetch(..., { credentials: "include" })` on every
  request to this API (already done in the provided frontend).
- Both sites to be served over HTTPS (Render and Vercel both do this by
  default).
- `FRONTEND_URL` on this service to exactly match the frontend's deployed
  origin, since CORS is locked to that origin (required for
  credentialed requests — wildcard `*` doesn't work with cookies).
- The user's browser to allow third-party cookies for these two domains.
  Some browsers (Safari, Firefox in strict mode, Chrome with "Block
  third-party cookies" on) block this by default, which will make login
  fail with no useful error. If you see this a lot in production, the
  most durable fix is to put the frontend and API behind the **same**
  parent domain (e.g. `www.kuwarjitravels.com` and
  `api.kuwarjitravels.com`) instead of vercel.app/onrender.com, since
  same-site cookies aren't affected by third-party cookie blocking.

## Security notes

- Rate limiting here is in-memory and per-instance. If you scale to
  multiple Render instances, move this to Redis or similar.
- Never commit `.env`. `MSG91_AUTH_KEY` and `AUTH_SECRET` must stay
  server-only.

## Cloudinary vehicle photos

For production, set `STORAGE_PROVIDER=CLOUDINARY` and provide the three `CLOUDINARY_*` credentials. See `CLOUDINARY_SETUP.md`. Admin vehicle uploads are stored in Cloudinary and the database stores the secure URL/public ID plus admin-controlled `showInPortal`, `showOnLanding`, and `isPrimary` flags.
