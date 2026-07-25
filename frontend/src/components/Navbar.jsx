import { Link, useLocation } from "react-router-dom";
import HeartMark from "./HeartMark";

const links = [
  { label: "Departments", href: "#departments" },
  { label: "How it works", href: "#how-it-works" },
  { label: "Portals", href: "#portals" },
];

export default function Navbar() {
  const location = useLocation();
  const isLanding = location.pathname === "/";

  return (
    <header className="sticky top-0 z-40 bg-paper/90 backdrop-blur border-b border-mist">
      <div className="max-w-6xl mx-auto px-6 h-20 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-3 group">
          <HeartMark size={38} />
          <div className="leading-tight">
            <div className="font-display text-xl">
              <span className="text-crimson">Heart</span>
              <span className="text-navy">Stone</span>
            </div>
            <div className="eyebrow -mt-0.5">Hospital</div>
          </div>
        </Link>

        {isLanding && (
          <nav className="hidden md:flex items-center gap-8">
            {links.map((l) => (
              <a
                key={l.label}
                href={l.href}
                className="text-sm font-medium text-ink/80 hover:text-crimson transition-colors"
              >
                {l.label}
              </a>
            ))}
          </nav>
        )}

        <Link
          to="/login"
          className="inline-flex items-center rounded-full bg-navy hover:bg-navy-light text-white text-sm font-semibold px-5 py-2.5 transition-colors"
        >
          Sign in
        </Link>
      </div>
    </header>
  );
}
