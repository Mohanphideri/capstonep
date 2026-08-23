# Kuwarji Travels — Frontend (React + Vite, deploy to Vercel)

Plain JavaScript React app (no TypeScript, no Tailwind — plain CSS files
per component). Same pages and OTP-login flow as the original, calling
the separate Express backend over the network instead of using Next.js
API routes.

## Pages

- `/` — public landing page
- `/login` — mobile number → custom captcha → MSG91 OTP widget → session
- `/dashboard` — protected; redirects to `/login` if not authenticated (checked client-side via `GET /api/auth/me`)

## 1. Install

```bash
npm install
```

## 2. Configure environment variables

```bash
cp .env.example .env.local
```

| Variable | Notes |
|---|---|
| `VITE_API_URL` | URL of the deployed backend (Render), e.g. `https://kuwarji-travels-api.onrender.com`. Use `http://localhost:4000` for local dev. |
| `VITE_MSG91_WIDGET_ID` | MSG91 dashboard → OTP → Widgets → your widget's Widget ID |
| `VITE_MSG91_TOKEN_AUTH` | Same widget's Token Auth |
| `VITE_WHATSAPP_NUMBER`, `VITE_BUSINESS_ADDRESS`, `VITE_BUSINESS_PHONE`, `VITE_BUSINESS_EMAIL` | Optional footer/contact placeholders |

Only variables prefixed `VITE_` are exposed to the browser by Vite — this
mirrors the original app's `NEXT_PUBLIC_` convention.

## 3. Run locally

```bash
npm run dev
```

Visit `http://localhost:5173`. Run the backend (`../backend`) at the same
time on `http://localhost:4000`.

## Deploying to Vercel

1. Push this `frontend/` folder to its own Git repo (or a subfolder of a monorepo — set Vercel's "Root Directory" to `frontend`).
2. Import the repo in Vercel. Framework preset: **Vite**.
3. Build command: `npm run build` — Output directory: `dist` (Vercel's Vite preset sets these automatically).
4. Add the environment variables above in Vercel's project settings, pointing `VITE_API_URL` at your deployed Render backend.
5. Deploy. `vercel.json` in this folder rewrites all routes to `index.html` so client-side routing (`/dashboard`, `/login`) works on refresh/direct link.
6. Once you have the Vercel URL, set it as `FRONTEND_URL` on the backend service (Render) and redeploy the backend so CORS allows it.

## How login works (unchanged behavior)

1. User enters their mobile number on `/login`.
2. The browser calls MSG91's OTP Widget (`window.sendOtp`), which sends the OTP directly.
3. User enters the OTP; the browser calls `window.verifyOtp`, returning a signed JWT access-token from MSG91.
4. The browser sends that token to the backend's `POST /api/auth/verify`.
5. The backend verifies it against MSG91 server-side, finds-or-creates the user, and sets a session cookie.
6. The frontend re-checks `/api/auth/me` and redirects to `/dashboard`.

## Notes on the design conversion

- Tailwind utility classes were replaced with plain CSS files (one per
  component/page) using CSS custom properties in `src/styles/index.css`
  for the color palette, fonts, and the "ticket" boarding-pass card
  styling — same visual design, no Tailwind build step required.
