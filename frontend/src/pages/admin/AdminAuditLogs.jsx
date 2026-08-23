import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { apiFetch } from "../../api.js";
import { AdminLayout } from "../../components/AdminLayout.jsx";

function formatDateTime(value) {
  if (!value) return "—";
  return new Date(value).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function AdminAuditLogs() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [logs, setLogs] = useState([]);
  const [total, setTotal] = useState(0);
  const [filterOptions, setFilterOptions] = useState({ actions: [], entityTypes: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const action = searchParams.get("action") || "";
  const entityType = searchParams.get("entityType") || "";
  const page = Math.max(1, parseInt(searchParams.get("page"), 10) || 1);
  const limit = 50;

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const params = new URLSearchParams();
    if (action) params.set("action", action);
    if (entityType) params.set("entityType", entityType);
    params.set("page", String(page));
    params.set("limit", String(limit));
    const { ok, data } = await apiFetch(`/api/admin/audit-logs?${params.toString()}`);
    if (ok && data?.success) {
      setLogs(data.logs);
      setTotal(data.total);
      setFilterOptions(data.filters);
    } else {
      setError(data?.error || "Failed to load audit logs.");
    }
    setLoading(false);
  }, [action, entityType, page]);

  useEffect(() => {
    load();
  }, [load]);

  // Changing a filter always resets to page 1; changing only the page
  // (via goToPage) keeps the current filters as-is.
  function updateFilter(next) {
    setSearchParams({ action, entityType, ...next, page: "1" });
  }

  function goToPage(nextPage) {
    setSearchParams({ action, entityType, page: String(nextPage) });
  }

  const totalPages = Math.max(1, Math.ceil(total / limit));

  return (
    <AdminLayout title="Audit log" lead="Read-only trail of every admin action, most recent first.">
      <div className="ticket admin-table-card" style={{ marginBottom: "1rem" }}>
        <div className="admin-filter-row">
          <div className="admin-form-field">
            <label className="otp-label-text" htmlFor="log-action">Action</label>
            <select
              id="log-action"
              className="admin-select"
              value={action}
              onChange={(e) => updateFilter({ action: e.target.value })}
            >
              <option value="">All actions</option>
              {filterOptions.actions.map((a) => (
                <option key={a} value={a}>{a}</option>
              ))}
            </select>
          </div>
          <div className="admin-form-field">
            <label className="otp-label-text" htmlFor="log-entity">Entity type</label>
            <select
              id="log-entity"
              className="admin-select"
              value={entityType}
              onChange={(e) => updateFilter({ entityType: e.target.value })}
            >
              <option value="">All entities</option>
              {filterOptions.entityTypes.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="ticket admin-table-card">
        {loading ? (
          <p className="admin-loading">Loading audit log…</p>
        ) : error ? (
          <p className="admin-error">{error}</p>
        ) : logs.length === 0 ? (
          <p className="admin-empty">No audit log entries match these filters.</p>
        ) : (
          <>
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>When</th>
                    <th>Actor</th>
                    <th>Action</th>
                    <th>Entity</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((entry) => (
                    <tr key={entry.id}>
                      <td>{formatDateTime(entry.createdAt)}</td>
                      <td>{entry.actorName || (entry.actorPhone ? `+91 ${entry.actorPhone}` : "System")}</td>
                      <td>{entry.action}</td>
                      <td>
                        {entry.entityType}
                        {entry.entityId && <span className="admin-subtext"> #{entry.entityId.slice(-6)}</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="admin-pagination">
              <button
                type="button"
                className="admin-inline-btn"
                disabled={page <= 1}
                onClick={() => goToPage(page - 1)}
              >
                ← Newer
              </button>
              <span>Page {page} of {totalPages}</span>
              <button
                type="button"
                className="admin-inline-btn"
                disabled={page >= totalPages}
                onClick={() => goToPage(page + 1)}
              >
                Older →
              </button>
            </div>
          </>
        )}
      </div>
    </AdminLayout>
  );
}
