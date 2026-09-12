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

const NAV_GROUPS = [
  {
    label: "Overview",
    items: [{ to: "/admin", label: "Dashboard", icon: "grid", end: true }],
  },
  {
    label: "Operations",
    items: [
      { to: "/admin/enquiries", label: "Enquiries", icon: "message" },
      { to: "/admin/bookings", label: "Bookings", icon: "calendar" },
      { to: "/admin/issues", label: "Report Issues", icon: "message" },
    ],
  },
  {
    label: "Fleet & Packages",
    items: [
      { to: "/admin/vehicles", label: "Vehicles", icon: "truck" },
      { to: "/admin/tour-packages", label: "Tour Packages", icon: "tag" },
      { to: "/admin/categories", label: "Categories", icon: "tag" },
      { to: "/admin/amenities", label: "Amenities", icon: "star" },
    ],
  },
  {
    label: "Finance & Reports",
    items: [
      { to: "/admin/balance-sheet", label: "Balance Sheet", icon: "chart" },
      { to: "/admin/invoices", label: "Invoices", icon: "receipt" },
      { to: "/admin/reports", label: "Reports", icon: "chart" },
    ],
  },
  {
    label: "Content",
    items: [
      { to: "/admin/reviews", label: "Reviews", icon: "star" },
      { to: "/admin/settings/banner", label: "Banner Management", icon: "image" },
      { to: "/admin/settings/invoice", label: "PDF Settings", icon: "receipt" },
    ],
  },
  {
    label: "Settings",
    items: [{ to: "/admin/settings/business", label: "Business Settings", icon: "settings" }],
  },
];

export function AdminLayout({ title, lead, children }) {
  const { user } = useAuth();
  const [collapsed, setCollapsed] = useState(() => {
    try { return localStorage.getItem(SIDEBAR_STATE_KEY) === "1"; } catch { return false; }
  });
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [liveStats, setLiveStats] = useState(null);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);

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
  useEffect(() => { setDrawerOpen(false); setProfileMenuOpen(false); }, [title]);

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
          {NAV_GROUPS.map((group) => (
            <div className="admin-nav-group" key={group.label}>
              <p className="admin-nav-group-label">{group.label}</p>
              {group.items.map((item) => (
                <NavLink key={item.to} to={item.to} end={item.end} onClick={() => setDrawerOpen(false)} className={({isActive}) => `admin-side-link${isActive ? " is-active" : ""}`} data-tooltip={item.label}>
                  <Icon name={item.icon} size={17}/><span>{item.label}</span>
                  {item.label === "Enquiries" && Number(liveStats?.newEnquiries || 0) > 0 && <em className="admin-nav-badge">{liveStats.newEnquiries}</em>}
                  {item.label === "Reviews" && Number(liveStats?.pendingReviews || 0) > 0 && <em className="admin-nav-badge">{liveStats.pendingReviews}</em>}
                  {item.label === "Report Issues" && Number(liveStats?.openComplaints || 0) > 0 && <em className="admin-nav-badge">{liveStats.openComplaints}</em>}
                </NavLink>
              ))}
            </div>
          ))}
        </nav>
        <div className="admin-sidebar-spacer" />
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
            <div className="admin-profile-menu-wrap">
              <button type="button" className="portal-profile" onClick={() => setProfileMenuOpen((v) => !v)} aria-expanded={profileMenuOpen} aria-haspopup="menu">
                <span className="portal-avatar"><Icon name="user" size={15}/></span>
                <span><strong>{displayName}</strong><small>{roleLabel}</small></span>
                <span className="portal-caret">⌄</span>
              </button>
              {profileMenuOpen && <div className="admin-profile-menu" role="menu">
                <NavLink to="/admin/profile" role="menuitem" onClick={() => setProfileMenuOpen(false)}><Icon name="user" size={15}/>Profile</NavLink>
                <LogoutButton />
              </div>}
            </div>
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
