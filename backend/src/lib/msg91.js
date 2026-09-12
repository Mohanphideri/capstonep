const { env } = require("../env");

class Msg91VerificationError extends Error {}

/**
 * Verifies the JWT access-token issued by the MSG91 OTP Widget after a
 * successful client-side OTP flow. This is the server-side trust boundary:
 * the client can never be trusted to assert "I verified my own OTP".
 */
async function verifyMsg91AccessToken(accessToken) {
  const url = "https://control.msg91.com/api/v5/widget/verifyAccessToken";

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      authkey: env.msg91AuthKey,
      "access-token": accessToken,
    }),
    cache: "no-store",
  });

  let data;
  try {
    data = await response.json();
  } catch {
    throw new Msg91VerificationError(
      "MSG91 returned an unreadable response while verifying the OTP token."
    );
  }

  if (!response.ok || data.type !== "success") {
    throw new Msg91VerificationError(
      typeof data.message === "string"
        ? data.message
        : "OTP verification failed. Please try again."
    );
  }

  // MSG91 returns the verified identifier (mobile number, possibly with
  // country code) in `message` on success.
  return { verifiedIdentifier: String(data.message) };
}

/**
 * Normalizes a verified identifier down to digits only, and strips a
 * leading country code (default 91) so we store a consistent phone key.
 */
function normalizePhone(identifier) {
  const digitsOnly = identifier.replace(/\D/g, "");
  if (digitsOnly.length > 10) {
    return digitsOnly.slice(-10);
  }
  return digitsOnly;
}

module.exports = { Msg91VerificationError, verifyMsg91AccessToken, normalizePhone };
