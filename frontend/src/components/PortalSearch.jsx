import Icon from "./Icon.jsx";
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch } from "../api.js";
import "./PortalSearch.css";

const ADMIN_SHORTCUTS = [
  ["Dashboard", "/admin"], ["Enquiries", "/admin/enquiries"], ["Bookings", "/admin/bookings"],
  ["Vehicles", "/admin/vehicles"], ["Fleet Gallery", "/admin/settings/fleetGallery"], ["Tour Packages", "/admin/tour-packages"],
  ["Reviews", "/admin/reviews"], ["Reports", "/admin/reports"], ["Settings", "/admin/settings/business"],
];
const CUSTOMER_SHORTCUTS = [
  ["Dashboard", "/dashboard"], ["Search Vehicles", "/dashboard/vehicles"], ["Tour Packages", "/dashboard/tour-packages"],
  ["My Bookings", "/dashboard/bookings"], ["My Enquiries", "/dashboard/enquiries"], ["My Reviews", "/dashboard/reviews"],
];

export default function PortalSearch({ mode = "customer", isSuperAdmin = false }) {
  const navigate = useNavigate();
  const ref = useRef(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const shortcuts = mode === "admin" ? ADMIN_SHORTCUTS : CUSTOMER_SHORTCUTS;

  useEffect(() => {
    const onPointer = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", onPointer);
    return () => document.removeEventListener("mousedown", onPointer);
  }, []);

  useEffect(() => {
    const term = query.trim();
    if (!term) { setResults([]); return undefined; }
    const timer = setTimeout(async () => {
      setLoading(true);
      const lower = term.toLowerCase();
      const local = shortcuts.filter(([label]) => label.toLowerCase().includes(lower)).map(([label, path]) => ({ type: "shortcut", label, path }));
      const calls = [apiFetch(`/api/vehicles?search=${encodeURIComponent(term)}&limit=5`), apiFetch(`/api/tour-packages?search=${encodeURIComponent(term)}&limit=5`)];
      if (mode === "admin" && isSuperAdmin) {
        calls.push(apiFetch(`/api/admin/bookings?search=${encodeURIComponent(term)}&limit=5`));
      }
      const responses = await Promise.all(calls);
      const out = [...local];
      const vehicles = responses[0];
      if (vehicles.ok && vehicles.data?.success) (vehicles.data.vehicles || []).forEach(v => out.push({ type: "vehicle", label: v.name, meta: v.category?.name || "Vehicle", path: mode === "admin" ? (isSuperAdmin ? `/admin/vehicles/${v.id}` : `/admin`) : `/dashboard/vehicles/${v.id}` }));
      const packages = responses[1];
      if (packages.ok && packages.data?.success) (packages.data.packages || []).forEach(p => out.push({ type: "package", label: p.title, meta: p.destination, path: mode === "admin" ? `/tour-packages/${p.slug || p.id}` : `/dashboard/tour-packages/${p.slug || p.id}` }));
      if (mode === "admin" && isSuperAdmin) {
        const bookings = responses[2];
        if (bookings?.ok && bookings.data?.success) (bookings.data.bookings || []).forEach(b => out.push({ type: "booking", label: b.bookingId, meta: `${b.customer?.name || b.customerSnapshot?.name || "Booking"}`, path: `/admin/bookings/${b.bookingId || b.id}` }));
      }
      setResults(out.slice(0, 8));
      setLoading(false);
    }, 280);
    return () => clearTimeout(timer);
  }, [query, mode, isSuperAdmin]);

  function go(path) { setOpen(false); setQuery(""); navigate(path); }
  return <div className={`portal-search portal-search-${mode}`} ref={ref}>
    <span className="portal-search-icon"><Icon name="search" size={16}/></span>
    <input value={query} onChange={(e) => { setQuery(e.target.value); setOpen(true); }} onFocus={() => setOpen(true)} onKeyDown={(e) => { if (e.key === "Escape") setOpen(false); if (e.key === "Enter" && results[0]) go(results[0].path); }} placeholder={mode === "admin" ? "Search admin, vehicles, bookings…" : "Search vehicles, packages…"} aria-label={mode === "admin" ? "Search admin portal" : "Search customer portal"} />
    {query && <button type="button" className="portal-search-clear" onClick={() => setQuery("")} aria-label="Clear search">×</button>}
    {open && <div className="portal-search-menu">
      {!query.trim() ? <><p className="portal-search-heading">Quick access</p>{shortcuts.slice(0, 7).map(([label, path]) => <button key={path} type="button" className="portal-search-result" onClick={() => go(path)}><span>{label}</span><small>Open</small></button>)}</> : loading ? <div className="portal-search-empty">Searching…</div> : results.length ? results.map((r, i) => <button key={`${r.path}-${i}`} type="button" className="portal-search-result" onClick={() => go(r.path)}><span>{r.label}</span><small>{r.meta || r.type}</small></button>) : <div className="portal-search-empty">No matching results.</div>}
    </div>}
  </div>;
}
