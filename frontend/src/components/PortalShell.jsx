import { NavLink, Outlet, Link, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext.jsx";
import HeartMark from "./HeartMark";
import { LogOut, Activity, Hospital } from "lucide-react";

export default function PortalShell({ config }) {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const accentText = config.accent === "crimson" ? "text-crimson" : "text-navy";
  const activeBg = config.accent === "crimson" ? "bg-crimson" : "bg-navy-light";

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <div className="min-h-screen flex bg-[radial-gradient(circle_at_top,_rgba(200,16,46,0.08),_transparent_50%),_linear-gradient(180deg,_#f8fafc_0%,_#f1f5f9_100%)]">
      <aside className="w-72 shrink-0 bg-navy text-white flex flex-col shadow-[0_30px_80px_-60px_rgba(15,31,61,0.4)]">
        <Link to="/" className="flex items-center gap-3 px-6 h-24 border-b border-white/10">
          <HeartMark size={34} />
          <div className="leading-tight">
            <div className="font-display text-base text-white">HeartStone</div>
            <div className="text-[10px] tracking-widest2 uppercase text-white/50">Hospital Suite</div>
          </div>
        </Link>

        <div className="px-6 py-6 border-b border-white/10">
          <div className="text-[11px] tracking-widest2 uppercase text-white/40">{config.label} portal</div>
          <div className="text-sm text-white/80 mt-2">{config.tagline}</div>
          <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-2 text-xs uppercase tracking-widest text-white/80">
            <Activity className="w-3.5 h-3.5" />
            Live workflow
          </div>
        </div>

        <nav className="flex-1 px-4 py-4 space-y-2 overflow-y-auto">
          {config.sections.map((s) => (
            <NavLink
              key={s.path}
              to={`/${config.role}/${s.path}`}
              className={({ isActive }) =>
                `flex items-center justify-between rounded-2xl px-4 py-3 text-sm transition ${
                  isActive ? `${activeBg} text-white font-semibold shadow-[0_10px_30px_-20px_rgba(200,16,46,0.45)]` : "text-white/70 hover:bg-white/10 hover:text-white"
                }`
              }
            >
              <span>{s.label}</span>
              {s.roleOnly && (
                <span className="text-[9px] tracking-wide uppercase bg-white/10 rounded-full px-2 py-0.5">
                  {s.roleOnly}
                </span>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="px-6 py-5 border-t border-white/10 space-y-3">
          <div className="rounded-2xl bg-white/5 p-4 text-sm text-white/80">
            <div className="flex items-center gap-2">
              <Hospital className="w-4 h-4" />
              <span>Hospital-ready interface</span>
            </div>
            <p className="mt-3 text-xs text-white/60">Designed for fast patient flow, minimal clicks, and team coordination.</p>
          </div>

          <button
            onClick={handleLogout}
            className="w-full text-xs text-white/70 hover:text-white transition-colors flex items-center gap-2 justify-center py-3 rounded-2xl bg-white/5 hover:bg-white/10"
          >
            <LogOut className="w-4 h-4" />
            Logout
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-24 bg-white/95 border-b border-mist flex items-center justify-between px-8 shadow-sm">
          <div>
            <div className={`eyebrow ${accentText}`}>{config.label} workspace</div>
            <div className="font-display text-lg text-ink">Welcome, {user?.name || "Healthcare professional"}</div>
          </div>
          <div className="inline-flex items-center gap-3 rounded-full bg-mist px-4 py-2 text-sm text-ink shadow-sm">
            <span className={`h-2.5 w-2.5 rounded-full ${config.accent === "crimson" ? "bg-crimson" : "bg-navy"}`} />
            Live hospital systems
          </div>
        </header>

        <main className="flex-1 p-8 md:p-12 overflow-y-auto">
          <Outlet context={config} />
        </main>
      </div>
    </div>
  );
}
