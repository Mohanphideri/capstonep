import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "../../api.js";
import { AdminLayout } from "../../components/AdminLayout.jsx";

function emptyForm() {
  return { name: "", icon: "" };
}

export default function AdminAmenities() {
  const [amenities, setAmenities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionError, setActionError] = useState(null);

  const [editingId, setEditingId] = useState(null); // null = not editing, "new" = create form
  const [form, setForm] = useState(emptyForm());
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { ok, data } = await apiFetch("/api/admin/amenities");
    if (ok && data?.success) {
      setAmenities(data.amenities);
    } else {
      setError(data?.error || "Failed to load amenities.");
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function startCreate() {
    setForm(emptyForm());
    setEditingId("new");
    setActionError(null);
  }

  function startEdit(amenity) {
    setForm({ name: amenity.name, icon: amenity.icon || "" });
    setEditingId(amenity.id);
    setActionError(null);
  }

  async function handleSave(e) {
    e.preventDefault();
    setActionError(null);
    if (form.name.trim().length < 2) {
      setActionError("Enter an amenity name.");
      return;
    }
    setSaving(true);
    const payload = { name: form.name.trim(), icon: form.icon.trim() || null };
    const { ok, data } =
      editingId === "new"
        ? await apiFetch("/api/admin/amenities", { method: "POST", body: JSON.stringify(payload) })
        : await apiFetch(`/api/admin/amenities/${editingId}`, { method: "PATCH", body: JSON.stringify(payload) });
    setSaving(false);
    if (!ok || !data?.success) {
      setActionError(data?.error || "Failed to save amenity.");
      return;
    }
    setEditingId(null);
    load();
  }

  async function toggleActive(amenity) {
    setActionError(null);
    const { ok, data } = await apiFetch(`/api/admin/amenities/${amenity.id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ isActive: !amenity.isActive }),
    });
    if (ok && data?.success) {
      setAmenities((prev) => prev.map((a) => (a.id === amenity.id ? data.amenity : a)));
    } else {
      setActionError(data?.error || "Failed to update amenity status.");
    }
  }

  return (
    <AdminLayout title="Vehicle amenities">
      <div className="admin-page-actions">
        <p className="admin-subtext">{amenities.length} amenit{amenities.length === 1 ? "y" : "ies"}</p>
        <button type="button" className="btn btn-primary btn-sm" onClick={startCreate}>
          + Add amenity
        </button>
      </div>

      {actionError && <p className="otp-error">{actionError}</p>}

      {editingId && (
        <form className="ticket admin-table-card" onSubmit={handleSave}>
          <p className="eyebrow">{editingId === "new" ? "New amenity" : "Edit amenity"}</p>
          <div className="admin-form-grid">
            <div className="admin-form-field">
              <label className="otp-label-text" htmlFor="am-name">Name</label>
              <input
                id="am-name"
                className="admin-input"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="e.g. Charging point"
              />
            </div>
            <div className="admin-form-field">
              <label className="otp-label-text" htmlFor="am-icon">Icon <span className="enquiry-optional">(optional)</span></label>
              <input
                id="am-icon"
                className="admin-input"
                value={form.icon}
                onChange={(e) => setForm((f) => ({ ...f, icon: e.target.value }))}
                placeholder="e.g. plug"
              />
            </div>
          </div>
          <div className="admin-form-actions">
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? "Saving…" : "Save"}
            </button>
            <button type="button" className="btn btn-outline" onClick={() => setEditingId(null)}>
              Cancel
            </button>
          </div>
        </form>
      )}

      <div className="ticket admin-table-card">
        {loading ? (
          <p className="admin-loading">Loading amenities…</p>
        ) : error ? (
          <p className="admin-error">{error}</p>
        ) : amenities.length === 0 ? (
          <p className="admin-empty">No amenities yet. Add one to start building the picklist.</p>
        ) : (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Icon</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {amenities.map((a) => (
                  <tr key={a.id}>
                    <td>{a.name}</td>
                    <td>{a.icon || "—"}</td>
                    <td>
                      <span className={`admin-badge ${a.isActive ? "admin-badge-active" : "admin-badge-inactive"}`}>
                        {a.isActive ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td>
                      <button type="button" className="admin-inline-btn" onClick={() => startEdit(a)}>
                        Edit
                      </button>{" "}
                      <button type="button" className="admin-inline-btn" onClick={() => toggleActive(a)}>
                        {a.isActive ? "Deactivate" : "Activate"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
