import { useEffect, useState } from "react";
import { NavLink } from "react-router-dom";
import { useAuth } from "../AuthContext.jsx";
import { LogoutButton } from "./LogoutButton.jsx";
import { apiFetch } from "../api.js";
import { BrandLogo } from "./BrandLogo.jsx";
import "../pages/Dashboard.css";
import "../pages/AdminDashboard.css";
import "./AdminShared.css";
import "./AdminLayout.css";
import PortalSearch from "./PortalSearch.jsx";

const SIDEBAR_STATE_KEY = "kt-admin-sidebar-collapsed";

function Icon({ name, size = 18 }) {
  const common = { width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": "true" };
  const paths = {
    grid: <><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></>,
    calendar: <><rect x="3" y="4.5" width="18" height="17" rx="2"/><path d="M16 2.5v4M8 2.5v4M3 9h18"/></>,
    message: <><path d="M20 11.5a7.5 7.5 0 0 1-7.5 7.5H7l-4 3v-6.1a7.5 7.5 0 1 1 17-4.4Z"/></>,
    truck: <><path d="M3 7h11v9H3z"/><path d="M14 11h4l3 3v2h-7z"/><circle cx="7.5" cy="18" r="1.6"/><circle cx="17.5" cy="18" r="1.6"/></>,
    tag: <><path d="M12.5 3H5a2 2 0 0 0-2 2v7.5L12.8 22l8.2-8.2L12.5 3Z"/><circle cx="8.2" cy="8.2" r="1.4"/></>,
    star: <path d="m12 3 2.6 5.6 6.1.7-4.5 4.2 1.2 6-5.4-3-5.4 3 1.2-6-4.5-4.2 6.1-.7Z"/>,
    users: <><circle cx="9" cy="8" r="3.2"/><path d="M2.8 20a6.2 6.2 0 0 1 12.4 0M15.5 5.2a3.2 3.2 0 0 1 0 6.1M17.5 14.3a6.2 6.2 0 0 1 4.2 5.7"/></>,
    receipt: <><path d="M6 3h12v18l-3-2-3 2-3-2-3 2Z"/><path d="M9 8h6M9 12h6"/></>,
    chart: <><path d="M4 20V10M11 20V4M18 20v-7M3 20h18"/></>,
    clipboard: <><rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 4V3a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v1M8.5 11h7M8.5 15h7"/></>,
    image: <><rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="8.5" cy="9" r="1.5"/><path d="m4 17 5-5 4 4 3-3 4 4"/></>,
    settings: <><circle cx="12" cy="12" r="3"/><path d="M19.4 13a1.7 1.7 0 0 0 .34 1.87l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.7 1.7 0 0 0-1.87-.34 1.7 1.7 0 0 0-1.03 1.56V19.4a2 2 0 1 1-4 0v-.09A1.7 1.7 0 0 0 8.98 17.75a1.7 1.7 0 0 0-1.87.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.7 1.7 0 0 0 4.6 13a1.7 1.7 0 0 0-1.56-1.02H2.94a2 2 0 1 1 0-4h.1A1.7 1.7 0 0 0 4.6 6.97a1.7 1.7 0 0 0-.34-1.87l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.7 1.7 0 0 0 8.96 2.6a1.7 1.7 0 0 0 1.03-1.56V.94a2 2 0 1 1 4 0v.1A1.7 1.7 0 0 0 15.02 2.6a1.7 1.7 0 0 0 1.87-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.7 1.7 0 0 0-.34 1.87V7a1.7 1.7 0 0 0 1.56 1.03h.06a2 2 0 1 1 0 4h-.09A1.7 1.7 0 0 0 19.4 13Z"/></>,
    menu: <path d="M4 6h16M4 12h16M4 18h16"/>,
    close: <path d="M6 6l12 12M18 6 6 18"/>,
    search: <><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></>,
    bell: <><path d="M18 9a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"/><path d="M10 21h4"/></>,
    user: <><circle cx="12" cy="8" r="3.5"/><path d="M5 21a7 7 0 0 1 14 0"/></>,
  };
  return <svg {...common}>{paths[name]}</svg>;
}

const NAV_ITEMS = [
  { to: "/admin", label: "Dashboard", icon: "grid", end: true },
  { to: "/admin/enquiries", label: "Enquiries", icon: "message" },
  { to: "/admin/bookings", label: "Bookings", icon: "calendar" },
  { to: "/admin/vehicles", label: "Vehicles", icon: "truck" },
  { to: "/admin/settings/fleetGallery", label: "Fleet Gallery", icon: "image" },
  { to: "/admin/tour-packages", label: "Trips / Tour Packages", icon: "tag" },
  { to: "/admin/customers", label: "Customers", icon: "users" },
  { to: "/admin/balance-sheet", label: "Balance Sheet", icon: "chart" },
  { to: "/admin/reviews", label: "Reviews", icon: "star" },
  { to: "/admin/settings/banner", label: "Banner Management", icon: "image" },
  { to: "/admin/settings/invoice", label: "PDF Settings", icon: "receipt" },
  { to: "/admin/customers", label: "Users", icon: "users" },
  { to: "/admin/settings/business", label: "Settings", icon: "settings" },
  { to: "/admin/categories", label: "Categories", icon: "tag" },
  { to: "/admin/amenities", label: "Amenities", icon: "star" },
  { to: "/admin/reports", label: "Reports", icon: "chart" },
  { to: "/admin/audit-logs", label: "Audit Log", icon: "clipboard" },
];

export function AdminLayout({ title, lead, children }) {
  const { user } = useAuth();
  const [collapsed, setCollapsed] = useState(() => {
    try { return localStorage.getItem(SIDEBAR_STATE_KEY) === "1"; } catch { return false; }
  });
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [liveStats, setLiveStats] = useState(null);

  useEffect(() => {
    let cancelled = false;
    apiFetch("/api/admin/stats").then((r) => {
      if (!cancelled && r.ok && r.data?.success) setLiveStats(r.data.stats);
    }).catch(() => {});
    return () => { cancelled = true; };
  }, [title]);

  useEffect(() => {
    try { localStorage.setItem(SIDEBAR_STATE_KEY, collapsed ? "1" : "0"); } catch {}
  }, [collapsed]);
  useEffect(() => { setDrawerOpen(false); }, [title]);

  const displayName = user?.name || (user ? `+91 ${user.phone}` : "Admin");
  const roleLabel = user?.role ? user.role.replace(/_/g, " ") : "Administrator";

  return (
    <div className={`admin-shell${collapsed ? " is-collapsed" : ""}`}>
      <aside className={`admin-sidebar${drawerOpen ? " is-open" : ""}`}>
        <div className="admin-sidebar-top">
          <BrandLogo to="/admin" className="admin-brand" variant="full" />
          <button type="button" className="admin-drawer-close" onClick={() => setDrawerOpen(false)} aria-label="Close menu"><Icon name="close" size={18}/></button>
        </div>
        <div className="admin-side-caption">ADMIN PANEL</div>
        <nav className="admin-side-nav" aria-label="Admin navigation">
          {NAV_ITEMS.map((item, index) => (
            <NavLink key={`${item.to}-${item.label}-${index}`} to={item.to} end={item.end} onClick={() => setDrawerOpen(false)} className={({isActive}) => `admin-side-link${isActive ? " is-active" : ""}`} data-tooltip={item.label}>
              <Icon name={item.icon} size={17}/><span>{item.label}</span>
              {item.label === "Enquiries" && Number(liveStats?.newEnquiries || 0) > 0 && <em className="admin-nav-badge">{liveStats.newEnquiries}</em>}
              {item.label === "Reviews" && Number(liveStats?.pendingReviews || 0) > 0 && <em className="admin-nav-badge">{liveStats.pendingReviews}</em>}
            </NavLink>
          ))}
        </nav>
        <div className="admin-sidebar-spacer" />
        <div className="admin-sidebar-user">
          <span className="admin-sidebar-avatar"><Icon name="user" size={16}/></span>
          <span className="admin-sidebar-user-copy"><strong>{displayName}</strong><small>{roleLabel}</small></span>
        </div>
        <div className="admin-sidebar-logout"><LogoutButton /></div>
      </aside>

      {drawerOpen && <button type="button" className="admin-drawer-scrim" aria-label="Close menu" onClick={() => setDrawerOpen(false)} />}

      <div className="admin-main">
        <header className="admin-topbar">
          <button type="button" className="admin-hamburger" aria-label="Toggle menu" onClick={() => window.innerWidth <= 900 ? setDrawerOpen(true) : setCollapsed(v => !v)}><Icon name="menu" size={19}/></button>
          <div className="admin-topbar-titles">
            <p className="admin-breadcrumb">Dashboard <span>›</span> {title === "Dashboard" ? "Overview" : title}</p>
            <h1>{title}</h1>
          </div>
          <div className="admin-topbar-actions">
            <PortalSearch mode="admin" isSuperAdmin={user?.role === "super_admin"} />
            <NavLink to="/admin/enquiries" className="portal-icon-btn portal-bell" aria-label="Notifications"><Icon name="bell" size={17}/>{Number(liveStats?.notificationCount || 0) > 0 && <b>{liveStats.notificationCount > 99 ? "99+" : liveStats.notificationCount}</b>}</NavLink>
            <div className="portal-profile"><span className="portal-avatar"><Icon name="user" size={15}/></span><span><strong>{displayName}</strong><small>{roleLabel}</small></span><span className="portal-caret">⌄</span></div>
          </div>
        </header>
        <main className="admin-content">
          {lead && <p className="dashboard-lead admin-content-lead">{lead}</p>}
          <div className="admin-page-body">{children}</div>
        </main>
      </div>
    </div>
  );
}
