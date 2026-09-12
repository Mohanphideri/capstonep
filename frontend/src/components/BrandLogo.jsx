import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { apiFetch } from "../api.js";
import "./BrandLogo.css";

let cachedLogo = null;
let logoRequest = null;
function loadLogo() {
  if (cachedLogo) return Promise.resolve(cachedLogo);
  if (!logoRequest) {
    logoRequest = apiFetch("/api/site-content").then(({ ok, data }) => { cachedLogo = ok && data?.success ? data.settings?.logoUrl || null : null; return cachedLogo; }).catch(() => null).finally(() => { logoRequest = null; });
  }
  return logoRequest;
}

// The real Kuwarji Travels mark (red bus + wordmark) already has the brand
// name baked into the artwork. The "full" variant renders that image
// directly everywhere (navbar, sidebars, footer, login, emails, PDFs) —
// an admin-uploaded logo from Settings takes priority when present.
export function BrandLogo({ to="/", href, variant="full", className="", showTagline=false, onClick }) {
  const [logoUrl, setLogoUrl] = useState(cachedLogo);
  useEffect(() => { let active=true; loadLogo().then((url)=>{ if(active && url) setLogoUrl(url); }); return ()=>{active=false}; }, []);

  const content = (
    <>
      {variant === "icon" ? (
        <img className="brand-logo-image brand-logo-image-icon" src="/kuwarji-travels-icon.png" alt="Kuwarji Travels" draggable="false" />
      ) : (
        <>
          <img className="brand-logo-image brand-logo-image-full is-custom" src={logoUrl || "/kuwarji-travels-logo.png"} alt="Kuwarji Travels" draggable="false" />
          <img className="brand-logo-image brand-logo-image-sidebar-icon" src="/kuwarji-travels-icon.png" alt="" aria-hidden="true" draggable="false" />
        </>
      )}
      {showTagline && <span className="brand-logo-tagline">TRAVEL · RENTAL · BOOKINGS</span>}
    </>
  );

  const classes = `brand-logo brand-logo-${variant} ${className}`.trim();
  if (href) return <a href={href} className={classes} onClick={onClick} aria-label="Kuwarji Travels home">{content}</a>;
  return <Link to={to} className={classes} onClick={onClick} aria-label="Kuwarji Travels home">{content}</Link>;
}
