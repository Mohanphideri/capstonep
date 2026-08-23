const shared = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.6,
  strokeLinecap: "round",
  strokeLinejoin: "round",
};

function BusGlyph() {
  return (
    <>
      <rect x="3" y="7" width="26" height="14" rx="3" {...shared} />
      <path d="M3 15h26" {...shared} />
      <path d="M8 7v8M14 7v8M20 7v8" {...shared} />
      <circle cx="9" cy="23" r="2" {...shared} />
      <circle cx="23" cy="23" r="2" {...shared} />
    </>
  );
}

function SleeperGlyph() {
  return (
    <>
      <rect x="3" y="6" width="26" height="16" rx="3" {...shared} />
      <path d="M3 12h26" {...shared} />
      <path d="M3 17h26" {...shared} />
      <path d="M7 6v16M25 6v16" {...shared} />
      <circle cx="9" cy="24" r="1.6" {...shared} />
      <circle cx="23" cy="24" r="1.6" {...shared} />
    </>
  );
}

function VanGlyph() {
  return (
    <>
      <path d="M3 20V11a2 2 0 0 1 2-2h13l6 6v5" {...shared} />
      <path d="M3 20h24" {...shared} />
      <path d="M15 9v6h9" {...shared} />
      <circle cx="9" cy="22" r="2" {...shared} />
      <circle cx="22" cy="22" r="2" {...shared} />
    </>
  );
}

function LuxuryGlyph() {
  return (
    <>
      <path d="M4 19c1-6 5-10 12-10s11 4 12 10" {...shared} />
      <path d="M4 19h24" {...shared} />
      <path d="M12 12v6M20 12v6" {...shared} />
      <circle cx="10" cy="22" r="2" {...shared} />
      <circle cx="22" cy="22" r="2" {...shared} />
      <path d="M14 6l1.5 2M18 6l-1.5 2" {...shared} />
    </>
  );
}

export function VehicleIcon({ kind, className = "" }) {
  const glyph =
    kind === "bus" ? (
      <BusGlyph />
    ) : kind === "sleeper" ? (
      <SleeperGlyph />
    ) : kind === "van" ? (
      <VanGlyph />
    ) : (
      <LuxuryGlyph />
    );

  return (
    <svg viewBox="0 0 32 28" className={className} aria-hidden="true">
      {glyph}
    </svg>
  );
}
