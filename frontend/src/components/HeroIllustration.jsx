export function HeroIllustration({ className = "" }) {
  return (
    <svg viewBox="0 0 640 260" fill="none" className={className} aria-hidden="true">
      <path
        d="M20 190 C 140 190, 160 60, 280 60 S 420 200, 540 120 S 600 60, 618 50"
        stroke="#DDE2E8"
        strokeWidth="2"
      />
      <path
        d="M20 190 C 140 190, 160 60, 280 60 S 420 200, 540 120 S 600 60, 618 50"
        stroke="#5A6B8C"
        strokeWidth="2"
        strokeDasharray="2 10"
        strokeLinecap="round"
        className="route-dash-animate"
      />

      {/* Origin pin */}
      <circle cx="20" cy="190" r="7" fill="#101B33" />
      <text x="20" y="214" textAnchor="middle" fontFamily="'IBM Plex Mono', monospace" fontSize="11" fill="#5A6B8C">
        ORIGIN
      </text>

      {/* Waypoints */}
      <circle cx="280" cy="60" r="5" fill="#F0A202" />
      <circle cx="540" cy="120" r="5" fill="#F0A202" />

      {/* Destination pin */}
      <circle cx="618" cy="50" r="7" fill="#D64550" />
      <text x="590" y="34" textAnchor="middle" fontFamily="'IBM Plex Mono', monospace" fontSize="11" fill="#5A6B8C">
        DESTINATION
      </text>

      {/* Simple bus glyph riding the route */}
      <g transform="translate(255,150)">
        <rect x="0" y="0" width="72" height="34" rx="7" fill="#101B33" />
        <rect x="8" y="7" width="16" height="14" rx="2" fill="#F2F4F6" />
        <rect x="28" y="7" width="16" height="14" rx="2" fill="#F2F4F6" />
        <rect x="48" y="7" width="16" height="14" rx="2" fill="#F2F4F6" />
        <circle cx="16" cy="36" r="5" fill="#2A3A5C" />
        <circle cx="56" cy="36" r="5" fill="#2A3A5C" />
      </g>
    </svg>
  );
}
