import { useEffect, useState } from "react";
import { BrandLogo } from "./BrandLogo.jsx";
import "./GlobalLoadingBus.css";

// The bus loader is intentionally reserved for genuinely slow requests.
// Fast requests (< 3s) stay visually quiet so normal navigation never feels blocked.
const SLOW_REQUEST_MS = 3000;

export default function GlobalLoadingBus() {
  const [slowRequests, setSlowRequests] = useState(0);

  useEffect(() => {
    const timers = new Map();

    const start = (event) => {
      const id = event.detail?.requestId;
      if (!id) return;
      const entry = { timer: null, shown: false };
      entry.timer = window.setTimeout(() => {
        const current = timers.get(id);
        if (!current) return;
        current.shown = true;
        setSlowRequests((n) => n + 1);
      }, SLOW_REQUEST_MS);
      timers.set(id, entry);
    };

    const complete = (event) => {
      const id = event.detail?.requestId;
      if (!id) return;
      const entry = timers.get(id);
      if (!entry) return;
      timers.delete(id);
      if (entry.timer) window.clearTimeout(entry.timer);
      if (entry.shown) setSlowRequests((n) => Math.max(0, n - 1));
    };

    window.addEventListener("kt:api-start", start);
    window.addEventListener("kt:api-complete", complete);
    return () => {
      window.removeEventListener("kt:api-start", start);
      window.removeEventListener("kt:api-complete", complete);
      timers.forEach((entry) => entry?.timer && window.clearTimeout(entry.timer));
      timers.clear();
    };
  }, []);

  if (!slowRequests) return null;

  return (
    <div className="kt-global-loader" role="status" aria-live="polite" aria-label="Loading">
      <div className="kt-loader-bus" aria-hidden="true">
        <BrandLogo variant="icon" className="kt-loader-bus-logo" />
      </div>
      <div className="kt-loader-dots" aria-hidden="true"><span /><span /><span /></div>
      <span className="kt-loading-label">Loading</span>
    </div>
  );
}
