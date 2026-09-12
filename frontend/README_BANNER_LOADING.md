# Landing Banner + Bus Loading Integration

This frontend now expects two public/admin API capabilities for the new landing banner:

## Public
`GET /api/banner`

Response:
```json
{
  "success": true,
  "banner": {
    "id": "unique-id",
    "enabled": true,
    "imageUrl": "https://...",
    "title": "Announcement",
    "message": "Short message",
    "buttonText": "Explore",
    "buttonUrl": "/vehicles",
    "altText": "Announcement banner"
  }
}
```

## Admin
`POST /api/admin/banner` accepts JSON:
- filename
- mimeType
- dataBase64

It should store the image in the application's existing media/storage system and return `{ success: true, banner: {...} }`.

`DELETE /api/admin/banner` removes the active banner and returns `{ success: true }`.

The existing `PATCH /api/admin/settings` payload also includes a `banner` object so the banner metadata can be persisted with site settings.

## Loading animation
`apiFetch()` now emits global start/complete events. `GlobalLoadingBus` listens to these events and shows three animated Kuwarji bus logos whenever API requests are in progress. This is intentionally light, small, and non-blocking.
