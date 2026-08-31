import { useEffect, useRef, useState } from "react";
import ConsumerLayout from "../components/ConsumerLayout.jsx";
import { apiFetch } from "../api.js";
import "./TripPlanner.css";

const GREETING = {
  role: "assistant",
  text: "Hi! I'm the Kuwarji Trip Planner. Tell me where you'd like to go, for how many days and how many travellers, and I'll help you plan it.",
};
const STORAGE_KEY = "kw_portal_chat";
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

export default function TripPlanner() {
  const [messages, setMessages] = useState(loadChat);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const listRef = useRef(null);

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(messages)); } catch { /* ignore */ }
  }, [messages]);

  useEffect(() => {
    if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [messages, sending]);

  async function send(text) {
    const value = (text ?? input).trim();
    if (!value || sending) return;

    const next = [...messages, { role: "user", text: value }];
    setMessages(next);
    setInput("");
    setSending(true);
    try {
      const result = await apiFetch("/api/trip-planner/chat", { method: "POST", body: JSON.stringify({ messages: next }) });
      const reply = result.ok && result.data?.success && result.data.reply
        ? result.data.reply
        : result.status === 429
          ? "You've sent a lot of messages in a short time — please wait a few minutes and try again."
          : "Sorry, I couldn't reach the planning assistant just now — please try again in a moment.";
      setMessages((m) => [...m, { role: "assistant", text: reply }]);
    } catch {
      setMessages((m) => [...m, { role: "assistant", text: "Sorry, I couldn't reach the planning assistant just now." }]);
    } finally {
      setSending(false);
    }
  }

  function resetChat() {
    setMessages([GREETING]);
    try { localStorage.removeItem(STORAGE_KEY); } catch { /* ignore */ }
  }

  return (
    <ConsumerLayout title="Trip Planner" lead="Tell us about your trip and we'll help you plan it — routes, pace and the right vehicle for the journey.">
      <div className="trip-planner-panel">
        <div className="trip-planner-head">
          <div>
            <strong>Kuwarji Trip Planner</strong>
            <small>Tell us where you're headed and we'll help you plan the trip</small>
          </div>
          <button type="button" className="trip-planner-reset" onClick={resetChat}>New conversation</button>
        </div>

        <div className="trip-planner-list" ref={listRef}>
          {messages.map((m, i) => (
            <div className={`trip-planner-msg ${m.role}`} key={i}>
              {m.role === "assistant" && <span className="trip-planner-avatar">🧭</span>}
              <p>{m.text}</p>
            </div>
          ))}
          {sending && (
            <div className="trip-planner-msg assistant">
              <span className="trip-planner-avatar">🧭</span>
              <div className="trip-planner-thinking"><i /><i /><i /></div>
            </div>
          )}
        </div>

        {messages.length <= 1 && (
          <div className="trip-planner-suggestions">
            {SUGGESTIONS.map((s) => (
              <button type="button" key={s} onClick={() => send(s)} disabled={sending}>{s}</button>
            ))}
          </div>
        )}

        <div className="trip-planner-input-row">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); send(); } }}
            placeholder="e.g. 3 days to Manali for 6 people"
            disabled={sending}
          />
          <button type="button" onClick={() => send()} disabled={sending || !input.trim()} aria-label="Send">➤</button>
        </div>
      </div>
    </ConsumerLayout>
  );
}
