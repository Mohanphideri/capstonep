import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch } from "../api.js";
import { useAuth } from "../AuthContext.jsx";
import { otpErrorMessage as errorMessage } from "../hooks/useMsg91Widget.js";
import "./OtpLogin.css";

const WIDGET_ID = import.meta.env.VITE_MSG91_WIDGET_ID;
const TOKEN_AUTH = import.meta.env.VITE_MSG91_TOKEN_AUTH;

const RESEND_COOLDOWN_SECONDS = 30;
const MAX_OTP_ATTEMPTS = 5;
const OTP_LENGTH = 4;
const WIDGET_SCRIPT_SRC = "https://verify.msg91.com/otp-provider.js";

export function OtpLogin({ nextPath = "/" }) {
  const navigate = useNavigate();
  const { refresh } = useAuth();

  const [widgetReady, setWidgetReady] = useState(false);
  const [step, setStep] = useState("phone");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const [cooldown, setCooldown] = useState(0);
  const [attemptsLeft, setAttemptsLeft] = useState(MAX_OTP_ATTEMPTS);

  const cooldownTimer = useRef(null);

  // CAPTCHA state
  const [captchaSvg, setCaptchaSvg] = useState("");
  const [captchaAnswer, setCaptchaAnswer] = useState("");
  const [captchaLoading, setCaptchaLoading] = useState(true);

  // OTP state
  const [otpDigits, setOtpDigits] = useState(
    Array(OTP_LENGTH).fill("")
  );
  const otpRefs = useRef([]);

  const configured = Boolean(WIDGET_ID && TOKEN_AUTH);

  /**
   * Load a new CAPTCHA from the Express backend.
   */
  const loadCaptcha = useCallback(async () => {
    setCaptchaLoading(true);
    setCaptchaAnswer("");
    setCaptchaSvg("");
    setError(null);

    try {
      const { ok, status, data } = await apiFetch("/api/captcha");

      if (ok && data?.success && data?.svg) {
        setCaptchaSvg(data.svg);
      } else {
        console.error("Invalid CAPTCHA response:", data);
        setCaptchaSvg("");
      }
    } catch (error) {
      console.error("CAPTCHA loading failed:", error);
      setCaptchaSvg("");
    } finally {
      setCaptchaLoading(false);
    }
  }, []);

  /**
   * Load MSG91 widget and initial CAPTCHA.
   */
  useEffect(() => {
    if (!configured) return;

    loadCaptcha();

    function handleWidgetLoad() {
      if (!window.initSendOTP) {
        console.error("MSG91 initSendOTP is not available.");
        return;
      }

      window.initSendOTP({
        widgetId: WIDGET_ID,
        tokenAuth: TOKEN_AUTH,
        exposeMethods: true,
        success: () => {},
        failure: () => {},
      });

      setWidgetReady(true);
    }

    let script = document.querySelector(
      `script[src="${WIDGET_SCRIPT_SRC}"]`
    );

    if (!script) {
      script = document.createElement("script");
      script.src = WIDGET_SCRIPT_SRC;
      script.async = true;
      document.body.appendChild(script);
    }

    script.addEventListener("load", handleWidgetLoad);

    // Widget may already be loaded.
    if (window.initSendOTP) {
      handleWidgetLoad();
    }

    return () => {
      script.removeEventListener("load", handleWidgetLoad);

      if (cooldownTimer.current) {
        clearInterval(cooldownTimer.current);
      }
    };
  }, [configured, loadCaptcha]);

  function startCooldown() {
    if (cooldownTimer.current) {
      clearInterval(cooldownTimer.current);
    }

    setCooldown(RESEND_COOLDOWN_SECONDS);

    cooldownTimer.current = setInterval(() => {
      setCooldown((current) => {
        if (current <= 1) {
          if (cooldownTimer.current) {
            clearInterval(cooldownTimer.current);
          }

          cooldownTimer.current = null;
          return 0;
        }

        return current - 1;
      });
    }, 1000);
  }

  async function handleSendOtp(e) {
    e.preventDefault();

    setError(null);

    const digits = phone.replace(/\D/g, "");

    if (digits.length !== 10) {
      setError("Enter a valid 10-digit mobile number.");
      return;
    }

    if (!captchaAnswer.trim()) {
      setError("Enter the code shown in the image.");
      return;
    }

    if (!widgetReady || !window.sendOtp) {
      setError(
        "Login is still loading. Please wait a moment and try again."
      );
      return;
    }

    setLoading(true);

    try {
      // Verify CAPTCHA on the server before sending SMS.
      const captchaResult = await apiFetch(
        "/api/captcha/verify",
        {
          method: "POST",
          body: JSON.stringify({
            answer: captchaAnswer.trim(),
          }),
        }
      );

      if (!captchaResult.ok || !captchaResult.data?.success) {
        setError(
          captchaResult.data?.error ||
            "That code didn't match."
        );

        await loadCaptcha();
        return;
      }

      window.sendOtp(
        `91${digits}`,

        () => {
          setLoading(false);
          setStep("otp");
          setOtpDigits(Array(OTP_LENGTH).fill(""));
          setAttemptsLeft(MAX_OTP_ATTEMPTS);
          startCooldown();

          setTimeout(() => {
            otpRefs.current[0]?.focus();
          }, 50);
        },

        (err) => {
          setLoading(false);
          setError(errorMessage(err));
          loadCaptcha();
        }
      );
    } catch (error) {
      console.error("Send OTP failed:", error);
      setLoading(false);
      setError("Unable to send OTP. Please try again.");
      loadCaptcha();
    }
  }

  function handleResend() {
    if (cooldown > 0 || !window.retryOtp || loading) {
      return;
    }

    setError(null);
    setLoading(true);

    window.retryOtp(
      "text",

      () => {
        setLoading(false);
        setOtpDigits(Array(OTP_LENGTH).fill(""));
        startCooldown();

        setTimeout(() => {
          otpRefs.current[0]?.focus();
        }, 50);
      },

      (err) => {
        setLoading(false);
        setError(errorMessage(err));
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
    if (
      e.key === "Backspace" &&
      !otpDigits[index] &&
      index > 0
    ) {
      otpRefs.current[index - 1]?.focus();
    }
  }

  function handleOtpPaste(e) {
    const pasted = e.clipboardData
      .getData("text")
      .replace(/\D/g, "")
      .slice(0, OTP_LENGTH);

    if (!pasted) return;

    e.preventDefault();

    const next = Array(OTP_LENGTH).fill("");

    pasted
      .split("")
      .forEach((digit, index) => {
        next[index] = digit;
      });

    setOtpDigits(next);

    const lastFilled =
      Math.min(pasted.length, OTP_LENGTH) - 1;

    otpRefs.current[lastFilled]?.focus();

    if (pasted.length === OTP_LENGTH) {
      submitOtp(pasted);
    }
  }

  function submitOtp(code) {
    setError(null);

    if (attemptsLeft <= 0) {
      setError(
        "Too many incorrect attempts. Please request a new OTP."
      );
      return;
    }

    if (!window.verifyOtp) {
      setError(
        "Login is still loading. Please wait a moment and try again."
      );
      return;
    }

    setLoading(true);

    window.verifyOtp(
      code,

      async (data = {}) => {
        try {
          // MSG91 widget returns the JWT/access token in message.
          const accessToken = data?.message;

          if (!accessToken) {
            setLoading(false);
            setError(
              "Verification did not return a token. Please try again."
            );
            return;
          }

          const result = await apiFetch(
            "/api/auth/verify",
            {
              method: "POST",
              body: JSON.stringify({
                accessToken,
              }),
            }
          );

          if (
            !result.ok ||
            !result.data?.success
          ) {
            setLoading(false);
            setError(
              result.data?.error ||
                "Login failed. Please try again."
            );
            return;
          }

          // Backend has created the session cookie.
          await refresh();

          setLoading(false);

          navigate(nextPath);
        } catch (error) {
          console.error("Authentication failed:", error);
          setLoading(false);
          setError(
            "Login failed. Please try again."
          );
        }
      },

      (err) => {
        setLoading(false);

        setAttemptsLeft((current) =>
          Math.max(0, current - 1)
        );

        setOtpDigits(Array(OTP_LENGTH).fill(""));

        otpRefs.current[0]?.focus();

        setError(errorMessage(err));
      }
    );
  }

  if (!configured) {
    return (
      <div className="ticket otp-card">
        <p className="otp-title">
          Login isn&apos;t configured yet
        </p>

        <p className="otp-subtitle">
          The site is missing{" "}
          <code className="otp-code">
            VITE_MSG91_WIDGET_ID
          </code>{" "}
          and/or{" "}
          <code className="otp-code">
            VITE_MSG91_TOKEN_AUTH
          </code>
          . Add these to your environment file and
          restart the dev server.
        </p>
      </div>
    );
  }

  return (
    <div className="ticket otp-card otp-card-padded">
      {step === "phone" && (
        <form
          onSubmit={handleSendOtp}
          className="otp-form"
        >
          <div>
            <p className="eyebrow">
              Customer login
            </p>

            <h1 className="otp-heading">
              Enter your mobile number
            </h1>

            <p className="otp-lead">
              We&apos;ll send a 4-digit code to verify
              it&apos;s you.
            </p>
          </div>

          <label className="otp-label">
            <span className="otp-label-text">
              Mobile number
            </span>

            <div className="otp-phone-field">
              <span className="otp-phone-prefix">
                +91
              </span>

              <input
                type="tel"
                inputMode="numeric"
                autoComplete="tel"
                maxLength={10}
                placeholder="98765 43210"
                value={phone}
                onChange={(e) =>
                  setPhone(
                    e.target.value.replace(/\D/g, "")
                  )
                }
                className="otp-phone-input"
              />
            </div>
          </label>

          {/* CAPTCHA */}
          <div>
            <div className="otp-captcha-header">
              <span className="otp-label-text">
                Verification code
              </span>

              <button
                type="button"
                onClick={loadCaptcha}
                disabled={captchaLoading}
                className="otp-captcha-refresh"
              >
                {captchaLoading
                  ? "Loading…"
                  : "Get a new code"}
              </button>
            </div>

            <div className="otp-captcha-row">
              <div className="ticket otp-captcha-image">
                {captchaSvg ? (
                  <div
                    className="otp-captcha-svg"
                    dangerouslySetInnerHTML={{
                      __html: captchaSvg,
                    }}
                  />
                ) : (
                  <span className="otp-captcha-placeholder">
                    {captchaLoading
                      ? "Loading…"
                      : "Unavailable"}
                  </span>
                )}
              </div>

              <input
                type="text"
                autoComplete="off"
                autoCapitalize="off"
                spellCheck={false}
                placeholder="Type the code"
                value={captchaAnswer}
                onChange={(e) =>
                  setCaptchaAnswer(e.target.value)
                }
                className="otp-captcha-input"
              />
            </div>

            <p className="otp-hint">
              Case doesn&apos;t matter. This confirms
              you&apos;re not a bot before we send an SMS.
            </p>
          </div>

          {error && (
            <p className="otp-error">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={
              loading ||
              !widgetReady ||
              captchaLoading
            }
            className="btn btn-primary btn-block"
          >
            {loading
              ? "Sending OTP…"
              : widgetReady
                ? "Send OTP"
                : "Loading…"}
          </button>
        </form>
      )}

      {step === "otp" && (
        <div className="otp-form">
          <div>
            <p className="eyebrow">
              Verify OTP
            </p>

            <h1 className="otp-heading">
              Enter the 4-digit code
            </h1>

            <p className="otp-lead">
              Sent to +91 {phone}.{" "}

              <button
                type="button"
                onClick={() => {
                  setStep("phone");
                  setOtpDigits(
                    Array(OTP_LENGTH).fill("")
                  );
                  setError(null);
                  loadCaptcha();
                }}
                className="otp-change-number"
              >
                Change number
              </button>
            </p>
          </div>

          <div>
            <span className="otp-label-text">
              One-time code
            </span>

            <div className="otp-digits-row">
              {otpDigits.map((digit, i) => (
                <input
                  key={i}
                  ref={(el) => {
                    otpRefs.current[i] = el;
                  }}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  autoComplete={
                    i === 0
                      ? "one-time-code"
                      : "off"
                  }
                  value={digit}
                  onChange={(e) =>
                    handleOtpDigitChange(
                      i,
                      e.target.value
                    )
                  }
                  onKeyDown={(e) =>
                    handleOtpKeyDown(i, e)
                  }
                  onPaste={
                    i === 0
                      ? handleOtpPaste
                      : undefined
                  }
                  disabled={loading}
                  className="otp-digit-input"
                />
              ))}
            </div>
          </div>

          {error && (
            <p className="otp-error">
              {error}
            </p>
          )}

          {attemptsLeft < MAX_OTP_ATTEMPTS &&
            attemptsLeft > 0 && (
              <p className="otp-hint">
                {attemptsLeft} attempt(s) remaining.
              </p>
            )}

          {loading && (
            <p className="otp-hint">
              Verifying…
            </p>
          )}

          <button
            type="button"
            onClick={handleResend}
            disabled={cooldown > 0 || loading}
            className="otp-resend"
          >
            {cooldown > 0
              ? `Resend OTP in ${cooldown}s`
              : "Resend OTP"}
          </button>
        </div>
      )}
    </div>
  );
}