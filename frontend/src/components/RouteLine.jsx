export function RouteLine({ className = "" }) {
  return (
    <svg viewBox="0 0 640 200" fill="none" className={className} aria-hidden="true">
      <path
        d="M20 160 C 140 160, 160 40, 280 40 S 420 170, 540 100 S 600 40, 618 30"
        stroke="#5A6B8C"
        strokeWidth="2"
        strokeDasharray="2 10"
        strokeLinecap="round"
      />
      <circle cx="20" cy="160" r="7" fill="#101B33" />
      <circle cx="280" cy="40" r="5" fill="#F0A202" />
      <circle cx="540" cy="100" r="5" fill="#F0A202" />
      <circle cx="618" cy="30" r="7" fill="#D64550" />
    </svg>
  );
}
