import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { AdminLayout } from "../../components/AdminLayout.jsx";
import { apiFetch } from "../../api.js";
import "./AdminIssues.css";

const STATUSES = ["ALL", "OPEN", "IN_REVIEW", "IN_PROGRESS", "RESOLVED", "CLOSED"];
const label = (v) => String(v || "").replace(/_/g, " ");
const fmt = (d) => d ? new Date(d).toLocaleDateString("en-IN", { day:"2-digit", month:"short", year:"numeric" }) : "—";

export default function AdminIssues() {
  const [status, setStatus] = useState("ALL");
  const [issues, setIssues] = useState([]);
  const [selected, setSelected] = useState(null);
  const [reply, setReply] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function load() {
    setLoading(true); setError("");
    const { ok, data } = await apiFetch(`/api/admin/issues?status=${status}`);
    if (ok && data?.success) setIssues(data.complaints || []);
    else setError(data?.error || "Failed to load issues.");
    setLoading(false);
  }
  useEffect(() => { load(); }, [status]);

  async function openIssue(ticketId) {
    const { ok, data } = await apiFetch(`/api/admin/issues/${ticketId}`);
    if (ok && data?.success) { setSelected(data.complaint); setReply(""); }
    else setError(data?.error || "Failed to load issue.");
  }

  async function updateStatus(nextStatus) {
    if (!selected) return;
    setSaving(true); setError("");
    const { ok, data } = await apiFetch(`/api/admin/issues/${selected.ticketId}/status`, { method:"PATCH", body:JSON.stringify({ status:nextStatus }) });
    setSaving(false);
    if (!ok || !data?.success) { setError(data?.error || "Failed to update issue."); return; }
    setSelected(data.complaint); setIssues((xs)=>xs.map(x=>x.ticketId===selected.ticketId?data.complaint:x));
  }

  async function sendReply(e) {
    e.preventDefault(); if (!selected || !reply.trim()) return;
    setSaving(true); setError("");
    const { ok, data } = await apiFetch(`/api/admin/issues/${selected.ticketId}/messages`, { method:"POST", body:JSON.stringify({ message:reply.trim() }) });
    setSaving(false);
    if (!ok || !data?.success) { setError(data?.error || "Failed to send reply."); return; }
    setSelected(data.complaint); setIssues((xs)=>xs.map(x=>x.ticketId===selected.ticketId?data.complaint:x)); setReply("");
  }

  return <AdminLayout title="Report Issues" lead="Review customer issues raised against individual bookings and reply or update their status.">
    {error && <div className="admin-issue-alert">{error}</div>}
    <div className="admin-issue-toolbar">{STATUSES.map(s=><button key={s} className={status===s?"active":""} onClick={()=>setStatus(s)}>{label(s)}</button>)}</div>
    {loading ? <div className="admin-issue-empty">Loading issues…</div> : !issues.length ? <div className="admin-issue-empty">No reported issues in this status.</div> : <div className="admin-issue-grid">
      <div className="admin-issue-list">{issues.map(issue=><button type="button" className={`admin-issue-row ${selected?.ticketId===issue.ticketId?"selected":""}`} key={issue.ticketId} onClick={()=>openIssue(issue.ticketId)}><div><strong>{issue.ticketId}</strong><span className={`issue-status issue-${String(issue.status).toLowerCase()}`}>{label(issue.status)}</span></div><h3>{issue.subject}</h3><p>{issue.customer?.name || "Customer"} · {issue.customer?.mobile || "—"}</p><small>Booking {issue.bookingId} · {fmt(issue.updatedAt)}</small></button>)}</div>
      <section className="admin-issue-detail">{!selected ? <div className="admin-issue-detail-empty">Select an issue to see the complete booking and customer details.</div> : <>
        <div className="admin-issue-detail-head"><div><p className="eyebrow">Support ticket</p><h2>{selected.ticketId}</h2><p>{selected.subject}</p></div><select value={selected.status} disabled={saving} onChange={e=>updateStatus(e.target.value)}>{STATUSES.filter(x=>x!=="ALL").map(s=><option key={s} value={s}>{label(s)}</option>)}</select></div>
        <div className="admin-issue-customer"><div><span>Customer</span><strong>{selected.customer?.name || "—"}</strong></div><div><span>Mobile</span><strong>{selected.customer?.mobile || "—"}</strong></div><div><span>Email</span><strong>{selected.customer?.email || "—"}</strong></div><div><span>Booking</span><strong>{selected.bookingId || "—"}</strong></div><div><span>Travel</span><strong>{selected.journey?.pickup || "—"} → {selected.journey?.destination || "—"}</strong></div></div>
        <div className="admin-issue-description"><span className="issue-status">{label(selected.category)}</span>{selected.vehicleName && <div className="admin-issue-vehicle">Affected vehicle: <strong>{selected.vehicleName}</strong></div>}<h3>{selected.subject}</h3><p>{selected.description}</p></div>
        <div className="admin-issue-thread">{(selected.messages||[]).map((m,i)=><div className={`admin-issue-message ${m.authorRole === "customer" ? "customer":"team"}`} key={i}><small>{m.authorRole === "customer" ? selected.customer?.name || "Customer" : "Kuwarji Travels"} · {fmt(m.createdAt)}</small><p>{m.message}</p></div>)}</div>
        <form className="admin-issue-reply" onSubmit={sendReply}><textarea value={reply} onChange={e=>setReply(e.target.value)} rows={4} placeholder="Reply to the customer…" disabled={saving}/><button className="btn btn-primary" disabled={saving || !reply.trim()}>{saving?"Sending…":"Send reply"}</button></form>
      </>}</section>
    </div>}
  </AdminLayout>;
}
