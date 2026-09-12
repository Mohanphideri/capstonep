import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../AuthContext.jsx";
import { apiFetch } from "../api.js";
import "./WebsiteTour.css";

const STEPS = [
  { route: "/dashboard", target: '[data-tour-target="dashboard"]', title: "Your dashboard", text: "Start here to see your trips, enquiries, reviews and the most important account updates." },
  { route: "/dashboard/vehicles", target: '[data-tour-target="vehicles"]', title: "Search vehicles", text: "Browse the live fleet, compare vehicle details and choose what fits your journey." },
  { route: "/dashboard/trip-planner", target: '[data-tour-target="trip-planner"]', title: "Plan a journey", text: "Use Trip Planner when you already know your route, dates and passenger requirements." },
  { route: "/dashboard/bookings", target: '[data-tour-target="bookings"]', title: "Manage bookings", text: "Your confirmed, completed and cancelled bookings stay together here." },
  { route: "/dashboard/profile", target: '[data-tour-target="profile"]', title: "Your profile", text: "Keep your name and contact details up to date. Support is also available from the portal." },
];

function getRect(selector) {
  const el = selector ? document.querySelector(selector) : null;
  if (!el) return null;
  const r = el.getBoundingClientRect();
  return { top: r.top, left: r.left, width: r.width, height: r.height };
}

export default function WebsiteTour() {
  const { user, refresh } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [active, setActive] = useState(false);
  const [step, setStep] = useState(0);
  const [rect, setRect] = useState(null);
  const [starting, setStarting] = useState(true);

  const current = STEPS[step];
  const isLast = step === STEPS.length - 1;

  useEffect(() => {
    if (!user || user.welcomeTourCompleted) { setActive(false); setStarting(false); return; }
    setStarting(false);
    setActive(true);
  }, [user]);

  useEffect(() => {
    if (!active || !current) return;
    if (location.pathname !== current.route) {
      navigate(current.route);
      return;
    }
    let timer;
    const update = () => {
      const next = getRect(current.target);
      setRect(next);
      if (!next) {
        window.scrollTo({ top: 0, behavior: "smooth" });
        timer = window.setTimeout(update, 220);
      }
    };
    update();
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => { window.removeEventListener("resize", update); window.removeEventListener("scroll", update, true); if (timer) window.clearTimeout(timer); };
  }, [active, current, location.pathname, navigate]);

  const finish = async () => {
    setActive(false);
    await apiFetch("/api/auth/welcome-tour/complete", { method: "POST" });
    await refresh();
  };

  const next = () => {
    if (isLast) { finish(); return; }
    setRect(null);
    setStep((value) => value + 1);
  };

  const tooltipStyle = rect ? { top: Math.min(window.innerHeight - 230, Math.max(16, rect.top + rect.height + 14)), left: Math.min(window.innerWidth - 350, Math.max(16, rect.left)) } : undefined;

  if (starting || !active || !user) return null;
  return <div className="website-tour" role="dialog" aria-modal="true" aria-labelledby="website-tour-title">
    <div className="website-tour-shade" />
    {rect && <div className="website-tour-spotlight" style={rect} aria-hidden="true" />}
    <div className={`website-tour-card${rect ? " website-tour-card-positioned" : ""}`} style={tooltipStyle}>
      <div className="website-tour-progress">Welcome tour · {step + 1} of {STEPS.length}</div>
      <h2 id="website-tour-title">{current.title}</h2>
      <p>{current.text}</p>
      <div className="website-tour-actions">
        <button type="button" className="website-tour-skip" onClick={finish}>Skip tour</button>
        <button type="button" className="btn btn-primary" onClick={next}>{isLast ? "Finish" : "Next"}</button>
      </div>
    </div>
  </div>;
}
