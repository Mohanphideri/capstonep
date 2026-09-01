import Icon from "../components/Icon.jsx";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "../AuthContext.jsx";
import { apiFetch } from "../api.js";
import { Navbar } from "../components/Navbar.jsx";
import { Footer } from "../components/Footer.jsx";
import ConsumerLayout from "../components/ConsumerLayout.jsx";
import "./TripPlanner.css";

const GUEST_LIMIT = 2;
const GUEST_WINDOW_MS = 5 * 60 * 60 * 1000;
const GREETING = {
  role: "assistant",
  text: "Hi! I'm the Kuwarji Trip Planner. Tell me where you'd like to go, for how many days and how many travellers, and I'll help you plan it.",
};
const STORAGE_KEY = "kw_trip_planner_chat";
const USAGE_KEY = "kw_trip_planner_guest_usage";
const SUGGESTIONS = [
  "3 days to Manali for 6 people, family trip",
  "Weekend trip to Rishikesh for 4 friends",
  "5-day Rajasthan tour for 15 people",
];

function loadChat() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
    return Array.isArray(saved) && saved.length ? saved : [GREETING];
  } catch {
    return [GREETING];
  }
}

function loadGuestUsage() {
  try {
    const saved = JSON.parse(localStorage.getItem(USAGE_KEY) || "null");
    if (!saved || typeof saved !== "object") return { count: 0, resetAt: 0 };
    if (!saved.resetAt || saved.resetAt <= Date.now()) return { count: 0, resetAt: 0 };
    return { count: Math.min(GUEST_LIMIT, Number(saved.count) || 0), resetAt: Number(saved.resetAt) };
  } catch {
    return { count: 0, resetAt: 0 };
  }
}

function formatRemaining(ms) {
  const totalMinutes = Math.max(0, Math.ceil(ms / 60000));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

function PlannerContent() {
  const { user } = useAuth();
  const [messages, setMessages] = useState(loadChat);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [usage, setUsage] = useState(loadGuestUsage);
  const [now, setNow] = useState(Date.now());
  const [error, setError] = useState("");
  const listRef = useRef(null);

  const usageActive = !user && usage.resetAt > now;
  const guestUsed = usageActive ? usage.count : 0;
  const guestRemaining = Math.max(0, GUEST_LIMIT - guestUsed);
  const guestBlocked = !user && guestRemaining === 0;

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(messages)); } catch { /* ignore */ }
  }, [messages]);

  useEffect(() => {
    if (!user && usage.resetAt && usage.resetAt <= Date.now()) {
      setUsage({ count: 0, resetAt: 0 });
      try { localStorage.removeItem(USAGE_KEY); } catch { /* ignore */ }
    }
  }, [user, usage.resetAt, now]);

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [messages, sending]);

  async function send(text) {
    const value = (text ?? input).trim();
    if (!value || sending) return;
    if (!user && guestBlocked) {
      setError("You've used both free messages. Your 2 free messages will reset in " + formatRemaining(usage.resetAt - Date.now()) + ".");
      return;
    }

    setError("");
    const next = [...messages, { role: "user", text: value }];
    setMessages(next);
    setInput("");
    setSending(true);

    // Reserve one guest message locally before the request so the UI cannot
    // accidentally allow a third message while the request is in flight.
    if (!user) {
      const nextUsage = usage.resetAt > Date.now()
        ? { count: usage.count + 1, resetAt: usage.resetAt }
        : { count: 1, resetAt: Date.now() + GUEST_WINDOW_MS };
      setUsage(nextUsage);
      try { localStorage.setItem(USAGE_KEY, JSON.stringify(nextUsage)); } catch { /* ignore */ }
    }

    try {
      const result = await apiFetch("/api/trip-planner/chat", {
        method: "POST",
        body: JSON.stringify({ messages: next }),
      });
      if (result.ok && result.data?.success && result.data.reply) {
        setMessages((m) => [...m, { role: "assistant", text: result.data.reply }]);
      } else if (result.status === 429) {
        // Keep the local count conservative if the backend also enforces the window.
        const retryMs = Number(result.data?.retryAfterMs || GUEST_WINDOW_MS);
        setUsage((u) => ({ ...u, resetAt: Math.max(u.resetAt, Date.now() + retryMs) }));
        setError(result.data?.error || "Your free messages are temporarily used up. Please try again after the reset time.");
        setMessages((m) => m.slice(0, -1));
        if (!user) setInput(value);
      } else {
        setError("Sorry, I couldn't reach the planning assistant just now — please try again in a moment.");
        setMessages((m) => m.slice(0, -1));
        if (!user) setInput(value);
      }
    } catch {
      setError("Sorry, I couldn't reach the planning assistant just now.");
      setMessages((m) => m.slice(0, -1));
      if (!user) setInput(value);
    } finally {
      setSending(false);
    }
  }

  function resetChat() {
    setMessages([GREETING]);
    setError("");
    try { localStorage.removeItem(STORAGE_KEY); } catch { /* ignore */ }
  }

  const panel = (
    <div className="trip-planner-panel">
      <div className="trip-planner-head">
        <div>
          <strong>Kuwarji Trip Planner</strong>
          <small>{user ? "Unlimited planning access for your customer account" : "Try 2 free planning messages — reset every 5 hours"}</small>
        </div>
        <button type="button" className="trip-planner-reset" onClick={resetChat}>New conversation</button>
      </div>

      {!user && (
        <div className="trip-planner-free-banner">
          <span><b>{guestRemaining}</b> free message{guestRemaining === 1 ? "" : "s"} remaining</span>
          {guestBlocked && <small>Resets in {formatRemaining(Math.max(0, usage.resetAt - now))}</small>}
        </div>
      )}

      <div className="trip-planner-list" ref={listRef}>
        {messages.map((m, i) => (
          <div className={`trip-planner-msg ${m.role}`} key={i}>
            {m.role === "assistant" && <span className="trip-planner-avatar"><Icon name="compass" size={20}/></span>}
            <p>{m.text}</p>
          </div>
        ))}
        {sending && (
          <div className="trip-planner-msg assistant">
            <span className="trip-planner-avatar"><Icon name="compass" size={20}/></span>
            <div className="trip-planner-thinking"><i /><i /><i /></div>
          </div>
        )}
      </div>

      {messages.length <= 1 && !guestBlocked && (
        <div className="trip-planner-suggestions">
          {SUGGESTIONS.map((s) => (
            <button type="button" key={s} onClick={() => send(s)} disabled={sending}>{s}</button>
          ))}
        </div>
      )}

      {error && <div className="trip-planner-error" role="alert">{error}</div>}

      {guestBlocked ? (
        <div className="trip-planner-limit">
          <strong>Your 2 free messages are used.</strong>
          <span>They reset automatically in {formatRemaining(Math.max(0, usage.resetAt - now))}.</span>
          <small>Log in to continue using Trip Planner without the guest message limit.</small>
        </div>
      ) : (
        <div className="trip-planner-input-row">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); send(); } }}
            placeholder="e.g. 3 days to Manali for 6 people"
            disabled={sending}
          />
          <button type="button" onClick={() => send()} disabled={sending || !input.trim()} aria-label="Send"><Icon name="send" size={17}/></button>
        </div>
      )}
    </div>
  );

  if (user) {
    return (
      <ConsumerLayout title="Trip Planner" lead="Tell us about your trip and we'll help you plan it — routes, pace and the right vehicle for the journey.">
        {panel}
      </ConsumerLayout>
    );
  }

  return (
    <div className="trip-planner-public">
      <Navbar />
      <main className="trip-planner-public-main">
        <div className="container">
          <div className="trip-planner-public-intro">
            <p className="eyebrow">PLAN YOUR JOURNEY</p>
            <h1>Plan My Trip</h1>
            <p>Tell us your destination, dates, group size and travel style. Get a practical route and trip structure before you make your enquiry.</p>
            <div className="trip-planner-value-row" aria-label="Trip Planner benefits">
              <span>Smart itinerary guidance</span><span>Vehicle-aware planning</span><span>2 free guest messages</span><span>Resets every 5 hours</span>
            </div>
          </div>
          <div className="trip-planner-shell">{panel}</div>
        </div>
      </main>
      <Footer />
    </div>
  );
}

export default function TripPlanner() {
  return <PlannerContent />;
}
