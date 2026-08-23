import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { apiFetch } from "../api.js";
import { Navbar } from "../components/Navbar.jsx";
import { Footer } from "../components/Footer.jsx";
import ConsumerLayout from "../components/ConsumerLayout.jsx";
import LoginRequiredModal from "../components/LoginRequiredModal.jsx";
import { useAuth } from "../AuthContext.jsx";
import { EnquiryDrawer } from "../components/EnquiryDrawer.jsx";
import "./TripMaker.css";

const today = new Date();
const TODAY = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,"0")}-${String(today.getDate()).padStart(2,"0")}`;

const DESTINATIONS = {
  Punjab: {
    tagline: "Golden heritage, food trails and relaxed family travel.",
    places: [
      { name: "Amritsar", image: "https://images.unsplash.com/photo-1609947017136-9daf32a5eb16?auto=format&fit=crop&w=900&q=80", why: "Golden Temple, Wagah Border and famous Punjabi food." },
      { name: "Anandpur Sahib", image: "https://images.unsplash.com/photo-1587474260584-136574528ed5?auto=format&fit=crop&w=900&q=80", why: "Historic Sikh heritage and peaceful hill-edge scenery." },
      { name: "Patiala", image: "https://images.unsplash.com/photo-1599661046289-e31897846e41?auto=format&fit=crop&w=900&q=80", why: "Palaces, forts and a classic Punjabi cultural experience." },
    ],
  },
  Himachal: {
    tagline: "Mountain roads, cool weather and scenic group escapes.",
    places: [
      { name: "Manali", image: "https://images.unsplash.com/photo-1518005020951-eccb494ad742?auto=format&fit=crop&w=900&q=80", why: "Snow views, Solang Valley, cafes and adventure activities." },
      { name: "Shimla", image: "https://images.unsplash.com/photo-1597074866923-dc0589150358?auto=format&fit=crop&w=900&q=80", why: "Mall Road, colonial architecture and mountain viewpoints." },
      { name: "Dharamshala", image: "https://images.unsplash.com/photo-1605649487212-47bdab064df7?auto=format&fit=crop&w=900&q=80", why: "McLeod Ganj, monasteries and Himalayan landscapes." },
    ],
  },
  Rajasthan: {
    tagline: "Forts, palaces, desert sunsets and royal road trips.",
    places: [
      { name: "Jaipur", image: "https://images.unsplash.com/photo-1477587458883-47145ed94245?auto=format&fit=crop&w=900&q=80", why: "Amber Fort, City Palace, markets and heritage streets." },
      { name: "Udaipur", image: "https://images.unsplash.com/photo-1606298855672-3f1f6d7c3e5c?auto=format&fit=crop&w=900&q=80", why: "Lakes, palaces and a slower premium getaway." },
      { name: "Jaisalmer", image: "https://images.unsplash.com/photo-1477587458883-47145ed94245?auto=format&fit=crop&w=900&q=80", why: "Golden Fort, desert camps and sunset experiences." },
    ],
  },
  Uttarakhand: {
    tagline: "Rivers, temples, forests and Himalayan viewpoints.",
    places: [
      { name: "Rishikesh", image: "https://images.unsplash.com/photo-1605649487212-47bdab064df7?auto=format&fit=crop&w=900&q=80", why: "Ganga ghats, rafting, yoga and adventure activities." },
      { name: "Mussoorie", image: "https://images.unsplash.com/photo-1597074866923-dc0589150358?auto=format&fit=crop&w=900&q=80", why: "Hill walks, viewpoints and family-friendly sightseeing." },
      { name: "Nainital", image: "https://images.unsplash.com/photo-1597074866923-dc0589150358?auto=format&fit=crop&w=900&q=80", why: "Lake boating, Mall Road and cool mountain weather." },
    ],
  },
  Goa: {
    tagline: "Beach days, relaxed drives and easy group holidays.",
    places: [
      { name: "North Goa", image: "https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?auto=format&fit=crop&w=900&q=80", why: "Beaches, cafes, nightlife and water activities." },
      { name: "South Goa", image: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=900&q=80", why: "Quieter beaches, resorts and relaxed family time." },
      { name: "Old Goa", image: "https://images.unsplash.com/photo-1590050752117-23a9d5d4d8d8?auto=format&fit=crop&w=900&q=80", why: "Portuguese-era churches and heritage sightseeing." },
    ],
  },
  Kerala: {
    tagline: "Backwaters, beaches, tea country and slow travel.",
    places: [
      { name: "Alleppey", image: "https://images.unsplash.com/photo-1602216056096-3b40cc0c9944?auto=format&fit=crop&w=900&q=80", why: "Backwaters, houseboats and peaceful village scenery." },
      { name: "Munnar", image: "https://images.unsplash.com/photo-1593693411515-c20261bcad6e?auto=format&fit=crop&w=900&q=80", why: "Tea estates, viewpoints and cool hill weather." },
      { name: "Kochi", image: "https://images.unsplash.com/photo-1593693411515-c20261bcad6e?auto=format&fit=crop&w=900&q=80", why: "Fort Kochi, food, art and coastal heritage." },
    ],
  },
  Maharashtra: {
    tagline: "City breaks, forts, beaches and scenic weekend routes.",
    places: [
      { name: "Mumbai", image: "https://images.unsplash.com/photo-1570168007204-dfb528c6958f?auto=format&fit=crop&w=900&q=80", why: "Gateway of India, Marine Drive and city experiences." },
      { name: "Lonavala", image: "https://images.unsplash.com/photo-1605649487212-47bdab064df7?auto=format&fit=crop&w=900&q=80", why: "Monsoon valleys, forts and easy weekend travel." },
      { name: "Mahabaleshwar", image: "https://images.unsplash.com/photo-1597074866923-dc0589150358?auto=format&fit=crop&w=900&q=80", why: "Hill viewpoints, strawberry farms and cool weather." },
    ],
  },
  JammuAndKashmir: {
    tagline: "Lakes, valleys and memorable mountain scenery.",
    places: [
      { name: "Srinagar", image: "https://images.unsplash.com/photo-1609947017136-9daf32a5eb16?auto=format&fit=crop&w=900&q=80", why: "Dal Lake, houseboats, gardens and Kashmiri culture." },
      { name: "Gulmarg", image: "https://images.unsplash.com/photo-1518005020951-eccb494ad742?auto=format&fit=crop&w=900&q=80", why: "Mountain views, gondola rides and snow experiences." },
      { name: "Pahalgam", image: "https://images.unsplash.com/photo-1518005020951-eccb494ad742?auto=format&fit=crop&w=900&q=80", why: "Rivers, valleys and scenic family excursions." },
    ],
  },
};

const STATE_OPTIONS = Object.keys(DESTINATIONS).map((key) => ({
  value: key,
  label: key === "JammuAndKashmir" ? "Jammu & Kashmir" : key,
}));

function scoreVehicle(vehicle, travelers, style) {
  const seats = Number(vehicle.capacity || 0);
  let score = 0;
  if (seats >= travelers) score += 50;
  else score -= Math.min(40, (travelers - seats) * 8);
  if (style === "family" && vehicle.acType === "AC") score += 20;
  if (style === "premium" && vehicle.seatType === "SEMI_SLEEPER") score += 18;
  if (style === "overnight" && ["SLEEPER", "SEMI_SLEEPER"].includes(vehicle.seatType)) score += 30;
  if (style === "budget" && vehicle.acType === "NON_AC") score += 15;
  score += Number(vehicle.priority || 0) * 0.5;
  score += Number(vehicle.ratingAvg || 0) * 4;
  return score;
}

function TripMakerContent({ embedded = false }) {
  const [state, setState] = useState("Punjab");
  const [days, setDays] = useState(3);
  const [travelers, setTravelers] = useState(4);
  const [children, setChildren] = useState(0);
  const [luggage, setLuggage] = useState(2);
  const [departureDate, setDepartureDate] = useState("");
  const [returnDate, setReturnDate] = useState("");
  const [departureTime, setDepartureTime] = useState("08:00");
  const [tripType, setTripType] = useState("round");
  const [flexibleDates, setFlexibleDates] = useState(false);
  const [specialRequirements, setSpecialRequirements] = useState("");
  const [enquiryOpen, setEnquiryOpen] = useState(false);
  const [style, setStyle] = useState("family");
  const [pace, setPace] = useState("balanced");
  const [interests, setInterests] = useState(["sightseeing"]);
  const [stayLevel, setStayLevel] = useState("comfortable");
  const [stayType, setStayType] = useState("hotel");
  const [mealPreference, setMealPreference] = useState("local");
  const [activityLevel, setActivityLevel] = useState("moderate");
  const [budget, setBudget] = useState("mid");
  const [dailyStart, setDailyStart] = useState("08:00");
  const [returnBy, setReturnBy] = useState("20:00");
  const [customStops, setCustomStops] = useState("");
  const [notes, setNotes] = useState("");
  const [selectedPlaces, setSelectedPlaces] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [loadingVehicles, setLoadingVehicles] = useState(false);
  const [step, setStep] = useState(1);
  const [start, setStart] = useState("");
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [saved, setSaved] = useState(false);
  const [loginPrompt, setLoginPrompt] = useState(false);
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiMessages, setAiMessages] = useState([{ role: "assistant", text: "Tell me the trip you have in mind — for example, “3 days from Chandigarh to Manali for 6 people, family-friendly, relaxed pace.” I’ll translate it into a plan." }]);
  const [aiThinking, setAiThinking] = useState(false);
  const [aiVoiceListening, setAiVoiceListening] = useState(false);
  const [aiUnderstanding, setAiUnderstanding] = useState({ entities: [], constraints: [], intent: "leisure group travel", confidence: 54 });
  const [aiAlternatives, setAiAlternatives] = useState([]);
  const [aiAnalysis, setAiAnalysis] = useState(null);
  const [aiError, setAiError] = useState("");
  const [aiPlanLoading, setAiPlanLoading] = useState(false);
  const [planVersion, setPlanVersion] = useState(1);
  const { user, loading: authLoading } = useAuth();

  const destination = DESTINATIONS[state];

  useEffect(() => {
    setSelectedPlaces(destination.places.slice(0, 2).map((p) => p.name));
    setSelectedVehicle(null);
    setSaved(false);
  }, [state]);

  useEffect(() => {
    let cancelled = false;
    setLoadingVehicles(true);
    apiFetch("/api/vehicles?limit=50&sort=recommended").then(({ ok, data }) => {
      if (!cancelled && ok && data?.success) setVehicles(data.vehicles || []);
      if (!cancelled) setLoadingVehicles(false);
    });
    return () => { cancelled = true; };
  }, []);

  const recommendedVehicles = useMemo(() => [...vehicles]
    .filter((v) => Number(v.capacity || 0) >= Math.max(1, travelers - 2))
    .sort((a, b) => scoreVehicle(b, travelers, style) - scoreVehicle(a, travelers, style))
    .slice(0, 4), [vehicles, travelers, style]);

  useEffect(() => {
    if (!selectedVehicle && recommendedVehicles[0]) setSelectedVehicle(recommendedVehicles[0]);
  }, [recommendedVehicles, selectedVehicle]);

  useEffect(() => {
    if (tripType === "oneWay") { setDays(1); return; }
    if (!departureDate || !returnDate) return;
    const startDate = new Date(`${departureDate}T00:00:00`);
    const endDate = new Date(`${returnDate}T00:00:00`);
    const diff = Math.round((endDate - startDate) / 86400000);
    if (Number.isFinite(diff) && diff >= 0) setDays(Math.min(30, diff + 1));
  }, [departureDate, returnDate, tripType]);

  const openTripMaker = () => {
    if (!authLoading && !user) setLoginPrompt(true);
  };

  function next() {
    if (step === 1 && !start.trim()) return;
    setStep((s) => Math.min(8, s + 1));
  }
  function back() { setStep((s) => Math.max(1, s - 1)); }
  const itinerary = useMemo(() => {
    const places = [...selectedPlaces, ...customStops.split(",").map((x) => x.trim()).filter(Boolean)];
    const usablePlaces = places.length ? places : [destination.places[0].name];
    const interestText = interests.map((x) => x.replace(/-/g, " ")).join(", ");
    const totalDays = Math.max(1, Number(days) || 1);
    const paceBuffer = pace === "relaxed" ? "Build generous buffer time and avoid back-to-back major stops." : pace === "packed" ? "Use an early start and group nearby sights to reduce wasted movement." : "Balance two meaningful blocks with breaks and realistic transfer time.";
    return Array.from({ length: totalDays }, (_, index) => {
      const place = usablePlaces[index % usablePlaces.length];
      const details = destination.places.find((item) => item.name === place);
      const morning = pace === "relaxed" ? "Late breakfast and an easy morning" : pace === "packed" ? "Early departure and priority sightseeing" : "Breakfast and a comfortable morning departure";
      const activity = activityLevel === "active" ? "Prioritize an outdoor/adventure activity where appropriate" : activityLevel === "relaxed" ? "Keep the afternoon open for rest" : "Mix sightseeing with a relaxed break";
      const focus = details?.why || "Local sightseeing and a comfortable transfer.";
      const evening = interests.includes("food") ? "Dinner focused on local food experiences" : interests.includes("photography") ? "Golden-hour photography and relaxed evening" : "Free evening for rest and local exploration";
      const familyLayer = style === "family" ? "Include child-friendly pauses and avoid an overloaded schedule." : style === "premium" ? "Prioritize comfort, quality breaks and smoother transfers." : style === "budget" ? "Favor efficient routing and practical stops." : "Allow for a later finish where the group is comfortable.";
      return {
        day: index + 1,
        place,
        title: index === 0 ? `Start from ${start || "your pickup point"} and explore ${place}` : `Discover ${place} · ${interestText || "sightseeing"}`,
        morning: `${morning}. Prioritize ${interests[0] || "sightseeing"}.`,
        afternoon: `${focus} ${activity}. Allow a ${mealPreference} meal break and buffer time for the group.`,
        evening: `${evening}. Target return by ${returnBy}.`,
        body: `${morning}. ${focus} ${activity} ${familyLayer} ${paceBuffer} Plan a ${mealPreference} meal break and aim to return by ${returnBy}.`,
      };
    });
  }, [days, destination, selectedPlaces, customStops, interests, pace, activityLevel, mealPreference, returnBy, style, start, planVersion]);

  const aiInsights = useMemo(() => {
    const people = Math.max(1, Number(travelers || 0) + Number(children || 0));
    const stops = [...selectedPlaces, ...customStops.split(",").map((x) => x.trim()).filter(Boolean)];
    const density = stops.length / Math.max(1, Number(days) || 1);
    const fit = selectedVehicle ? Number(selectedVehicle.capacity || 0) >= people : false;
    const notes = [];
    if (density > 2.5) notes.push("The route is ambitious; the planner will group stops and protect buffer time.");
    else if (density <= 1) notes.push("The pace is spacious, leaving room for local discovery and rest.");
    else notes.push("The route has a balanced stop density for a multi-day group trip.");
    if (fit) notes.push(`${selectedVehicle.name} fits the current group size with ${Math.max(0, Number(selectedVehicle.capacity || 0) - people)} seat${Number(selectedVehicle.capacity || 0) - people === 1 ? "" : "s"} of headroom.`);
    else notes.push("Fleet matching is still flexible; the team can recommend a larger vehicle if required.");
    if (interests.length) notes.push(`The plan is weighted toward ${interests.slice(0, 3).join(", ")}${interests.length > 3 ? " and more" : ""}.`);
    return notes;
  }, [travelers, children, selectedPlaces, customStops, days, selectedVehicle, interests]);

  function buildAiUnderstanding(text, patch) {
    const q = text.toLowerCase();
    const entities = [];
    if (patch.state) entities.push(`region: ${STATE_OPTIONS.find((x) => x.value === patch.state)?.label || patch.state}`);
    if (patch.selectedPlaces?.length) entities.push(`destination: ${patch.selectedPlaces.join(", ")}`);
    if (patch.days) entities.push(`${patch.days} days`);
    if (patch.travelers) entities.push(`${patch.travelers} travellers`);
    if (/family|kids|children/.test(q)) entities.push("family-friendly");
    if (/luxury|premium|vip/.test(q)) entities.push("premium comfort");
    if (/budget|cheap|economical/.test(q)) entities.push("value-focused");
    const constraints = [];
    if (/avoid|skip|no\s+night|don't|do not/.test(q)) constraints.push("avoid/constraint detected");
    if (/early|morning/.test(q)) constraints.push("early starts");
    if (/late|sleep in/.test(q)) constraints.push("later starts");
    if (/less driving|short drive|easy drive/.test(q)) constraints.push("reduce driving load");
    if (/more places|maximum|packed/.test(q)) constraints.push("maximize sightseeing");
    const intent = /honeymoon|romantic/.test(q) ? "romantic getaway" : /business|corporate/.test(q) ? "corporate travel" : /pilgrimage|temple|religious/.test(q) ? "pilgrimage" : /adventure|trek|rafting/.test(q) ? "adventure trip" : /family|kids/.test(q) ? "family holiday" : "leisure group travel";
    const confidence = Math.min(98, 54 + entities.length * 7 + constraints.length * 5 + (patch.selectedPlaces?.length ? 10 : 0));
    return { entities, constraints, intent, confidence };
  }

  function buildSmartAlternatives() {
    const base = [...selectedPlaces];
    const pool = destination.places.map((p) => p.name).filter((name) => !base.includes(name));
    const alternatives = [
      { title: "Relaxed explorer", pace: "relaxed", style: "family", description: "Fewer transfers, longer breaks and more flexible evenings." },
      { title: "Maximum discovery", pace: "packed", style: style === "premium" ? "premium" : "budget", description: "More nearby sights grouped into efficient day plans." },
      { title: "Comfort-first", pace: "balanced", style: "premium", description: "Prioritizes the best-fit fleet, smoother timing and premium breaks." },
    ];
    if (pool[0]) alternatives[0].extra = `Consider adding ${pool[0]} if the group wants one more stop.`;
    return alternatives;
  }

  function parseAiPrompt(text) {
    const q = text.toLowerCase();
    const next = {};
    const stateMatch = STATE_OPTIONS.find((item) => q.includes(item.label.toLowerCase()) || q.includes(item.value.toLowerCase()));
    if (stateMatch) next.state = stateMatch.value;
    const dayMatch = q.match(/\b(\d{1,2})\s*(?:day|days|d)\b/);
    if (dayMatch) next.days = Math.max(1, Math.min(30, Number(dayMatch[1])));
    const peopleMatch = q.match(/\b(?:for|with)\s+(\d{1,3})\s*(?:people|persons|travellers|travelers|pax)\b/);
    if (peopleMatch) next.travelers = Math.max(1, Math.min(200, Number(peopleMatch[1])));
    if (/premium|luxury|vip/.test(q)) next.style = "premium";
    else if (/budget|cheap|economical|value/.test(q)) next.style = "budget";
    else if (/family|kids|children/.test(q)) next.style = "family";
    else if (/overnight|night journey|sleeper/.test(q)) next.style = "overnight";
    if (/relaxed|slow|easy/.test(q)) next.pace = "relaxed";
    else if (/packed|maximum|more places|as much as possible/.test(q)) next.pace = "packed";
    if (/adventure|trek|rafting|outdoor/.test(q)) next.activityLevel = "active";
    if (/food|culinary|restaurant/.test(q)) next.interests = [...new Set([...interests, "food"])];
    if (/nature|mountain|lake|forest/.test(q)) next.interests = [...new Set([...interests, "nature"])];
    if (/heritage|fort|temple|history/.test(q)) next.interests = [...new Set([...interests, "heritage"])];
    if (/shopping|market/.test(q)) next.interests = [...new Set([...interests, "shopping"])];
    if (/photo|photography|instagram/.test(q)) next.interests = [...new Set([...interests, "photography"])];
    if (/avoid long driving|less driving|short drives|easy driving/.test(q)) next.pace = "relaxed";
    if (/comfortable ac|ac bus|air conditioned|air-conditioned/.test(q)) next.style = next.style || "family";
    if (/no hotel|day trip|same day return/.test(q)) { next.stayLevel = "basic"; next.days = 1; }
    if (/weekend/.test(q)) next.days = 2;
    if (/long weekend/.test(q)) next.days = 3;
    const fromMatch = text.match(/\bfrom\s+(.+?)\s+to\s+(.+?)(?:\s+for\s+|\s+on\s+|\s+with\s+|$)/i);
    if (fromMatch?.[1]) next.start = fromMatch[1].trim().replace(/[,.]$/, "");
    const dateMatch = text.match(/(\d{4}-\d{2}-\d{2})/g);
    if (dateMatch?.[0]) next.departureDate = dateMatch[0];
    if (dateMatch?.[1]) next.returnDate = dateMatch[1];
    const destinationMatches = Object.values(DESTINATIONS).flatMap((x) => x.places).filter((p) => q.includes(p.name.toLowerCase()));
    if (destinationMatches.length) next.selectedPlaces = [...new Set(destinationMatches.map((p) => p.name))].slice(0, 5);
    return next;
  }

  async function runAiPlanner() {
    const text = aiPrompt.trim();
    if (!text) return;
    setAiMessages((m) => [...m, { role: "user", text }]);
    setAiPrompt("");
    setAiThinking(true);
    setAiError("");
    try {
      const result = await apiFetch("/api/trip-planner/analyze", { method: "POST", body: JSON.stringify({ prompt: text }) });
      if (!result.ok || !result.data?.success) throw new Error(result.data?.error || "Planner analysis failed");
      const analysis = result.data.analysis;
      setAiAnalysis(analysis);
      const patch = parseAiPrompt(text);
      if (analysis.region && STATE_OPTIONS.some((x) => x.value === analysis.region)) patch.state = analysis.region;
      if (analysis.days) patch.days = analysis.days;
      if (analysis.travelers) patch.travelers = analysis.travelers;
      if (analysis.children) setChildren(analysis.children);
      if (analysis.destinations?.length) patch.selectedPlaces = analysis.destinations;
      if (analysis.intent === "romantic getaway") patch.style = "premium";
      if (analysis.intent === "adventure escape") patch.activityLevel = "active";
      if (analysis.preferences?.includes("family")) patch.style = "family";
      if (analysis.preferences?.includes("premium travel")) patch.style = "premium";
      if (analysis.preferences?.includes("budget travel")) patch.style = "budget";
      if (analysis.preferences?.includes("overnight travel")) patch.style = "overnight";
      if (analysis.preferences?.includes("relaxed pace")) patch.pace = "relaxed";
      if (analysis.preferences?.includes("packed pace")) patch.pace = "packed";
      const interestSet = new Set(interests);
      (analysis.preferences || []).forEach((x) => { if (["food","nature","heritage","shopping","adventure","photography","family","beach"].includes(x)) interestSet.add(x); });
      patch.interests = [...interestSet];
      if (analysis.constraints.includes("reduce driving load")) patch.pace = "relaxed";
      if (patch.state) setState(patch.state);
      if (patch.days) setDays(patch.days);
      if (patch.travelers) setTravelers(patch.travelers);
      if (patch.style) setStyle(patch.style);
      if (patch.pace) setPace(patch.pace);
      if (patch.activityLevel) setActivityLevel(patch.activityLevel);
      if (patch.interests?.length) setInterests(patch.interests);
      if (patch.departureDate) setDepartureDate(patch.departureDate);
      if (patch.returnDate) setReturnDate(patch.returnDate);
      if (patch.selectedPlaces?.length) setSelectedPlaces(patch.selectedPlaces);
      if (patch.start) setStart(patch.start);
      if (analysis.constraints.includes("day-trip / no overnight stay")) setStayLevel("basic");
      setAiUnderstanding({ entities: analysis.entities || [], constraints: analysis.constraints || [], intent: analysis.intent, confidence: analysis.confidence || 60 });
      setAiAlternatives(buildSmartAlternatives());
      setPlanVersion((v) => v + 1);
      const follow = analysis.nextQuestions?.length ? ` Next, I’d like to know: ${analysis.nextQuestions[0]}` : " Your brief is structured; now refine the route, pace or fleet if you want.";
      setAiMessages((m) => [...m, { role: "assistant", text: `I’ve analyzed your brief as a ${analysis.intent}. I detected ${analysis.destinations?.length ? analysis.destinations.join(", ") : "a destination that still needs confirmation"}, ${analysis.travelers || "an unspecified number of"} travellers and a ${analysis.confidence}% planning confidence.${follow}` }]);
    } catch (err) {
      setAiError(err.message || "The AI planner is temporarily unavailable.");
      const patch = parseAiPrompt(text);
      setAiUnderstanding(buildAiUnderstanding(text, patch));
      setAiMessages((m) => [...m, { role: "assistant", text: "I can still build the trip locally, but the advanced planner service could not be reached. I’ve applied the details I could detect from your message." }]);
    } finally {
      setAiThinking(false);
    }
  }

  async function generateUltraPlan() {
    setAiPlanLoading(true);
    setAiError("");
    try {
      const result = await apiFetch("/api/trip-planner/plan", { method: "POST", body: JSON.stringify({ plan: { start, days, travelers, children, selectedPlaces, customStops: customStops.split(",").map((x) => x.trim()).filter(Boolean), interests, pace, style, mealPreference, dailyStart, returnBy } }) });
      if (result.ok && result.data?.success) setPlanVersion(result.data.planVersion || Date.now());
      else throw new Error(result.data?.error || "Could not generate the advanced itinerary");
    } catch (err) {
      setAiError(err.message || "Advanced itinerary service unavailable; using local itinerary.");
    } finally {
      setAiPlanLoading(false);
    }
  }

  function startVoiceInput() {
    const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!Recognition) { setAiMessages((m) => [...m, { role: "assistant", text: "Voice input is not supported by this browser. You can type your trip brief instead." }]); return; }
    const recognition = new Recognition();
    recognition.lang = "en-IN"; recognition.interimResults = false; recognition.maxAlternatives = 1;
    setAiVoiceListening(true);
    recognition.onresult = (event) => setAiPrompt(event.results[0][0].transcript);
    recognition.onerror = () => setAiVoiceListening(false);
    recognition.onend = () => setAiVoiceListening(false);
    recognition.start();
  }

  function saveTrip() {
    const trip = { start, state, days, travelers, children, luggage, departureDate, returnDate, departureTime, tripType, flexibleDates, style, pace, interests, stayLevel, stayType, mealPreference, activityLevel, budget, dailyStart, returnBy, customStops, notes, selectedPlaces, specialRequirements, itinerary, vehicle: selectedVehicle?.id || null, vehicleType: selectedVehicle?.category?.name || selectedVehicle?.name || "Trip Maker vehicle", savedAt: new Date().toISOString() };
    localStorage.setItem("kuwarji-trip-draft", JSON.stringify(trip));
    setSaved(true);
  }
  function openEnquiry() {
    saveTrip();
    setEnquiryOpen(true);
  }
  function togglePlace(name) {
    setSelectedPlaces((current) => current.includes(name) ? current.filter((p) => p !== name) : [...current, name]);
  }

  if (!authLoading && !user) {
    return <>
      <div className="trip-login-gate ticket">
        <div className="trip-login-gate-icon">⌁</div>
        <p className="eyebrow">Kuwarji Trip Maker</p>
        <h2>Plan a journey that fits you.</h2>
        <p>Trip Maker is available to signed-in customers. Log in to build routes, choose stops, compare vehicles and save your trip.</p>
        <div className="trip-login-gate-actions">
          <Link to="/login" className="btn btn-primary">Log in to access Trip Maker →</Link>
          <Link to="/" className="btn btn-outline">Back to website</Link>
        </div>
      </div>
      <LoginRequiredModal open={loginPrompt} onClose={() => setLoginPrompt(false)} />
    </>;
  }

  return (
    <div className="trip-maker-page">
      <div className="trip-maker-hero">
        <div>
          <p className="eyebrow">Kuwarji Trip Maker</p>
          <h2>Build the journey first. We’ll help match the ride.</h2>
          <p>Plan destinations, stops, dates, travellers and comfort preferences in one guided flow. Your vehicle recommendations use the current Kuwarji fleet.</p>
        </div>
        <div className="trip-maker-hero-badge"><span>✦</span><strong>Plan → Discover → Ride</strong></div>
      </div>

      <section className="ai-copilot ticket">
        <div className="ai-copilot-head">
          <div className="ai-orb" aria-hidden="true">✦</div>
          <div><p className="eyebrow">AI Trip Co-Pilot</p><h3>Describe the trip. I’ll shape the plan.</h3><p>Use natural language instead of filling every field. The planner translates your brief into route, pace, interests, dates and fleet preferences using the data available in Kuwarji Travels.</p></div>
          <span className="ai-live-pill"><i/> Planning engine ready</span>
        </div>
        <div className="ai-chat">{aiMessages.slice(-4).map((m, i) => <div className={`ai-message ${m.role}`} key={`${m.role}-${i}`}><span className="ai-message-avatar">{m.role === "assistant" ? "✦" : "You"}</span><div>{m.text}</div></div>)}{aiThinking && <div className="ai-message assistant"><span className="ai-message-avatar">✦</span><div className="ai-thinking"><i/><i/><i/></div></div>}</div>
        <div className="ai-input-row"><textarea value={aiPrompt} onChange={(e)=>setAiPrompt(e.target.value)} onKeyDown={(e)=>{if(e.key === "Enter" && !e.shiftKey){e.preventDefault();runAiPlanner();}}} placeholder="Try: 4 days from Chandigarh to Manali for 8 people, relaxed family trip with nature, food and comfortable AC bus" rows="2"/><button type="button" className={`ai-voice ${aiVoiceListening ? "is-listening" : ""}`} onClick={startVoiceInput} aria-label="Voice input">{aiVoiceListening ? "●" : "◉"}</button><button type="button" className="btn btn-primary" onClick={runAiPlanner} disabled={aiThinking || !aiPrompt.trim()}>Build with AI →</button></div>
        <div className="ai-suggestions">{["Make it more relaxed", "Avoid long driving days", "Add food & photography", "Optimize for a family", "Make it premium", "Fit the plan for 10 people", "Give me a balanced alternative"].map((q)=><button key={q} type="button" onClick={()=>setAiPrompt(q)}>{q}</button>)}</div>
      </section>

      <section className="ai-command-center ticket">
        <div className="ai-command-top">
          <div><p className="eyebrow">AI Travel Architect</p><h3>Understands the brief, constraints and trade-offs.</h3><p>The planner continuously converts your conversation into a structured travel model instead of only filling form fields.</p></div>
          <div className="ai-confidence"><span>Planning confidence</span><strong>{aiUnderstanding.confidence}%</strong><div><i style={{ width: `${aiUnderstanding.confidence}%` }} /></div></div>
        </div>
        <div className="ai-model-grid">
          <div><span>Trip intent</span><strong>{aiUnderstanding.intent}</strong></div>
          <div><span>Detected preferences</span><strong>{aiUnderstanding.entities.length ? aiUnderstanding.entities.join(" · ") : "Waiting for your brief"}</strong></div>
          <div><span>Constraints</span><strong>{aiUnderstanding.constraints.length ? aiUnderstanding.constraints.join(" · ") : "None detected yet"}</strong></div>
        </div>
        {aiAnalysis && <div className="ai-analysis-deck">
          <div className="ai-analysis-header"><div><span className="ai-kicker">LIVE TRIP INTELLIGENCE</span><strong>What the architect understood</strong></div><span className="ai-confidence-chip">{aiAnalysis.routeQuality}</span></div>
          <div className="ai-analysis-grid">
            <div><span>Intent</span><strong>{aiAnalysis.intent}</strong></div>
            <div><span>Destinations</span><strong>{aiAnalysis.destinations?.join(" · ") || "Needs destination"}</strong></div>
            <div><span>Preferences</span><strong>{aiAnalysis.preferences?.join(" · ") || "None yet"}</strong></div>
            <div><span>Constraints</span><strong>{aiAnalysis.constraints?.join(" · ") || "No hard constraints"}</strong></div>
          </div>
          {aiAnalysis.plannerNotes?.length > 0 && <div className="ai-notes"><b>Planner reasoning</b>{aiAnalysis.plannerNotes.slice(0,3).map((n,i)=><span key={i}>✓ {n}</span>)}</div>}
          <small className="ai-disclaimer">{aiAnalysis.safety}</small>
        </div>}
        {aiError && <div className="ai-error-banner">{aiError}</div>}
        <div className="ai-alternatives">
          <div className="ai-alt-heading"><strong>AI plan modes</strong><small>Choose a direction, then refine it conversationally</small></div>
          <div className="ai-alt-grid">{aiAlternatives.map((alt) => <button key={alt.title} type="button" onClick={() => { setPace(alt.pace); setStyle(alt.style); setPlanVersion((v) => v + 1); setAiMessages((m) => [...m, { role: "assistant", text: `${alt.title} mode applied. ${alt.description}` }]); }}><b>{alt.title}</b><span>{alt.description}</span>{alt.extra && <small>{alt.extra}</small>}</button>)}</div>
        </div>
      </section>

      <div className="trip-progress" aria-label="Trip Maker progress">
        {["Journey", "Dates", "Travellers", "Vehicle", "Experience", "Stay & Food", "Schedule", "Review"].map((label, i) => (
          <button key={label} type="button" className={`trip-progress-step${step === i + 1 ? " is-current" : ""}${step > i + 1 ? " is-done" : ""}`} onClick={() => i + 1 <= step && setStep(i + 1)}>
            <span>{i + 1}</span><strong>{label}</strong>
          </button>
        ))}
      </div>

      <section className="trip-wizard ticket">
        {step === 1 && <>
          <div className="wizard-heading"><div><p className="eyebrow">Step 1 · Journey</p><h3>Where are you going?</h3><p>Start with your route and choose the places you want to experience.</p></div></div>
          <div className="wizard-grid">
            <label className="trip-maker-field"><span>Starting location</span><input value={start} onChange={(e) => setStart(e.target.value)} placeholder="e.g. Chandigarh" /></label>
            <label className="trip-maker-field"><span>Region</span><select value={state} onChange={(e) => setState(e.target.value)}>{STATE_OPTIONS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label>
          </div>
          <div className="trip-route-preview"><span>📍 {start || "Starting point"}</span><i>→</i><span>📌 {selectedPlaces[0] || destination.places[0].name}</span></div>
          <div className="trip-place-grid">{destination.places.map((place) => { const selected = selectedPlaces.includes(place.name); return <button key={place.name} type="button" className={`trip-place-card${selected ? " is-selected" : ""}`} onClick={() => togglePlace(place.name)}><img src={place.image} alt={place.name}/><span className="trip-place-overlay"/><span className="trip-place-check">{selected ? "✓" : "+"}</span><span className="trip-place-copy"><strong>{place.name}</strong><small>{place.why}</small></span></button>; })}</div>
        </>}

        {step === 2 && <div className="wizard-panel"><p className="eyebrow">Step 2 · Dates</p><h3>When do you want to travel?</h3><div className="wizard-grid three"><label className="trip-maker-field"><span>Departure date</span><input type="date" min={TODAY} value={departureDate} onChange={(e) => setDepartureDate(e.target.value)} /></label><label className="trip-maker-field"><span>Return date</span><input type="date" min={departureDate || TODAY} value={returnDate} disabled={tripType === "oneWay"} onChange={(e) => setReturnDate(e.target.value)} /></label><label className="trip-maker-field"><span>Departure time</span><input type="time" value={departureTime} onChange={(e) => setDepartureTime(e.target.value)} /></label></div><label className="trip-checkline"><input type="checkbox" checked={flexibleDates} onChange={(e) => setFlexibleDates(e.target.checked)}/> <span>My dates are flexible</span></label><div className="trip-choice-grid"><button type="button" className={`trip-choice${tripType === "round" ? " is-selected" : ""}`} onClick={() => setTripType("round")}>↔ Round trip<small>Return to your starting point</small></button><button type="button" className={`trip-choice${tripType === "oneWay" ? " is-selected" : ""}`} onClick={() => setTripType("oneWay")}>→ One way<small>Finish at your destination</small></button></div></div>}

        {step === 3 && <div className="wizard-panel"><p className="eyebrow">Step 3 · Travellers</p><h3>Who is travelling?</h3><div className="traveller-controls"><div><strong>Adults</strong><span>Age 13+</span><div className="stepper"><button type="button" onClick={() => setTravelers(Math.max(1, travelers - 1))}>−</button><b>{travelers}</b><button type="button" onClick={() => setTravelers(Math.min(200, travelers + 1))}>+</button></div></div><div><strong>Children</strong><span>Age 2–12</span><div className="stepper"><button type="button" onClick={() => setChildren(Math.max(0, children - 1))}>−</button><b>{children}</b><button type="button" onClick={() => setChildren(Math.min(50, children + 1))}>+</button></div></div><div><strong>Luggage</strong><span>Approximate bags</span><div className="stepper"><button type="button" onClick={() => setLuggage(Math.max(0, luggage - 1))}>−</button><b>{luggage}</b><button type="button" onClick={() => setLuggage(Math.min(100, luggage + 1))}>+</button></div></div></div><div className="traveller-summary"><strong>{travelers + children} travellers · {luggage} bags</strong><span>We’ll prioritize vehicles with enough seating and comfortable luggage space.</span></div></div>}

        {step === 4 && <div className="wizard-panel"><p className="eyebrow">Step 4 · Vehicle</p><h3>Choose your ride</h3><p className="wizard-muted">Recommended from the current fleet based on group size and comfort.</p>{loadingVehicles ? <div className="trip-loading-grid"><span/><span/><span/></div> : <div className="vehicle-choice-grid">{recommendedVehicles.map((vehicle) => { const selected = selectedVehicle?.id === vehicle.id; return <button type="button" key={vehicle.id} className={`vehicle-choice${selected ? " is-selected" : ""}`} onClick={() => setSelectedVehicle(vehicle)}><div className="vehicle-choice-image">{vehicle.photos?.[0] ? <img src={vehicle.photos[0]} alt={vehicle.name}/> : <span>BUS</span>}</div><div><p className="eyebrow-muted">{vehicle.category?.name || "Fleet vehicle"}</p><strong>{vehicle.name}</strong><span>{vehicle.capacity} seats · {vehicle.acType === "AC" ? "AC" : "Non-AC"}</span><small>{vehicle.amenities?.slice(0,3).join(" · ") || "Comfortable group travel"}</small></div><b>{selected ? "✓" : "Select"}</b></button>; })}</div>}{!loadingVehicles && !recommendedVehicles.length && <div className="trip-no-vehicle"><strong>No exact fleet match yet.</strong><p>Our team can arrange a larger coach for your group.</p></div>}</div>}

        {step === 5 && <div className="wizard-panel"><p className="eyebrow">Step 5 · Experience</p><h3>Design the experience, not just the route.</h3><p className="wizard-muted">Tell the planner how you want the days to feel. These preferences shape the generated itinerary and vehicle recommendation.</p><div className="preference-grid"><button type="button" className={`trip-choice${style === "budget" ? " is-selected" : ""}`} onClick={() => setStyle("budget")}>₹ Value<small>Keep the plan practical</small></button><button type="button" className={`trip-choice${style === "family" ? " is-selected" : ""}`} onClick={() => setStyle("family")}>♡ Family<small>Comfortable, easy pacing</small></button><button type="button" className={`trip-choice${style === "premium" ? " is-selected" : ""}`} onClick={() => setStyle("premium")}>✦ Premium<small>Comfort-first experience</small></button><button type="button" className={`trip-choice${style === "overnight" ? " is-selected" : ""}`} onClick={() => setStyle("overnight")}>☾ Overnight<small>Long-distance optimized</small></button></div><div className="wizard-grid three"><label className="trip-maker-field"><span>Daily pace</span><select value={pace} onChange={(e)=>setPace(e.target.value)}><option value="relaxed">Relaxed</option><option value="balanced">Balanced</option><option value="packed">Packed</option></select></label><label className="trip-maker-field"><span>Activity level</span><select value={activityLevel} onChange={(e)=>setActivityLevel(e.target.value)}><option value="relaxed">Easy</option><option value="moderate">Moderate</option><option value="active">Active / adventure</option></select></label><label className="trip-maker-field"><span>Budget band</span><select value={budget} onChange={(e)=>setBudget(e.target.value)}><option value="value">Value</option><option value="mid">Comfort</option><option value="premium">Premium</option></select></label></div><div className="interest-grid">{["sightseeing","heritage","nature","food","shopping","adventure","photography","family"].map((item)=>{const on=interests.includes(item);return <button key={item} type="button" className={`trip-interest${on?" is-selected":""}`} onClick={()=>setInterests((cur)=>on?cur.filter(x=>x!==item):[...cur,item])}>{on?"✓ ":"+ "}{item}</button>})}</div><label className="trip-maker-field"><span>Special requirements</span><textarea rows="3" value={specialRequirements} onChange={(e) => setSpecialRequirements(e.target.value)} placeholder="Accessibility, extra luggage, child seat, rest stops, mobility needs, etc."/></label></div>}

        {step === 6 && <div className="wizard-panel"><p className="eyebrow">Step 6 · Stay & Food</p><h3>Complete the trip beyond the vehicle.</h3><p className="wizard-muted">These are planning preferences. Kuwarji will confirm actual hotel, meal and activity availability separately.</p><div className="wizard-grid three"><label className="trip-maker-field"><span>Stay level</span><select value={stayLevel} onChange={(e)=>setStayLevel(e.target.value)}><option value="basic">Essential</option><option value="comfortable">Comfortable</option><option value="premium">Premium</option></select></label><label className="trip-maker-field"><span>Stay type</span><select value={stayType} onChange={(e)=>setStayType(e.target.value)}><option value="hotel">Hotel</option><option value="resort">Resort</option><option value="homestay">Homestay</option><option value="houseboat">Houseboat where applicable</option></select></label><label className="trip-maker-field"><span>Meals</span><select value={mealPreference} onChange={(e)=>setMealPreference(e.target.value)}><option value="local">Local cuisine</option><option value="vegetarian">Vegetarian-focused</option><option value="mixed">Mixed</option><option value="premium">Premium dining</option></select></label></div><label className="trip-maker-field"><span>Extra stops or places not listed above</span><input value={customStops} onChange={(e)=>setCustomStops(e.target.value)} placeholder="Example: Kasauli, local market, temple, viewpoint"/></label><label className="trip-maker-field"><span>Planner notes</span><textarea rows="4" value={notes} onChange={(e)=>setNotes(e.target.value)} placeholder="Anything the planner should know about the group or occasion?"/></label></div>}

        {step === 7 && <div className="wizard-panel"><p className="eyebrow">Step 7 · Daily schedule</p><h3>Set the rhythm of every day.</h3><div className="wizard-grid three"><label className="trip-maker-field"><span>Daily departure</span><input type="time" value={dailyStart} onChange={(e)=>setDailyStart(e.target.value)}/></label><label className="trip-maker-field"><span>Preferred return</span><input type="time" value={returnBy} onChange={(e)=>setReturnBy(e.target.value)}/></label><label className="trip-maker-field"><span>Trip days</span><input type="number" min="1" max="30" value={days} onChange={(e)=>setDays(Math.max(1,Math.min(30,Number(e.target.value)||1)))}/></label></div><div className="schedule-summary"><div><strong>{days}</strong><span>days</span></div><div><strong>{selectedPlaces.length + customStops.split(",").filter(x=>x.trim()).length}</strong><span>planned stops</span></div><div><strong>{travelers + children}</strong><span>travellers</span></div><div><strong>{dailyStart}</strong><span>start</span></div><div><strong>{returnBy}</strong><span>target return</span></div></div><div className="trip-maker-note"><strong>Planner logic:</strong> the itinerary balances selected interests, trip pace, activity level, meal preference and daily timing. It will not invent confirmed hotel, activity, distance or pricing data.</div></div>}

        {step === 8 && <div className="wizard-panel"><div className="review-heading"><div><p className="eyebrow">Step 8 · Final plan</p><h3>Your complete trip blueprint</h3></div>{saved && <span className="saved-pill">✓ Saved</span>}</div><div className="review-route"><strong>{start || "Starting point"}</strong><span>→</span><strong>{[...selectedPlaces,...customStops.split(",").map(x=>x.trim()).filter(Boolean)].join(" → ") || destination.places[0].name}</strong></div><div className="review-grid"><div><span>Dates</span><strong>{departureDate || "Flexible"}{returnDate && ` → ${returnDate}`}</strong></div><div><span>Travellers</span><strong>{travelers} adults · {children} children</strong></div><div><span>Experience</span><strong>{style} · {pace}</strong></div><div><span>Interests</span><strong>{interests.join(", ")}</strong></div><div><span>Stay & food</span><strong>{stayLevel} · {mealPreference}</strong></div><div><span>Vehicle</span><strong>{selectedVehicle?.name || "To be arranged"}</strong></div></div><div className="ai-insight-panel"><div className="ai-insight-title"><span>✦ AI planning insights</span><small>Plan v{planVersion}</small></div><div className="ai-insight-grid">{aiInsights.map((item, i) => <div key={i}><b>0{i + 1}</b><span>{item}</span></div>)}</div></div><div className="trip-itinerary-preview"><div className="itinerary-preview-head"><strong>Generated day-by-day itinerary</strong><span>{itinerary.length} days</span></div>{itinerary.map((item) => <div className="itinerary-preview-row" key={item.day}><b>Day {item.day}</b><div><strong>{item.title}</strong><small><b>Morning:</b> {item.morning}</small><small><b>Afternoon:</b> {item.afternoon}</small><small><b>Evening:</b> {item.evening}</small></div></div>)}</div><div className="review-note"><strong>Ready for human confirmation</strong><span>The planner creates a structured proposal. Your enquiry sends the full blueprint to the Kuwarji team, who can confirm fleet, timings, hotels, activities and final pricing.</span></div><div className="review-actions"><button type="button" className="btn btn-outline" onClick={saveTrip}>Save Trip</button><button type="button" className="btn btn-primary" onClick={openEnquiry}>Request This Trip →</button></div></div>}

        <div className="wizard-actions"><button type="button" className="btn btn-outline" onClick={back} disabled={step === 1}>← Back</button>{step < 8 && <button type="button" className="btn btn-primary" onClick={async () => { if (step === 7) await generateUltraPlan(); next(); }}>{step === 7 ? (aiPlanLoading ? "Architecting itinerary…" : "Build final itinerary →") : "Continue →"}</button>}</div>
      </section>
      <div className="trip-maker-note"><strong>Transparent recommendations:</strong> group size is the first priority, then travel style, comfort, rating and admin fleet priority. No invented availability or pricing is shown.</div>
      <LoginRequiredModal open={loginPrompt} onClose={() => setLoginPrompt(false)} />
      <EnquiryDrawer open={enquiryOpen} onClose={() => setEnquiryOpen(false)} initialTrip={{ tripDate: departureDate, vehicleType: selectedVehicle?.category?.name || selectedVehicle?.name || "Trip Maker request", message: `ULTRA TRIP MAKER PLAN\nRoute: ${start || "Starting point"} → ${[...selectedPlaces,...customStops.split(",").map(x=>x.trim()).filter(Boolean)].join(" → ")}\nDates: ${departureDate || "Flexible"}${returnDate ? ` to ${returnDate}` : ""}\nDeparture: ${departureTime} · Daily schedule ${dailyStart}-${returnBy}\nTravellers: ${travelers} adults, ${children} children · ${luggage} bags\nTrip type: ${tripType} · Flexible dates: ${flexibleDates ? "Yes" : "No"}\nExperience: ${style}, pace ${pace}, activity ${activityLevel}, budget ${budget}\nInterests: ${interests.join(", ")}\nStay: ${stayLevel} ${stayType} · Meals: ${mealPreference}\nVehicle: ${selectedVehicle?.name || "To be arranged"}\nSpecial requirements: ${specialRequirements || "None"}\nPlanner notes: ${notes || "None"}\nGenerated itinerary: ${itinerary.map((x)=>`Day ${x.day}: ${x.title} — ${x.body}`).join(" | ")}` }} />
    </div>
  );
}

export default function TripMaker({ embedded = false }) {
  if (embedded) return <ConsumerLayout title="Trip Maker" lead="Create a destination plan and get a vehicle recommendation without leaving your customer portal."><TripMakerContent embedded /></ConsumerLayout>;
  return <><Navbar /><main className="container section"><TripMakerContent /></main><Footer /></>;
}
