import { useEffect } from "react";
import { useAuth } from "../AuthContext.jsx";
import "./BotpressChat.css";

let loaderPromise;

function loadBotpress() {
  if (window.botpress?.init) return Promise.resolve();
  if (loaderPromise) return loaderPromise;
  loaderPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector('script[data-kt-botpress="v3.3"]');
    if (existing) { existing.addEventListener("load", () => resolve()); existing.addEventListener("error", reject); return; }
    const script = document.createElement("script");
    script.src = "https://cdn.botpress.cloud/webchat/v3.3/inject.js";
    script.async = true;
    script.dataset.ktBotpress = "v3.3";
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Botpress Webchat failed to load."));
    document.head.appendChild(script);
  });
  return loaderPromise;
}

export default function BotpressChat() {
  const { user } = useAuth();
  const botId = import.meta.env.VITE_BOTPRESS_BOT_ID;
  const clientId = import.meta.env.VITE_BOTPRESS_CLIENT_ID;
  const enabled = Boolean(botId && clientId);

  useEffect(() => {
    if (!enabled) return undefined;
    let cancelled = false;
    loadBotpress().then(() => {
      if (cancelled || !window.botpress) return;
      if (!window.__ktBotpressInitialized) {
        window.botpress.init({ botId, clientId, configuration: { variant: "soft", themeMode: "light", fontFamily: "inter" } });
        window.__ktBotpressInitialized = true;
      }
      const updateUser = () => {
        if (!window.botpress?.updateUser) return;
        const nameParts = (user?.name || "Traveller").trim().split(/\s+/);
        window.botpress.updateUser({
          name: user?.name || "Traveller",
          data: { firstName: nameParts[0] || "Traveller", lastName: nameParts.slice(1).join(" "), email: user?.email || "", customerId: user?.id || "" },
        }).catch(() => {});
      };
      if (window.__ktBotpressReady) updateUser();
      else if (window.botpress.on) { window.botpress.on("webchat:initialized", () => { window.__ktBotpressReady = true; updateUser(); }); }
    }).catch(() => {});
    return () => { cancelled = true; };
  }, [enabled, botId, clientId, user?.id, user?.name, user?.email]);

  if (!enabled) return null;
  return <button type="button" className="kt-botpress-launcher" onClick={() => window.botpress?.open?.()} aria-label="Open Kuwarji travel assistant" title="Kuwarji Travel Assistant"><svg viewBox="0 0 48 48" fill="none" aria-hidden="true"><rect x="9" y="12" width="30" height="25" rx="8" fill="currentColor" opacity=".12"/><rect x="9" y="12" width="30" height="25" rx="8" stroke="currentColor" strokeWidth="2.4"/><path d="M24 7v5M17 25h.01M31 25h.01" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round"/><path d="M17 31c2.1 1.7 4.4 2.5 7 2.5s4.9-.8 7-2.5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"/><path d="M5 24h4M39 24h4" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg><span>Travel Assistant</span></button>;
}
