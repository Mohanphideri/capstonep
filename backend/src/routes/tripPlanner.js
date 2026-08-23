const express = require("express");
const router = express.Router();

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

  const confidence = Math.min(99, 58 + entities.length * 6 + preferences.length * 4 + constraints.length * 5 + (dates.length ? 7 : 0));
  const routeQuality = places.length >= 2 ? "multi-stop route" : places.length === 1 ? "single-anchor route" : "destination discovery needed";
  const plannerNotes = [];
  if (!day) plannerNotes.push("Trip length is missing; start with 2–3 days and refine after the destination is confirmed.");
  if (!places.length) plannerNotes.push("No supported destination was detected; ask for a city, state or region.");
  if (people && Number(people[1]) > 40) plannerNotes.push("Large group detected; split vehicle matching by capacity and keep a group-lead contact in the enquiry.");
  if (children) plannerNotes.push(`Family composition detected: ${children[1]} children. Keep daily transitions comfortable.`);
  if (constraints.includes("reduce driving load")) plannerNotes.push("Prioritize geographic clustering and buffer time over maximum sightseeing.");
  if (preferences.includes("adventure")) plannerNotes.push("Keep outdoor activities flexible because actual operating conditions can change.");
  if (preferences.includes("food")) plannerNotes.push("Add local-food windows without treating restaurants as confirmed bookings.");

  return {
    success: true,
    analysis: {
      raw: text,
      intent,
      confidence,
      entities,
      constraints,
      preferences: [...new Set(preferences)],
      routeQuality,
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
      safety: "Recommendations are planning proposals only. Fleet availability, hotel inventory, activities, timings and prices require confirmation by Kuwarji Travels.",
    },
  };
}

router.post("/analyze", (req, res) => {
  try {
    const { prompt } = req.body || {};
    if (typeof prompt !== "string" || prompt.trim().length < 3) {
      return res.status(400).json({ success: false, error: "Please provide a trip description." });
    }
    if (prompt.length > 3000) return res.status(400).json({ success: false, error: "Trip description is too long." });
    return res.json(analyzePrompt(prompt));
  } catch (err) {
    return res.status(500).json({ success: false, error: "Trip planner could not analyze the request." });
  }
});

router.post("/plan", (req, res) => {
  try {
    const { plan = {} } = req.body || {};
    const days = Math.max(1, Math.min(30, Number(plan.days || 3)));
    const places = Array.isArray(plan.selectedPlaces) && plan.selectedPlaces.length ? plan.selectedPlaces : ["Flexible destination day"];
    const interests = Array.isArray(plan.interests) && plan.interests.length ? plan.interests : ["sightseeing"];
    const pace = plan.pace || "balanced";
    const style = plan.style || "family";
    const itinerary = Array.from({ length: days }, (_, i) => {
      const place = places[i % places.length];
      const next = places[(i + 1) % places.length];
      const transfer = i === 0 ? `Begin from ${plan.start || "your pickup point"} toward ${place}.` : `Use ${pace} routing around ${place}${next !== place ? ` and nearby ${next}` : ""}.`;
      const activity = interests.slice(0, 3).join(", ");
      return {
        day: i + 1,
        title: i === 0 ? `Arrival & ${place}` : `${place} · ${activity}`,
        morning: `${transfer} Start around ${plan.dailyStart || "08:00"} with a realistic buffer.`,
        afternoon: `Build the main ${activity} block, with a ${plan.mealPreference || "local"} meal break and recovery time.`,
        evening: style === "premium" ? "Comfort-first evening with flexible local exploration." : "Relaxed local time and target return before the preferred cutoff.",
        body: `AI-planned day ${i + 1}: ${transfer} Prioritize ${activity}. This is a proposal, not a confirmed booking.`,
      };
    });
    res.json({ success: true, itinerary, planVersion: Date.now() });
  } catch (err) {
    res.status(500).json({ success: false, error: "Trip plan generation failed." });
  }
});

module.exports = router;
