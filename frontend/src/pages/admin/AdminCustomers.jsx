import { useCallback, useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { apiFetch } from "../../api.js";
import { AdminLayout } from "../../components/AdminLayout.jsx";

function formatDate(value) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

export default function AdminCustomers() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [customers, setCustomers] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionError, setActionError] = useState(null);

  const search = searchParams.get("search") || "";
  const status = searchParams.get("status") || "";

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (status) params.set("status", status);
    const { ok, data } = await apiFetch(`/api/admin/customers?${params.toString()}`);
    if (ok && data?.success) {
      setCustomers(data.customers);
      setTotal(data.total);
    } else {
      setError(data?.error || "Failed to load customers.");
    }
    setLoading(false);
  }, [search, status]);

  useEffect(() => {
    load();
  }, [load]);

  async function toggleActive(customer) {
    setActionError(null);
    const { ok, data } = await apiFetch(`/api/admin/customers/${customer.id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ isActive: !customer.isActive }),
    });
    if (ok && data?.success) {
      setCustomers((prev) => prev.map((c) => (c.id === customer.id ? data.customer : c)));
    } else {
      setActionError(data?.error || "Failed to update customer status.");
    }
  }

  return (
    <AdminLayout title="Customers" lead="Everyone who has enquired, booked, or logged in as a customer.">
      <div className="admin-page-actions">
        <p className="admin-subtext">{total} customer{total === 1 ? "" : "s"}</p>
      </div>

      {actionError && <p className="otp-error">{actionError}</p>}

      <div className="ticket admin-table-card" style={{ marginBottom: "1rem" }}>
        <div className="admin-toolbar">
          <div className="admin-toolbar-search admin-form-field" style={{ marginBottom: 0 }}>
            <label className="otp-label-text" htmlFor="cust-search">Search</label>
            <input
              id="cust-search"
              className="admin-input"
              placeholder="Name, phone, or email"
              defaultValue={search}
              onKeyDown={(e) => e.key === "Enter" && setSearchParams({ search: e.target.value, status })}
              onBlur={(e) => setSearchParams({ search: e.target.value, status })}
            />
          </div>
          <div className="admin-form-field" style={{ marginBottom: 0 }}>
            <label className="otp-label-text" htmlFor="cust-status">Status</label>
            <select
              id="cust-status"
              className="admin-select"
              value={status}
              onChange={(e) => setSearchParams({ search, status: e.target.value })}
            >
              <option value="">All</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        </div>
      </div>

      <div className="ticket admin-table-card">
        {loading ? (
          <p className="admin-loading">Loading customers…</p>
        ) : error ? (
          <p className="admin-error">{error}</p>
        ) : customers.length === 0 ? (
          <div className="admin-empty">
            <strong>No customers found</strong>
            <p className="admin-subtext">Try a different search, or clear the status filter.</p>
          </div>
        ) : (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Phone</th>
                  <th>Email</th>
                  <th>Joined</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {customers.map((c) => (
                  <tr key={c.id}>
                    <td>
                      <Link to={`/admin/customers/${c.id}`}>{c.name || `+91 ${c.phone}`}</Link>
                    </td>
                    <td>+91 {c.phone}</td>
                    <td>{c.email || "—"}</td>
                    <td>{formatDate(c.createdAt)}</td>
                    <td>
                      <span className={`admin-badge ${c.isActive ? "admin-badge-active" : "admin-badge-inactive"}`}>
                        {c.isActive ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td>
                      <div className="admin-row-actions">
                        <Link to={`/admin/customers/${c.id}`} className="admin-inline-btn">View</Link>
                        <button type="button" className="admin-inline-btn" onClick={() => toggleActive(c)}>
                          {c.isActive ? "Deactivate" : "Activate"}
                        </button>
                      </div>
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
