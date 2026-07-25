import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext.jsx";
import { authService } from "../services/api.js";
import { initSocket } from "../utils/socket.js";
import { Heart, Mail, Lock, Smartphone } from "lucide-react";

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
      const { token, patient } = response.data;

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

  const handleStaffLogin = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await authService.staffLogin(username, password);
      const { token, user } = response.data;

      login(token, user);
      initSocket(token);

      if (user.mustResetPassword) {
        navigate("/password-reset");
      } else {
        navigate(location.state?.from || `/${user.role}`);
      }
    } catch (err) {
      setError(err.response?.data?.error || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-pink-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Heart className="w-8 h-8 text-red-600" fill="currentColor" />
            <h1 className="text-3xl font-bold text-gray-900">HeartStone</h1>
          </div>
          <p className="text-gray-600">Hospital Queue & Appointment System</p>
        </div>

        {/* Login Type Selector */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <div className="flex gap-2 mb-6">
            <button
              onClick={() => {
                setLoginType("patient");
                setError("");
                setSuccess("");
              }}
              className={`flex-1 py-2 rounded-lg font-medium transition-colors ${
                loginType === "patient"
                  ? "bg-red-600 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
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
              className={`flex-1 py-2 rounded-lg font-medium transition-colors ${
                loginType === "staff"
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              Staff
            </button>
          </div>

          {/* Patient OTP Login */}
          {loginType === "patient" && (
            <form onSubmit={otpSent ? handleVerifyOTP : handleSendOTP} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Mobile Number
                </label>
                <div className="relative">
                  <Smartphone className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+91-9876543210"
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    disabled={otpSent}
                    required
                  />
                </div>
              </div>

              {otpSent && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">OTP</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                    <input
                      type="text"
                      value={otp}
                      onChange={(e) => setOtp(e.target.value)}
                      placeholder="1234"
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
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
                    className="text-sm text-red-600 hover:text-red-700 mt-2"
                  >
                    Change number
                  </button>
                </div>
              )}

              {error && <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">{error}</div>}
              {success && (
                <div className="p-3 bg-green-50 border border-green-200 text-green-700 rounded-lg text-sm">
                  {success}
                </div>
              )}

              <button
                type="submit"
                className="w-full bg-red-600 hover:bg-red-700 text-white font-medium py-2 rounded-lg transition-colors"
              >
                {otpSent ? "Verify OTP" : "Send OTP"}
              </button>
            </form>
          )}

          {/* Staff Login */}
          {loginType === "staff" && (
            <form onSubmit={handleStaffLogin} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Username</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="e.g., admin or dr.smith01"
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>
              </div>

              {error && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
                  {error}
                </div>
              )}

              <button
                type="submit"
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 rounded-lg transition-colors"
              >
                Login
              </button>

              <div className="text-xs text-gray-600 text-center mt-4">
                <p className="font-medium mb-2">Demo Credentials:</p>
                <p>Admin: <code className="bg-gray-100 px-1">admin</code> / <code className="bg-gray-100 px-1">admin@123</code></p>
                <p className="mt-1 text-gray-500">Check seed script for other users</p>
              </div>
            </form>
          )}
        </div>

        {/* Footer */}
        <div className="text-center text-sm text-gray-600">
          <p>© 2024 HeartStone. All rights reserved.</p>
        </div>
      </div>
    </div>
  );
}
