const shared = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.7,
  strokeLinecap: "round",
  strokeLinejoin: "round",
};

function FleetGlyph() {
  return (
    <>
      <rect x="3" y="8" width="26" height="14" rx="3" {...shared} />
      <path d="M3 15h26" {...shared} />
      <path d="M9 8v7M15 8v7M21 8v7" {...shared} />
      <circle cx="9.5" cy="23.5" r="2" {...shared} />
      <circle cx="22.5" cy="23.5" r="2" {...shared} />
    </>
  );
}

function PriceGlyph() {
  return (
    <>
      <path d="M4 15.5 15.5 4h9.5a2 2 0 0 1 2 2v9.5L15.5 27 4 15.5Z" {...shared} />
      <circle cx="20" cy="9.5" r="1.9" fill="currentColor" stroke="none" />
    </>
  );
}

function ShieldGlyph() {
  return (
    <>
      <path d="M16 3.5 27 7.5v7c0 8-5 12.5-11 15-6-2.5-11-7-11-15v-7L16 3.5Z" {...shared} />
      <path d="M11 15.5l3.4 3.4L21.5 12" {...shared} />
    </>
  );
}

function ClockGlyph() {
  return (
    <>
      <circle cx="16" cy="16" r="12.5" {...shared} />
      <path d="M16 8.5V16l6 3.4" {...shared} />
    </>
  );
}

function SupportGlyph() {
  return (
    <>
      <path d="M6 17v-2a10 10 0 0 1 20 0v2" {...shared} />
      <rect x="3.5" y="16" width="6" height="8" rx="2.5" {...shared} />
      <rect x="22.5" y="16" width="6" height="8" rx="2.5" {...shared} />
      <path d="M26 24v1a4 4 0 0 1-4 4h-4" {...shared} />
    </>
  );
}

const GLYPHS = {
  fleet: FleetGlyph,
  price: PriceGlyph,
  shield: ShieldGlyph,
  clock: ClockGlyph,
  support: SupportGlyph,
};

export function BenefitIcon({ kind, className = "" }) {
  const Glyph = GLYPHS[kind] || FleetGlyph;
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true">
      <Glyph />
    </svg>
  );
}
