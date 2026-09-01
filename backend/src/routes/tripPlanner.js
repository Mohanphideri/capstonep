const express = require("express");
const router = express.Router();
const llm = require("../lib/llm");
const { createRateLimiter } = require("../middleware/rateLimit");
const { attachSessionIfPresent } = require("../middleware/requireAuth");

// Trip Planner guest allowance: exactly 2 messages per 5-hour window.
// Authenticated customers are not subject to this guest allowance.
// The limiter is intentionally server-side so clearing localStorage cannot
// bypass the free-message rule. This in-memory store should be moved to Redis
// when the deployment runs multiple backend instances.
const GUEST_WINDOW_MS = 5 * 60 * 60 * 1000;
const GUEST_MAX_MESSAGES = 2;
const guestUsage = new Map();

function getClientKey(req) {
  const forwarded = String(req.headers["x-forwarded-for"] || "").split(",")[0].trim();
  return forwarded || req.ip || "unknown";
}

function chatRateLimit(req, res, next) {
  if (req.session) return next();

  const key = getClientKey(req);
  const now = Date.now();
  let entry = guestUsage.get(key);
  if (!entry || entry.resetAt <= now) {
    entry = { count: 0, resetAt: now + GUEST_WINDOW_MS };
    guestUsage.set(key, entry);
  }

  if (entry.count >= GUEST_MAX_MESSAGES) {
    const retryAfterMs = Math.max(0, entry.resetAt - now);
    return res.status(429).json({
      success: false,
      error: `You've used your 2 free Trip Planner messages. They reset automatically in 5 hours.`,
      retryAfterMs,
      resetAt: entry.resetAt,
      remaining: 0,
    });
  }

  entry.count += 1;
  res.setHeader("X-Trip-Planner-Free-Remaining", String(Math.max(0, GUEST_MAX_MESSAGES - entry.count)));
  res.setHeader("X-Trip-Planner-Free-Reset", String(entry.resetAt));
  return next();
}

const REGIONS = {
  Punjab: ["Amritsar", "Anandpur Sahib", "Patiala"],
  Himachal: ["Manali", "Shimla", "Dharamshala"],
  Rajasthan: ["Jaipur", "Udaipur", "Jaisalmer"],
  Uttarakhand: ["Rishikesh", "Mussoorie", "Nainital"],
  Goa: ["North Goa", "South Goa", "Old Goa"],
  Kerala: ["Alleppey", "Munnar", "Kochi"],
  Maharashtra: ["Mumbai", "Lonavala", "Mahabaleshwar"],
  JammuAndKashmir: ["Srinagar", "Gulmarg", "Pahalgam"],
};

const PLACE_TO_REGION = Object.entries(REGIONS).reduce((acc, [region, places]) => {
  places.forEach((place) => { acc[place.toLowerCase()] = region; });
  return acc;
}, {});

function firstMatch(text, patterns) {
  return patterns.find((p) => p.re.test(text));
}

// Deterministic, keyword-based fallback used to shape a reply when no
// GROQ_API_KEY is configured, or a Groq call fails/times out.
function analyzePrompt(input) {
  const text = String(input || "").trim();
  const q = text.toLowerCase();
  const entities = [];
  const constraints = [];
  const preferences = [];

  const day = q.match(/\b(\d{1,2})\s*(?:day|days|d)\b/);
  const people = q.match(/\b(?:for|with)\s+(\d{1,3})\s*(?:people|persons|travellers|travelers|pax|members)\b/);
  const children = q.match(/\b(\d{1,2})\s*(?:children|kids)\b/);
  const dates = text.match(/\b\d{4}-\d{2}-\d{2}\b/g) || [];

  let region = Object.keys(REGIONS).find((r) => q.includes(r.toLowerCase()));
  const places = Object.keys(PLACE_TO_REGION).filter((p) => q.includes(p));
  if (!region && places[0]) region = PLACE_TO_REGION[places[0]];
  if (region) entities.push(`region: ${region === "JammuAndKashmir" ? "Jammu & Kashmir" : region}`);
  places.forEach((p) => entities.push(`destination: ${p.replace(/\b\w/g, (m) => m.toUpperCase())}`));
  if (day) entities.push(`${day[1]} days`);
  if (people) entities.push(`${people[1]} travellers`);

  const styleMatch = firstMatch(q, [
    { re: /premium|luxury|vip/, value: "premium" },
    { re: /budget|cheap|economical|value/, value: "budget" },
    { re: /overnight|night journey|sleeper/, value: "overnight" },
    { re: /family|kids|children/, value: "family" },
  ]);
  const paceMatch = firstMatch(q, [
    { re: /very relaxed|slow|easy|leisurely/, value: "relaxed" },
    { re: /packed|maximize|maximum|as much as possible/, value: "packed" },
  ]);

  if (styleMatch) preferences.push(`${styleMatch.value} travel`);
  if (paceMatch) preferences.push(`${paceMatch.value} pace`);

  const interestMap = [
    ["food", /food|culinary|restaurant|cafe/], ["nature", /nature|mountain|lake|forest|waterfall/],
    ["heritage", /heritage|fort|palace|temple|history/], ["shopping", /shopping|market|bazaar/],
    ["adventure", /adventure|trek|rafting|outdoor|paragliding/], ["photography", /photo|photography|sunset|instagram/],
    ["family", /family|kids|children/], ["beach", /beach|sea|coast/],
  ];
  interestMap.forEach(([name, re]) => { if (re.test(q)) preferences.push(name); });

  if (/avoid|skip|don't|do not|no\s+(night|long|late)/.test(q)) constraints.push("explicit avoidance constraint");
  if (/avoid long driving|less driving|short drives|easy drives/.test(q)) constraints.push("reduce driving load");
  if (/early start|early morning|start early/.test(q)) constraints.push("early departures");
  if (/late start|sleep in/.test(q)) constraints.push("later mornings");
  if (/no hotel|same day|day trip/.test(q)) constraints.push("day-trip / no overnight stay");
  if (/child|kids|family/.test(q)) constraints.push("family-friendly pacing");
  if (/wheelchair|mobility|accessible/.test(q)) constraints.push("accessibility requirement");

  let intent = "leisure group travel";
  if (/honeymoon|romantic|couple/.test(q)) intent = "romantic getaway";
  else if (/corporate|business|conference|office/.test(q)) intent = "corporate travel";
  else if (/pilgrimage|temple|religious|darshan/.test(q)) intent = "pilgrimage journey";
  else if (/adventure|trek|rafting/.test(q)) intent = "adventure escape";
  else if (/family|kids/.test(q)) intent = "family holiday";

  const plannerNotes = [];
  if (!day) plannerNotes.push("Trip length is missing; start with 2–3 days and refine after the destination is confirmed.");
  if (!places.length) plannerNotes.push("No supported destination was detected; ask for a city, state or region.");
  if (people && Number(people[1]) > 40) plannerNotes.push("Large group detected; split vehicle matching by capacity and keep a group-lead contact in the enquiry.");
  if (children) plannerNotes.push(`Family composition detected: ${children[1]} children. Keep daily transitions comfortable.`);
  if (constraints.includes("reduce driving load")) plannerNotes.push("Prioritize geographic clustering and buffer time over maximum sightseeing.");
  if (preferences.includes("adventure")) plannerNotes.push("Keep outdoor activities flexible because actual operating conditions can change.");
  if (preferences.includes("food")) plannerNotes.push("Add local-food windows without treating restaurants as confirmed bookings.");

  return {
    analysis: {
      raw: text,
      intent,
      entities,
      constraints,
      preferences: [...new Set(preferences)],
      days: day ? Number(day[1]) : null,
      travelers: people ? Number(people[1]) : null,
      children: children ? Number(children[1]) : 0,
      region: region || null,
      destinations: places.map((p) => p.replace(/\b\w/g, (m) => m.toUpperCase())),
      dates,
      plannerNotes,
      nextQuestions: [
        !places.length ? "What destination or region do you want to visit?" : null,
        !day ? "How many days should I plan?" : null,
        !people ? "How many travellers are going?" : null,
      ].filter(Boolean),
    },
  };
}

// Dedicated Trip Planner endpoint. The general customer chatbot uses the
// separate /api/chatbot endpoint and never opens this flow.
router.post("/chat", attachSessionIfPresent, chatRateLimit, async (req, res) => {
  try {
    const { messages } = req.body || {};
    if (!Array.isArray(messages) || !messages.length) {
      return res.status(400).json({ success: false, error: "messages array is required." });
    }
    const trimmed = messages
      .slice(-12)
      .map((m) => ({ role: m?.role === "assistant" ? "assistant" : "user", text: String(m?.text || "").slice(0, 2000) }))
      .filter((m) => m.text.trim().length);
    if (!trimmed.length) return res.status(400).json({ success: false, error: "messages array is required." });

    const reply = await llmChatReply(trimmed);
    return res.json({ success: true, reply });
  } catch (err) {
    return res.status(500).json({ success: false, error: "The assistant is temporarily unavailable." });
  }
});

async function llmChatReply(messages) {
  const regionList = Object.keys(REGIONS)
    .map((r) => `${r === "JammuAndKashmir" ? "Jammu & Kashmir" : r}: ${REGIONS[r].join(", ")}`)
    .join("\n");

  if (llm.isConfigured()) {
    const system = `You are the friendly AI trip-planning assistant on the Kuwarji Travels website, a bus/car/tempo-traveller rental company in India. Kuwarji currently plans trips to these destinations only — steer the conversation toward them and never invent other destinations:
${regionList}

Have a natural, helpful conversation about the traveller's trip idea: ask a clarifying question if key details (destination, days, group size) are missing, or give a short, concrete suggestion (route, pace, ideal trip length) if you have enough to work with. Keep replies conversational, under about 120 words, and no more than 30 lines. Never invent confirmed prices, hotel names, or exact bus availability — remind the traveller that a real quote comes from the Kuwarji team via an enquiry. Respond with ONLY a single JSON object of the shape {"reply": "your response text"} — no markdown fences, no extra keys.`;

    const conversation = messages.map((m) => `${m.role === "assistant" ? "Assistant" : "Traveller"}: ${m.text}`).join("\n");
    const parsed = await llm.askForJson({ system, user: conversation, temperature: 0.6 });
    if (parsed && typeof parsed.reply === "string" && parsed.reply.trim()) return parsed.reply.trim();
  }

  // Fallback — used when no GROQ_API_KEY is configured, or the call failed.
  const lastUser = [...messages].reverse().find((m) => m.role === "user");
  const analysis = analyzePrompt(lastUser?.text || "").analysis;
  const bits = [];
  if (analysis.destinations?.length) bits.push(`heading to ${analysis.destinations.join(", ")}`);
  if (analysis.days) bits.push(`${analysis.days} days`);
  if (analysis.travelers) bits.push(`${analysis.travelers} travellers`);
  const summary = bits.length ? bits.join(", ") : "your trip";
  const ask = analysis.nextQuestions?.[0];
  return `Got it — noting ${summary}. ${ask ? ask + " " : ""}Tell me a bit more and I can sketch a day-by-day plan matched to the Kuwarji fleet, or send an enquiry when you're ready.`;
}

module.exports = router;
