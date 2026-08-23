import { Link } from "react-router-dom";
import "./BrandLogo.css";

export function BrandLogo({
  to = "/",
  href,
  variant = "full",
  className = "",
  showTagline = false,
  onClick,
}) {
  const content = (
    <>
      {variant === "icon" ? (
        <img className="brand-logo-image brand-logo-image-icon" src="/kuwarji-travels-icon.png" alt="Kuwarji Travels" draggable="false" />
      ) : (
        <>
          <img className="brand-logo-image brand-logo-image-full" src="/kuwarji-travels-logo.png" alt="Kuwarji Travels" draggable="false" />
          <img className="brand-logo-image brand-logo-image-sidebar-icon" src="/kuwarji-travels-icon.png" alt="" aria-hidden="true" draggable="false" />
        </>
      )}
      {showTagline && <span className="brand-logo-tagline">TRAVEL · RENTAL · BOOKINGS</span>}
    </>
  );

  const classes = `brand-logo brand-logo-${variant} ${className}`.trim();

  if (href) {
    return (
      <a href={href} className={classes} onClick={onClick} aria-label="Kuwarji Travels home">
        {content}
      </a>
    );
  }

  return (
    <Link to={to} className={classes} onClick={onClick} aria-label="Kuwarji Travels home">
      {content}
    </Link>
  );
}
