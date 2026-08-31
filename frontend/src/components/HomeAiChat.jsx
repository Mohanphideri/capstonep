import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch } from "../api.js";
import { useAuth } from "../AuthContext.jsx";
import "./HomeAiChat.css";

const GUEST_LIMIT = 2;
const MAX_PREVIEW_LINES = 10;
const GREETING = {
  role: "assistant",
  text: "Hi! I'm the Kuwarji AI trip assistant. Tell me where you'd like to go and I'll help you plan it — try \"3 days to Manali for 6 people, family trip.\"",
};
const STORAGE_CHAT = "kw_guest_chat";
const STORAGE_PENDING = "kw_pending_chat";

function splitLines(text) {
  if (!text) return [];
  if (text.includes("\n")) return text.split("\n").filter((l) => l.trim().length);
  const sentences = text.match(/[^.!?]+[.!?]+(\s+|$)|[^.!?]+$/g);
  return (sentences || [text]).map((s) => s.trim()).filter(Boolean);
}

function truncateReply(text) {
  const lines = splitLines(text);
  if (lines.length <= MAX_PREVIEW_LINES) return { preview: text, truncated: false };
  const joiner = text.includes("\n") ? "\n" : " ";
  return { preview: lines.slice(0, MAX_PREVIEW_LINES).join(joiner), truncated: true };
}

function loadGuestChat() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_CHAT) || "null");
    return Array.isArray(saved) && saved.length ? saved : [GREETING];
  } catch {
    return [GREETING];
  }
}

export default function HomeAiChat() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState(loadGuestChat);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [expanded, setExpanded] = useState({});
  const listRef = useRef(null);

  const guestSentCount = useMemo(() => messages.filter((m) => m.role === "user").length, [messages]);
  const limitReached = !user && guestSentCount >= GUEST_LIMIT;

  useEffect(() => {
    if (!user) {
      try { localStorage.setItem(STORAGE_CHAT, JSON.stringify(messages)); } catch { /* ignore */ }
    }
  }, [messages, user]);

  useEffect(() => {
    if (!user) return;
    try {
      const pending = JSON.parse(localStorage.getItem(STORAGE_PENDING) || "null");
      if (Array.isArray(pending) && pending.length) {
        setMessages(pending);
        setOpen(true);
      }
      localStorage.removeItem(STORAGE_PENDING);
      localStorage.removeItem(STORAGE_CHAT);
    } catch { /* ignore */ }
    // Runs once per login — `user` flips from null to a value exactly then.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [Boolean(user)]);

  useEffect(() => {
    if (open && listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [messages, open, sending]);

  useEffect(() => {
    function handleOpenRequest() { setOpen(true); }
    window.addEventListener("kw:open-ai-chat", handleOpenRequest);
    return () => window.removeEventListener("kw:open-ai-chat", handleOpenRequest);
  }, []);

  function goToLogin() {
    try { localStorage.setItem(STORAGE_PENDING, JSON.stringify(messages)); } catch { /* ignore */ }
    setOpen(false);
    navigate("/login?next=/dashboard");
  }

  function viewMore(index) {
    if (!user) { goToLogin(); return; }
    setExpanded((e) => ({ ...e, [index]: true }));
  }

  async function send() {
    const text = input.trim();
    if (!text || sending) return;
    if (limitReached) { goToLogin(); return; }

    const next = [...messages, { role: "user", text }];
    setMessages(next);
    setInput("");
    setSending(true);
    try {
      const result = await apiFetch("/api/trip-planner/chat", { method: "POST", body: JSON.stringify({ messages: next }) });
      const reply = result.ok && result.data?.success && result.data.reply
        ? result.data.reply
        : "Sorry, I couldn't reach the planning assistant just now — please try again in a moment.";
      setMessages((m) => [...m, { role: "assistant", text: reply }]);
    } catch {
      setMessages((m) => [...m, { role: "assistant", text: "Sorry, I couldn't reach the planning assistant just now." }]);
    } finally {
      setSending(false);
    }
  }

  const remaining = Math.max(0, GUEST_LIMIT - guestSentCount);

  return (
    <>
      <button type="button" className="home-ai-fab" onClick={() => setOpen((o) => !o)}>
        <span className="home-ai-fab-ico">✦</span>{open ? "Close" : "Ask AI"}
      </button>

      {open && (
        <div className="home-ai-panel" role="dialog" aria-label="Kuwarji AI trip assistant">
          <div className="home-ai-panel-head">
            <span className="home-ai-orb">✦</span>
            <div>
              <strong>Kuwarji AI Trip Assistant</strong>
              <small>{user ? "Full access" : `${remaining} free message${remaining === 1 ? "" : "s"} left`}</small>
            </div>
            <button type="button" className="home-ai-close" onClick={() => setOpen(false)} aria-label="Close">×</button>
          </div>

          <div className="home-ai-panel-list" ref={listRef}>
            {messages.map((m, i) => {
              if (m.role !== "assistant") return <div className="home-ai-msg user" key={i}>{m.text}</div>;
              const { preview, truncated } = !user ? truncateReply(m.text) : { preview: m.text, truncated: false };
              const showFull = user || expanded[i];
              return (
                <div className="home-ai-msg assistant" key={i}>
                  <span className="home-ai-msg-avatar">✦</span>
                  <div>
                    <p>{showFull ? m.text : preview}</p>
                    {truncated && !showFull && (
                      <button type="button" className="home-ai-viewmore" onClick={() => viewMore(i)}>View more — log in →</button>
                    )}
                  </div>
                </div>
              );
            })}
            {sending && (
              <div className="home-ai-msg assistant">
                <span className="home-ai-msg-avatar">✦</span>
                <div className="home-ai-thinking"><i /><i /><i /></div>
              </div>
            )}
          </div>

          {limitReached ? (
            <div className="home-ai-limit">
              <p>You've used your {GUEST_LIMIT} free messages. Log in to keep chatting and build a full trip plan.</p>
              <button type="button" className="btn btn-primary" onClick={goToLogin}>Log in to continue →</button>
            </div>
          ) : (
            <div className="home-ai-input-row">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); send(); } }}
                placeholder="e.g. 3 days to Manali for 6 people"
              />
              <button type="button" onClick={send} disabled={sending || !input.trim()} aria-label="Send">➤</button>
            </div>
          )}
        </div>
      )}
    </>
  );
}
