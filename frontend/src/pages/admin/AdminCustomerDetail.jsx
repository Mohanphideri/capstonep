import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { apiFetch } from "../../api.js";
import { AdminLayout } from "../../components/AdminLayout.jsx";

function formatDate(value) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

export default function AdminCustomerDetail() {
  const { id } = useParams();
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionError, setActionError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { ok, data } = await apiFetch(`/api/admin/customers/${id}`);
    if (ok && data?.success) {
      setDetail(data);
    } else {
      setError(data?.error || "Failed to load customer.");
    }
    setLoading(false);
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  async function toggleActive() {
    setActionError(null);
    const { ok, data } = await apiFetch(`/api/admin/customers/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ isActive: !detail.customer.isActive }),
    });
    if (ok && data?.success) {
      setDetail((prev) => ({ ...prev, customer: data.customer }));
    } else {
      setActionError(data?.error || "Failed to update customer status.");
    }
  }

  if (loading) {
    return (
      <AdminLayout title="Customer">
        <p className="admin-loading">Loading customer…</p>
      </AdminLayout>
    );
  }

  if (error || !detail) {
    return (
      <AdminLayout title="Customer">
        <div className="admin-empty">
          <strong>{error || "Customer not found."}</strong>
          <Link to="/admin/customers" className="btn btn-outline btn-sm">Back to customers</Link>
        </div>
      </AdminLayout>
    );
  }

  const { customer, summary, recentEnquiries, recentBookings, recentComplaints } = detail;

  return (
    <AdminLayout title={customer.name || `+91 ${customer.phone}`} lead={`+91 ${customer.phone}${customer.email ? ` · ${customer.email}` : ""}`}>
      {actionError && <p className="otp-error">{actionError}</p>}

      <div className="admin-page-actions">
        <span className={`admin-badge ${customer.isActive ? "admin-badge-active" : "admin-badge-inactive"}`}>
          {customer.isActive ? "Active" : "Inactive"}
        </span>
        <button type="button" className="btn btn-outline btn-sm" onClick={toggleActive}>
          {customer.isActive ? "Deactivate account" : "Activate account"}
        </button>
      </div>

      <div className="dashboard-grid admin-stats-grid">
        <div className="ticket dashboard-card">
          <p className="eyebrow-muted">Enquiries</p>
          <p className="dashboard-card-value">{summary.enquiryCount}</p>
        </div>
        <div className="ticket dashboard-card">
          <p className="eyebrow-muted">Bookings</p>
          <p className="dashboard-card-value">{summary.bookingCount}</p>
        </div>
        <div className="ticket dashboard-card">
          <p className="eyebrow-muted">Completed trips</p>
          <p className="dashboard-card-value">{summary.completedBookingCount}</p>
        </div>
        <div className="ticket dashboard-card">
          <p className="eyebrow-muted">Complaints</p>
          <p className="dashboard-card-value">{summary.complaintCount}</p>
        </div>
        <div className="ticket dashboard-card">
          <p className="eyebrow-muted">Total billed</p>
          <p className="dashboard-card-value">₹{summary.totalBilled}</p>
        </div>
        <div className="ticket dashboard-card">
          <p className="eyebrow-muted">Total received</p>
          <p className="dashboard-card-value">₹{summary.totalReceived}</p>
        </div>
      </div>

      <div className="admin-form-grid">
        <div className="ticket admin-table-card">
          <p className="eyebrow">Recent bookings</p>
          {recentBookings.length === 0 ? (
            <p className="admin-empty-note">No bookings yet.</p>
          ) : (
            <ul className="admin-plain-list">
              {recentBookings.map((b) => (
                <li key={b.id}>
                  <Link to={`/admin/bookings/${b.id}`}>{b.bookingId}</Link>
                  <span className="admin-subtext"> · {b.pickup} → {b.destination} · ₹{b.totalAmount} · {formatDate(b.createdAt)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="ticket admin-table-card">
          <p className="eyebrow">Recent enquiries</p>
          {recentEnquiries.length === 0 ? (
            <p className="admin-empty-note">No enquiries yet.</p>
          ) : (
            <ul className="admin-plain-list">
              {recentEnquiries.map((e) => (
                <li key={e.id}>
                  <Link to={`/admin/enquiries/${e.id}`}>{e.enquiryId || e.id}</Link>
                  <span className="admin-subtext"> · {e.status} · {formatDate(e.createdAt)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="ticket admin-table-card">
          <p className="eyebrow">Recent complaints</p>
          {recentComplaints.length === 0 ? (
            <p className="admin-empty-note">No complaints filed.</p>
          ) : (
            <ul className="admin-plain-list">
              {recentComplaints.map((c) => (
                <li key={c.id}>
                  {c.ticketId} — {c.subject}
                  <span className="admin-subtext"> · {c.status} · {formatDate(c.createdAt)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
