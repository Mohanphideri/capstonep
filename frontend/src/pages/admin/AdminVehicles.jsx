import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { apiFetch } from "../../api.js";
import { AdminLayout } from "../../components/AdminLayout.jsx";

const STATUS_FILTERS = [
  { value: "", label: "All statuses" },
  { value: "AVAILABLE", label: "Available" },
  { value: "INACTIVE", label: "Inactive" },
];

function StatusBadge({ status }) {
  const known = status === "AVAILABLE" || status === "INACTIVE";
  const cls = status === "AVAILABLE" ? "admin-badge-available" : known ? "admin-badge-inactive" : "admin-badge-legacy";
  return <span className={`admin-badge ${cls}`}>{status}</span>;
}

export default function AdminVehicles() {
  const [vehicles, setVehicles] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 20;

  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [actionError, setActionError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const params = new URLSearchParams({ page: String(page), limit: String(limit) });
    if (search.trim()) params.set("search", search.trim());
    if (status) params.set("status", status);
    if (categoryId) params.set("categoryId", categoryId);

    const { ok, data } = await apiFetch(`/api/admin/vehicles?${params.toString()}`);
    if (ok && data?.success) {
      setVehicles(Array.from(new Map((data.vehicles || []).map((item) => [item.id, item])).values()));
      setTotal(data.total);
    } else {
      setError(data?.error || "Failed to load vehicles.");
    }
    setLoading(false);
  }, [search, status, categoryId, page]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    apiFetch("/api/admin/categories").then(({ ok, data }) => {
      if (ok && data?.success) setCategories(data.categories);
    });
  }, []);

  async function toggleStatus(vehicle) {
    setActionError(null);
    const nextStatus = vehicle.status === "AVAILABLE" ? "INACTIVE" : "AVAILABLE";
    const { ok, data } = await apiFetch(`/api/admin/vehicles/${vehicle.id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status: nextStatus }),
    });
    if (ok && data?.success) {
      setVehicles((prev) => prev.map((v) => (v.id === vehicle.id ? { ...v, status: nextStatus } : v)));
    } else {
      setActionError(data?.error || "Failed to update vehicle status.");
    }
  }

  async function confirmDelete(id) {
    setActionError(null);
    const { ok, data } = await apiFetch(`/api/admin/vehicles/${id}`, { method: "DELETE" });
    if (ok && data?.success) {
      setVehicles((prev) => prev.filter((v) => v.id !== id));
      setConfirmDeleteId(null);
    } else {
      setActionError(data?.error || "Failed to delete vehicle.");
    }
  }

  const totalPages = Math.max(1, Math.ceil(total / limit));

  return (
    <AdminLayout title="Fleet management">
      <div className="admin-page-actions">
        <p className="admin-subtext">{total} vehicle{total === 1 ? "" : "s"}</p>
        <Link to="/admin/vehicles/new" className="btn btn-primary btn-sm">
          + Add vehicle
        </Link>
      </div>

      <div className="admin-toolbar">
        <input
          type="search"
          className="admin-input admin-toolbar-search"
          placeholder="Search vehicles by name…"
          value={search}
          onChange={(e) => {
            setPage(1);
            setSearch(e.target.value);
          }}
        />
        <select
          className="admin-select"
          value={status}
          onChange={(e) => {
            setPage(1);
            setStatus(e.target.value);
          }}
        >
          {STATUS_FILTERS.map((f) => (
            <option key={f.value} value={f.value}>
              {f.label}
            </option>
          ))}
        </select>
        <select
          className="admin-select"
          value={categoryId}
          onChange={(e) => {
            setPage(1);
            setCategoryId(e.target.value);
          }}
        >
          <option value="">All categories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      {actionError && <p className="otp-error">{actionError}</p>}

      <div className="ticket admin-table-card">
        {loading ? (
          <p className="admin-loading">Loading vehicles…</p>
        ) : error ? (
          <p className="admin-error">{error}</p>
        ) : vehicles.length === 0 ? (
          <div className="admin-empty">
            <strong>No vehicles match your filters</strong>
            <p className="admin-subtext">Try clearing the search/filters, or add a new vehicle to the fleet.</p>
            <Link to="/admin/vehicles/new" className="btn btn-primary btn-sm">
              + Add vehicle
            </Link>
          </div>
        ) : (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Vehicle</th>
                  <th>Category</th>
                  <th>Capacity</th>
                  <th>Status</th>
                  <th>Priority</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {vehicles.map((v) => (
                  <tr key={v.id}>
                    <td>
                      <Link to={`/admin/vehicles/${v.id}`}>{v.name}</Link>
                      <p className="admin-subtext">{v.acType} · {v.seatType.replace("_", "-").toLowerCase()}</p>
                    </td>
                    <td>{v.category?.name || "—"}</td>
                    <td>{v.capacity}</td>
                    <td>
                      <StatusBadge status={v.status} />
                    </td>
                    <td>{v.priority}</td>
                    <td>
                      <div className="admin-row-actions">
                        <Link to={`/admin/vehicles/${v.id}`} className="admin-inline-btn">Edit</Link>
                        <button type="button" className="admin-inline-btn" onClick={() => toggleStatus(v)}>
                          {v.status === "AVAILABLE" ? "Deactivate" : "Activate"}
                        </button>
                        {confirmDeleteId !== v.id && (
                          <button
                            type="button"
                            className="admin-inline-btn"
                            onClick={() => setConfirmDeleteId(v.id)}
                          >
                            Delete
                          </button>
                        )}
                      </div>
                      {confirmDeleteId === v.id && (
                        <div className="admin-confirm-bar">
                          <span>Delete this vehicle?</span>
                          <button type="button" className="btn btn-danger btn-sm" onClick={() => confirmDelete(v.id)}>
                            Confirm delete
                          </button>
                          <button type="button" className="admin-inline-btn" onClick={() => setConfirmDeleteId(null)}>
                            Cancel
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {!loading && !error && vehicles.length > 0 && (
        <div className="admin-pagination">
          <button
            type="button"
            className="admin-inline-btn"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            Previous
          </button>
          <span>
            Page {page} of {totalPages}
          </span>
          <button
            type="button"
            className="admin-inline-btn"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          >
            Next
          </button>
        </div>
      )}
    </AdminLayout>
  );
}
