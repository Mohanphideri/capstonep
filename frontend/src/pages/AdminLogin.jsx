import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { apiFetch } from "../api.js";
import { useAuth } from "../AuthContext.jsx";
import "./Login.css";
import "./AdminLogin.css";
import { BrandLogo } from "../components/BrandLogo.jsx";
import { useMsg91Widget, otpErrorMessage } from "../hooks/useMsg91Widget.js";

export default function AdminLogin() {
  const navigate = useNavigate();
  const { refresh } = useAuth();

  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [forgot, setForgot] = useState(false);
  const [resetPhone, setResetPhone] = useState("");
  const [resetStep, setResetStep] = useState("phone");
  const [resetPassword, setResetPassword] = useState("");
  const [resetConfirm, setResetConfirm] = useState("");
  const [resetOtp, setResetOtp] = useState("");
  const [resetError, setResetError] = useState("");
  const { widgetReady, configured } = useMsg91Widget();

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);

    const digits = phone.replace(/\D/g, "");
    if (digits.length !== 10) {
      setError("Enter a valid 10-digit mobile number.");
      return;
    }
    if (!password) {
      setError("Enter your password.");
      return;
    }

    setLoading(true);
    try {
      const { ok, data } = await apiFetch("/api/auth/admin-login", {
        method: "POST",
        body: JSON.stringify({ phone: digits, password }),
      });

      if (!ok || !data?.success) {
        setError(data?.error || "Invalid mobile number or password.");
        setLoading(false);
        return;
      }

      await refresh();
      navigate("/admin");
    } catch {
      setError("Unable to reach the server. Please try again.");
      setLoading(false);
    }
  }


  function startReset() {
    setForgot(true); setResetStep("phone"); setResetError(""); setResetPhone(phone);
  }
  function sendResetOtp() {
    const digits=resetPhone.replace(/\D/g,"");
    if(digits.length!==10) return setResetError("Enter the registered 10-digit mobile number.");
    if(!configured || !widgetReady || !window.sendOtp) return setResetError("OTP service is still loading. Please try again.");
    setLoading(true); setResetError("");
    window.sendOtp(`91${digits}`,()=>{setLoading(false);setResetStep("otp");},(err)=>{setLoading(false);setResetError(otpErrorMessage(err));});
  }
  function verifyResetOtp(code) {
    if(!window.verifyOtp) return setResetError("OTP service is still loading. Please try again.");
    setLoading(true); setResetError("");
    window.verifyOtp(code, async (data={})=>{
      const accessToken=data?.message;
      if(!accessToken){setLoading(false);return setResetError("Verification did not return a token.");}
      if(resetPassword.length<8 || resetPassword!==resetConfirm){setLoading(false);return setResetError("Enter matching passwords of at least 8 characters.");}
      const {ok,data:result}=await apiFetch("/api/auth/admin/reset-password",{method:"POST",body:JSON.stringify({accessToken,newPassword:resetPassword})});
      setLoading(false); if(!ok||!result?.success)return setResetError(result?.error||"Unable to reset password.");
      setForgot(false);setPassword("");setResetStep("phone");setResetPassword("");setResetConfirm("");setError("Password reset successfully. Please sign in with your new password.");
    },err=>{setLoading(false);setResetError(otpErrorMessage(err));});
  }

  return (
    <div className="page login-page admin-login-page">
      <header className="container login-header">
        <BrandLogo className="login-brand" />
      </header>

      <main className="container login-main admin-login-main">
        <form className="ticket otp-card otp-card-padded admin-login-card" onSubmit={handleSubmit}>
          <div>
            <p className="eyebrow">Admin portal</p>
            <h1 className="otp-heading">Staff &amp; admin login</h1>
            <p className="otp-lead">Sign in with your mobile number and password.</p>
          </div>

          <label className="otp-label">
            <span className="otp-label-text">Mobile number</span>
            <div className="otp-phone-field">
              <span className="otp-phone-prefix">+91</span>
              <input
                type="tel"
                inputMode="numeric"
                maxLength={10}
                autoComplete="username"
                placeholder="98765 43210"
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
                className="otp-phone-input"
              />
            </div>
          </label>

          <label className="otp-label">
            <span className="otp-label-text">Password</span>
            <input
              type="password"
              autoComplete="current-password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="admin-login-password"
            />
          </label>

          {error && <p className="otp-error">{error}</p>}

          <button type="button" className="btn btn-outline btn-block" onClick={startReset}>Forgot password?</button>

          <button type="submit" disabled={loading} className="btn btn-primary btn-block">
            {loading ? "Signing in…" : "Sign in"}
          </button>

          <p className="admin-login-footnote">
            Looking for customer login? <Link to="/login">Log in with OTP instead</Link>.
          </p>
        </form>
      </main>

      {forgot && <div style={{position:"fixed",inset:0,background:"rgba(8,20,40,.42)",display:"grid",placeItems:"center",zIndex:1000,padding:"1rem"}}><div className="ticket" style={{width:"min(440px,100%)",padding:"1.4rem",display:"grid",gap:"1rem"}}>
        <div><p className="eyebrow">Account recovery</p><h2>Reset admin password</h2><p className="admin-login-footnote">We’ll verify the OTP sent to your registered admin mobile number.</p></div>
        {resetStep==="phone" && <><label className="otp-label"><span className="otp-label-text">Registered mobile number</span><input className="admin-login-password" value={resetPhone} maxLength={10} inputMode="numeric" onChange={e=>setResetPhone(e.target.value.replace(/\D/g,""))}/></label><button className="btn btn-primary" onClick={sendResetOtp} disabled={loading}>{loading?"Sending…":"Send OTP"}</button></>}
        {resetStep==="otp" && <><label className="otp-label"><span className="otp-label-text">Enter OTP</span><input className="admin-login-password" inputMode="numeric" maxLength={6} autoFocus value={resetOtp} onChange={e=>setResetOtp(e.target.value.replace(/\D/g,""))} placeholder="Enter verification code"/></label><label className="otp-label"><span className="otp-label-text">New password</span><input className="admin-login-password" type="password" value={resetPassword} onChange={e=>setResetPassword(e.target.value)}/></label><label className="otp-label"><span className="otp-label-text">Confirm new password</span><input className="admin-login-password" type="password" value={resetConfirm} onChange={e=>setResetConfirm(e.target.value)}/></label><button className="btn btn-primary" onClick={()=>{if(resetOtp.length<4)return setResetError("Enter the verification code."); verifyResetOtp(resetOtp)}} disabled={loading}>{loading?"Verifying…":"Reset password"}</button></>}
        {resetError&&<p className="otp-error">{resetError}</p>}<button className="btn btn-outline" onClick={()=>setForgot(false)}>Close</button>
      </div></div>}
    </div>
  );
}
