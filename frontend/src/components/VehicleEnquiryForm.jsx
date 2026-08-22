import { useCallback, useEffect, useRef, useState } from "react";
import { apiFetch } from "../api.js";
import { useMsg91Widget, otpErrorMessage, useCooldown } from "../hooks/useMsg91Widget.js";
import "./OtpLogin.css";
import "./EnquiryForm.css";

const OTP_LENGTH = 4;
const RESEND_COOLDOWN_SECONDS = 30;

const TRIP_TYPES = [
  { value: "ONE_WAY", label: "One-way" },
  { value: "ROUND_TRIP", label: "Round trip" },
  { value: "LOCAL", label: "Local / in-city" },
  { value: "OUTSTATION", label: "Outstation" },
];

/**
 * Vehicle detail page's "Enquire Now" form. Same OTP-verification flow as
 * the general EnquiryForm (site-wide drawer) — this isn't a second
 * authentication system, it's the same MSG91 widget + server-side
 * re-verification — but adds the trip fields a travel enquiry actually
 * needs, and is always tied to the vehicle the customer was looking at.
 *
 * This never books anything, checks availability, or shows a price —
 * submitting only creates an Enquiry row for the team to follow up on.
 */
export function VehicleEnquiryForm({ vehicle, vehicles, onSubmitted }) {
  // Accepts either a single `vehicle` (legacy single-vehicle enquiry from
  // a vehicle detail page) or a `vehicles` array (multi-vehicle enquiry
  // from the cart on the listing page) — normalized to one list so the
  // rest of the form doesn't need to care which caller it came from.
  const selectedVehicles = vehicles?.length ? vehicles : vehicle ? [vehicle] : [];
  const { configured, widgetReady } = useMsg91Widget();
  const [cooldown, startCooldown] = useCooldown(RESEND_COOLDOWN_SECONDS);

  // Contact fields
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");

  // Trip fields
  const [pickupLocation, setPickupLocation] = useState("");
  const [destination, setDestination] = useState("");
  const [tripDate, setTripDate] = useState("");
  const [returnDate, setReturnDate] = useState("");
  const [passengers, setPassengers] = useState("");
  const [tripType, setTripType] = useState("");
  const [message, setMessage] = useState("");

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
          vehicleId: selectedVehicles[0]?.id,
          vehicleType: selectedVehicles.length > 1 ? undefined : selectedVehicles[0]?.name,
          selectedVehicleIds: selectedVehicles.map((v) => v.id),
          pickupLocation: pickupLocation.trim() || undefined,
          destination: destination.trim() || undefined,
          tripDate: tripDate || undefined,
          returnDate: returnDate || undefined,
          passengers: passengers ? Number(passengers) : undefined,
          tripType: tripType || undefined,
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
      onSubmitted?.();
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
          Thank you for your enquiry. Our team will connect with you soon.
        </p>
      </div>
    );
  }

  const phoneVerified = otpStage === "verified" && verifiedPhone === phone;

  return (
    <form className="ticket enquiry-card enquiry-form" onSubmit={handleSubmit}>
      <div className="enquiry-field">
        <label className="otp-label-text">
          {selectedVehicles.length > 1 ? `Vehicles (${selectedVehicles.length} selected)` : "Vehicle"}
        </label>
        {selectedVehicles.length > 1 ? (
          <ul className="enquiry-vehicle-list">
            {selectedVehicles.map((v) => (
              <li key={v.id} className="enquiry-input enquiry-vehicle-locked">
                {v.name}
              </li>
            ))}
          </ul>
        ) : (
          <div className="enquiry-input enquiry-vehicle-locked">
            {selectedVehicles[0]?.name || "Selected vehicle"}
          </div>
        )}
      </div>

      <div className="enquiry-field">
        <label className="otp-label-text" htmlFor="veh-enq-name">
          Full name
        </label>
        <input
          id="veh-enq-name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Your name"
          className="enquiry-input"
          autoComplete="name"
        />
      </div>

      <div className="enquiry-field">
        <label className="otp-label-text" htmlFor="veh-enq-phone">
          Mobile number
        </label>
        <div className="otp-phone-field">
          <span className="otp-phone-prefix">+91</span>
          <input
            id="veh-enq-phone"
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

      <div className="enquiry-field">
        <label className="otp-label-text" htmlFor="veh-enq-email">
          Email <span className="enquiry-optional">(optional)</span>
        </label>
        <input
          id="veh-enq-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          className="enquiry-input"
          autoComplete="email"
        />
      </div>

      <div className="enquiry-grid-2">
        <div className="enquiry-field">
          <label className="otp-label-text" htmlFor="veh-enq-pickup">
            Pickup location <span className="enquiry-optional">(optional)</span>
          </label>
          <input
            id="veh-enq-pickup"
            type="text"
            value={pickupLocation}
            onChange={(e) => setPickupLocation(e.target.value)}
            placeholder="e.g. Sector 22, Chandigarh"
            className="enquiry-input"
          />
        </div>
        <div className="enquiry-field">
          <label className="otp-label-text" htmlFor="veh-enq-destination">
            Destination <span className="enquiry-optional">(optional)</span>
          </label>
          <input
            id="veh-enq-destination"
            type="text"
            value={destination}
            onChange={(e) => setDestination(e.target.value)}
            placeholder="e.g. Manali"
            className="enquiry-input"
          />
        </div>
      </div>

      <div className="enquiry-grid-2">
        <div className="enquiry-field">
          <label className="otp-label-text" htmlFor="veh-enq-date">
            Travel date <span className="enquiry-optional">(optional)</span>
          </label>
          <input
            id="veh-enq-date"
            type="date"
            value={tripDate}
            onChange={(e) => setTripDate(e.target.value)}
            className="enquiry-input"
          />
        </div>
        <div className="enquiry-field">
          <label className="otp-label-text" htmlFor="veh-enq-return">
            Return date <span className="enquiry-optional">(if applicable)</span>
          </label>
          <input
            id="veh-enq-return"
            type="date"
            value={returnDate}
            onChange={(e) => setReturnDate(e.target.value)}
            className="enquiry-input"
          />
        </div>
      </div>

      <div className="enquiry-grid-2">
        <div className="enquiry-field">
          <label className="otp-label-text" htmlFor="veh-enq-passengers">
            Passengers <span className="enquiry-optional">(optional)</span>
          </label>
          <input
            id="veh-enq-passengers"
            type="number"
            min={1}
            max={500}
            value={passengers}
            onChange={(e) => setPassengers(e.target.value)}
            placeholder="e.g. 32"
            className="enquiry-input"
          />
        </div>
        <div className="enquiry-field">
          <label className="otp-label-text" htmlFor="veh-enq-trip-type">
            Trip type <span className="enquiry-optional">(optional)</span>
          </label>
          <select
            id="veh-enq-trip-type"
            value={tripType}
            onChange={(e) => setTripType(e.target.value)}
            className="enquiry-input"
          >
            <option value="">Select trip type</option>
            {TRIP_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="enquiry-field">
        <label className="otp-label-text" htmlFor="veh-enq-message">
          Additional requirements <span className="enquiry-optional">(optional)</span>
        </label>
        <textarea
          id="veh-enq-message"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Anything else the team should know…"
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
