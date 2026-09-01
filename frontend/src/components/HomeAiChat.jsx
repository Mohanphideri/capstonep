import { useEffect, useRef, useState } from "react";
import { apiFetch } from "../api.js";
import { Link } from "react-router-dom";
import "./HomeAiChat.css";

const GREETING = {
  role: "assistant",
  text: "Hi! 👋 I’m the Kuwarji Travel Assistant. I can help with vehicles, tours, bookings, enquiries, pricing guidance, cancellations and more. What are you planning?",
};
const STORAGE_CHAT = "kw_support_chat";
const QUICK_ACTIONS = [
  { label: "🚐 Vehicles", text: "Show me available vehicles" },
  { label: "🧳 Tour packages", text: "Show me tour packages" },
  { label: "📅 Plan my trip", text: "Help me plan my trip" },
  { label: "📋 My bookings", text: "Show my bookings" },
];

const ROUTE_LABELS = {
  "/": "Home", "/vehicles": "Vehicles", "/tour-packages": "Tour Packages",
  "/trip-planner": "Trip Planner", "/about": "About Us", "/faq": "FAQ",
  "/why-us": "Why Kuwarji", "/fleet-gallery": "Fleet Gallery", "/location": "Location",
  "/privacy-policy": "Privacy Policy", "/cookie-policy": "Cookie Policy", "/terms": "Terms & Conditions",
  "/cancellation-policy": "Cancellation Policy", "/refund-policy": "Refund Policy", "/login": "Login",
  "/dashboard": "Customer Dashboard", "/dashboard/vehicles": "My Vehicles",
  "/dashboard/tour-packages": "Tour Packages", "/dashboard/bookings": "My Bookings",
  "/dashboard/enquiries": "My Enquiries", "/dashboard/invoices": "My Invoices",
  "/dashboard/reviews": "My Reviews", "/dashboard/profile": "My Profile",
  "/dashboard/settings": "Settings", "/dashboard/trip-planner": "Trip Planner",
};

function routeLabel(path) {
  if (ROUTE_LABELS[path]) return ROUTE_LABELS[path];
  if (/^\/vehicles\//.test(path)) return "Vehicle Details";
  if (/^\/tour-packages\//.test(path)) return "Tour Package Details";
  if (/^\/dashboard\/bookings\//.test(path)) return "Booking Details";
  if (/^\/dashboard\/vehicles\//.test(path)) return "Vehicle Details";
  if (/^\/dashboard\/tour-packages\//.test(path)) return "Tour Package Details";
  return "Open page";
}

function renderAssistantText(text) {
  const source = String(text ?? "");
  const pattern = /(\[[^\]]+\]\(\/[^)]+\)|\/(?:dashboard(?:\/[^\s.,!?;:]*)?|vehicles(?:\/[^\s.,!?;:]*)?|tour-packages(?:\/[^\s.,!?;:]*)?|trip-planner|about|faq|why-us|fleet-gallery|location|privacy-policy|cookie-policy|terms|cancellation-policy|refund-policy|login)(?=[\s.,!?;:]|$))/g;
  return source.split(pattern).map((part, index) => {
    if (!part) return null;
    const markdown = part.match(/^\[([^\]]+)\]\((\/[^)]+)\)$/);
    if (markdown) return <Link key={index} className="home-ai-route-link" to={markdown[2]}>{markdown[1]}</Link>;
    if (part.startsWith("/")) return <Link key={index} className="home-ai-route-link" to={part}>{routeLabel(part)}</Link>;
    return <span key={index}>{part}</span>;
  });
}

function loadChat() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_CHAT) || "null");
    return Array.isArray(saved) && saved.length ? saved : [GREETING];
  } catch { return [GREETING]; }
}

export default function HomeAiChat({ portal = false }) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState(loadChat);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [assistLabel, setAssistLabel] = useState("");
  const [assistIndex, setAssistIndex] = useState(0);
  const listRef = useRef(null);
  const inputRef = useRef(null);
  const assistPhrases = ["Need Help?", "Plan a Trip?", "Need a Vehicle?"];

  useEffect(() => {
    try { localStorage.setItem(STORAGE_CHAT, JSON.stringify(messages.slice(-30))); } catch { /* ignore */ }
  }, [messages]);

  useEffect(() => {
    if (open && listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
    if (open) setTimeout(() => inputRef.current?.focus(), 80);
  }, [messages, open, sending]);

  useEffect(() => {
    let cancelled = false;
    let timer;
    const phrase = assistPhrases[assistIndex];
    const typePhrase = (pos = 0) => {
      if (cancelled) return;
      setAssistLabel(phrase.slice(0, pos));
      if (pos < phrase.length) timer = setTimeout(() => typePhrase(pos + 1), 55);
      else timer = setTimeout(() => setAssistIndex((assistIndex + 1) % assistPhrases.length), 2200);
    };
    typePhrase();
    return () => { cancelled = true; clearTimeout(timer); };
  }, [assistIndex]);

  useEffect(() => {
    const handleOpenRequest = () => setOpen(true);
    window.addEventListener("kw:open-ai-chat", handleOpenRequest);
    return () => window.removeEventListener("kw:open-ai-chat", handleOpenRequest);
  }, []);

  function clearChat() {
    setMessages([GREETING]);
    try { localStorage.removeItem(STORAGE_CHAT); } catch { /* ignore */ }
  }

  async function send(preset) {
    const text = String(preset || input).trim();
    if (!text || sending) return;
    const next = [...messages, { role: "user", text }];
    setMessages(next);
    setInput("");
    setSending(true);
    try {
      const result = await apiFetch("/api/chatbot/chat", {
        method: "POST",
        body: JSON.stringify({ messages: next }),
      });
      const reply = result.ok && result.data?.success && result.data.reply
        ? result.data.reply
        : "Sorry, our support assistant is temporarily unavailable. Please try again in a moment.";
      setMessages((m) => [...m, { role: "assistant", text: reply }]);
    } catch {
      setMessages((m) => [...m, { role: "assistant", text: "Sorry, our support assistant is temporarily unavailable. Please try again in a moment." }]);
    } finally { setSending(false); }
  }

  return (
    <>
      <div className={`home-ai-launcher${portal ? " portal-chat" : ""}${open ? " is-open" : ""}`}>
        {!open && (
          <button type="button" className="home-ai-speech" onClick={() => setOpen(true)} aria-label={assistLabel}>
            <span className="home-ai-speech-dot" aria-hidden="true" />
            <span>{assistLabel}</span>
          </button>
        )}
        <button type="button" className="home-ai-fab" onClick={() => setOpen((o) => !o)}
          aria-label={open ? "Close support assistant" : "Open support assistant"}>
          <span className="home-ai-fab-ico" aria-hidden="true">
            <svg viewBox="0 0 48 48" fill="none">
              <rect x="9" y="12" width="30" height="25" rx="8" fill="currentColor" opacity=".16"/>
              <rect x="9" y="12" width="30" height="25" rx="8" stroke="currentColor" strokeWidth="2.4"/>
              <path d="M24 7v5M17 25h.01M31 25h.01" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round"/>
              <path d="M17 31c2.1 1.7 4.4 2.5 7 2.5s4.9-.8 7-2.5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"/>
              <path d="M5 24h4M39 24h4" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </span>
          {open && <span className="home-ai-fab-text">Close</span>}
        </button>
      </div>

      {open && (
        <div className={`home-ai-panel${portal ? " portal-chat" : ""}`} role="dialog" aria-label="Kuwarji Support Assistant">
          <div className="home-ai-panel-head">
            <span className="home-ai-orb" aria-hidden="true">
              <svg viewBox="0 0 48 48" fill="none">
                <rect x="9" y="12" width="30" height="25" rx="8" fill="currentColor" opacity=".16"/>
                <rect x="9" y="12" width="30" height="25" rx="8" stroke="currentColor" strokeWidth="2.4"/>
                <path d="M24 7v5M17 25h.01M31 25h.01" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round"/>
                <path d="M17 31c2.1 1.7 4.4 2.5 7 2.5s4.9-.8 7-2.5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"/>
              </svg>
            </span>
            <div className="home-ai-head-copy">
              <strong>Kuwarji Travel Assistant</strong>
              <small><span className="home-ai-online-dot" /> Quick customer help</small>
            </div>
            <button type="button" className="home-ai-clear" onClick={clearChat} title="Start a new chat">↻</button>
            <button type="button" className="home-ai-close" onClick={() => setOpen(false)} aria-label="Close">×</button>
          </div>

          <div className="home-ai-panel-list" ref={listRef}>
            {messages.length === 1 && !sending && (
              <div className="home-ai-welcome">
                <div className="home-ai-welcome-icon">✦</div>
                <strong>How can I help today?</strong>
                <span>Try one of these, or type your own question.</span>
                <div className="home-ai-quick-grid">
                  {QUICK_ACTIONS.map((action) => (
                    <button key={action.text} type="button" onClick={() => send(action.text)} disabled={sending}>
                      {action.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {messages.map((m, i) => (
              <div className={`home-ai-msg ${m.role === "user" ? "user" : "assistant"}`} key={`${i}-${m.text}`}>
                {m.role !== "user" && <span className="home-ai-msg-avatar">✦</span>}
                <div><p>{renderAssistantText(m.text)}</p></div>
              </div>
            ))}
            {sending && (
              <div className="home-ai-msg assistant">
                <span className="home-ai-msg-avatar home-ai-thinking-robot" aria-hidden="true">
                  <svg viewBox="0 0 48 48" fill="none"><rect x="9" y="12" width="30" height="25" rx="8"/><path d="M24 7v5M17 25h.01M31 25h.01"/><path d="M17 31c2 1.5 4.3 2.3 7 2.3s5-.8 7-2.3"/></svg>
                </span>
                <div className="home-ai-thinking"><span>Checking</span><i/><i/><i/></div>
              </div>
            )}
          </div>

          <div className="home-ai-input-row">
            <input ref={inputRef} value={input} onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); send(); } }}
              placeholder="Ask: vehicle, booking, tour, price…" disabled={sending}
              aria-label="Ask Kuwarji Travel Assistant"/>
            <button type="button" onClick={() => send()} disabled={sending || !input.trim()} aria-label="Send message">➤</button>
          </div>
          <div className="home-ai-footer">Kuwarji Travels • Customer support assistant</div>
        </div>
      )}
    </>
  );
}
