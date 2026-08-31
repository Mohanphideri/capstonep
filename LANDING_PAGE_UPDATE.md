# Kuwarji Travels Landing Page Redesign – Implementation Notes

## What changed

The public landing page was redesigned to follow the supplied clean/bright Kuwarji Travels reference design while preserving the existing travel features.

### Hero
- Removed the From/To route-search box from the landing page.
- Removed the old illustrative HeroIllustration/route card presentation.
- Added a large travel hero with:
  - Admin-controlled hero title
  - Admin-controlled accent line
  - Admin-controlled description
  - Admin-uploaded hero image
  - Search Vehicles CTA
  - Plan My Trip CTA
  - Trust/benefit badges
- If no dedicated hero image is configured, the first Admin-selected landing vehicle image is used as a fallback.

### Fleet
- Removed hardcoded landing-page vehicle categories.
- Landing fleet cards now come from `/api/vehicles`.
- Only Admin-selected `landingPhotos` are used for the homepage fleet section.
- Vehicle name, category, capacity and AC type come from the backend.
- Fleet cards link to the existing vehicle detail pages.

### Reviews
- Reviews continue to come from `/api/reviews/featured`.
- Approved reviews are automatically duplicated into a continuous horizontal marquee.
- The review track auto-scrolls continuously.
- Hovering pauses the animation.
- No hardcoded review content is introduced.

### Tour Packages
- Homepage package cards come from `/api/tour-packages`.
- Package images are the images managed by Admin.
- Only active public packages are returned by the existing public endpoint.

### Why Us
- Homepage Why Us content comes from `/api/site-content`.
- Admin-managed Why Us image and feature text are displayed.

### Branding / Logo
- `BrandLogo` now reads the public logo from `/api/site-content`.
- Existing `/kuwarji-travels-logo.png` remains the safe fallback.
- Added Admin logo upload/remove support.
- Uploaded logos are stored through the project's existing storage provider (Cloudinary when configured, local storage otherwise).

## New Admin options

### Admin → Settings → Homepage
- Hero title
- Hero accent line
- Hero description
- Hero image upload/remove

### Admin → Settings → Business Profile
- Brand logo upload/remove

### Admin sidebar
- Added a dedicated `Homepage` settings entry.

## New backend settings

`SiteSetting` now supports:

- `homepage.heroTitle`
- `homepage.heroAccent`
- `homepage.heroBody`
- `homepage.heroImageUrl`
- `homepage.heroImageKey`
- `logoUrl`
- `logoKey`

## New/updated endpoints

Public:

- `GET /api/site-content` now returns `logoUrl` and `homepage` content.

Admin:

- `POST /api/admin/settings/logo`
- `DELETE /api/admin/settings/logo`
- `POST /api/admin/settings/homepage-hero`
- `DELETE /api/admin/settings/homepage-hero`
- `PATCH /api/admin/settings` supports the `homepage` object.

## Important behavior

The landing page does not contain a From/To search form.

The main actions are:

- Search Vehicles
- Plan My Trip
- Get a Quote

All homepage photos are sourced from Admin-managed uploads/data rather than newly invented hardcoded image URLs.

## Validation

Backend JavaScript syntax was checked successfully with `node --check` for the modified backend files.

A complete Vite production build could not be run in the execution environment because the npm dependency registry/cache was unavailable; therefore the final runtime build/browser smoke test must still be performed in the normal development/deployment environment.
