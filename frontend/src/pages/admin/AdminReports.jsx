import { useCallback, useEffect, useState } from "react";
import { apiFetch, API_URL } from "../../api.js";
import { AdminLayout } from "../../components/AdminLayout.jsx";

const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function statusLabel(key) {
  return key.replace(/_/g, " ");
}

export default function AdminReports() {
  const [summary, setSummary] = useState(null);
  const [revenue, setRevenue] = useState([]);
  const [topVehicles, setTopVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [managementPeriod, setManagementPeriod] = useState("daily");
  const [management, setManagement] = useState(null);
  const [managementLoading, setManagementLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const [summaryRes, revenueRes, vehiclesRes] = await Promise.all([
      apiFetch("/api/admin/reports/summary"),
      apiFetch("/api/admin/reports/revenue?months=6"),
      apiFetch("/api/admin/reports/top-vehicles?limit=5"),
    ]);
    if (summaryRes.ok && summaryRes.data?.success) {
      setSummary(summaryRes.data.summary);
    } else {
      setError(summaryRes.data?.error || "Failed to load reports.");
    }
    if (revenueRes.ok && revenueRes.data?.success) setRevenue(revenueRes.data.revenue);
    if (vehiclesRes.ok && vehiclesRes.data?.success) setTopVehicles(vehiclesRes.data.vehicles);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    let cancelled = false;
    async function loadManagement() {
      setManagementLoading(true);
      const { ok, data } = await apiFetch(`/api/admin/reports/management?period=${managementPeriod}`);
      if (!cancelled && ok && data?.success) setManagement(data.report);
      setManagementLoading(false);
    }
    loadManagement();
    return () => { cancelled = true; };
  }, [managementPeriod]);

  if (loading) {
    return (
      <AdminLayout title="Reports">
        <p className="admin-loading">Loading reports…</p>
      </AdminLayout>
    );
  }

  if (error || !summary) {
    return (
      <AdminLayout title="Reports">
        <p className="admin-error">{error || "No report data available."}</p>
      </AdminLayout>
    );
  }

  const maxRevenue = Math.max(1, ...revenue.map((r) => r.billed));

  return (
    <AdminLayout title="Reports" lead="Business numbers pulled live from bookings, invoices, and enquiries.">
      <div className="ticket admin-table-card" style={{ marginBottom: "1rem" }}>
        <div className="admin-page-actions">
          <div>
            <p className="eyebrow">Management report</p>
            <p className="admin-subtext">Choose a period to see enquiries, accepted enquiries, bookings and payment status.</p>
          </div>
          <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", flexWrap: "wrap" }}>
            <select className="admin-select" value={managementPeriod} onChange={(e) => setManagementPeriod(e.target.value)}>
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
            </select>
            <a
              className="btn btn-outline btn-sm"
              href={`${API_URL}/api/admin/reports/management.csv?period=${managementPeriod}`}
              target="_blank"
              rel="noreferrer"
            >
              Export CSV
            </a>
          </div>
        </div>
        {managementLoading ? <p className="admin-loading">Loading management report…</p> : management && (
          <div className="dashboard-grid admin-stats-grid" style={{ marginTop: "1rem" }}>
            <div className="ticket dashboard-card"><p className="eyebrow-muted">Enquiries</p><p className="dashboard-card-value">{management.enquiries}</p></div>
            <div className="ticket dashboard-card"><p className="eyebrow-muted">Accepted for booking</p><p className="dashboard-card-value">{management.acceptedForBooking}</p></div>
            <div className="ticket dashboard-card"><p className="eyebrow-muted">Bookings done</p><p className="dashboard-card-value">{management.bookingsDone}</p></div>
            <div className="ticket dashboard-card"><p className="eyebrow-muted">Amount received</p><p className="dashboard-card-value">₹{management.amountReceived}</p></div>
            <div className="ticket dashboard-card"><p className="eyebrow-muted">Amount pending</p><p className="dashboard-card-value">₹{management.amountPending}</p></div>
          </div>
        )}
      </div>

      <div className="dashboard-grid admin-stats-grid">
        <div className="ticket dashboard-card">
          <p className="eyebrow-muted">Total customers</p>
          <p className="dashboard-card-value">{summary.totalCustomers}</p>
        </div>
        <div className="ticket dashboard-card">
          <p className="eyebrow-muted">Enquiry → booking rate</p>
          <p className="dashboard-card-value">{summary.conversionRate}%</p>
        </div>
        <div className="ticket dashboard-card">
          <p className="eyebrow-muted">Total billed</p>
          <p className="dashboard-card-value">₹{summary.billing.totalBilled}</p>
        </div>
        <div className="ticket dashboard-card">
          <p className="eyebrow-muted">Total received</p>
          <p className="dashboard-card-value">₹{summary.billing.totalReceived}</p>
        </div>
        <div className="ticket dashboard-card">
          <p className="eyebrow-muted">Outstanding balance</p>
          <p className="dashboard-card-value">₹{summary.billing.totalOutstanding}</p>
        </div>
        <div className="ticket dashboard-card">
          <p className="eyebrow-muted">Active vehicles</p>
          <p className="dashboard-card-value">{summary.activeVehicles}</p>
        </div>
      </div>

      <div className="admin-form-grid">
        <div className="ticket admin-table-card">
          <p className="eyebrow">Enquiries by status</p>
          <div className="admin-table-wrap">
            <table className="admin-table">
              <tbody>
                {Object.entries(summary.enquiriesByStatus).map(([status, count]) => (
                  <tr key={status}>
                    <td>{statusLabel(status)}</td>
                    <td>{count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="ticket admin-table-card">
          <p className="eyebrow">Bookings by status</p>
          <div className="admin-table-wrap">
            <table className="admin-table">
              <tbody>
                {Object.entries(summary.bookingsByStatus).map(([status, count]) => (
                  <tr key={status}>
                    <td>{statusLabel(status)}</td>
                    <td>{count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="ticket admin-table-card">
        <p className="eyebrow">Monthly revenue (last 6 months)</p>
        {revenue.length === 0 ? (
          <p className="admin-empty">No invoices yet.</p>
        ) : (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Month</th>
                  <th>Billed</th>
                  <th>Received</th>
                  <th>Invoices</th>
                  <th style={{ width: "40%" }}></th>
                </tr>
              </thead>
              <tbody>
                {revenue.map((r) => (
                  <tr key={`${r.year}-${r.month}`}>
                    <td>{MONTH_NAMES[r.month - 1]} {r.year}</td>
                    <td>₹{r.billed}</td>
                    <td>₹{r.received}</td>
                    <td>{r.invoiceCount}</td>
                    <td>
                      <div style={{ background: "var(--color-paper-line)", borderRadius: "0.3rem", height: "0.6rem" }}>
                        <div
                          style={{
                            width: `${Math.max(2, (r.billed / maxRevenue) * 100)}%`,
                            background: "var(--color-marigold-dark)",
                            height: "100%",
                            borderRadius: "0.3rem",
                          }}
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="ticket admin-table-card">
        <p className="eyebrow">Most-booked vehicles</p>
        {topVehicles.length === 0 ? (
          <p className="admin-empty">No bookings yet.</p>
        ) : (
          <ul className="admin-plain-list">
            {topVehicles.map((v) => (
              <li key={v.vehicleId || v.name}>
                {v.name} <span className="admin-subtext">· {v.bookingCount} booking{v.bookingCount === 1 ? "" : "s"}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </AdminLayout>
  );
}
