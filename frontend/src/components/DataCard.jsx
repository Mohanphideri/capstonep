// Shared presentational building blocks used across Section.jsx so every
// portal (patient, admin, doctor, staff, pharmacist) renders lists and
// records with consistent spacing, alignment, and visual hierarchy.

export function DataCard({ title, subtitle, actions, badge, children, className = "" }) {
  const hasHeader = title || subtitle || actions || badge;
  return (
    <div
      className={`rounded-2xl border border-mist bg-white p-5 sm:p-6 shadow-sm hover:shadow-md hover:border-slate-200 transition-all duration-200 ${className}`}
    >
      {hasHeader && (
        <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
          <div className="min-w-0">
            {title && <div className="text-base font-semibold text-ink truncate">{title}</div>}
            {subtitle && <div className="mt-0.5 text-sm text-slate-soft">{subtitle}</div>}
          </div>
          {(actions || badge) && (
            <div className="flex items-center gap-2 shrink-0">
              {badge}
              {actions}
            </div>
          )}
        </div>
      )}
      {children}
    </div>
  );
}

// Renders a tidy label/value grid — the column count stays fixed and
// responsive so fields always line up instead of wrapping unevenly.
export function DataGrid({ fields }) {
  const visible = fields.filter(Boolean);
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-x-6 gap-y-4">
      {visible.map((f, i) => (
        <div key={i} className="min-w-0">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-soft/80">{f.label}</div>
          <div className="mt-1 text-sm font-medium text-ink truncate">{f.value ?? "—"}</div>
        </div>
      ))}
    </div>
  );
}

const TONES = {
  neutral: "bg-mist text-ink",
  success: "bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-200",
  warning: "bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-200",
  danger: "bg-red-50 text-red-700 ring-1 ring-inset ring-red-200",
  info: "bg-navy/5 text-navy ring-1 ring-inset ring-navy/10",
};

export function StatusBadge({ status, tone = "neutral" }) {
  return (
    <span className={`inline-flex items-center whitespace-nowrap rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-wide ${TONES[tone] || TONES.neutral}`}>
      {status}
    </span>
  );
}

// Maps common status strings across the app to a visual tone.
export function statusTone(status) {
  const s = (status || "").toLowerCase();
  if (["completed", "approved", "available", "answered", "done"].includes(s)) return "success";
  if (["pending", "booked", "waiting", "in-progress", "open"].includes(s)) return "warning";
  if (["cancelled", "rejected", "unavailable", "no-show", "closed"].includes(s)) return "danger";
  return "neutral";
}

export function EmptyRow({ children }) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-200 bg-mist/50 p-10 text-center text-sm text-slate-soft">
      {children}
    </div>
  );
}

export function SectionToolbar({ children }) {
  return <div className="flex flex-wrap items-center justify-between gap-3">{children}</div>;
}
