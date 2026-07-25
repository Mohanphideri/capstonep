import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext.jsx";
import { authService, patientService } from "../services/api.js";
import { initSocket } from "../utils/socket.js";
import { Heart, Mail, Lock, Smartphone, ShieldCheck, User } from "lucide-react";

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, setLoading } = useAuth();
  const [loginType, setLoginType] = useState("patient");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // A brand-new phone number has no name on file yet — it must be provided
  // before the patient can continue into the portal. An existing/recognized
  // number already has a name, so this step is skipped for them.
  const [needsName, setNeedsName] = useState(false);
  const [nameDraft, setNameDraft] = useState("");
  const [pendingAuth, setPendingAuth] = useState(null); // { token, patient }

  const handleSendOTP = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    try {
      await authService.sendOTP(phone);
      setSuccess("OTP sent successfully! Check console for demo OTP: 1234");
      setOtpSent(true);
    } catch (err) {
      setError(err.response?.data?.error || "Failed to send OTP");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await authService.verifyOTP(phone, otp);
      const { token, patient, nameRequired } = response.data;

      if (nameRequired) {
        // New number: hold off on entering the portal until they give a name.
        setPendingAuth({ token, patient });
        setNeedsName(true);
        setLoading(false);
        return;
      }

      login(token, {
        _id: patient._id,
        phone: patient.phone,
        name: patient.name,
        role: "patient",
      });

      initSocket(token);
      navigate(location.state?.from || "/patient");
    } catch (err) {
      setError(err.response?.data?.error || "Invalid OTP");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitName = async (e) => {
    e.preventDefault();
    setError("");
    if (!nameDraft.trim()) {
      setError("Please enter your name to continue.");
      return;
    }
    setLoading(true);
    try {
      const { token, patient } = pendingAuth;
      // Temporarily store the token so the authenticated /patients/me call works.
      localStorage.setItem("token", token);
      const response = await patientService.updateMyProfile({ name: nameDraft.trim() });
      const updatedPatient = response.data.patient;

      login(token, {
        _id: updatedPatient._id,
        phone: updatedPatient.phone,
        name: updatedPatient.name,
        role: "patient",
      });

      initSocket(token);
      navigate(location.state?.from || "/patient");
    } catch (err) {
      setError(err.response?.data?.error || "Failed to save your name");
    } finally {
      setLoading(false);
    }
  };

  const handleStaffLogin = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const cleanUsername = username.trim().toLowerCase();
      const response = await authService.staffLogin(cleanUsername, password);
      const { token, user } = response.data;

      login(token, user);
      initSocket(token);

      if (user.mustResetPassword) {
        navigate("/password-reset");
      } else {
        // Every role now has its own portal path that matches its role name
        // (admin, doctor, nurse, accountant, receptionist, pharmacist, patient).
        const targetPortal = `/${user.role}`;
        navigate(location.state?.from || targetPortal);
      }
    } catch (err) {
      setError(err.response?.data?.error || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(200,16,46,0.18),_transparent_18%),_radial-gradient(circle_at_bottom_right,_rgba(15,31,61,0.08),_transparent_22%)] flex items-center justify-center py-10 px-4">
      <div className="grid gap-8 lg:grid-cols-[1fr_0.95fr] w-full max-w-6xl">
        <aside className="rounded-[2rem] bg-white/95 border border-mist p-10 shadow-[0_40px_90px_-50px_rgba(15,31,61,0.25)]">
          <div className="flex items-center gap-3 mb-6">
            <Heart className="w-9 h-9 text-crimson" />
            <div>
              <p className="text-sm uppercase tracking-widest2 text-crimson">HeartStone Hospital</p>
              <h2 className="text-2xl font-display text-ink">Secure hospital access</h2>
            </div>
          </div>
          <p className="text-slate-soft leading-relaxed">
            Access your patient or staff portal to manage appointments, ward rounds, pharmacy fulfilment, and hospital operations in a single secure system.
          </p>

          <div className="mt-10 space-y-4">
            {[
              { label: "Emergency ready", value: "24/7 queue monitoring" },
              { label: "Secure login", value: "Protected hospital network" },
              { label: "Clinical workflows", value: "Designed for care teams" },
            ].map((item) => (
              <div key={item.label} className="rounded-3xl bg-mist/80 p-4">
                <p className="text-xs uppercase tracking-widest2 text-slate-500">{item.label}</p>
                <p className="mt-2 font-semibold text-ink">{item.value}</p>
              </div>
            ))}
          </div>

          <div className="mt-10 rounded-3xl bg-navy text-white p-6">
            <div className="flex items-center gap-3 text-sm uppercase tracking-widest2 text-slate-300">
              <ShieldCheck className="w-4 h-4" />
              Hospital-grade safety
            </div>
            <p className="mt-4 text-sm leading-relaxed text-white/80">
              Single sign-on for staff, OTP-based patient access, and strict session handling keep hospital data protected.
            </p>
          </div>
        </aside>

        <div className="rounded-[2rem] bg-white border border-mist shadow-lg p-8 lg:p-10">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center rounded-full bg-red-50 p-4 mb-4">
              <Heart className="w-6 h-6 text-crimson" />
            </div>
            <h1 className="text-3xl font-display text-ink">Hospital portal login</h1>
            <p className="mt-2 text-slate-soft">Patient OTP and staff authentication for all hospital roles.</p>
          </div>

          <div className="bg-mist/70 rounded-3xl p-6 mb-6">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-widest2 text-slate-500">Current mode</p>
                <p className="mt-2 text-sm font-semibold text-ink">{loginType === "patient" ? "Patient access" : "Staff sign in"}</p>
              </div>
              <div className="text-xs uppercase tracking-widest2 text-crimson">Safe login</div>
            </div>
          </div>

          <div className="bg-white rounded-3xl p-6 shadow-sm">
            {needsName ? (
              <form onSubmit={handleSubmitName} className="space-y-4">
                <div className="text-center mb-2">
                  <h2 className="text-lg font-semibold text-ink">Welcome — you're new here</h2>
                  <p className="mt-1 text-sm text-slate-soft">
                    We don't have a name on file for this number yet. Please enter your name to
                    continue — it will appear on your prescriptions and across your portal.
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Your name</label>
                  <div className="relative">
                    <User className="absolute left-3 top-3 w-5 h-5 text-slate-400" />
                    <input
                      type="text"
                      value={nameDraft}
                      onChange={(e) => setNameDraft(e.target.value)}
                      placeholder="Full name"
                      autoFocus
                      className="w-full rounded-2xl border border-slate-200 bg-white px-10 py-3 text-sm shadow-sm focus:border-crimson focus:ring-2 focus:ring-crimson/20"
                      required
                    />
                  </div>
                </div>
                {error && <div className="rounded-2xl bg-red-50 border border-red-200 p-4 text-sm text-red-700">{error}</div>}
                <button
                  type="submit"
                  className="w-full rounded-2xl bg-crimson px-4 py-3 text-sm font-semibold text-white transition hover:bg-crimson-dark"
                >
                  Continue
                </button>
              </form>
            ) : (
            <>
            <div className="flex gap-2 mb-6">
              <button
                onClick={() => {
                  setLoginType("patient");
                  setError("");
                  setSuccess("");
                }}
                className={`flex-1 py-2 rounded-2xl text-sm font-semibold transition ${
                  loginType === "patient"
                    ? "bg-crimson text-white"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
              >
                Patient
              </button>
              <button
                onClick={() => {
                  setLoginType("staff");
                  setError("");
                  setSuccess("");
                }}
                className={`flex-1 py-2 rounded-2xl text-sm font-semibold transition ${
                  loginType === "staff"
                    ? "bg-navy text-white"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
              >
                Staff
              </button>
            </div>

            {loginType === "patient" && (
              <form onSubmit={otpSent ? handleVerifyOTP : handleSendOTP} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Mobile number</label>
                  <div className="relative">
                    <Smartphone className="absolute left-3 top-3 w-5 h-5 text-slate-400" />
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+91-9876543210"
                      className="w-full rounded-2xl border border-slate-200 bg-white px-10 py-3 text-sm shadow-sm focus:border-crimson focus:ring-2 focus:ring-crimson/20"
                      disabled={otpSent}
                      required
                    />
                  </div>
                </div>

                {otpSent && (
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">OTP code</label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 w-5 h-5 text-slate-400" />
                      <input
                        type="text"
                        value={otp}
                        onChange={(e) => setOtp(e.target.value)}
                        placeholder="1234"
                        className="w-full rounded-2xl border border-slate-200 bg-white px-10 py-3 text-sm shadow-sm focus:border-crimson focus:ring-2 focus:ring-crimson/20"
                        required
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setOtpSent(false);
                        setOtp("");
                        setSuccess("");
                      }}
                      className="text-sm text-crimson hover:text-crimson-dark mt-2"
                    >
                      Change mobile number
                    </button>
                  </div>
                )}

                {error && <div className="rounded-2xl bg-red-50 border border-red-200 p-4 text-sm text-red-700">{error}</div>}
                {success && <div className="rounded-2xl bg-emerald-50 border border-emerald-200 p-4 text-sm text-emerald-700">{success}</div>}

                <button
                  type="submit"
                  className="w-full rounded-2xl bg-crimson px-4 py-3 text-sm font-semibold text-white transition hover:bg-crimson-dark"
                >
                  {otpSent ? "Verify OTP" : "Send OTP"}
                </button>
              </form>
            )}

            {loginType === "staff" && (
              <form onSubmit={handleStaffLogin} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Username</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 w-5 h-5 text-slate-400" />
                    <input
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="e.g., admin or dr.smith01"
                      className="w-full rounded-2xl border border-slate-200 bg-white px-10 py-3 text-sm shadow-sm focus:border-navy focus:ring-2 focus:ring-navy/20"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 w-5 h-5 text-slate-400" />
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full rounded-2xl border border-slate-200 bg-white px-10 py-3 text-sm shadow-sm focus:border-navy focus:ring-2 focus:ring-navy/20"
                      required
                    />
                  </div>
                </div>

                {error && <div className="rounded-2xl bg-red-50 border border-red-200 p-4 text-sm text-red-700">{error}</div>}

                <button
                  type="submit"
                  className="w-full rounded-2xl bg-navy px-4 py-3 text-sm font-semibold text-white transition hover:bg-navy-light"
                >
                  Login
                </button>

                <div className="text-xs text-slate-500 text-center mt-4">
                  Authorized hospital staff only. If you are a patient, use the patient access tab.
                </div>
              </form>
            )}
            </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
