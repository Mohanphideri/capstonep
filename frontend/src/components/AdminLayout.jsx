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
import Icon from "./Icon.jsx";

const SIDEBAR_STATE_KEY = "kt-admin-sidebar-collapsed";


const NAV_ITEMS = [
  { to: "/admin", label: "Dashboard", icon: "grid", end: true },
  { to: "/admin/enquiries", label: "Enquiries", icon: "message" },
  { to: "/admin/bookings", label: "Bookings", icon: "calendar" },
  { to: "/admin/vehicles", label: "Vehicles", icon: "truck" },
  { to: "/admin/settings/fleetGallery", label: "Fleet Gallery", icon: "image" },
  { to: "/admin/tour-packages", label: "Trips / Tour Packages", icon: "tag" },
  { to: "/admin/balance-sheet", label: "Balance Sheet", icon: "chart" },
  { to: "/admin/reviews", label: "Reviews", icon: "star" },
  { to: "/admin/issues", label: "Report Issues", icon: "message" },
  { to: "/admin/settings/banner", label: "Banner Management", icon: "image" },
  { to: "/admin/settings/invoice", label: "PDF Settings", icon: "receipt" },
  { to: "/admin/profile", label: "Admin Profile", icon: "user" },
  { to: "/admin/settings/business", label: "Settings", icon: "settings" },
  { to: "/admin/categories", label: "Categories", icon: "tag" },
  { to: "/admin/amenities", label: "Amenities", icon: "star" },
  { to: "/admin/reports", label: "Reports", icon: "chart" },
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
              {item.label === "Report Issues" && Number(liveStats?.openComplaints || 0) > 0 && <em className="admin-nav-badge">{liveStats.openComplaints}</em>}
            </NavLink>
          ))}
        </nav>
        <div className="admin-sidebar-spacer" />
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
            <NavLink to="/admin/enquiries" className="portal-icon-btn portal-bell" aria-label="Notifications"><Icon name="bell" size={17}/></NavLink>
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
