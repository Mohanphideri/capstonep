import { useEffect, useState } from "react";
import { AdminLayout } from "../../components/AdminLayout.jsx";
import { apiFetch } from "../../api.js";
import { useAuth } from "../../AuthContext.jsx";

export default function AdminProfile() {
  const { refresh } = useAuth();
  const [profile, setProfile] = useState({ name:"", phone:"", email:"" });
  const [form, setForm] = useState({ name:"", phone:"" });
  const [password, setPassword] = useState({ oldPassword:"", newPassword:"", confirm:"" });
  const [loading,setLoading]=useState(true); const [saving,setSaving]=useState(false); const [message,setMessage]=useState(""); const [error,setError]=useState("");
  useEffect(()=>{ apiFetch("/api/auth/admin/profile").then(({ok,data})=>{ if(ok&&data?.success){setProfile(data.profile);setForm({name:data.profile.name||"",phone:data.profile.phone||""});} else setError(data?.error||"Failed to load profile."); setLoading(false);}); },[]);
  async function saveProfile(e){e.preventDefault();setError("");setMessage("");setSaving(true);const {ok,data}=await apiFetch("/api/auth/admin/profile",{method:"PATCH",body:JSON.stringify(form)});setSaving(false);if(!ok||!data?.success)return setError(data?.error||"Failed to update profile.");setProfile(data.profile);setMessage("Profile updated successfully.");await refresh();}
  async function changePassword(e){e.preventDefault();setError("");setMessage("");if(password.newPassword!==password.confirm)return setError("New password and confirmation do not match.");setSaving(true);const {ok,data}=await apiFetch("/api/auth/admin/change-password",{method:"POST",body:JSON.stringify({oldPassword:password.oldPassword,newPassword:password.newPassword})});setSaving(false);if(!ok||!data?.success)return setError(data?.error||"Failed to change password.");setPassword({oldPassword:"",newPassword:"",confirm:""});setMessage("Password changed successfully.");}
  if(loading)return <AdminLayout title="Admin Profile"><p className="admin-loading">Loading profile…</p></AdminLayout>;
  return <AdminLayout title="Admin Profile" lead="Manage your administrator account details and password.">
    {message&&<div className="admin-success">{message}</div>}{error&&<div className="admin-error">{error}</div>}
    <div className="admin-form-grid" style={{alignItems:"start"}}>
      <section className="ticket" style={{padding:"1.25rem"}}><p className="eyebrow">Account details</p><h2>Profile</h2><form onSubmit={saveProfile} style={{display:"grid",gap:"1rem"}}>
        <label className="admin-form-field"><span>Name</span><input className="admin-input" value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/></label>
        <label className="admin-form-field"><span>Registered mobile number</span><input className="admin-input" inputMode="numeric" maxLength={10} value={form.phone} onChange={e=>setForm({...form,phone:e.target.value.replace(/\D/g,"")})}/></label>
        <label className="admin-form-field"><span>Email</span><input className="admin-input" value={profile.email||""} disabled/></label>
        <button className="btn btn-primary" disabled={saving}>{saving?"Saving…":"Save profile"}</button>
      </form></section>
      <section className="ticket" style={{padding:"1.25rem"}}><p className="eyebrow">Security</p><h2>Change password</h2><form onSubmit={changePassword} style={{display:"grid",gap:"1rem"}}>
        <label className="admin-form-field"><span>Old password</span><input className="admin-input" type="password" autoComplete="current-password" value={password.oldPassword} onChange={e=>setPassword({...password,oldPassword:e.target.value})}/></label>
        <label className="admin-form-field"><span>New password</span><input className="admin-input" type="password" autoComplete="new-password" value={password.newPassword} onChange={e=>setPassword({...password,newPassword:e.target.value})}/></label>
        <label className="admin-form-field"><span>Confirm new password</span><input className="admin-input" type="password" autoComplete="new-password" value={password.confirm} onChange={e=>setPassword({...password,confirm:e.target.value})}/></label>
        <button className="btn btn-primary" disabled={saving}>{saving?"Saving…":"Change password"}</button>
      </form></section>
    </div>
  </AdminLayout>;
}
