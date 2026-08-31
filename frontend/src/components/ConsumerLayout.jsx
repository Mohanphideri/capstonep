import { NavLink } from "react-router-dom";
import { useAuth } from "../AuthContext.jsx";
import { useEffect, useState } from "react";
import { apiFetch } from "../api.js";
import { LogoutButton } from "./LogoutButton.jsx";
import { BrandLogo } from "./BrandLogo.jsx";
import "../pages/Dashboard.css";
import "./ConsumerLayout.css";
import PortalSearch from "./PortalSearch.jsx";
import BotpressChat from "./BotpressChat.jsx";

function Icon({ name, size = 18 }) {
  const common = { width:size,height:size,viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:1.8,strokeLinecap:"round",strokeLinejoin:"round","aria-hidden":"true" };
  const p = {
    grid:<><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></>,
    message:<><path d="M20 11.5a7.5 7.5 0 0 1-7.5 7.5H7l-4 3v-6.1a7.5 7.5 0 1 1 17-4.4Z"/></>,
    calendar:<><rect x="3" y="4.5" width="18" height="17" rx="2"/><path d="M16 2.5v4M8 2.5v4M3 9h18"/></>,
    truck:<><path d="M3 7h11v9H3z"/><path d="M14 11h4l3 3v2h-7z"/><circle cx="7.5" cy="18" r="1.6"/><circle cx="17.5" cy="18" r="1.6"/></>,
    wallet:<><path d="M4 6.5A2.5 2.5 0 0 1 6.5 4H20v16H6a3 3 0 0 1-3-3V7"/><path d="M3 8h15M16 13h4"/><circle cx="16.2" cy="13" r=".8"/></>,
    star:<path d="m12 3 2.6 5.6 6.1.7-4.5 4.2 1.2 6-5.4-3-5.4 3 1.2-6-4.5-4.2 6.1-.7Z"/>,
    user:<><circle cx="12" cy="8" r="3.5"/><path d="M5 21a7 7 0 0 1 14 0"/></>,
    help:<><circle cx="12" cy="12" r="9"/><path d="M9.7 9a2.5 2.5 0 1 1 4.5 1.5c-.8 1-2.2 1.2-2.2 2.8M12 17h.01"/></>,
    settings:<><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2.8 2.8-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.5v.1h-4v-.1a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.9.3l-.1.1-2.8-2.8.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.5-1H4v-4h.1a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.9l-.1-.1L8 3.2l.1.1a1.7 1.7 0 0 0 1.9.3 1.7 1.7 0 0 0 1-1.5V2h4v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.9-.3l.1-.1 2.8 2.8-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.5 1h.1v4h-.1a1.7 1.7 0 0 0-1.5 1Z"/></>,
    bell:<><path d="M18 9a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"/><path d="M10 21h4"/></>,
    menu:<path d="M4 6h16M4 12h16M4 18h16"/>,
    compass:<><circle cx="12" cy="12" r="9"/><path d="m15 9-3.5 1.5L10 14l3.5-1.5L15 9Z"/></>,
  };
  return <svg {...common}>{p[name]}</svg>;
}

const NAV_GROUPS = [
  {
    label: "Overview",
    items: [
      { to: "/dashboard", label: "Dashboard", icon: "grid", end: true },
    ],
  },
  {
    label: "Plan & Travel",
    items: [
      { to: "/dashboard/trip-planner", label: "Trip Planner", icon: "compass" },
      { to: "/dashboard/vehicles", label: "Search Vehicles", icon: "truck" },
      { to: "/dashboard/tour-packages", label: "Tour Packages", icon: "grid" },
      { to: "/dashboard/enquiries", label: "My Enquiries", icon: "message" },
      { to: "/dashboard/bookings", label: "My Bookings", icon: "calendar" },
    ],
  },
  {
    label: "Account",
    items: [
      { to: "/dashboard/reviews", label: "Reviews", icon: "star" },
      { to: "/dashboard/profile", label: "Profile", icon: "user" },
      { to: "/dashboard/settings", label: "Settings", icon: "settings" },
    ],
  },
];

function greeting(){const h=new Date().getHours();return h<12?"Good Morning":h<17?"Good Afternoon":h<21?"Good Evening":"Good Night";}

export default function ConsumerLayout({ title, lead, children }) {
  const { user } = useAuth();
  const displayName = user?.name || "Traveller";
  const [profileOpen, setProfileOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [supportOpen, setSupportOpen] = useState(false);
  const [support, setSupport] = useState({ phone: "", email: "" });
  const [navOpen, setNavOpen] = useState(false);
  useEffect(() => { setNavOpen(false); }, [title]);
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    Promise.all([apiFetch("/api/notifications"), apiFetch("/api/site-content")]).then(([n,s]) => {
      if (cancelled) return;
      if (n.ok && n.data?.success) { const items = n.data.notifications || []; setNotifications(items); }
      if (s.ok && s.data?.success) setSupport({ phone: s.data.settings?.phone || "", email: s.data.settings?.email || "" });
    }).catch(() => {});
    return () => { cancelled = true; };
  }, [user]);
  return (
    <div className={`consumer-shell${navOpen ? " nav-open" : ""}`}>
      {navOpen && <button type="button" className="consumer-nav-backdrop" aria-label="Close menu" onClick={() => setNavOpen(false)} />}
      <aside className="consumer-sidebar">
        <div className="consumer-sidebar-brand">
          <BrandLogo to="/dashboard" className="consumer-brand" variant="full" />
          <button type="button" className="consumer-sidebar-close" aria-label="Close menu" onClick={() => setNavOpen(false)}>×</button>
        </div>

        <nav className="consumer-nav" aria-label="Customer portal">
          {NAV_GROUPS.map((group) => (
            <div className="consumer-nav-group" key={group.label}>
              <p className="consumer-nav-label">{group.label}</p>
              {group.items.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  onClick={() => setNavOpen(false)}
                  className={({ isActive }) => `consumer-nav-link${isActive ? " is-active" : ""}`}
                >
                  <Icon name={item.icon} size={16} /><span>{item.label}</span>
                </NavLink>
              ))}
            </div>
          ))}
        </nav>
        <div className="consumer-sidebar-spacer" />
        <button type="button" className="consumer-support-link" onClick={()=>setSupportOpen(true)}><Icon name="help" size={16}/><span>Support</span></button>
        <div className="consumer-sidebar-logout"><LogoutButton /></div>
      </aside>

      <main className="consumer-content">
        <header className="consumer-topbar">
          <button type="button" className="consumer-nav-toggle" aria-label="Open menu" onClick={() => setNavOpen(true)}><Icon name="menu" size={20}/></button>
          <div className="consumer-topbar-title"><p className="consumer-breadcrumb">{greeting()} <span>›</span> {title}</p><h1>{title}</h1>{lead && <p className="consumer-page-lead">{lead}</p>}</div>
          <div className="consumer-topbar-actions"><PortalSearch mode="customer" /><div className="portal-notification-wrap"><button className="portal-icon-btn" type="button" onClick={()=>setNotificationsOpen(v=>!v)} aria-label="Notifications"><Icon name="bell" size={17}/></button>{notificationsOpen&&<div className="portal-notification-panel"><strong>Notifications</strong>{notifications.length?notifications.slice(0,8).map((n,i)=><div key={n.id||i} className="portal-notification-item"><b>{n.title||"Update"}</b><span>{n.message||""}</span></div>):<p>No notifications</p>}</div>}</div><div className="portal-profile-wrap"><button className="portal-profile" type="button" onClick={() => setProfileOpen((v) => !v)} aria-expanded={profileOpen}><span className="portal-avatar"><Icon name="user" size={15}/></span><span><strong>{displayName}</strong><small>Customer</small></span></button>{profileOpen && <div className="portal-profile-menu"><NavLink to="/dashboard/profile" onClick={() => setProfileOpen(false)}>Profile</NavLink><LogoutButton /></div>}</div></div>
        </header>
        <div className="consumer-page-body">{children}</div>
      </main>
      {supportOpen&&<div className="consumer-modal-backdrop" onClick={()=>setSupportOpen(false)}><div className="consumer-support-modal" onClick={e=>e.stopPropagation()}><button type="button" className="consumer-modal-close" onClick={()=>setSupportOpen(false)} aria-label="Close">×</button><h2>Support & Help</h2><p>Our team is here to help with your journey, enquiry or booking.</p><p><strong>Phone:</strong> {support.phone||"Not configured"}</p><p><strong>Email:</strong> {support.email||"Not configured"}</p></div></div>}
      <BotpressChat />
    </div>
  );
}
export { Icon as ConsumerIcon };
