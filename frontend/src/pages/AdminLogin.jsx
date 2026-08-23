import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { apiFetch } from "../api.js";
import { useAuth } from "../AuthContext.jsx";
import "./Login.css";
import "./AdminLogin.css";
import { BrandLogo } from "../components/BrandLogo.jsx";

export default function AdminLogin() {
  const navigate = useNavigate();
  const { refresh } = useAuth();

  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

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

          <button type="submit" disabled={loading} className="btn btn-primary btn-block">
            {loading ? "Signing in…" : "Sign in"}
          </button>

          <p className="admin-login-footnote">
            Looking for customer login? <Link to="/login">Log in with OTP instead</Link>.
          </p>
        </form>
      </main>
    </div>
  );
}
