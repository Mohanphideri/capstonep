export default function EmptyState({ title, description, accent = "crimson" }) {
  const accentBar = accent === "crimson" ? "bg-crimson" : "bg-navy";
  return (
    <div className="rounded-[2rem] border border-mist bg-white p-10 md:p-14 text-center max-w-xl mx-auto animate-fadeUp shadow-[0_30px_80px_-60px_rgba(15,31,61,0.25)]">
      <div className={`h-1.5 w-16 ${accentBar} rounded-full mx-auto mb-6`} />
      <h2 className="font-display text-2xl text-ink mb-3">{title}</h2>
      <p className="text-slate-soft text-sm leading-relaxed">{description}</p>
      <div className="mt-7 rounded-2xl bg-mist p-4 text-left text-sm text-slate-600">
        <strong className="block text-ink mb-2">Hospital dashboard status</strong>
        This section will show active workflows, queue status, and patient assignments once the backend is connected.
      </div>
    </div>
  );
}
