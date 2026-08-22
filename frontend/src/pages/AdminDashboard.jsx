import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { apiFetch } from "../api.js";
import { useAuth } from "../AuthContext.jsx";
import { AdminLayout } from "../components/AdminLayout.jsx";
import "./Dashboard.css";
import "./AdminDashboard.css";
import "../components/AdminShared.css";

const TABS = [
  { id: "overview", label: "Overview" },
  { id: "enquiries", label: "Enquiries" },
  { id: "users", label: "Users" },
];

const STATUS_OPTIONS = ["NEW", "IN_REVIEW", "CONTACTED", "QUOTED", "CONVERTED", "CLOSED", "CANCELLED"];

function formatDate(value) {
  if (!value) return "—";
  try {
    return new Date(value).toLocaleString("en-IN", {
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    return value;
  }
}

export default function AdminDashboard() {
  const { user } = useAuth();
  const [tab, setTab] = useState("overview");

  const [stats, setStats] = useState(null);
  const [statsLoading, setStatsLoading] = useState(true);

  const [enquiries, setEnquiries] = useState([]);
  const [enquiriesLoading, setEnquiriesLoading] = useState(true);
  const [enquiriesError, setEnquiriesError] = useState(null);

  const [users, setUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(true);
  const [usersError, setUsersError] = useState(null);

  const loadStats = useCallback(async () => {
    setStatsLoading(true);
    const { ok, data } = await apiFetch("/api/admin/stats");
    if (ok && data?.success) setStats(data.stats);
    setStatsLoading(false);
  }, []);

  const loadEnquiries = useCallback(async () => {
    setEnquiriesLoading(true);
    setEnquiriesError(null);
    const { ok, data } = await apiFetch("/api/enquiry?limit=50");
    if (ok && data?.success) {
      setEnquiries(data.enquiries);
    } else {
      setEnquiriesError(data?.error || "Failed to load enquiries.");
    }
    setEnquiriesLoading(false);
  }, []);

  const loadUsers = useCallback(async () => {
    setUsersLoading(true);
    setUsersError(null);
    const { ok, data } = await apiFetch("/api/admin/users?limit=50");
    if (ok && data?.success) {
      setUsers(data.users);
    } else {
      setUsersError(data?.error || "Failed to load users.");
    }
    setUsersLoading(false);
  }, []);

  useEffect(() => {
    loadStats();
    loadEnquiries();
    loadUsers();
  }, [loadStats, loadEnquiries, loadUsers]);

  async function updateEnquiryStatus(id, status) {
    setEnquiries((prev) => prev.map((e) => (e.id === id ? { ...e, status } : e)));
    const { ok, data } = await apiFetch(`/api/enquiry/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    });
    if (!ok || !data?.success) {
      loadEnquiries();
    }
  }

  async function toggleUserActive(id, isActive) {
    setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, isActive } : u)));
    const { ok, data } = await apiFetch(`/api/admin/users/${id}/active`, {
      method: "PATCH",
      body: JSON.stringify({ isActive }),
    });
    if (!ok || !data?.success) {
      loadUsers();
    }
  }

  if (!user) return null;

  const attentionItems = [];
  if (stats?.newEnquiries) {
    attentionItems.push({
      key: "new-enquiries",
      text: `${stats.newEnquiries} new ${stats.newEnquiries === 1 ? "enquiry needs" : "enquiries need"} a first response`,
      to: "/admin/enquiries",
    });
  }
  if (stats?.inReviewEnquiries) {
    attentionItems.push({
      key: "in-review",
      text: `${stats.inReviewEnquiries} ${stats.inReviewEnquiries === 1 ? "enquiry is" : "enquiries are"} awaiting a quote or reply`,
      to: "/admin/enquiries",
    });
  }
  if (stats?.maintenanceVehicles) {
    attentionItems.push({
      key: "maintenance",
      text: `${stats.maintenanceVehicles} ${stats.maintenanceVehicles === 1 ? "vehicle is" : "vehicles are"} marked under maintenance`,
      to: "/admin/vehicles",
    });
  }

  return (
    <AdminLayout
      title="Dashboard"
      lead={`Signed in as +91 ${user.phone} · ${user.role.replace(/_/g, " ")}`}
    >
      {user.role === "super_admin" && (
        <div className="admin-page-actions">
          <Link to="/admin/bookings/create" className="btn btn-primary btn-sm">
            + Create booking
          </Link>
          <Link to="/admin/vehicles" className="btn btn-outline btn-sm">
            Manage fleet
          </Link>
          <Link to="/admin/enquiries" className="btn btn-outline btn-sm">
            Vehicle enquiries
          </Link>
          <Link to="/admin/invoices" className="btn btn-outline btn-sm">
            Invoices
          </Link>
        </div>
      )}

      <div className="admin-tabs">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            className={`admin-tab ${tab === t.id ? "admin-tab-active" : ""}`}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "overview" && (
        <>
          <div className="admin-kpi-grid">
            <div className="ticket admin-kpi-card">
              <span className="admin-kpi-icon blue">◔</span>
              <p className="eyebrow-muted">Total customers</p>
              <p className="admin-kpi-value">{statsLoading ? "…" : stats?.totalCustomers ?? "—"}</p>
            </div>
            <div className="ticket admin-kpi-card">
              <span className="admin-kpi-icon red">◔</span>
              <p className="eyebrow-muted">New enquiries</p>
              <p className="admin-kpi-value">{statsLoading ? "…" : stats?.newEnquiries ?? "—"}</p>
            </div>
            <div className="ticket admin-kpi-card">
              <span className="admin-kpi-icon amber">◔</span>
              <p className="eyebrow-muted">In review</p>
              <p className="admin-kpi-value">{statsLoading ? "…" : stats?.inReviewEnquiries ?? "—"}</p>
            </div>
            <div className="ticket admin-kpi-card">
              <span className="admin-kpi-icon green">◔</span>
              <p className="eyebrow-muted">Converted enquiries</p>
              <p className="admin-kpi-value">{statsLoading ? "…" : stats?.convertedEnquiries ?? "—"}</p>
            </div>
            <div className="ticket admin-kpi-card">
              <span className="admin-kpi-icon blue">◔</span>
              <p className="eyebrow-muted">Total bookings</p>
              <p className="admin-kpi-value">{statsLoading ? "…" : stats?.totalBookings ?? "—"}</p>
            </div>
            <div className="ticket admin-kpi-card">
              <span className="admin-kpi-icon green">◔</span>
              <p className="eyebrow-muted">Confirmed bookings</p>
              <p className="admin-kpi-value">{statsLoading ? "…" : stats?.confirmedBookings ?? "—"}</p>
            </div>
            <div className="ticket admin-kpi-card">
              <span className="admin-kpi-icon green">◔</span>
              <p className="eyebrow-muted">Completed bookings</p>
              <p className="admin-kpi-value">{statsLoading ? "…" : stats?.completedBookings ?? "—"}</p>
            </div>
            <div className="ticket admin-kpi-card">
              <span className="admin-kpi-icon red">◔</span>
              <p className="eyebrow-muted">Cancelled bookings</p>
              <p className="admin-kpi-value">{statsLoading ? "…" : stats?.cancelledBookings ?? "—"}</p>
            </div>
            <div className="ticket admin-kpi-card">
              <span className="admin-kpi-icon green">◔</span>
              <p className="eyebrow-muted">Active vehicles</p>
              <p className="admin-kpi-value">{statsLoading ? "…" : stats?.activeVehicles ?? "—"}</p>
            </div>
            <div className="ticket admin-kpi-card">
              <span className="admin-kpi-icon amber">◔</span>
              <p className="eyebrow-muted">Under maintenance</p>
              <p className="admin-kpi-value">{statsLoading ? "…" : stats?.maintenanceVehicles ?? "—"}</p>
            </div>
          </div>

          <div className="ticket admin-attention-panel">
            <h3>Needs your attention</h3>
            {statsLoading ? (
              <p className="admin-empty-note">Checking for open items…</p>
            ) : attentionItems.length === 0 ? (
              <p className="admin-empty-note">Nothing urgent right now — everything is up to date.</p>
            ) : (
              <ul className="admin-attention-list">
                {attentionItems.map((item) => (
                  <li key={item.key}>
                    <Link to={item.to}>
                      {item.text}
                      <span aria-hidden="true">→</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}

      {tab === "enquiries" && (
        <div className="ticket admin-table-card">
          {enquiriesLoading ? (
            <p className="admin-empty-note">Loading enquiries…</p>
          ) : enquiriesError ? (
            <p className="otp-error">{enquiriesError}</p>
          ) : enquiries.length === 0 ? (
            <p className="admin-empty-note">
              No enquiries yet — they&apos;ll show up here as soon as someone submits the
              enquiry form on the homepage.
            </p>
          ) : (
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Phone</th>
                    <th>Vehicle</th>
                    <th>Trip date</th>
                    <th>Received</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {enquiries.map((e) => (
                    <tr key={e.id}>
                      <td>
                        {e.name}
                        {e.email && <div className="admin-subtext">{e.email}</div>}
                        {e.message && <div className="admin-subtext">{e.message}</div>}
                      </td>
                      <td>
                        <a href={`tel:+91${e.phone}`}>+91 {e.phone}</a>
                      </td>
                      <td>{e.vehicleType || "—"}</td>
                      <td>{e.tripDate || "—"}</td>
                      <td>{formatDate(e.createdAt)}</td>
                      <td>
                        <select
                          value={e.status}
                          onChange={(ev) => updateEnquiryStatus(e.id, ev.target.value)}
                          className={`admin-status-select admin-status-${e.status}`}
                        >
                          {STATUS_OPTIONS.map((s) => (
                            <option key={s} value={s}>
                              {s}
                            </option>
                          ))}
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {tab === "users" && (
        <div className="ticket admin-table-card">
          {usersLoading ? (
            <p className="admin-empty-note">Loading users…</p>
          ) : usersError ? (
            <p className="otp-error">{usersError}</p>
          ) : (
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Phone</th>
                    <th>Name</th>
                    <th>Role</th>
                    <th>Last login</th>
                    <th>Status</th>
                    {user.role === "super_admin" && <th></th>}
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.id}>
                      <td>+91 {u.phone}</td>
                      <td>{u.name || "—"}</td>
                      <td>{u.role.replace("_", " ")}</td>
                      <td>{formatDate(u.lastLoginAt)}</td>
                      <td>{u.isActive ? "Active" : "Deactivated"}</td>
                      {user.role === "super_admin" && (
                        <td>
                          <button
                            type="button"
                            className="admin-inline-btn"
                            onClick={() => toggleUserActive(u.id, !u.isActive)}
                          >
                            {u.isActive ? "Deactivate" : "Activate"}
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </AdminLayout>
  );
}
