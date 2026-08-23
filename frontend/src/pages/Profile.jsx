import { useState } from "react";
import ConsumerLayout from "../components/ConsumerLayout.jsx";
import { useAuth } from "../AuthContext.jsx";
import { apiFetch } from "../api.js";
import "./Profile.css";

export default function Profile() {
  const { user, refresh } = useAuth();
  const [name, setName] = useState(user?.name || "");
  const [email, setEmail] = useState(user?.email || "");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  async function save(e) { e.preventDefault(); setSaving(true); setMessage(""); setError(""); const { ok, data } = await apiFetch("/api/auth/profile", { method: "PATCH", body: JSON.stringify({ name: name.trim(), email: email.trim() }) }); if (!ok || !data?.success) setError(data?.error || "Unable to update your profile."); else { await refresh(); setMessage("Profile updated successfully."); } setSaving(false); }
  return <ConsumerLayout title="Profile" lead="Manage the contact details used for your travel enquiries and confirmations."><div className="profile-page-grid"><section className="profile-card"><div className="profile-card-head"><span className="profile-avatar-large">{(name || "T").trim().charAt(0).toUpperCase()}</span><div><p className="eyebrow">Customer profile</p><h2>{name || "Traveller"}</h2><p>Account verified by mobile OTP</p></div></div><form onSubmit={save} className="profile-form"><label><span>Full name</span><input value={name} onChange={(e)=>setName(e.target.value)} minLength={2} maxLength={120} required /></label><label><span>Mobile number</span><input value={user?.phone || ""} readOnly /></label><label><span>Email address</span><input type="email" value={email} onChange={(e)=>setEmail(e.target.value)} /></label>{message&&<p className="profile-message success">{message}</p>}{error&&<p className="profile-message error">{error}</p>}<button className="btn btn-primary" disabled={saving}>{saving?"Saving…":"Save changes"}</button></form></section><aside className="profile-side-card"><p className="eyebrow">Account safety</p><h3>Your mobile number is your login.</h3><p>Use the same verified mobile number whenever you sign in. We do not expose account credentials in the customer portal.</p><div className="profile-side-item"><strong>Need help?</strong><span>Visit the FAQ or contact the Kuwarji Travels team from your enquiry flow.</span></div></aside></div></ConsumerLayout>;
}
