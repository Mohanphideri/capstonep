import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AdminLayout } from "../../components/AdminLayout.jsx";
import { apiFetch } from "../../api.js";
import { useAuth } from "../../AuthContext.jsx";
import { useMsg91Widget, otpErrorMessage } from "../../hooks/useMsg91Widget.js";
import "./AdminProfile.css";

export default function AdminProfile() {
  const navigate = useNavigate();
  const { refresh, logout } = useAuth();
  const { widgetReady, configured } = useMsg91Widget();
  const [profile, setProfile] = useState({ name: "", phone: "", email: "" });
  const [name, setName] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [phoneCode, setPhoneCode] = useState("");
  const [emailCode, setEmailCode] = useState("");
  const [contactFlow, setContactFlow] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    apiFetch("/api/auth/admin/profile").then(({ ok, data }) => {
      if (ok && data?.success) {
        setProfile(data.profile);
        setName(data.profile.name || "");
        setNewPhone(data.profile.phone || "");
        setNewEmail(data.profile.email || "");
      } else setError(data?.error || "Failed to load profile.");
      setLoading(false);
    });
  }, []);

  function clearFeedback() { setError(""); setMessage(""); }

  async function saveName(e) {
    e.preventDefault();
    clearFeedback();
    setSaving(true);
    const { ok, data } = await apiFetch("/api/auth/admin/profile", {
      method: "PATCH",
      body: JSON.stringify({ name: name.trim(), phone: profile.phone, email: profile.email || "" }),
    });
    setSaving(false);
    if (!ok || !data?.success) return setError(data?.error || "Failed to update profile.");
    setProfile(data.profile);
    setName(data.profile.name || "");
    setMessage("Profile name updated successfully.");
    await refresh();
  }

  async function startPhoneChange() {
    clearFeedback();
    const digits = newPhone.replace(/\D/g, "");
    if (digits.length !== 10) return setError("Enter a valid 10-digit mobile number.");
    if (digits === profile.phone) return setError("That is already your current mobile number.");
    setSaving(true);
    const { ok, data } = await apiFetch("/api/auth/admin/profile/request-phone-change", {
      method: "POST",
      body: JSON.stringify({ newPhone: digits }),
    });
    setSaving(false);
    if (!ok || !data?.success) return setError(data?.error || "Unable to send the email verification code.");
    setNewPhone(digits);
    setPhoneCode("");
    setContactFlow("phone");
    setMessage(data.message || "A verification code was sent to your current admin email.");
  }

  async function verifyPhoneChange(e) {
    e.preventDefault();
    clearFeedback();
    if (!/^\d{6}$/.test(phoneCode)) return setError("Enter the 6-digit verification code from your email.");
    setSaving(true);
    const { ok, data } = await apiFetch("/api/auth/admin/profile/verify-phone-change", {
      method: "POST",
      body: JSON.stringify({ newPhone: newPhone.replace(/\D/g, ""), code: phoneCode }),
    });
    setSaving(false);
    if (!ok || !data?.success) return setError(data?.error || "Unable to verify the mobile number.");
    setProfile(data.profile);
    setNewPhone(data.profile.phone || "");
    setContactFlow(null);
    setPhoneCode("");
    setMessage("Mobile number updated. A fresh admin session is active; previous sessions were signed out.");
    await refresh();
  }

  async function startEmailChange() {
    clearFeedback();
    const email = newEmail.trim().toLowerCase();
    if (!email || !/^\S+@\S+\.\S+$/.test(email)) return setError("Enter a valid email address.");
    if (email === (profile.email || "")) return setError("That is already your current email address.");
    if (!configured || !widgetReady || !window.sendOtp) return setError("Mobile OTP service is still loading. Please try again.");
    setSaving(true);
    window.sendOtp(`91${profile.phone}`, () => {
      setSaving(false);
      setEmailCode("");
      setContactFlow("email");
      setMessage(`A verification OTP was sent to +91 ${profile.phone}.`);
    }, (err) => {
      setSaving(false);
      setError(otpErrorMessage(err) || "Unable to send the mobile OTP.");
    });
  }

  async function verifyEmailChange(e) {
    e.preventDefault();
    clearFeedback();
    if (emailCode.length < 4) return setError("Enter the mobile verification code.");
    if (!window.verifyOtp) return setError("Mobile OTP service is still loading. Please try again.");
    setSaving(true);
    window.verifyOtp(emailCode, async (data = {}) => {
      const accessToken = data?.message;
      if (!accessToken) { setSaving(false); return setError("Verification did not return a token."); }
      const result = await apiFetch("/api/auth/admin/profile/verify-email-change", {
        method: "POST",
        body: JSON.stringify({ newEmail: newEmail.trim().toLowerCase(), accessToken }),
      });
      setSaving(false);
      if (!result.ok || !result.data?.success) return setError(result.data?.error || "Unable to update the email address.");
      setProfile(result.data.profile);
      setNewEmail(result.data.profile.email || "");
      setEmailCode("");
      setContactFlow(null);
      setMessage("Email address updated. A fresh admin session is active; previous sessions were signed out.");
      await refresh();
    }, (err) => {
      setSaving(false);
      setError(otpErrorMessage(err) || "Mobile OTP verification failed.");
    });
  }

  async function changePassword(e) {
    e.preventDefault();
    clearFeedback();
    const form = new FormData(e.currentTarget);
    const oldPassword = form.get("oldPassword");
    const newPassword = form.get("newPassword");
    const confirm = form.get("confirm");
    if (newPassword !== confirm) return setError("New password and confirmation do not match.");
    setSaving(true);
    const { ok, data } = await apiFetch("/api/auth/admin/change-password", {
      method: "POST",
      body: JSON.stringify({ oldPassword, newPassword }),
    });
    setSaving(false);
    if (!ok || !data?.success) return setError(data?.error || "Failed to change password.");
    await logout();
    navigate("/admin/login?message=password-changed", { replace: true });
  }

  if (loading) return <AdminLayout title="Admin Profile"><p className="admin-loading">Loading profile…</p></AdminLayout>;

  return <AdminLayout title="Admin Profile" lead="Manage your identity and verified contact methods.">
    {message && <div className="admin-success">{message}</div>}
    {error && <div className="admin-error">{error}</div>}

    <div className="admin-profile-grid">
      <section className="ticket admin-profile-card">
        <div className="admin-profile-section-head"><div><p className="eyebrow">Identity</p><h2>Profile</h2><p>These details identify you inside the administrator portal.</p></div><span className="admin-profile-avatar"><span>{(name || "A").trim().charAt(0).toUpperCase()}</span></span></div>
        <form onSubmit={saveName} className="admin-profile-form">
          <label className="admin-form-field"><span>Full name</span><input className="admin-input" value={name} onChange={e=>setName(e.target.value)} minLength={2} maxLength={120} required /></label>
          <button className="btn btn-primary" disabled={saving}>{saving ? "Saving…" : "Save profile"}</button>
        </form>
      </section>

      <section className="ticket admin-profile-card">
        <div className="admin-profile-section-head"><div><p className="eyebrow">Verified contacts</p><h2>Account recovery</h2><p>Changing either contact method requires verification through the other one.</p></div></div>
        <div className="admin-contact-row"><div className="admin-contact-copy"><span className="admin-contact-label">Current mobile number</span><strong>+91 {profile.phone || "Not configured"}</strong><small>Change request → OTP is sent to your current admin email.</small></div><div className="admin-contact-change"><label><span>New mobile number</span><input className="admin-input" inputMode="numeric" maxLength={10} value={newPhone} onChange={e=>setNewPhone(e.target.value.replace(/\D/g, ""))} placeholder="10-digit mobile" disabled={saving || contactFlow !== null}/></label><button type="button" className="btn btn-outline btn-sm" onClick={startPhoneChange} disabled={saving || contactFlow === "email"}>Send email OTP</button></div></div>
        <div className="admin-contact-row"><div className="admin-contact-copy"><span className="admin-contact-label">Current email address</span><strong>{profile.email || "Not configured"}</strong><small>Change request → OTP is sent to your current admin mobile.</small></div><div className="admin-contact-change"><label><span>New email address</span><input className="admin-input" type="email" value={newEmail} onChange={e=>setNewEmail(e.target.value)} placeholder="admin@example.com" disabled={saving || contactFlow !== null}/></label><button type="button" className="btn btn-outline btn-sm" onClick={startEmailChange} disabled={saving || contactFlow === "phone" || !profile.phone}>Send mobile OTP</button></div></div>

        {contactFlow === "phone" && <form className="admin-verification-box" onSubmit={verifyPhoneChange}><p><strong>Verify new mobile number</strong><span>We sent a 6-digit code to your current admin email. New mobile: +91 {newPhone}</span></p><input className="admin-input" inputMode="numeric" maxLength={6} value={phoneCode} onChange={e=>setPhoneCode(e.target.value.replace(/\D/g, ""))} placeholder="6-digit code" autoFocus /><div><button type="button" className="btn btn-outline btn-sm" onClick={()=>setContactFlow(null)} disabled={saving}>Cancel</button><button type="button" className="btn btn-outline btn-sm" onClick={startPhoneChange} disabled={saving}>Resend code</button><button className="btn btn-primary btn-sm" disabled={saving}>{saving ? "Verifying…" : "Verify & update mobile"}</button></div></form>}
        {contactFlow === "email" && <form className="admin-verification-box" onSubmit={verifyEmailChange}><p><strong>Verify new email address</strong><span>We sent an OTP to your current mobile number. New email: {newEmail}</span></p><input className="admin-input" inputMode="numeric" maxLength={6} value={emailCode} onChange={e=>setEmailCode(e.target.value.replace(/\D/g, ""))} placeholder="Enter OTP" autoFocus /><div><button type="button" className="btn btn-outline btn-sm" onClick={()=>setContactFlow(null)} disabled={saving}>Cancel</button><button type="button" className="btn btn-outline btn-sm" onClick={startEmailChange} disabled={saving}>Resend OTP</button><button className="btn btn-primary btn-sm" disabled={saving}>{saving ? "Verifying…" : "Verify & update email"}</button></div></form>}
      </section>

      <section className="ticket admin-profile-card admin-profile-security">
        <div className="admin-profile-section-head"><div><p className="eyebrow">Security</p><h2>Change password</h2><p>For safety, changing the password signs out every existing admin session.</p></div></div>
        <form onSubmit={changePassword} className="admin-profile-form">
          <label className="admin-form-field"><span>Current password</span><input name="oldPassword" className="admin-input" type="password" autoComplete="current-password" required /></label>
          <label className="admin-form-field"><span>New password</span><input name="newPassword" className="admin-input" type="password" autoComplete="new-password" minLength={8} maxLength={128} required /></label>
          <label className="admin-form-field"><span>Confirm new password</span><input name="confirm" className="admin-input" type="password" autoComplete="new-password" minLength={8} maxLength={128} required /></label>
          <button className="btn btn-primary" disabled={saving}>{saving ? "Updating…" : "Change password"}</button>
        </form>
      </section>
    </div>
  </AdminLayout>;
}
