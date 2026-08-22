import { NavLink, Link } from "react-router-dom";
import { useAuth } from "../AuthContext.jsx";
import { LogoutButton } from "./LogoutButton.jsx";
import "../pages/Dashboard.css";
import "./ConsumerLayout.css";
import { BrandLogo } from "./BrandLogo.jsx";

const NAV_ITEMS = [
  { to: "/dashboard", label: "Overview", icon: "grid", end: true },
  { to: "/dashboard/vehicles", label: "Find a Vehicle", icon: "search" },
  { to: "/dashboard/trip-maker", label: "Trip Maker", icon: "spark" },
  { to: "/dashboard/bookings", label: "My Bookings", icon: "calendar" },
  { to: "/dashboard/enquiries", label: "My Enquiries", icon: "message" },
  { to: "/dashboard/invoices", label: "Invoices", icon: "receipt" },
  { to: "/dashboard/reviews", label: "Reviews", icon: "star" },
];

function Icon({ name, size = 18 }) {
  const common = { width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": "true" };
  const paths = {
    grid: <><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></>,
    search: <><circle cx="11" cy="11" r="7" /><path d="m20 20-4-4" /></>,
    calendar: <><rect x="3" y="4.5" width="18" height="17" rx="2" /><path d="M16 2.5v4M8 2.5v4M3 9h18" /></>,
    message: <><path d="M20 11.5a7.5 7.5 0 0 1-7.5 7.5H7l-4 3v-6.1a7.5 7.5 0 1 1 17-4.4Z" /></>,
    star: <path d="m12 3 2.6 5.6 6.1.7-4.5 4.2 1.2 6-5.4-3-5.4 3 1.2-6-4.5-4.2 6.1-.7Z" />,
    receipt: <><path d="M6 3h12v18l-3-2-3 2-3-2-3 2Z" /><path d="M9 8h6M9 12h6" /></>,
    user: <><circle cx="12" cy="8" r="3.5" /><path d="M5 21a7 7 0 0 1 14 0" /></>,
    arrow: <><path d="M5 12h14M13 6l6 6-6 6" /></>,
    spark: <><path d="m12 3 1.5 5.5L19 10l-5.5 1.5L12 17l-1.5-5.5L5 10l5.5-1.5Z" /><path d="m19 16 .7 2.3L22 19l-2.3.7L19 22l-.7-2.3L16 19l2.3-.7Z" /></>,
  };
  return <svg {...common}>{paths[name]}</svg>;
}

export default function ConsumerLayout({ title, lead, children }) {
  const { user } = useAuth();
  const displayName = user?.name || "Traveller";

  return (
    <div className="consumer-shell">
      <aside className="consumer-sidebar">
        <BrandLogo to="/dashboard" className="consumer-brand" variant="full" />

        <div className="consumer-nav-label">Workspace</div>
        <nav className="consumer-nav" aria-label="Customer portal">
          {NAV_ITEMS.map((item) => (
            <NavLink key={item.to} to={item.to} end={item.end} className={({ isActive }) => `consumer-nav-link${isActive ? " is-active" : ""}`}>
              <Icon name={item.icon} />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="consumer-sidebar-spacer" />

       

        
        <div className="consumer-user-mini">
          <span className="consumer-avatar"><Icon name="user" size={17} /></span>
          <span className="consumer-user-copy"><strong>{displayName}</strong><small>+91 {user?.phone || ""}</small></span>
        </div>
        <div className="consumer-sidebar-logout"><LogoutButton /></div>
      </aside>

      <main className="consumer-content">
        <div className="consumer-mobile-nav-label"><span>Customer portal</span><strong>{title}</strong></div>
        <nav className="consumer-mobile-nav" aria-label="Customer portal navigation">
          {NAV_ITEMS.map((item) => (
            <NavLink key={item.to} to={item.to} end={item.end} className={({ isActive }) => `consumer-mobile-nav-link${isActive ? " is-active" : ""}`}>
              {item.label}
            </NavLink>
          ))}
        </nav>

        <header className="consumer-topbar">
          <div>
            <p className="consumer-breadcrumb">Customer portal / {title}</p>
            <h1>{title}</h1>
            {lead && <p className="consumer-page-lead">{lead}</p>}
          </div>
          <div className="consumer-topbar-context"><span className="consumer-topbar-dot" /><span>Customer account</span></div>
        </header>
        <div className="consumer-page-body">{children}</div>
      </main>
    </div>
  );
}

export { Icon as ConsumerIcon };
