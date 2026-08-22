import { useEffect, useState } from "react";
import { Link, NavLink } from "react-router-dom";
import { useAuth } from "../AuthContext.jsx";
import { LogoutButton } from "./LogoutButton.jsx";
import { BrandLogo } from "./BrandLogo.jsx";
import "../pages/Dashboard.css";
import "../pages/AdminDashboard.css";
import "./AdminShared.css";
import "./AdminLayout.css";

const SIDEBAR_STATE_KEY = "kt-admin-sidebar-collapsed";

function Icon({ name, size = 18 }) {
  const common = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round",
    strokeLinejoin: "round",
    "aria-hidden": "true",
  };

  const paths = {
    grid: <><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></>,
    calendar: <><rect x="3" y="4.5" width="18" height="17" rx="2" /><path d="M16 2.5v4M8 2.5v4M3 9h18" /></>,
    message: <><path d="M20 11.5a7.5 7.5 0 0 1-7.5 7.5H7l-4 3v-6.1a7.5 7.5 0 1 1 17-4.4Z" /></>,
    truck: <><path d="M3 7h11v9H3z" /><path d="M14 11h4l3 3v2h-7z" /><circle cx="7.5" cy="18" r="1.6" /><circle cx="17.5" cy="18" r="1.6" /></>,
    tag: <><path d="M12.5 3H5a2 2 0 0 0-2 2v7.5L12.8 22l8.2-8.2L12.5 3Z" /><circle cx="8.2" cy="8.2" r="1.4" /></>,
    star: <><path d="m12 3 2.6 5.6 6.1.7-4.5 4.2 1.2 6-5.4-3-5.4 3 1.2-6-4.5-4.2 6.1-.7Z" /></>,
    users: <><circle cx="9" cy="8" r="3.2" /><path d="M2.8 20a6.2 6.2 0 0 1 12.4 0" /><path d="M15.5 5.2a3.2 3.2 0 0 1 0 6.1" /><path d="M17.5 14.3a6.2 6.2 0 0 1 4.2 5.7" /></>,
    receipt: <><path d="M6 3h12v18l-3-2-3 2-3-2-3 2Z" /><path d="M9 8h6M9 12h6" /></>,
    chart: <><path d="M4 20V10M11 20V4M18 20v-7" /><path d="M3 20h18" /></>,
    clipboard: <><rect x="5" y="4" width="14" height="17" rx="2" /><path d="M9 4V3a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v1" /><path d="M8.5 11h7M8.5 15h7" /></>,
    image: <><rect x="3" y="4" width="18" height="16" rx="2" /><circle cx="8.5" cy="9" r="1.5" /><path d="m4 17 5-5 4 4 3-3 4 4" /></>,
    settings: <><circle cx="12" cy="12" r="3" /><path d="M19.4 13a1.7 1.7 0 0 0 .34 1.87l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.7 1.7 0 0 0-1.87-.34 1.7 1.7 0 0 0-1.03 1.56V19.4a2 2 0 1 1-4 0v-.09A1.7 1.7 0 0 0 8.98 17.75a1.7 1.7 0 0 0-1.87.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.7 1.7 0 0 0 4.6 13a1.7 1.7 0 0 0-1.56-1.02H2.94a2 2 0 1 1 0-4h.1A1.7 1.7 0 0 0 4.6 6.97a1.7 1.7 0 0 0-.34-1.87l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.7 1.7 0 0 0 8.96 2.6a1.7 1.7 0 0 0 1.03-1.56V.94a2 2 0 1 1 4 0v.1A1.7 1.7 0 0 0 15.02 2.6a1.7 1.7 0 0 0 1.87-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.7 1.7 0 0 0-.34 1.87V7a1.7 1.7 0 0 0 1.56 1.03h.06a2 2 0 1 1 0 4h-.09A1.7 1.7 0 0 0 19.4 13Z" /></>,
    menu: <><path d="M4 6h16M4 12h16M4 18h16" /></>,
    close: <><path d="M6 6l12 12M18 6 6 18" /></>,
    chevron: <><path d="m9 6 6 6-6 6" /></>,
    user: <><circle cx="12" cy="8" r="3.5" /><path d="M5 21a7 7 0 0 1 14 0" /></>,
  };

  return <svg {...common}>{paths[name]}</svg>;
}

const NAV_SECTIONS = [
  {
    label: "Workspace",
    items: [
      { to: "/admin", label: "Dashboard", icon: "grid", end: true },
      { to: "/admin/bookings", label: "Bookings", icon: "calendar" },
      { to: "/admin/enquiries", label: "Enquiries", icon: "message" },
      { to: "/admin/reviews", label: "Reviews", icon: "star" },
      { to: "/admin/customers", label: "Customers", icon: "users" },
    ],
  },
  {
    label: "Fleet",
    items: [
      { to: "/admin/vehicles", label: "Vehicles", icon: "truck" },
      { to: "/admin/categories", label: "Categories", icon: "tag" },
      { to: "/admin/amenities", label: "Amenities", icon: "star" },
    ],
  },
  {
    label: "Finance",
    items: [
      { to: "/admin/invoices", label: "Invoices", icon: "receipt" },
      { to: "/admin/reports", label: "Reports", icon: "chart" },
      { to: "/admin/balance-sheet", label: "Balance Sheet", icon: "receipt" },
    ],
  },
  {
    label: "Website",
    items: [
      { to: "/admin/settings/business", label: "Business & Footer", icon: "settings" },
      { to: "/admin/settings/whyUs", label: "Why Us", icon: "star" },
      { to: "/admin/settings/fleetGallery", label: "Fleet Gallery", icon: "image" },
      { to: "/admin/settings/banner", label: "Announcement Banner", icon: "tag" },
    ],
  },
  {
    label: "System",
    items: [
      { to: "/admin/audit-logs", label: "Audit log", icon: "clipboard" },
      { to: "/admin/settings/whatsapp", label: "WhatsApp", icon: "message" },
      { to: "/admin/settings/booking", label: "Booking Rules", icon: "calendar" },
      { to: "/admin/settings/invoice", label: "Authorized Signatory", icon: "receipt" },
    ],
  },
];

function SidebarNav({ onNavigate }) {
  return (
    <nav className="admin-side-nav" aria-label="Admin sections">
      {NAV_SECTIONS.map((section) => (
        <div className="admin-side-group" key={section.label}>
          <div className="admin-side-group-label">{section.label}</div>
          {section.items.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              onClick={onNavigate}
              className={({ isActive }) => `admin-side-link${isActive ? " is-active" : ""}`}
              data-tooltip={item.label}
            >
              <Icon name={item.icon} />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </div>
      ))}
    </nav>
  );
}

/**
 * Shared shell for every admin page: a collapsible, grouped sidebar as the
 * primary navigation (desktop) that becomes a slide-in drawer on mobile,
 * plus a light top header for page title / logout. Replaces the old
 * top-tab strip — same routes, same AdminLayout({ title, lead, children })
 * contract every admin page already uses, so no page needed to change.
 */
export function AdminLayout({ title, lead, children }) {
  const { user } = useAuth();
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem(SIDEBAR_STATE_KEY) === "1";
    } catch {
      return false;
    }
  });
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem(SIDEBAR_STATE_KEY, collapsed ? "1" : "0");
    } catch {
      /* ignore */
    }
  }, [collapsed]);

  useEffect(() => {
    setDrawerOpen(false);
  }, [title]);

  const displayName = user?.name || (user ? `+91 ${user.phone}` : "Admin");
  const roleLabel = user?.role ? user.role.replace(/_/g, " ") : "";

  return (
    <div className={`admin-shell${collapsed ? " is-collapsed" : ""}`}>
      <aside className={`admin-sidebar${drawerOpen ? " is-open" : ""}`}>
        <div className="admin-sidebar-top">
          <BrandLogo to="/admin" className="admin-brand" variant="full" />
          <button
            type="button"
            className="admin-drawer-close"
            aria-label="Close menu"
            onClick={() => setDrawerOpen(false)}
          >
            <Icon name="close" size={18} />
          </button>
        </div>

        <SidebarNav onNavigate={() => setDrawerOpen(false)} />

        <div className="admin-sidebar-spacer" />

        <button
          type="button"
          className="admin-collapse-toggle"
          onClick={() => setCollapsed((v) => !v)}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          <Icon name="chevron" size={16} />
          <span>Collapse</span>
        </button>

        <div className="admin-sidebar-user">
          <span className="admin-sidebar-avatar"><Icon name="user" size={16} /></span>
          <span className="admin-sidebar-user-copy">
            <strong>{displayName}</strong>
            <small>{roleLabel}</small>
          </span>
        </div>

        <div className="admin-sidebar-logout">
          <LogoutButton />
        </div>
      </aside>

      {drawerOpen && (
        <button
          type="button"
          className="admin-drawer-scrim"
          aria-label="Close menu"
          onClick={() => setDrawerOpen(false)}
        />
      )}

      <div className="admin-main">
        <header className="admin-topbar">
          <button
            type="button"
            className="admin-hamburger"
            aria-label="Open menu"
            onClick={() => setDrawerOpen(true)}
          >
            <Icon name="menu" size={20} />
          </button>
          <div className="admin-topbar-titles">
            <p className="admin-breadcrumb">Admin portal / {title}</p>
            <h1>{title}</h1>
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
