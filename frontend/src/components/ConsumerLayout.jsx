import { NavLink } from "react-router-dom";
import { useAuth } from "../AuthContext.jsx";
import { useEffect, useState } from "react";
import { apiFetch } from "../api.js";
import { LogoutButton } from "./LogoutButton.jsx";
import { BrandLogo } from "./BrandLogo.jsx";
import "../pages/Dashboard.css";
import "./ConsumerLayout.css";
import PortalSearch from "./PortalSearch.jsx";
import Icon from "./Icon.jsx";
import HomeAiChat from "./HomeAiChat.jsx";


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
  const displayInitial = displayName.trim().charAt(0).toUpperCase() || "T";
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
          <div className="consumer-topbar-actions"><PortalSearch mode="customer" /><div className="portal-notification-wrap"><button className="portal-icon-btn" type="button" onClick={()=>setNotificationsOpen(v=>!v)} aria-label="Notifications"><Icon name="bell" size={17}/></button>{notificationsOpen&&<div className="portal-notification-panel"><strong>Notifications</strong>{notifications.length?notifications.slice(0,8).map((n,i)=><div key={n.id||i} className="portal-notification-item"><b>{n.title||"Update"}</b><span>{n.message||""}</span></div>):<p>No notifications</p>}</div>}</div><div className="portal-profile-wrap"><button className="portal-profile" type="button" onClick={() => setProfileOpen((v) => !v)} aria-expanded={profileOpen}><span className="portal-avatar portal-avatar-initial" aria-hidden="true">{displayInitial}</span><span><strong>{displayName}</strong><small>Customer</small></span></button>{profileOpen && <div className="portal-profile-menu"><NavLink to="/dashboard/profile" onClick={() => setProfileOpen(false)}>Profile</NavLink><LogoutButton /></div>}</div></div>
        </header>
        <div className="consumer-page-body">{children}</div>
      </main>
      {supportOpen&&<div className="consumer-modal-backdrop" onClick={()=>setSupportOpen(false)}><div className="consumer-support-modal" onClick={e=>e.stopPropagation()}><button type="button" className="consumer-modal-close" onClick={()=>setSupportOpen(false)} aria-label="Close">×</button><h2>Support & Help</h2><p>Our team is here to help with your journey, enquiry or booking.</p><p><strong>Phone:</strong> {support.phone||"Not configured"}</p><p><strong>Email:</strong> {support.email||"Not configured"}</p></div></div>}
      <HomeAiChat portal />
    </div>
  );
}
export { Icon as ConsumerIcon };
