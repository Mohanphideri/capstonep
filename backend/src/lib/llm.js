/**
 * Thin wrapper around Groq's free, OpenAI-compatible chat completions API.
 * Used by the AI trip-planning assistant (src/routes/tripPlanner.js).
 *
 * Get a free key (no credit card) at https://console.groq.com/keys and set
 * GROQ_API_KEY in the backend .env file. If the key is missing, or a call
 * fails/times out, callers should fall back to the deterministic rule-based
 * planner — this module never throws for "no key configured", it just
 * returns null so the caller can decide what to do.
 */

const { env } = require("../env");

const GROQ_ENDPOINT = "https://api.groq.com/openai/v1/chat/completions";
const REQUEST_TIMEOUT_MS = 15000;

function isConfigured() {
  return Boolean(env.groqApiKey);
}

/**
 * Calls Groq's chat completions endpoint and forces a JSON-object response.
 * @param {Object} opts
 * @param {string} opts.system - system prompt
 * @param {string} opts.user - user prompt
 * @param {number} [opts.temperature]
 * @returns {Promise<Object|null>} parsed JSON object, or null on any failure
 */
async function askForJson({ system, user, temperature = 0.4 }) {
  if (!isConfigured()) return null;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(GROQ_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${env.groqApiKey}`,
      },
      body: JSON.stringify({
        model: env.groqModel,
        temperature,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      const text = await response.text().catch(() => "");
      console.error(`[llm] Groq request failed (${response.status}): ${text.slice(0, 300)}`);
      return null;
    }

    const data = await response.json();
    const content = data?.choices?.[0]?.message?.content;
    if (!content) return null;

    try {
      return JSON.parse(content);
    } catch (parseErr) {
      console.error("[llm] Groq returned non-JSON content:", parseErr.message);
      return null;
    }
  } catch (err) {
    if (err.name === "AbortError") {
      console.error("[llm] Groq request timed out");
    } else {
      console.error("[llm] Groq request error:", err.message);
    }
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

module.exports = { isConfigured, askForJson };
