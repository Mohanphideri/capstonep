import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";
import "./Navbar.css";
import { BrandLogo } from "./BrandLogo.jsx";
import { useAuth } from "../AuthContext.jsx";

const TRIP_PLANNER_PATH = "/dashboard/trip-planner";

// Only the actions a travelling customer actually needs up top — everything
// else (About, FAQ, policies, office locations) lives in the footer.
const links = [
  { href: "/vehicles", label: "Search Vehicles" },
  { href: "/tour-packages", label: "Tour Packages" },
  { href: "/about", label: "About" },
  { href: "/location", label: "Contact" },
];

function isRoutePath(href) {
  return href.startsWith("/") && !href.includes("#");
}

function NavLink({ href, label, className, onClick }) {
  if (isRoutePath(href)) {
    return (
      <Link to={href} className={className} onClick={onClick}>
        {label}
      </Link>
    );
  }
  return (
    <a href={href} className={className} onClick={onClick}>
      {label}
    </a>
  );
}

export function Navbar({ onOpenEnquiry }) {
  const [open, setOpen] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();

  function goToTripPlanner(closeMenu) {
    if (closeMenu) setOpen(false);
    navigate(user ? TRIP_PLANNER_PATH : `/login?next=${encodeURIComponent(TRIP_PLANNER_PATH)}`);
  }

  return (
    <header className="navbar">
      <div className="container navbar-row">
        <BrandLogo variant="full" className="navbar-brand" onClick={() => setOpen(false)} />

        <nav className="navbar-links">
          {links.map((link) => (
            <NavLink key={link.href} href={link.href} label={link.label} className="navbar-link" />
          ))}
          <button type="button" className="navbar-link navbar-link-btn" onClick={() => goToTripPlanner(false)}>
            Plan My Trip
          </button>
        </nav>

        <div className="navbar-actions">
          <Link to={user ? "/dashboard" : "/login"} className="btn btn-primary navbar-login-btn">
            Login
          </Link>
          <button
            type="button"
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
            className="navbar-toggle"
          >
            {open ? (
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
                <path d="M2 2L16 16M16 2L2 16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              </svg>
            ) : (
              <svg width="18" height="14" viewBox="0 0 18 14" fill="none" aria-hidden="true">
                <path d="M0 1H18M0 7H18M0 13H18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {open && (
        <nav className="navbar-mobile">
          <ul className="navbar-mobile-list">
            {links.map((link) => (
              <li key={link.href}>
                <NavLink
                  href={link.href}
                  label={link.label}
                  onClick={() => setOpen(false)}
                  className="navbar-mobile-link"
                />
              </li>
            ))}
            <li>
              <button type="button" className="navbar-mobile-link navbar-mobile-link-btn" onClick={() => goToTripPlanner(true)}>
                Plan My Trip
              </button>
            </li>
          </ul>
        </nav>
      )}
    </header>
  );
}
