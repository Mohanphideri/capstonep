import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "../../api.js";
import { AdminLayout } from "../../components/AdminLayout.jsx";

const ICONS = ["bus", "sleeper", "van", "luxury"];

function emptyForm() {
  return { name: "", description: "", icon: "bus" };
}

export default function AdminCategories() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionError, setActionError] = useState(null);

  const [editingId, setEditingId] = useState(null); // null = not editing, "new" = create form
  const [form, setForm] = useState(emptyForm());
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { ok, data } = await apiFetch("/api/admin/categories");
    if (ok && data?.success) {
      setCategories(data.categories);
    } else {
      setError(data?.error || "Failed to load categories.");
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

  function startEdit(category) {
    setForm({ name: category.name, description: category.description || "", icon: category.icon });
    setEditingId(category.id);
    setActionError(null);
  }

  async function handleSave(e) {
    e.preventDefault();
    setActionError(null);
    if (form.name.trim().length < 2) {
      setActionError("Enter a category name.");
      return;
    }
    setSaving(true);
    const payload = { name: form.name.trim(), description: form.description.trim(), icon: form.icon };
    const { ok, data } =
      editingId === "new"
        ? await apiFetch("/api/admin/categories", { method: "POST", body: JSON.stringify(payload) })
        : await apiFetch(`/api/admin/categories/${editingId}`, { method: "PATCH", body: JSON.stringify(payload) });
    setSaving(false);
    if (!ok || !data?.success) {
      setActionError(data?.error || "Failed to save category.");
      return;
    }
    setEditingId(null);
    load();
  }

  async function toggleActive(category) {
    setActionError(null);
    const { ok, data } = await apiFetch(`/api/admin/categories/${category.id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ isActive: !category.isActive }),
    });
    if (ok && data?.success) {
      setCategories((prev) => prev.map((c) => (c.id === category.id ? data.category : c)));
    } else {
      setActionError(data?.error || "Failed to update category status.");
    }
  }

  async function move(index, direction) {
    const target = index + direction;
    if (target < 0 || target >= categories.length) return;
    const reordered = [...categories];
    [reordered[index], reordered[target]] = [reordered[target], reordered[index]];
    setCategories(reordered);
    const { ok, data } = await apiFetch("/api/admin/categories/reorder", {
      method: "PATCH",
      body: JSON.stringify({ order: reordered.map((c) => c.id) }),
    });
    if (!ok || !data?.success) {
      setActionError(data?.error || "Failed to reorder categories.");
      load();
    }
  }

  return (
    <AdminLayout title="Vehicle categories">
      <div className="admin-page-actions">
        <p className="admin-subtext">{categories.length} category{categories.length === 1 ? "" : "ies"}</p>
        <button type="button" className="btn btn-primary btn-sm" onClick={startCreate}>
          + Add category
        </button>
      </div>

      {actionError && <p className="otp-error">{actionError}</p>}

      {editingId && (
        <form className="ticket admin-table-card" onSubmit={handleSave}>
          <p className="eyebrow">{editingId === "new" ? "New category" : "Edit category"}</p>
          <div className="admin-form-grid">
            <div className="admin-form-field">
              <label className="otp-label-text" htmlFor="cat-name">Name</label>
              <input
                id="cat-name"
                className="admin-input"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              />
            </div>
            <div className="admin-form-field">
              <label className="otp-label-text" htmlFor="cat-icon">Icon</label>
              <select
                id="cat-icon"
                className="admin-select"
                value={form.icon}
                onChange={(e) => setForm((f) => ({ ...f, icon: e.target.value }))}
              >
                {ICONS.map((i) => (
                  <option key={i} value={i}>
                    {i}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="admin-form-field">
            <label className="otp-label-text" htmlFor="cat-desc">Description</label>
            <textarea
              id="cat-desc"
              rows={2}
              className="admin-textarea"
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            />
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
          <p className="admin-loading">Loading categories…</p>
        ) : error ? (
          <p className="admin-error">{error}</p>
        ) : categories.length === 0 ? (
          <p className="admin-empty">No categories yet. Add one to start organizing your fleet.</p>
        ) : (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Order</th>
                  <th>Name</th>
                  <th>Icon</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {categories.map((c, index) => (
                  <tr key={c.id}>
                    <td>
                      <button type="button" className="admin-inline-btn" onClick={() => move(index, -1)} disabled={index === 0}>
                        ↑
                      </button>{" "}
                      <button
                        type="button"
                        className="admin-inline-btn"
                        onClick={() => move(index, 1)}
                        disabled={index === categories.length - 1}
                      >
                        ↓
                      </button>
                    </td>
                    <td>
                      {c.name}
                      {c.description && <p className="admin-subtext">{c.description}</p>}
                    </td>
                    <td>{c.icon}</td>
                    <td>
                      <span className={`admin-badge ${c.isActive ? "admin-badge-active" : "admin-badge-inactive"}`}>
                        {c.isActive ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td>
                      <button type="button" className="admin-inline-btn" onClick={() => startEdit(c)}>
                        Edit
                      </button>{" "}
                      <button type="button" className="admin-inline-btn" onClick={() => toggleActive(c)}>
                        {c.isActive ? "Deactivate" : "Activate"}
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
