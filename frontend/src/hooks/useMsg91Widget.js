import { useEffect, useRef, useState } from "react";

const WIDGET_ID = import.meta.env.VITE_MSG91_WIDGET_ID;
const TOKEN_AUTH = import.meta.env.VITE_MSG91_TOKEN_AUTH;
const WIDGET_SCRIPT_SRC = "https://verify.msg91.com/otp-provider.js";

/**
 * Loads the MSG91 OTP widget script and exposes the same window-level
 * sendOtp / verifyOtp / retryOtp functions that OtpLogin.jsx uses, so any
 * component (login, enquiry form, etc.) can gate an action behind a real
 * SMS OTP without duplicating the script-loading logic.
 */
export function useMsg91Widget() {
  const [widgetReady, setWidgetReady] = useState(false);
  const configured = Boolean(WIDGET_ID && TOKEN_AUTH);

  useEffect(() => {
    if (!configured) return undefined;

    function handleWidgetLoad() {
      if (!window.initSendOTP) return;

      window.initSendOTP({
        widgetId: WIDGET_ID,
        tokenAuth: TOKEN_AUTH,
        exposeMethods: true,
        success: () => {},
        failure: () => {},
      });

      setWidgetReady(true);
    }

    let script = document.querySelector(`script[src="${WIDGET_SCRIPT_SRC}"]`);

    if (!script) {
      script = document.createElement("script");
      script.src = WIDGET_SCRIPT_SRC;
      script.async = true;
      document.body.appendChild(script);
    }

    script.addEventListener("load", handleWidgetLoad);

    if (window.initSendOTP) {
      handleWidgetLoad();
    }

    return () => {
      script.removeEventListener("load", handleWidgetLoad);
    };
  }, [configured]);

  return { configured, widgetReady };
}

// MSG91's widget failure callback often returns its own internal error
// code as `message` (e.g. "AuthenticationFailure" for a wrong/stale OTP)
// rather than something a user can act on. Translate the ones we know.
const FRIENDLY_OTP_ERRORS = [
  {
    match: /auth(entication)?.?fail/i,
    text: "That code didn't match. Please check and try again.",
  },
  {
    match: /otp.?mismatch|invalid.?otp|wrong.?otp/i,
    text: "That code didn't match. Please check and try again.",
  },
  {
    match: /expir/i,
    text: "That code has expired. Tap resend to get a new one.",
  },
  {
    match: /max.?attempt|too.?many/i,
    text: "Too many incorrect attempts. Tap resend to get a new one.",
  },
];

export function otpErrorMessage(err) {
  let raw = null;
  if (typeof err === "string" && err) {
    raw = err;
  } else if (err && typeof err === "object") {
    if (typeof err.message === "string" && err.message) raw = err.message;
    else if (typeof err.type === "string" && err.type) raw = err.type;
  }

  if (!raw) return "Something went wrong. Please try again.";

  const rule = FRIENDLY_OTP_ERRORS.find((r) => r.match.test(raw));
  return rule ? rule.text : raw;
}

export function useCooldown(seconds) {
  const [cooldown, setCooldown] = useState(0);
  const timer = useRef(null);

  function start() {
    if (timer.current) clearInterval(timer.current);
    setCooldown(seconds);
    timer.current = setInterval(() => {
      setCooldown((current) => {
        if (current <= 1) {
          if (timer.current) clearInterval(timer.current);
          timer.current = null;
          return 0;
        }
        return current - 1;
      });
    }, 1000);
  }

  useEffect(() => () => timer.current && clearInterval(timer.current), []);

  return [cooldown, start];
}
