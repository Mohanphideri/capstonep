import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "../../api.js";
import { AdminLayout } from "../../components/AdminLayout.jsx";

function formatMoney(value) {
  return `₹${Number(value || 0).toLocaleString("en-IN")}`;
}

function formatDate(value) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

export default function AdminBalanceSheet() {
  const [balances, setBalances] = useState([]);
  const [totalOutstanding, setTotalOutstanding] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState("");
  const [payingId, setPayingId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const query = search.trim() ? `?search=${encodeURIComponent(search.trim())}` : "";
    const { ok, data } = await apiFetch(`/api/admin/balance-sheet${query}`);
    if (ok && data?.success) {
      setBalances(data.balances || []);
      setTotalOutstanding(Number(data.totalOutstanding || 0));
    } else {
      setError(data?.error || "Failed to load balance sheet.");
    }
    setLoading(false);
  }, [search]);

  useEffect(() => {
    load();
  }, [load]);

  async function markPaid(item) {
    if (!window.confirm(`Mark booking ${item.bookingId} as fully paid?`)) return;
    setPayingId(item.id);
    const { ok, data } = await apiFetch(`/api/admin/balance-sheet/${item.id}/mark-paid`, { method: "POST" });
    if (ok && data?.success) {
      setBalances((current) => current.filter((row) => row.id !== item.id));
      setTotalOutstanding((value) => Math.max(0, value - Number(item.balanceAmount || 0)));
    } else {
      // A slow request can occasionally get cut off by a network/proxy
      // timeout even though the update actually went through on the
      // server a moment later. Rather than leave a stale row that may
      // already be wrong, re-sync with the server so the list always
      // reflects the real current state instead of what we last guessed.
      await load();
      window.alert((data?.error || "Failed to mark as paid.") + " The list has been refreshed — please check whether it went through before trying again.");
    }
    setPayingId(null);
  }

  return (
    <AdminLayout title="Balance Sheet" lead="Track outstanding customer balances against each booking and mark payments received.">
      <div className="dashboard-grid admin-stats-grid" style={{ marginBottom: "1rem" }}>
        <div className="ticket dashboard-card">
          <p className="eyebrow-muted">Outstanding balance</p>
          <p className="dashboard-card-value">{formatMoney(totalOutstanding)}</p>
        </div>
        <div className="ticket dashboard-card">
          <p className="eyebrow-muted">Customers with balance</p>
          <p className="dashboard-card-value">{balances.length}</p>
        </div>
      </div>

      <div className="ticket admin-table-card" style={{ marginBottom: "1rem" }}>
        <div className="admin-form-field">
          <label className="otp-label-text" htmlFor="balance-search">Search booking / phone</label>
          <input
            id="balance-search"
            className="admin-input"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Booking ID or phone"
          />
        </div>
      </div>

      <div className="ticket admin-table-card">
        {loading ? (
          <p className="admin-loading">Loading balance sheet…</p>
        ) : error ? (
          <p className="admin-error">{error}</p>
        ) : balances.length === 0 ? (
          <div className="admin-empty">
            <strong>No pending balances</strong>
            <p className="admin-subtext">All non-cancelled bookings are currently fully paid.</p>
          </div>
        ) : (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Booking ID</th>
                  <th>Phone</th>
                  <th>Booking Date</th>
                  <th>Total</th>
                  <th>Received</th>
                  <th>Balance</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {balances.map((item) => (
                  <tr key={item.id}>
                    <td><strong>{item.bookingId}</strong></td>
                    <td>{item.customer.phone}</td>
                    <td>{formatDate(item.bookingDate)}</td>
                    <td>{formatMoney(item.totalAmount)}</td>
                    <td>{formatMoney(item.amountReceived)}</td>
                    <td><strong>{formatMoney(item.balanceAmount)}</strong></td>
                    <td>
                      <button
                        type="button"
                        className="admin-inline-btn"
                        disabled={payingId === item.id}
                        onClick={() => markPaid(item)}
                      >
                        {payingId === item.id ? "Updating…" : "Mark Paid"}
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
