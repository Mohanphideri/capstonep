# Kuwarji Travels — Full Stack Premium Light UI

This package contains both the **frontend** and **backend** in one project.

## Structure

- `frontend/` — Vite + React customer/admin application, premium light UI, advanced Trip Maker, landing banner UI, three-bus loading animation.
- `backend/` — Express + MongoDB API, authentication, vehicles, bookings, enquiries, admin settings, image storage, and landing-banner API.

## Frontend

```bash
cd frontend
npm install
npm run dev
```

Set `VITE_API_URL` in `frontend/.env` to your backend URL.

## Backend

```bash
cd backend
npm install
npm start
```

Configure `backend/.env` from `.env.example` with MongoDB, frontend URL, JWT/auth and storage settings.

## Landing Banner

Admin can upload the landing-page banner from **Admin → Settings**.

The backend provides:

- `GET /api/banner` — public active banner
- `POST /api/admin/banner` — SUPER_ADMIN banner image upload
- `DELETE /api/admin/banner` — SUPER_ADMIN banner removal
- `PATCH /api/admin/settings` — saves banner text/button/visibility settings

Banner images use the existing storage provider configuration (local or Cloudinary).

Visitors see the banner when enabled and can close it with the **X** button. Dismissal is stored for the current browser session.

## Loading Animation

The frontend includes a global three-bus loading animation using the Kuwarji Travels icon while API requests are in progress.

## Important

Existing routes, authentication, vehicle management, admin functionality, and APIs are preserved. The Trip Maker remains a frontend guided planner and uses the existing vehicle API; connect trip persistence to your preferred backend trip model if you want server-side saved trips.
