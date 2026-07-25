export default function HeartMark({ size = 40, className = "" }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      className={className}
      aria-hidden="true"
    >
      <path
        d="M50 30 C 38 12, 12 14, 8 34 C 4 56, 26 70, 50 88"
        fill="none"
        stroke="#C8102E"
        strokeWidth="7"
        strokeLinecap="round"
      />
      <path
        d="M50 30 C 62 12, 88 14, 92 34 C 96 56, 74 70, 50 88"
        fill="none"
        stroke="#0F1F3D"
        strokeWidth="7"
        strokeLinecap="round"
      />
      <rect x="38" y="34" width="24" height="34" rx="3" fill="#C8102E" />
      <rect x="50" y="34" width="12" height="34" rx="3" fill="#0F1F3D" />
      <rect x="27" y="45" width="46" height="12" rx="3" fill="#C8102E" />
      <rect x="50" y="45" width="23" height="12" rx="3" fill="#0F1F3D" />
      <polyline
        points="27,51 40,51 45,40 51,60 56,51 73,51"
        fill="none"
        stroke="#FFFFFF"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
