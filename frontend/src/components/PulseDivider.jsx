export default function PulseDivider({ className = "" }) {
  return (
    <div className={`w-full overflow-hidden ${className}`} aria-hidden="true">
      <svg
        viewBox="0 0 1200 60"
        preserveAspectRatio="none"
        className="w-full h-[36px] md:h-[48px]"
      >
        <polyline
          points="0,30 260,30 300,30 330,8 355,52 380,30 420,30 460,30 490,14 512,46 534,30 570,30 1200,30"
          fill="none"
          stroke="#C8102E"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray="1000"
          className="animate-pulseLine"
        />
      </svg>
    </div>
  );
}
