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
    bell:<><path d="M18 9a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"/><path d="M10 21h4"/></>,
    menu:<path d="M4 6h16M4 12h16M4 18h16"/>,
  };
  return <svg {...common}>{p[name]}</svg>;
}

const NAV_ITEMS = [
  {to:"/dashboard",label:"Dashboard",icon:"grid",end:true},
  {to:"/dashboard/vehicles",label:"Search Vehicles",icon:"truck"},
  {to:"/dashboard/enquiries",label:"My Enquiries",icon:"message"},
  {to:"/dashboard/bookings",label:"My Bookings",icon:"calendar"},
  {to:"/dashboard/trip-maker",label:"My Trips",icon:"truck"},
    {to:"/dashboard/reviews",label:"My Reviews",icon:"star"},
  {to:"/dashboard/profile",label:"Profile",icon:"user"},
];

export default function ConsumerLayout({ title, lead, children }) {
  const { user } = useAuth();
  const displayName = user?.name || "Traveller";
  const [notificationCount, setNotificationCount] = useState(0);
  const [profileOpen, setProfileOpen] = useState(false);
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    Promise.all([apiFetch("/api/my-enquiries"), apiFetch("/api/bookings?scope=upcoming")]).then(([e,b]) => {
      if (cancelled) return;
      const enquiries = e.ok && e.data?.success ? (e.data.enquiries || []) : [];
      const bookings = b.ok && b.data?.success ? (b.data.bookings || []) : [];
      const newEnquiries = enquiries.filter((x) => String(x.status || "").toUpperCase() === "NEW").length;
      setNotificationCount(newEnquiries + bookings.length);
    }).catch(() => {});
    return () => { cancelled = true; };
  }, [user]);
  return (
    <div className="consumer-shell">
      <aside className="consumer-sidebar">
        <div className="consumer-sidebar-brand"><BrandLogo to="/dashboard" className="consumer-brand" variant="full" /></div>
        <div className="consumer-nav-label">CUSTOMER PANEL</div>
        <nav className="consumer-nav" aria-label="Customer portal">
          {NAV_ITEMS.map((item,index)=><NavLink key={`${item.to}-${item.label}-${index}`} to={item.to} end={item.end} className={({isActive})=>`consumer-nav-link${isActive?" is-active":""}`}><Icon name={item.icon} size={16}/><span>{item.label}</span></NavLink>)}
        </nav>
        <div className="consumer-sidebar-spacer" />
        <NavLink to="/faq" className="consumer-support-link"><Icon name="help" size={16}/><span>Support</span></NavLink>
        <div className="consumer-user-mini"><span className="consumer-avatar"><Icon name="user" size={15}/></span><span className="consumer-user-copy"><strong>{displayName}</strong><small>Customer</small></span><span className="consumer-mini-caret">⌄</span></div>
        <div className="consumer-sidebar-logout"><LogoutButton /></div>
      </aside>

      <main className="consumer-content">
        <header className="consumer-topbar">
          <div><p className="consumer-breadcrumb">Customer portal <span>›</span> {title}</p><h1>{title}</h1>{lead && <p className="consumer-page-lead">{lead}</p>}</div>
          <div className="consumer-topbar-actions"><PortalSearch mode="customer" /><button className="portal-icon-btn" type="button" aria-label={`Notifications${notificationCount ? `, ${notificationCount} items` : ""}`}><Icon name="bell" size={17}/>{notificationCount > 0 && <b>{notificationCount > 99 ? "99+" : notificationCount}</b>}</button><div className="portal-profile-wrap"><button className="portal-profile" type="button" onClick={() => setProfileOpen((v) => !v)} aria-expanded={profileOpen}><span className="portal-avatar"><Icon name="user" size={15}/></span><span><strong>{displayName}</strong><small>Customer</small></span><span className="portal-caret">⌄</span></button>{profileOpen && <div className="portal-profile-menu"><NavLink to="/dashboard/profile" onClick={() => setProfileOpen(false)}>Profile</NavLink><LogoutButton /></div>}</div></div>
        </header>
        <div className="consumer-page-body">{children}</div>
      </main>
      <BotpressChat />
    </div>
  );
}
export { Icon as ConsumerIcon };
