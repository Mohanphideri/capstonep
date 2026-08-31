# Cloudinary vehicle photos

1. Create a Cloudinary account and open the dashboard.
2. Copy **Cloud name**, **API Key**, and **API Secret** into the backend environment.
3. Set `STORAGE_PROVIDER=CLOUDINARY`.
4. Restart the backend.
5. Admin uploads from **Admin → Vehicles → Add/Edit Vehicle → Photos** are sent to Cloudinary through the backend.
6. The database stores the Cloudinary secure URL and public ID. The actual image bytes are not stored on the application server.

## Admin permissions

Every uploaded photo can have these controls:

- **Portal on/off** — controls whether customers can see the image in the vehicle detail gallery.
- **Use on landing** — selects the single landing-page image for that vehicle and also makes it the primary card image.
- **Card image** — changes the primary image used in catalogue cards without changing portal permissions.

The public API exposes `photos` for approved portal images and `landingPhotos` for the admin-selected landing image.
