import { useCallback, useEffect, useRef, useState } from "react";
import { apiFetch } from "../api.js";
import { useMsg91Widget, otpErrorMessage, useCooldown } from "../hooks/useMsg91Widget.js";
import "./OtpLogin.css";
import "./EnquiryForm.css";

const OTP_LENGTH = 4;
const RESEND_COOLDOWN_SECONDS = 30;
const today = new Date();
const TODAY = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,"0")}-${String(today.getDate()).padStart(2,"0")}`;

const VEHICLE_OPTIONS = [
  "Volvo",
  "AC Bus",
  "Non-AC Bus",
  "Semi-Sleeper",
  "Sleeper",
  "Tempo Traveller",
  "Van",
  "Vanity Van",
  "Not sure yet",
];

export function EnquiryForm({ packageId = null, packageTitle = "", initialTrip = null }) {
  const { configured, widgetReady } = useMsg91Widget();
  const [cooldown, startCooldown] = useCooldown(RESEND_COOLDOWN_SECONDS);

  // Form fields
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [vehicleType, setVehicleType] = useState(packageTitle ? `Tour Package: ${packageTitle}` : (initialTrip?.vehicleType || ""));
  const [tripDate, setTripDate] = useState(initialTrip?.tripDate || "");
  const [message, setMessage] = useState(initialTrip?.message || "");

  // Captcha
  const [captchaSvg, setCaptchaSvg] = useState("");
  const [captchaAnswer, setCaptchaAnswer] = useState("");
  const [captchaLoading, setCaptchaLoading] = useState(true);

  // OTP verification state — this is the gate on the submit button.
  const [otpStage, setOtpStage] = useState("idle"); // idle | sending | sent | verifying | verified
  const [otpDigits, setOtpDigits] = useState(Array(OTP_LENGTH).fill(""));
  const [accessToken, setAccessToken] = useState(null);
  const [verifiedPhone, setVerifiedPhone] = useState(null);
  const otpRefs = useRef([]);

  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const loadCaptcha = useCallback(async () => {
    setCaptchaLoading(true);
    setCaptchaAnswer("");
    setCaptchaSvg("");
    try {
      const { ok, data } = await apiFetch("/api/captcha");
      if (ok && data?.success && data?.svg) {
        setCaptchaSvg(data.svg);
      } else {
        setCaptchaSvg("");
      }
    } catch {
      setCaptchaSvg("");
    } finally {
      setCaptchaLoading(false);
    }
  }, []);

  useEffect(() => {
    if (configured) loadCaptcha();
  }, [configured, loadCaptcha]);

  // Editing the phone number after verifying invalidates the previous
  // verification — the submitted phone must always be the verified one.
  function handlePhoneChange(value) {
    const digits = value.replace(/\D/g, "").slice(0, 10);
    setPhone(digits);
    if (otpStage === "verified" || otpStage === "sent") {
      setOtpStage("idle");
      setOtpDigits(Array(OTP_LENGTH).fill(""));
      setAccessToken(null);
      setVerifiedPhone(null);
    }
  }

  async function handleSendOtp() {
    setError(null);

    if (phone.length !== 10) {
      setError("Enter a valid 10-digit mobile number.");
      return;
    }
    if (!captchaAnswer.trim()) {
      setError("Enter the code shown in the image.");
      return;
    }
    if (!widgetReady || !window.sendOtp) {
      setError("OTP verification is still loading. Please wait a moment.");
      return;
    }

    setOtpStage("sending");

    try {
      const captchaResult = await apiFetch("/api/captcha/verify", {
        method: "POST",
        body: JSON.stringify({ answer: captchaAnswer.trim() }),
      });

      if (!captchaResult.ok || !captchaResult.data?.success) {
        setError(captchaResult.data?.error || "That code didn't match.");
        setOtpStage("idle");
        await loadCaptcha();
        return;
      }

      window.sendOtp(
        `91${phone}`,
        () => {
          setOtpStage("sent");
          setOtpDigits(Array(OTP_LENGTH).fill(""));
          startCooldown();
          setTimeout(() => otpRefs.current[0]?.focus(), 50);
        },
        (err) => {
          setOtpStage("idle");
          setError(otpErrorMessage(err));
          loadCaptcha();
        }
      );
    } catch {
      setOtpStage("idle");
      setError("Unable to send OTP. Please try again.");
      loadCaptcha();
    }
  }

  function handleResend() {
    if (cooldown > 0 || !window.retryOtp) return;
    setError(null);
    window.retryOtp(
      "text",
      () => {
        setOtpDigits(Array(OTP_LENGTH).fill(""));
        startCooldown();
        setTimeout(() => otpRefs.current[0]?.focus(), 50);
      },
      (err) => setError(otpErrorMessage(err))
    );
  }

  function submitOtp(code) {
    setError(null);

    if (!window.verifyOtp) {
      setError("OTP verification is still loading. Please wait a moment.");
      return;
    }

    setOtpStage("verifying");

    window.verifyOtp(
      code,
      (data = {}) => {
        const token = data?.message;
        if (!token) {
          setOtpStage("sent");
          setError("Verification did not return a token. Please try again.");
          return;
        }
        setAccessToken(token);
        setVerifiedPhone(phone);
        setOtpStage("verified");
      },
      (err) => {
        setOtpStage("sent");
        setOtpDigits(Array(OTP_LENGTH).fill(""));
        otpRefs.current[0]?.focus();
        setError(otpErrorMessage(err));
      }
    );
  }

  function handleOtpDigitChange(index, value) {
    const digit = value.replace(/\D/g, "").slice(-1);
    const next = [...otpDigits];
    next[index] = digit;
    setOtpDigits(next);

    if (digit && index < OTP_LENGTH - 1) {
      otpRefs.current[index + 1]?.focus();
    }
    if (next.every((d) => d !== "")) {
      submitOtp(next.join(""));
    }
  }

  function handleOtpKeyDown(index, e) {
    if (e.key === "Backspace" && !otpDigits[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);

    if (name.trim().length < 2) {
      setError("Enter your name.");
      return;
    }
    if (otpStage !== "verified" || !accessToken || verifiedPhone !== phone) {
      setError("Verify your mobile number with the OTP before submitting.");
      return;
    }

    setSubmitting(true);
    try {
      const { ok, data } = await apiFetch("/api/enquiry", {
        method: "POST",
        body: JSON.stringify({
          name: name.trim(),
          phone,
          email: email.trim() || undefined,
          vehicleType: vehicleType || undefined,
          packageId: packageId || undefined,
          tripDate: tripDate || undefined,
          message: message.trim() || undefined,
          accessToken,
        }),
      });

      if (!ok || !data?.success) {
        setError(data?.error || "Something went wrong submitting your enquiry.");
        setSubmitting(false);
        return;
      }

      setSubmitted(true);
      setSubmitting(false);
    } catch {
      setError("Unable to reach the server. Please try again.");
      setSubmitting(false);
    }
  }

  if (!configured) {
    return (
      <div className="ticket enquiry-card">
        <p className="enquiry-config-warning">
          Enquiry form isn&apos;t configured yet. Add{" "}
          <code className="otp-code">VITE_MSG91_WIDGET_ID</code> and{" "}
          <code className="otp-code">VITE_MSG91_TOKEN_AUTH</code> to the frontend environment.
        </p>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="ticket enquiry-card enquiry-success">
        <p className="enquiry-success-title">Enquiry sent</p>
        <p className="enquiry-success-body">
          Thanks, {name.split(" ")[0]}. We&apos;ve received your enquiry for a verified number
          — our team will reach out to +91 {phone} shortly.
        </p>
      </div>
    );
  }

  const phoneVerified = otpStage === "verified" && verifiedPhone === phone;

  return (
    <form className="ticket enquiry-card enquiry-form" onSubmit={handleSubmit}>
      <div className="enquiry-field">
        <label className="otp-label-text" htmlFor="enq-name">
          Full name
        </label>
        <input
          id="enq-name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Your name"
          className="enquiry-input"
          autoComplete="name"
        />
      </div>

      <div className="enquiry-field">
        <label className="otp-label-text" htmlFor="enq-phone">
          Mobile number
        </label>
        <div className="otp-phone-field">
          <span className="otp-phone-prefix">+91</span>
          <input
            id="enq-phone"
            type="tel"
            inputMode="numeric"
            maxLength={10}
            value={phone}
            onChange={(e) => handlePhoneChange(e.target.value)}
            placeholder="98765 43210"
            className="otp-phone-input"
            disabled={otpStage === "sending" || otpStage === "verifying"}
          />
          {phoneVerified && <span className="enquiry-verified-badge">Verified</span>}
        </div>
      </div>

      <div className="enquiry-grid-2">
        <div className="enquiry-field">
          <label className="otp-label-text" htmlFor="enq-email">
            Email <span className="enquiry-optional">(optional)</span>
          </label>
          <input
            id="enq-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="enquiry-input"
            autoComplete="email"
          />
        </div>

        <div className="enquiry-field">
          <label className="otp-label-text" htmlFor="enq-vehicle">
            Vehicle type <span className="enquiry-optional">(optional)</span>
          </label>
          <select
            id="enq-vehicle"
            value={vehicleType}
            onChange={(e) => setVehicleType(e.target.value)}
            className="enquiry-input"
          >
            <option value="">Select a category</option>
            {VEHICLE_OPTIONS.map((v) => (
              <option key={v} value={v}>
                {v}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="enquiry-field">
        <label className="otp-label-text" htmlFor="enq-date">
          Travel date <span className="enquiry-optional">(optional)</span>
        </label>
        <input
          id="enq-date"
          type="date"
          min={TODAY}
          value={tripDate}
          onChange={(e) => setTripDate(e.target.value)}
          className="enquiry-input"
        />
      </div>

      <div className="enquiry-field">
        <label className="otp-label-text" htmlFor="enq-message">
          Trip details <span className="enquiry-optional">(optional)</span>
        </label>
        <textarea
          id="enq-message"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="From, to, number of passengers, dates..."
          className="enquiry-input enquiry-textarea"
          rows={3}
        />
      </div>

      {/* OTP verification gate */}
      <div className="enquiry-otp-block">
        {otpStage !== "sent" && otpStage !== "verifying" && !phoneVerified && (
          <>
            <div className="otp-captcha-header">
              <span className="otp-label-text">Verification code</span>
              <button
                type="button"
                onClick={loadCaptcha}
                disabled={captchaLoading}
                className="otp-captcha-refresh"
              >
                {captchaLoading ? "Loading…" : "Get a new code"}
              </button>
            </div>
            <div className="otp-captcha-row">
              <div className="ticket otp-captcha-image">
                {captchaSvg ? (
                  <div className="otp-captcha-svg" dangerouslySetInnerHTML={{ __html: captchaSvg }} />
                ) : (
                  <span className="otp-captcha-placeholder">
                    {captchaLoading ? "Loading…" : "Unavailable"}
                  </span>
                )}
              </div>
              <input
                type="text"
                value={captchaAnswer}
                onChange={(e) => setCaptchaAnswer(e.target.value)}
                placeholder="Type the code"
                className="otp-captcha-input"
                autoComplete="off"
              />
            </div>

            <button
              type="button"
              onClick={handleSendOtp}
              disabled={otpStage === "sending" || !widgetReady || captchaLoading}
              className="btn btn-outline btn-block enquiry-send-otp-btn"
            >
              {otpStage === "sending" ? "Sending OTP…" : "Send OTP to verify number"}
            </button>
          </>
        )}

        {(otpStage === "sent" || otpStage === "verifying") && !phoneVerified && (
          <div className="enquiry-otp-verify">
            <p className="otp-label-text">Enter the 4-digit code sent to +91 {phone}</p>
            <div className="otp-digits-row">
              {otpDigits.map((digit, i) => (
                <input
                  key={i}
                  ref={(el) => (otpRefs.current[i] = el)}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleOtpDigitChange(i, e.target.value)}
                  onKeyDown={(e) => handleOtpKeyDown(i, e)}
                  disabled={otpStage === "verifying"}
                  className="otp-digit-input"
                />
              ))}
            </div>
            <button
              type="button"
              onClick={handleResend}
              disabled={cooldown > 0}
              className="otp-resend"
            >
              {cooldown > 0 ? `Resend OTP in ${cooldown}s` : "Resend OTP"}
            </button>
          </div>
        )}

        {phoneVerified && (
          <p className="enquiry-verified-note">
            ✓ Mobile number verified — you can submit your enquiry now.
          </p>
        )}
      </div>

      {error && <p className="otp-error">{error}</p>}

      <button
        type="submit"
        className="btn btn-primary btn-block"
        disabled={!phoneVerified || submitting}
        title={!phoneVerified ? "Verify your mobile number with OTP first" : undefined}
      >
        {submitting ? "Sending…" : "Submit enquiry"}
      </button>
    </form>
  );
}
