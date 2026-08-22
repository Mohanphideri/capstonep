import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { apiFetch } from "../../api.js";
import { AdminLayout } from "../../components/AdminLayout.jsx";

const AC_TYPES = ["AC", "NON_AC"];
const SEAT_TYPES = ["SEATER", "SLEEPER", "SEMI_SLEEPER"];
const MAX_PHOTO_BYTES = 5 * 1024 * 1024;

function emptyForm() {
  return {
    name: "",
    categoryId: "",
    capacity: "",
    acType: "AC",
    seatType: "SEATER",
    amenityIds: [],
    description: "",
    rentalInfo: "",
    registrationNumber: "",
    priority: 0,
  };
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function AdminVehicleForm() {
  const { id } = useParams();
  const isNew = !id;
  const navigate = useNavigate();

  const [categories, setCategories] = useState([]);
  const [amenities, setAmenities] = useState([]);
  const [form, setForm] = useState(emptyForm());
  const [photos, setPhotos] = useState([]);
  const [createdVehicleId, setCreatedVehicleId] = useState(null);
  const [pendingUploads, setPendingUploads] = useState([]);

  const [loading, setLoading] = useState(!isNew);
  const [loadError, setLoadError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [saved, setSaved] = useState(false);

  const [photoUploading, setPhotoUploading] = useState(false);
  const [photoError, setPhotoError] = useState(null);

  useEffect(() => {
    apiFetch("/api/admin/categories").then(({ ok, data }) => {
      if (ok && data?.success) setCategories(data.categories.filter((c) => c.isActive));
    });
    apiFetch("/api/admin/amenities").then(({ ok, data }) => {
      if (ok && data?.success) setAmenities(data.amenities.filter((a) => a.isActive));
    });
  }, []);

  const loadVehicle = useCallback(async () => {
    if (isNew) return;
    setLoading(true);
    setLoadError(null);
    const { ok, data } = await apiFetch(`/api/admin/vehicles/${id}`);
    if (ok && data?.success) {
      const v = data.vehicle;
      setForm({
        name: v.name,
        categoryId: v.categoryId || "",
        capacity: v.capacity,
        acType: v.acType,
        seatType: v.seatType,
        amenityIds: v.amenityIds,
        description: v.description || "",
        rentalInfo: v.rentalInfo || "",
        registrationNumber: v.registrationNumber || "",
        priority: v.priority,
      });
      setPhotos(v.photos);
    } else {
      setLoadError(data?.error || "Vehicle not found.");
    }
    setLoading(false);
  }, [id, isNew]);

  useEffect(() => {
    loadVehicle();
  }, [loadVehicle]);

  const vehicleId = id || createdVehicleId;
  const showPhotoManager = Boolean(vehicleId);
  const isCreating = !vehicleId;

  function updateField(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function toggleAmenity(amenityId) {
    setForm((prev) => ({
      ...prev,
      amenityIds: prev.amenityIds.includes(amenityId)
        ? prev.amenityIds.filter((a) => a !== amenityId)
        : [...prev.amenityIds, amenityId],
    }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaveError(null);

    if (form.name.trim().length < 2) {
      setSaveError("Enter a vehicle name.");
      return;
    }
    if (!form.categoryId) {
      setSaveError("Select a category.");
      return;
    }
    if (!form.capacity || Number(form.capacity) < 1) {
      setSaveError("Enter a valid seating capacity.");
      return;
    }

    setSaving(true);
    const payload = {
      name: form.name.trim(),
      categoryId: form.categoryId,
      capacity: Number(form.capacity),
      acType: form.acType,
      seatType: form.seatType,
      amenityIds: form.amenityIds,
      description: form.description.trim(),
      rentalInfo: form.rentalInfo.trim(),
      registrationNumber: form.registrationNumber.trim() || null,
      priority: Number(form.priority) || 0,
    };

    const { ok, data } = isCreating
      ? await apiFetch("/api/admin/vehicles", { method: "POST", body: JSON.stringify(payload) })
      : await apiFetch(`/api/admin/vehicles/${vehicleId}`, { method: "PATCH", body: JSON.stringify(payload) });

    setSaving(false);

    if (!ok || !data?.success) {
      setSaveError(data?.error || "Failed to save vehicle.");
      return;
    }

    if (isCreating) {
      setCreatedVehicleId(data.vehicle.id);
      setForm((current) => ({ ...current }));
      setPhotos([]);
      setSaved(true);
      return;
    }

    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  function stagePhotoFiles(e) {
    const files = Array.from(e.target.files || []);
    e.target.value = "";
    if (!files.length) return;
    setPhotoError(null);

    const valid = [];
    for (const file of files) {
      if (file.size > MAX_PHOTO_BYTES) {
        setPhotoError(`${file.name}: image must be 5MB or smaller.`);
        continue;
      }
      if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
        setPhotoError(`${file.name}: only JPEG, PNG, or WEBP images are supported.`);
        continue;
      }
      valid.push({
        file,
        preview: URL.createObjectURL(file),
        showInPortal: true,
        showOnLanding: photos.length === 0 && valid.length === 0,
      });
    }
    setPendingUploads((current) => [...current, ...valid]);
  }

  function removePendingUpload(index) {
    setPendingUploads((current) => {
      const next = [...current];
      URL.revokeObjectURL(next[index]?.preview);
      next.splice(index, 1);
      return next;
    });
  }

  function updatePendingUpload(index, patch) {
    setPendingUploads((current) => current.map((item, i) => i === index ? { ...item, ...patch } : item));
  }

  async function uploadPendingPhotos() {
    if (!vehicleId || !pendingUploads.length) return;
    setPhotoError(null);
    setPhotoUploading(true);
    try {
      for (const item of pendingUploads) {
        const dataBase64 = await fileToBase64(item.file);
        const { ok, data } = await apiFetch(`/api/admin/vehicles/${vehicleId}/photos`, {
          method: "POST",
          body: JSON.stringify({
            filename: item.file.name,
            mimeType: item.file.type,
            dataBase64,
            showInPortal: item.showInPortal,
            showOnLanding: item.showOnLanding,
          }),
        });
        if (ok && data?.success) setPhotos((prev) => [...prev, data.photo]);
        else throw new Error(data?.error || `Failed to upload ${item.file.name}.`);
      }
      pendingUploads.forEach((item) => URL.revokeObjectURL(item.preview));
      setPendingUploads([]);
    } catch (err) {
      setPhotoError(err.message || "Failed to upload the selected images.");
    } finally {
      setPhotoUploading(false);
    }
  }

  async function deletePhoto(photoId) {
    setPhotoError(null);
    const { ok, data } = await apiFetch(`/api/admin/vehicles/${vehicleId}/photos/${photoId}`, { method: "DELETE" });
    if (ok && data?.success) {
      setPhotos((prev) => prev.filter((p) => p.id !== photoId));
    } else {
      setPhotoError(data?.error || "Failed to delete photo.");
    }
  }

  async function setPrimaryPhoto(photoId) {
    setPhotoError(null);
    const { ok, data } = await apiFetch(`/api/admin/vehicles/${vehicleId}/photos/${photoId}/primary`, { method: "PATCH" });
    if (ok && data?.success) {
      setPhotos((prev) => prev.map((p) => ({ ...p, isPrimary: p.id === photoId })));
    } else {
      setPhotoError(data?.error || "Failed to set primary photo.");
    }
  }

  async function updatePhotoVisibility(photoId, patch) {
    setPhotoError(null);
    const { ok, data } = await apiFetch(`/api/admin/vehicles/${vehicleId}/photos/${photoId}/visibility`, {
      method: "PATCH",
      body: JSON.stringify(patch),
    });
    if (ok && data?.success) {
      setPhotos((prev) => prev.map((p) => {
        if (patch.showOnLanding === true) return { ...p, showOnLanding: p.id === photoId, isPrimary: p.id === photoId };
        if (p.id !== photoId) return p;
        return { ...p, ...data.photo };
      }));
    } else {
      setPhotoError(data?.error || "Failed to update photo visibility.");
    }
  }

  async function movePhoto(index, direction) {
    const target = index + direction;
    if (target < 0 || target >= photos.length) return;
    const reordered = [...photos];
    [reordered[index], reordered[target]] = [reordered[target], reordered[index]];
    setPhotos(reordered);

    const { ok, data } = await apiFetch(`/api/admin/vehicles/${vehicleId}/photos/reorder`, {
      method: "PATCH",
      body: JSON.stringify({ order: reordered.map((p) => p.id) }),
    });
    if (!ok || !data?.success) {
      setPhotoError(data?.error || "Failed to reorder photos.");
      loadVehicle();
    }
  }

  if (loading) {
    return (
      <AdminLayout title={isNew && !createdVehicleId ? "Add vehicle" : "Edit vehicle"}>
        <p className="admin-loading">Loading vehicle…</p>
      </AdminLayout>
    );
  }

  if (loadError) {
    return (
      <AdminLayout title="Edit vehicle">
        <p className="admin-error">{loadError}</p>
        <Link to="/admin/vehicles" className="btn btn-outline btn-sm">
          Back to vehicles
        </Link>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title={isNew && !createdVehicleId ? "Add vehicle" : `Edit: ${form.name}`}>
      <Link to="/admin/vehicles" className="admin-subtext" style={{ display: "inline-block", marginBottom: "1rem" }}>
        ← Back to vehicles
      </Link>

      <form className="ticket admin-table-card" onSubmit={handleSubmit}>
        <div className="admin-form-grid">
          <div className="admin-form-field">
            <label className="otp-label-text" htmlFor="v-name">Name</label>
            <input
              id="v-name"
              className="admin-input"
              value={form.name}
              onChange={(e) => updateField("name", e.target.value)}
              placeholder="e.g. Volvo 9600 A/C Sleeper"
            />
          </div>
          <div className="admin-form-field">
            <label className="otp-label-text" htmlFor="v-category">Category</label>
            <select
              id="v-category"
              className="admin-select"
              value={form.categoryId}
              onChange={(e) => updateField("categoryId", e.target.value)}
            >
              <option value="">Select a category</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="admin-form-grid">
          <div className="admin-form-field">
            <label className="otp-label-text" htmlFor="v-capacity">Capacity (seats)</label>
            <input
              id="v-capacity"
              type="number"
              min={1}
              className="admin-input"
              value={form.capacity}
              onChange={(e) => updateField("capacity", e.target.value)}
            />
          </div>
          <div className="admin-form-field">
            <label className="otp-label-text" htmlFor="v-priority">Admin priority</label>
            <input
              id="v-priority"
              type="number"
              className="admin-input"
              value={form.priority}
              onChange={(e) => updateField("priority", e.target.value)}
            />
          </div>
        </div>

        <div className="admin-form-grid">
          <div className="admin-form-field">
            <label className="otp-label-text" htmlFor="v-ac">AC / Non-AC</label>
            <select id="v-ac" className="admin-select" value={form.acType} onChange={(e) => updateField("acType", e.target.value)}>
              {AC_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t === "AC" ? "AC" : "Non-AC"}
                </option>
              ))}
            </select>
          </div>
          <div className="admin-form-field">
            <label className="otp-label-text" htmlFor="v-seat">Seat type</label>
            <select id="v-seat" className="admin-select" value={form.seatType} onChange={(e) => updateField("seatType", e.target.value)}>
              {SEAT_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t.replace("_", "-").toLowerCase()}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="admin-form-field">
          <label className="otp-label-text" htmlFor="v-reg">Registration number <span className="enquiry-optional">(internal only)</span></label>
          <input
            id="v-reg"
            className="admin-input"
            value={form.registrationNumber}
            onChange={(e) => updateField("registrationNumber", e.target.value)}
            placeholder="e.g. PB-01-AB-1234"
          />
        </div>

        <div className="admin-form-field">
          <label className="otp-label-text">Amenities</label>
          {amenities.length === 0 ? (
            <p className="admin-subtext">No amenities yet — add some from the Amenities page first.</p>
          ) : (
            <div className="admin-checkbox-grid">
              {amenities.map((a) => (
                <label key={a.id} className="admin-checkbox-item">
                  <input
                    type="checkbox"
                    checked={form.amenityIds.includes(a.id)}
                    onChange={() => toggleAmenity(a.id)}
                  />
                  {a.name}
                </label>
              ))}
            </div>
          )}
        </div>

        <div className="admin-form-field">
          <label className="otp-label-text" htmlFor="v-desc">Description</label>
          <textarea
            id="v-desc"
            rows={4}
            className="admin-textarea"
            value={form.description}
            onChange={(e) => updateField("description", e.target.value)}
            placeholder="What makes this vehicle a good fit for a trip…"
          />
        </div>

        <div className="admin-form-field">
          <label className="otp-label-text" htmlFor="v-rental">Rental information</label>
          <textarea
            id="v-rental"
            rows={3}
            className="admin-textarea"
            value={form.rentalInfo}
            onChange={(e) => updateField("rentalInfo", e.target.value)}
            placeholder="e.g. minimum booking days, fuel policy, driver terms…"
          />
        </div>

        {saveError && <p className="otp-error">{saveError}</p>}
        {saved && <p className="enquiry-verified-note">✓ Saved.</p>}

        <div className="admin-form-actions">
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? "Saving…" : isNew && !createdVehicleId ? "Create vehicle" : "Save changes"}
          </button>
        </div>
      </form>

      {showPhotoManager && (
        <div className="ticket admin-table-card">
          <p className="eyebrow">Photos</p>
          <h2 className="vehicle-detail-section-title">Manage photos</h2>

          {photoError && <p className="otp-error">{photoError}</p>}

          {photos.length === 0 ? (
            <p className="admin-empty">No photos yet. Upload one below.</p>
          ) : (
            <div className="admin-photo-grid">
              {photos.map((p, index) => (
                <div key={p.id} className="admin-photo-thumb">
                  <div className="admin-photo-badges">
                    {p.isPrimary && <span className="admin-photo-primary-badge">Primary</span>}
                    {p.showOnLanding && <span className="admin-photo-landing-badge">Landing</span>}
                    {p.showInPortal !== false && <span className="admin-photo-portal-badge">Portal</span>}
                  </div>
                  <img src={p.url} alt={`${form.name} vehicle`} />
                  <div className="admin-photo-thumb-actions">
                    <button type="button" className="btn btn-outline btn-sm" onClick={() => movePhoto(index, -1)} disabled={index === 0}>
                      ↑
                    </button>
                    <button
                      type="button"
                      className="btn btn-outline btn-sm"
                      onClick={() => movePhoto(index, 1)}
                      disabled={index === photos.length - 1}
                    >
                      ↓
                    </button>
                    {!p.isPrimary && (
                      <button type="button" className="btn btn-outline btn-sm" onClick={() => setPrimaryPhoto(p.id)}>
                        Card image
                      </button>
                    )}
                    <button
                      type="button"
                      className={`btn btn-sm ${p.showOnLanding ? "btn-primary" : "btn-outline"}`}
                      onClick={() => updatePhotoVisibility(p.id, { showOnLanding: !p.showOnLanding })}
                    >
                      {p.showOnLanding ? "Landing image" : "Use on landing"}
                    </button>
                    <button
                      type="button"
                      className={`btn btn-sm ${p.showInPortal !== false ? "btn-primary" : "btn-outline"}`}
                      onClick={() => updatePhotoVisibility(p.id, { showInPortal: p.showInPortal === false })}
                    >
                      {p.showInPortal !== false ? "Portal on" : "Portal off"}
                    </button>
                    <button type="button" className="btn btn-danger btn-sm" onClick={() => deletePhoto(p.id)}>
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="admin-photo-uploader admin-photo-uploader-enhanced">
            <div className="admin-photo-upload-copy">
              <strong>{isNew && createdVehicleId ? "Vehicle created — add its images now" : "Add vehicle images"}</strong>
              <span>Upload clear JPG, PNG or WEBP photos up to 5MB each. The browser only asks for file access when you choose images.</span>
              <small><b>Permissions:</b> Portal = visible to customers · Landing = approved for the public home page. You control these permissions before upload.</small>
            </div>
            <label
              className="admin-photo-dropzone"
              htmlFor="v-photo-upload"
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                const files = Array.from(e.dataTransfer.files || []);
                if (!files.length) return;
                stagePhotoFiles({ target: { files, value: "" } });
              }}
            >
              <span className="admin-photo-drop-icon">＋</span>
              <strong>Select images</strong>
              <small>or drag files here · up to 5MB each</small>
            </label>
            <input
              id="v-photo-upload"
              type="file"
              multiple
              accept="image/jpeg,image/png,image/webp"
              onChange={stagePhotoFiles}
              disabled={photoUploading}
              className="admin-photo-file-input"
            />
          </div>

          {pendingUploads.length > 0 && (
            <div className="admin-pending-photo-list">
              {pendingUploads.map((item, index) => (
                <div className="admin-pending-photo" key={`${item.file.name}-${index}`}>
                  <img src={item.preview} alt={`Preview ${item.file.name}`} />
                  <div className="admin-pending-photo-copy">
                    <strong title={item.file.name}>{item.file.name}</strong>
                    <small>{(item.file.size / (1024 * 1024)).toFixed(2)} MB</small>
                    <div className="admin-photo-permissions">
                      <label><input type="checkbox" checked={item.showInPortal} onChange={(e) => updatePendingUpload(index, { showInPortal: e.target.checked })} /> Customer portal</label>
                      <label><input type="checkbox" checked={item.showOnLanding} onChange={(e) => updatePendingUpload(index, { showOnLanding: e.target.checked })} /> Landing page</label>
                    </div>
                  </div>
                  <button type="button" className="btn btn-outline btn-sm" onClick={() => removePendingUpload(index)}>Remove</button>
                </div>
              ))}
              <div className="admin-pending-photo-actions">
                <span className="admin-subtext">{pendingUploads.length} image{pendingUploads.length === 1 ? "" : "s"} ready</span>
                <button type="button" className="btn btn-primary" onClick={uploadPendingPhotos} disabled={photoUploading}>
                  {photoUploading ? "Uploading images…" : "Upload selected images"}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </AdminLayout>
  );
}
