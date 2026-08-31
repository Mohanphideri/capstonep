import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Link } from "react-router-dom";
import { apiFetch } from "../../api.js";
import { AdminLayout } from "../../components/AdminLayout.jsx";

const STATUS_OPTIONS = [
  { value: "", label: "All statuses" },
  { value: "NEW", label: "New" },
  { value: "BOOKED", label: "Booked" },
  { value: "BOOKING", label: "Booking" },
  { value: "CLOSED", label: "Closed" },
  { value: "CANCELLED", label: "Cancelled" },
];

function formatDate(value) {
  if (!value) return "—";
  try {
    return new Date(value).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });
  } catch {
    return value;
  }
}

export default function AdminEnquiries() {
  const [enquiries, setEnquiries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [search, setSearch] = useState("");
  const [searchParams, setSearchParams] = useSearchParams();
  const from = searchParams.get("from") || "";
  const to = searchParams.get("to") || "";
  const [status, setStatus] = useState("");
  const [tripDate, setTripDate] = useState("");
  const [searchMore, setSearchMore] = useState(() => Boolean(searchParams.get("from") || searchParams.get("to") || searchParams.get("tripDate")));
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 20;

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const params = new URLSearchParams({ page: String(page), limit: String(limit) });
    if (search.trim()) params.set("search", search.trim());
    if (status) params.set("status", status);
    if (tripDate) params.set("tripDate", tripDate);
    if (from) params.set("from", from);
    if (to) params.set("to", to);

    const { ok, data } = await apiFetch(`/api/admin/enquiries?${params.toString()}`);
    if (ok && data?.success) {
      setEnquiries(data.enquiries);
      setTotal(data.total);
    } else {
      setError(data?.error || "Failed to load enquiries.");
    }
    setLoading(false);
  }, [search, status, tripDate, page, from, to]);

  useEffect(() => {
    load();
  }, [load]);

  const totalPages = Math.max(1, Math.ceil(total / limit));

  async function updateStatus(id, nextStatus) {
    const { ok, data } = await apiFetch(`/api/admin/enquiries/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status: nextStatus }),
    });
    if (ok && data?.success) {
      setEnquiries((items) => items.map((item) => item.id === id ? { ...item, status: nextStatus, canCreateBooking: nextStatus === "BOOKED" } : item));
    } else {
      setError(data?.error || "Failed to update enquiry status.");
    }
  }

  return (
    <AdminLayout title="Vehicle enquiries">
      <p className="admin-subtext" style={{ marginBottom: "1rem" }}>
        {total} enquir{total === 1 ? "y" : "ies"}
      </p>

      <div className="admin-toolbar">
        <input
          type="search"
          className="admin-input admin-toolbar-search"
          placeholder="Search by name, phone, email, location…"
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
          {STATUS_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <button type="button" className="admin-inline-btn" onClick={() => setSearchMore((value) => !value)}>
          {searchMore ? "Hide Search More" : "Search More"}
        </button>
        {searchMore && (
          <>
            <label className="admin-date-filter">
              <span>Select Date</span>
              <input type="date" className="admin-input" value={tripDate} onChange={(e) => { setPage(1); setTripDate(e.target.value); }} />
            </label>
            <label className="admin-date-filter">
              <span>From date</span>
              <input className="admin-input" type="date" value={from} onChange={(e)=>{const n=new URLSearchParams(searchParams); if(e.target.value)n.set("from",e.target.value); else n.delete("from"); setSearchParams(n); setPage(1);}} />
            </label>
            <label className="admin-date-filter">
              <span>To date</span>
              <input className="admin-input" type="date" value={to} onChange={(e)=>{const n=new URLSearchParams(searchParams); if(e.target.value)n.set("to",e.target.value); else n.delete("to"); setSearchParams(n); setPage(1);}} />
            </label>
          </>
        )}
      </div>

      <div className="ticket admin-table-card">
        {loading ? (
          <p className="admin-loading">Loading enquiries…</p>
        ) : error ? (
          <p className="admin-error">{error}</p>
        ) : enquiries.length === 0 ? (
          <p className="admin-empty">
            No enquiries match your filters yet — they&apos;ll show up here as soon as a customer submits one from a
            vehicle page.
          </p>
        ) : (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Customer</th>
                  <th>Vehicle</th>
                  <th>Trip</th>
                  <th>Travel date</th>
                  <th>Status</th>
                  <th>Received</th>
                </tr>
              </thead>
              <tbody>
                {enquiries.map((e) => (
                  <tr key={e.id}>
                    <td>
                      <Link to={`/admin/enquiries/${e.id}`}>{e.name}</Link>
                      <p className="admin-subtext">+91 {e.phone}</p>
                    </td>
                    <td>{e.vehicle?.name || e.vehicleType || "—"}</td>
                    <td>
                      {e.pickupLocation || e.destination ? (
                        <>
                          {e.pickupLocation || "—"} → {e.destination || "—"}
                        </>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td>{e.tripDate || "—"}</td>
                    <td>
                      <select
                        className="admin-select"
                        value={e.status}
                        disabled={!!e.convertedToBookingId}
                        onChange={(event) => updateStatus(e.id, event.target.value)}
                      >
                        {STATUS_OPTIONS.filter((o) => o.value).map((o) => (
                          <option key={o.value} value={o.value}>{o.label}</option>
                        ))}
                      </select>
                      {e.convertedToBookingId && <p className="admin-subtext">Booking created</p>}
                    </td>
                    <td>{formatDate(e.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {!loading && !error && enquiries.length > 0 && (
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
