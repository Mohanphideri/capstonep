import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { apiFetch } from "../api.js";
import Icon from "../components/Icon.jsx";
import { useAuth } from "../AuthContext.jsx";
import { AdminLayout } from "../components/AdminLayout.jsx";
import "./Dashboard.css";
import "./AdminDashboard.css";
import "../components/AdminShared.css";

function greeting(){const h=new Date().getHours();return h<12?"Good Morning":h<17?"Good Afternoon":h<21?"Good Evening":"Good Night"}
function formatDate(value){if(!value)return "—";try{return new Date(value).toLocaleDateString("en-IN",{day:"2-digit",month:"short",year:"numeric"})}catch{return String(value)}}

function buildLinePath(values, max, width, height){
  if(!values.length) return "";
  const step = values.length>1 ? width/(values.length-1) : 0;
  return values.map((v,i)=>{
    const x = i*step;
    const y = max>0 ? height-(v/max)*height : height;
    return `${i===0?"M":"L"}${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(" ");
}

function AdminDashboard(){
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [series, setSeries] = useState([]);
  const [enquiries, setEnquiries] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(()=>{
    let mounted = true;
    setLoading(true);
    Promise.all([
      apiFetch("/api/admin/stats"),
      apiFetch("/api/admin/analytics?days=7"),
      apiFetch("/api/admin/enquiries?limit=5&page=1"),
    ]).then(([s, a, e])=>{
      if(!mounted) return;
      if(s.ok && s.data?.success) setStats(s.data.stats);
      if(a.ok && a.data?.success) setSeries(Array.isArray(a.data.series) ? a.data.series : []);
      if(e.ok && e.data?.success) setEnquiries(Array.isArray(e.data.enquiries) ? e.data.enquiries : []);
    }).catch(()=>{}).finally(()=>mounted && setLoading(false));
    return ()=>{ mounted = false; };
  }, []);

  useEffect(()=>{ const cleanup = load(); return cleanup; }, [load]);

  const maxSeries = useMemo(()=>{
    return series.reduce((m,p)=>Math.max(m, p.enquiries||0, p.bookings||0), 0) || 1;
  }, [series]);

  const enquiryPath = useMemo(()=>buildLinePath(series.map(p=>p.enquiries||0), maxSeries, 100, 176), [series, maxSeries]);
  const bookingPath = useMemo(()=>buildLinePath(series.map(p=>p.bookings||0), maxSeries, 100, 176), [series, maxSeries]);

  const donutTotal = useMemo(()=>{
    if(!stats) return 0;
    return (stats.confirmedBookings||0) + (stats.completedBookings||0) + (stats.cancelledBookings||0) + (stats.draftBookings||0);
  }, [stats]);

  const displayName = user?.name || "Admin";

  return (
    <AdminLayout title="Dashboard" lead={`${greeting()}, ${displayName}. Here's what's happening today.`}>
      <div className="admin-dashboard-actions">
        <div className="admin-tabs">
          <span className="admin-tab admin-tab-active">Overview</span>
        </div>
        <div className="admin-action-links">
          <Link to="/admin/enquiries" className="admin-tab">View Enquiries</Link>
          <Link to="/admin/bookings" className="admin-tab">View Bookings</Link>
        </div>
      </div>

      <section className="hospital-admin-kpis">
        <div className="hospital-kpi">
          <span className="hospital-kpi-icon blue"><Icon name="message" /></span>
          <span><small>New Enquiries</small><strong>{stats ? stats.newEnquiries : "—"}</strong><em>Awaiting response</em></span>
        </div>
        <div className="hospital-kpi">
          <span className="hospital-kpi-icon green"><Icon name="calendar" /></span>
          <span><small>Confirmed Bookings</small><strong>{stats ? stats.confirmedBookings : "—"}</strong><em>Currently confirmed</em></span>
        </div>
        <div className="hospital-kpi">
          <span className="hospital-kpi-icon violet"><Icon name="truck" /></span>
          <span><small>Active Vehicles</small><strong>{stats ? stats.activeVehicles : "—"}</strong><em>Available fleet</em></span>
        </div>
      </section>

      <section className="hospital-admin-main-grid">
        <div className="hospital-admin-panel">
          <div className="hospital-panel-head">
            <h3>Enquiries &amp; Bookings (Last 7 Days)</h3>
            <Link to="/admin/reports">View Reports</Link>
          </div>
          {series.length ? (
            <div className="hospital-line-chart">
              <div className="chart-y">
                <span>{maxSeries}</span>
                <span>{Math.round(maxSeries/2)}</span>
                <span>0</span>
              </div>
              <div className="chart-area">
                <svg viewBox="0 0 100 176" preserveAspectRatio="none">
                  <g className="chart-grid">
                    <path d="M0,0 L100,0" />
                    <path d="M0,88 L100,88" />
                    <path d="M0,176 L100,176" />
                  </g>
                  <path className="chart-line blue" d={enquiryPath} vectorEffect="non-scaling-stroke" />
                  <path className="chart-line green" d={bookingPath} vectorEffect="non-scaling-stroke" />
                </svg>
                <div className="chart-labels">
                  {series.map((p)=>(<span key={p.date}>{p.label}</span>))}
                </div>
              </div>
            </div>
          ) : (
            <div className="admin-empty-note">{loading ? "Loading chart…" : "No activity in the last 7 days."}</div>
          )}
          <div className="chart-legend">
            <span><i className="blue-dot" />Enquiries</span>
            <span><i className="green-dot" />Bookings</span>
          </div>
        </div>

        <div className="hospital-admin-panel">
          <div className="hospital-panel-head">
            <h3>Booking Status</h3>
          </div>
          {stats && donutTotal > 0 ? (
            <div className="donut-wrap">
              <div
                className="donut"
                style={{
                  background: `conic-gradient(#2f79e8 0 ${(stats.confirmedBookings/donutTotal*100).toFixed(1)}%, #f1b53d ${(stats.confirmedBookings/donutTotal*100).toFixed(1)}% ${((stats.confirmedBookings+stats.draftBookings)/donutTotal*100).toFixed(1)}%, #42ad73 ${((stats.confirmedBookings+stats.draftBookings)/donutTotal*100).toFixed(1)}% ${((stats.confirmedBookings+stats.draftBookings+stats.completedBookings)/donutTotal*100).toFixed(1)}%, #f25c63 ${((stats.confirmedBookings+stats.draftBookings+stats.completedBookings)/donutTotal*100).toFixed(1)}% 100%)`,
                }}
              >
                <div className="donut-hole">{stats.totalBookings}</div>
              </div>
              <div className="status-list">
                <span><i className="s-blue" />Confirmed<b>{stats.confirmedBookings}</b></span>
                <span><i className="s-orange" />Draft<b>{stats.draftBookings}</b></span>
                <span><i className="s-green" />Completed<b>{stats.completedBookings}</b></span>
                <span><i className="s-red" />Cancelled<b>{stats.cancelledBookings}</b></span>
              </div>
            </div>
          ) : (
            <div className="admin-empty-note">{loading ? "Loading…" : "No bookings yet."}</div>
          )}
        </div>
      </section>

      <section className="hospital-admin-panel recent-admin-panel">
        <div className="hospital-panel-head">
          <h3>Recent Enquiries</h3>
          <Link to="/admin/enquiries">View All</Link>
        </div>
        <div className="hospital-admin-table-wrap">
          <table className="hospital-admin-table">
            <thead>
              <tr><th>Name</th><th>Vehicle / Package</th><th>Trip Date</th><th>Status</th><th>Received</th></tr>
            </thead>
            <tbody>
              {enquiries.map((e)=>(
                <tr key={e.id}>
                  <td>{e.name || "—"}</td>
                  <td>{e.vehicle?.name || e.package?.name || (e.selectedVehicles||[]).join(", ") || "—"}</td>
                  <td>{e.tripDate || "—"}</td>
                  <td><span className={`admin-status status-${String(e.status||"new").toLowerCase()}`}>{String(e.status||"NEW").replace(/_/g," ")}</span></td>
                  <td>{formatDate(e.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {!enquiries.length && <div className="admin-empty-note">{loading ? "Loading enquiries…" : "No enquiries yet."}</div>}
        </div>
      </section>

      <section className="hospital-admin-bottom-kpis">
        <div>
          <span><Icon name="user" /></span>
          <small>Total Customers</small>
          <strong>{stats ? stats.totalCustomers : "—"}</strong>
        </div>
        <div>
          <span><Icon name="star" /></span>
          <small>Pending Reviews</small>
          <strong>{stats ? stats.pendingReviews : "—"}</strong>
        </div>
        <div>
          <span><Icon name="settings" /></span>
          <small>Vehicles in Maintenance</small>
          <strong>{stats ? stats.maintenanceVehicles : "—"}</strong>
        </div>
      </section>
    </AdminLayout>
  );
}

export default AdminDashboard;
