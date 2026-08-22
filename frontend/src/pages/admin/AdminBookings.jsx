import { useCallback, useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { apiFetch, API_URL } from "../../api.js";
import { AdminLayout } from "../../components/AdminLayout.jsx";

const STATUS_OPTIONS = ["DRAFT", "CONFIRMED", "IN_PROGRESS", "COMPLETED", "CANCELLED"];

function formatDate(value) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

export default function AdminBookings() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [bookings, setBookings] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const status = searchParams.get("status") || "";
  const search = searchParams.get("search") || "";

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const params = new URLSearchParams();
    if (status) params.set("status", status);
    if (search) params.set("search", search);
    const { ok, data } = await apiFetch(`/api/admin/bookings?${params.toString()}`);
    if (ok && data?.success) {
      setBookings(data.bookings);
      setTotal(data.total);
    } else {
      setError(data?.error || "Failed to load bookings.");
    }
    setLoading(false);
  }, [status, search]);

  useEffect(() => {
    load();
  }, [load]);

  function updateParam(key, value) {
    const next = new URLSearchParams(searchParams);
    if (value) next.set(key, value);
    else next.delete(key);
    setSearchParams(next);
  }

  return (
    <AdminLayout title="Bookings" lead="Bookings are created and confirmed by SuperAdmin only — there is no customer checkout.">
      <div className="admin-page-actions">
        <p className="admin-subtext">{total} booking{total === 1 ? "" : "s"}</p>
        <Link to="/admin/bookings/create" className="btn btn-primary btn-sm">
          + Create booking
        </Link>
      </div>

      <div className="ticket admin-table-card" style={{ marginBottom: "1rem" }}>
        <div className="admin-form-grid">
          <div className="admin-form-field">
            <label className="otp-label-text" htmlFor="booking-search">Search</label>
            <input
              id="booking-search"
              className="admin-input"
              placeholder="Booking ID, customer name or phone"
              defaultValue={search}
              onKeyDown={(e) => e.key === "Enter" && updateParam("search", e.target.value)}
              onBlur={(e) => updateParam("search", e.target.value)}
            />
          </div>
          <div className="admin-form-field">
            <label className="otp-label-text" htmlFor="booking-status">Status</label>
            <select
              id="booking-status"
              className="admin-select"
              value={status}
              onChange={(e) => updateParam("status", e.target.value)}
            >
              <option value="">All statuses</option>
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>{s.replace(/_/g, " ")}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="ticket admin-table-card">
        {loading ? (
          <p className="admin-loading">Loading bookings…</p>
        ) : error ? (
          <p className="admin-error">{error}</p>
        ) : bookings.length === 0 ? (
          <div className="admin-empty">
            <strong>No bookings yet</strong>
            <p className="admin-subtext">Bookings you create or convert from enquiries will show up here.</p>
            <Link to="/admin/bookings/create" className="btn btn-primary btn-sm">
              + Create booking
            </Link>
          </div>
        ) : (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Booking ID</th>
                  <th>Customer</th>
                  <th>Vehicle(s)</th>
                  <th>Journey</th>
                  <th>Status</th>
                  <th>Balance</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {bookings.map((b) => (
                  <tr key={b.id}>
                    <td>{b.bookingId}</td>
                    <td>
                      {b.customer?.name}
                      <p className="admin-subtext">+91 {b.customer?.phone}</p>
                    </td>
                    <td>{b.vehicles.map((v) => v.name).join(", ")}</td>
                    <td>
                      {b.journey.pickup} → {b.journey.destination}
                      <p className="admin-subtext">{formatDate(b.journey.journeyStart)}</p>
                    </td>
                    <td>
                      <span className={`admin-badge admin-badge-${b.status.toLowerCase()}`}>
                        {b.status.replace(/_/g, " ")}
                      </span>
                    </td>
                    <td>₹{b.pricing?.balanceAmount ?? 0}</td>
                    <td>
                      <Link to={`/admin/bookings/${b.bookingId}`} className="admin-inline-btn">
                        View
                      </Link>{" "}
                      <a
                        className="admin-inline-btn"
                        href={`${API_URL}/api/admin/bookings/${b.bookingId}/pdf`}
                        target="_blank"
                        rel="noreferrer"
                      >
                        PDF
                      </a>
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
