import { Link } from "react-router-dom";
import { useState } from "react";
import "./Navbar.css";
import { BrandLogo } from "./BrandLogo.jsx";

const links = [
  { href: "/#about", label: "About" },
  { href: "/vehicles", label: "Vehicles" },
  { href: "/fleet-gallery", label: "Fleet Gallery" },
  { href: "/trip-maker", label: "Trip Maker" },
  { href: "/#how-it-works", label: "How it works" },
  { href: "/why-us", label: "Why Us" },
  { href: "/#faq", label: "FAQ" },
  { href: "/#contact", label: "Contact" },
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

  return (
    <header className="navbar">
      <div className="container navbar-row">
        <BrandLogo variant="icon" className="navbar-brand" onClick={() => setOpen(false)} />

        <nav className="navbar-links">
          {links.map((link) => (
            <NavLink key={link.href} href={link.href} label={link.label} className="navbar-link" />
          ))}
        </nav>

        <div className="navbar-actions">
          <Link to="/login" className="btn btn-primary navbar-login-btn">
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
          </ul>
        </nav>
      )}
    </header>
  );
}
