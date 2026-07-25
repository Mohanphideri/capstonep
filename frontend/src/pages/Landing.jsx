import { Link } from "react-router-dom";
import Navbar from "../components/Navbar";
import PulseDivider from "../components/PulseDivider";
import HeartMark from "../components/HeartMark";

const portalCards = [
  { key: "patient", label: "Patient", desc: "Book visits, join the queue, and receive treatment updates." },
  { key: "doctor", label: "Doctor", desc: "View appointments, triage patients, and manage rounds." },
  { key: "staff", label: "Nurse · Reception · Accounts", desc: "Handle check-ins, billing, and ward operations." },
  { key: "pharmacist", label: "Pharmacist", desc: "Validate prescriptions and track inventory in real time." },
  { key: "admin", label: "Hospital Admin", desc: "Oversee departments, staff, and patient workflows." },
];

const steps = [
  { n: "01", label: "Patient intake", desc: "Capture patient details and route them to the appropriate department quickly." },
  { n: "02", label: "Live triage", desc: "Assign urgency and monitor token progress from reception to consultation." },
  { n: "03", label: "Doctor review", desc: "Doctors manage visits, notes, and follow-up options from one dashboard." },
  { n: "04", label: "Pharmacy fulfillment", desc: "Prescriptions are checked, prepared, and released with stock visibility." },
];

export default function Landing() {
  return (
    <div className="bg-[radial-gradient(circle_at_top_left,_rgba(200,16,46,0.12),_transparent_24%),_radial-gradient(circle_at_bottom_right,_rgba(15,31,61,0.06),_transparent_22%)]">
      <Navbar />

      <section className="max-w-7xl mx-auto px-6 pt-16 md:pt-24 pb-16">
        <div className="grid lg:grid-cols-[1.3fr_0.95fr] gap-14 items-center">
          <div className="space-y-8 animate-fadeUp">
            <div className="eyebrow text-crimson mb-2">Hospital operations made easy</div>
            <h1 className="font-display text-4xl md:text-6xl text-ink tracking-tight">
              A care-first hospital system that keeps workflows moving.
            </h1>
            <p className="max-w-2xl text-slate-soft text-lg leading-relaxed">
              HeartStone connects reception, departments, clinicians, and pharmacy with one secure workflow so patients wait less and care teams stay aligned.
            </p>

            <div className="grid gap-4 sm:grid-cols-2">
              {[
                "Live patient queue",
                "Doctor schedule view",
                "Pharmacy stock sync",
                "Department handoffs",
              ].map((item) => (
                <div key={item} className="rounded-[1.75rem] border border-mist bg-white p-5 shadow-sm">
                  <div className="text-sm font-semibold text-navy">{item}</div>
                </div>
              ))}
            </div>

            <div className="flex flex-wrap gap-4 items-center">
              <Link
                to="/login"
                className="inline-flex items-center rounded-full bg-crimson hover:bg-crimson-dark text-white text-sm font-semibold px-7 py-3.5 transition"
              >
                Access your portal
              </Link>
              <a href="#how-it-works" className="inline-flex items-center text-sm font-semibold text-navy hover:text-crimson transition">
                Explore workflow →
              </a>
            </div>
          </div>

          <div className="relative rounded-[2rem] border border-white/80 bg-white/95 p-8 shadow-[0_40px_120px_-60px_rgba(15,31,61,0.3)] animate-fadeUp">
            <div className="absolute -left-10 top-8 h-24 w-24 rounded-full bg-crimson/10 blur-2xl" />
            <div className="space-y-6">
              <div className="rounded-[1.75rem] border border-mist bg-navy p-6 text-white">
                <div className="text-xs uppercase tracking-widest2 text-slate-300">Hospital command center</div>
                <div className="mt-4 text-3xl font-semibold">Queue status</div>
                <div className="mt-5 grid grid-cols-2 gap-3 text-sm text-slate-200">
                  <div className="rounded-3xl bg-white/10 p-4">20 active tokens</div>
                  <div className="rounded-3xl bg-white/10 p-4">12 departments</div>
                </div>
              </div>
              <div className="rounded-[1.75rem] bg-slate-50 p-6">
                <div className="flex items-center gap-3 text-sm font-semibold text-ink">
                  <span className="inline-flex h-3.5 w-3.5 rounded-full bg-crimson" />
                  Trusted by clinical teams
                </div>
                <p className="mt-3 text-sm leading-relaxed text-slate-600">
                  Patients, doctors, pharmacy, and administration stay aligned on one shared operational view.
                </p>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-[1.75rem] bg-mist p-4 text-sm text-ink">
                  <div className="text-2xl font-semibold">94%</div>
                  <div className="mt-1 text-slate-600">Patient satisfaction</div>
                </div>
                <div className="rounded-[1.75rem] bg-mist p-4 text-sm text-ink">
                  <div className="text-2xl font-semibold">60%</div>
                  <div className="mt-1 text-slate-600">Faster triage</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
      <PulseDivider className="mb-16" />

      {/* Portals */}
      <section id="portals" className="max-w-7xl mx-auto px-6 py-16 md:py-24">
        <div className="eyebrow text-navy mb-3">Portals</div>
        <h2 className="font-display text-3xl md:text-4xl text-ink max-w-2xl">
          The right interface for patients, clinical staff, and administrators.
        </h2>
        <div className="mt-10 grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {portalCards.map((p) => (
            <Link
              key={p.key}
              to="/login"
              className="group rounded-[2rem] border border-mist bg-white p-7 shadow-sm transition hover:-translate-y-1 hover:border-crimson/30"
            >
              <div className="font-display text-xl text-ink group-hover:text-crimson transition-colors">{p.label}</div>
              <p className="mt-3 text-sm text-slate-soft leading-relaxed">{p.desc}</p>
              <div className="mt-6 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-navy/60 group-hover:text-crimson">
                Enter portal →
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="bg-navy text-white">
        <div className="max-w-7xl mx-auto px-6 py-16 md:py-24">
          <div className="eyebrow text-white/50 mb-3">Hospital workflow</div>
          <h2 className="font-display text-3xl md:text-4xl max-w-2xl">A patient-first journey for every department.</h2>

          <div className="mt-12 grid md:grid-cols-4 gap-8">
            {steps.map((s) => (
              <div key={s.n} className="rounded-[2rem] border border-white/10 bg-white/5 p-8">
                <div className="font-display text-4xl text-crimson-light/80">{s.n}</div>
                <h3 className="mt-4 text-xl font-semibold text-white">{s.label}</h3>
                <p className="mt-3 text-sm text-white/70 leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Departments teaser */}
      <section id="departments" className="max-w-7xl mx-auto px-6 py-16 md:py-24">
        <div className="grid gap-10 lg:grid-cols-[1fr_0.95fr] items-center">
          <div>
            <div className="eyebrow text-crimson mb-3">Departments</div>
            <h2 className="font-display text-3xl md:text-4xl text-ink max-w-lg">
              Designed to support every hospital unit.
            </h2>
            <p className="mt-4 text-slate-soft leading-relaxed max-w-xl">
              Configure department queues and assign doctors while keeping admissions, diagnostics, and pharmacy aligned on one patient journey.
            </p>
          </div>
          <div className="grid gap-5 sm:grid-cols-2">
            {[
              { title: "Emergency", desc: "Fast-track urgent cases with priority queueing." },
              { title: "Outpatient", desc: "Manage scheduled appointments and walk-ins." },
              { title: "Pharmacy", desc: "Match prescriptions with in-stock medicines instantly." },
              { title: "Administration", desc: "Monitor staff, leave, and department assignments." },
            ].map((item) => (
              <div key={item.title} className="rounded-[1.75rem] border border-mist bg-white p-6 shadow-sm">
                <div className="text-sm font-semibold text-crimson">{item.title}</div>
                <p className="mt-3 text-sm text-slate-soft leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer className="border-t border-mist bg-white">
        <div className="max-w-7xl mx-auto px-6 py-10 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <HeartMark size={26} />
            <span className="text-sm text-slate-soft">© {new Date().getFullYear()} HeartStone Hospital</span>
          </div>
          <div className="text-xs uppercase tracking-widest2 text-slate-soft/70">
            Hospital-grade queue & appointment management
          </div>
        </div>
      </footer>
    </div>
  );
}
