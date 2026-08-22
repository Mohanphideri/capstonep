import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { apiFetch } from "../api.js";
import { Navbar } from "../components/Navbar.jsx";
import { Footer } from "../components/Footer.jsx";
import ConsumerLayout from "../components/ConsumerLayout.jsx";
import LoginRequiredModal from "../components/LoginRequiredModal.jsx";
import { useAuth } from "../AuthContext.jsx";
import "./TripMaker.css";

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
  const [style, setStyle] = useState("family");
  const [selectedPlaces, setSelectedPlaces] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [loadingVehicles, setLoadingVehicles] = useState(false);
  const [step, setStep] = useState(1);
  const [start, setStart] = useState("");
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [saved, setSaved] = useState(false);
  const [loginPrompt, setLoginPrompt] = useState(false);
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

  const openTripMaker = () => {
    if (!authLoading && !user) setLoginPrompt(true);
  };

  function next() {
    if (step === 1 && !start.trim()) return;
    setStep((s) => Math.min(6, s + 1));
  }
  function back() { setStep((s) => Math.max(1, s - 1)); }
  function saveTrip() {
    const trip = { start, state, days, travelers, style, selectedPlaces, vehicle: selectedVehicle?.id || null, savedAt: new Date().toISOString() };
    localStorage.setItem("kuwarji-trip-draft", JSON.stringify(trip));
    setSaved(true);
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

      <div className="trip-progress" aria-label="Trip Maker progress">
        {["Journey", "Dates", "Travellers", "Vehicle", "Preferences", "Review"].map((label, i) => (
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

        {step === 2 && <div className="wizard-panel"><p className="eyebrow">Step 2 · Dates</p><h3>When do you want to travel?</h3><div className="wizard-grid three"><label className="trip-maker-field"><span>Departure date</span><input type="date" min={new Date().toISOString().slice(0,10)} /></label><label className="trip-maker-field"><span>Return date</span><input type="date" /></label><label className="trip-maker-field"><span>Departure time</span><input type="time" defaultValue="08:00" /></label></div><label className="trip-checkline"><input type="checkbox"/> <span>My dates are flexible</span></label><div className="trip-choice-grid"><button type="button" className="trip-choice is-selected">↔ Round trip<small>Return to your starting point</small></button><button type="button" className="trip-choice">→ One way<small>Finish at your destination</small></button></div></div>}

        {step === 3 && <div className="wizard-panel"><p className="eyebrow">Step 3 · Travellers</p><h3>Who is travelling?</h3><div className="traveller-controls"><div><strong>Adults</strong><span>Age 13+</span><div className="stepper"><button type="button" onClick={() => setTravelers(Math.max(1, travelers - 1))}>−</button><b>{travelers}</b><button type="button" onClick={() => setTravelers(Math.min(200, travelers + 1))}>+</button></div></div><div><strong>Children</strong><span>Age 2–12</span><div className="stepper"><button type="button">−</button><b>0</b><button type="button">+</button></div></div><div><strong>Luggage</strong><span>Approximate bags</span><div className="stepper"><button type="button">−</button><b>2</b><button type="button">+</button></div></div></div><div className="traveller-summary"><strong>{travelers} travellers</strong><span>We’ll prioritize vehicles with enough seating and comfortable luggage space.</span></div></div>}

        {step === 4 && <div className="wizard-panel"><p className="eyebrow">Step 4 · Vehicle</p><h3>Choose your ride</h3><p className="wizard-muted">Recommended from the current fleet based on group size and comfort.</p>{loadingVehicles ? <div className="trip-loading-grid"><span/><span/><span/></div> : <div className="vehicle-choice-grid">{recommendedVehicles.map((vehicle) => { const selected = selectedVehicle?.id === vehicle.id; return <button type="button" key={vehicle.id} className={`vehicle-choice${selected ? " is-selected" : ""}`} onClick={() => setSelectedVehicle(vehicle)}><div className="vehicle-choice-image">{vehicle.photos?.[0] ? <img src={vehicle.photos[0]} alt={vehicle.name}/> : <span>BUS</span>}</div><div><p className="eyebrow-muted">{vehicle.category?.name || "Fleet vehicle"}</p><strong>{vehicle.name}</strong><span>{vehicle.capacity} seats · {vehicle.acType === "AC" ? "AC" : "Non-AC"}</span><small>{vehicle.amenities?.slice(0,3).join(" · ") || "Comfortable group travel"}</small></div><b>{selected ? "✓" : "Select"}</b></button>; })}</div>}{!loadingVehicles && !recommendedVehicles.length && <div className="trip-no-vehicle"><strong>No exact fleet match yet.</strong><p>Our team can arrange a larger coach for your group.</p></div>}</div>}

        {step === 5 && <div className="wizard-panel"><p className="eyebrow">Step 5 · Preferences</p><h3>Make it your kind of trip.</h3><div className="preference-grid"><button type="button" className={`trip-choice${style === "budget" ? " is-selected" : ""}`} onClick={() => setStyle("budget")}>₹ Budget<small>Value-focused travel</small></button><button type="button" className={`trip-choice${style === "family" ? " is-selected" : ""}`} onClick={() => setStyle("family")}>♡ Family comfort<small>Easy, relaxed travel</small></button><button type="button" className={`trip-choice${style === "premium" ? " is-selected" : ""}`} onClick={() => setStyle("premium")}>✦ Premium<small>More comfort and space</small></button><button type="button" className={`trip-choice${style === "overnight" ? " is-selected" : ""}`} onClick={() => setStyle("overnight")}>☾ Overnight<small>Best for long journeys</small></button></div><label className="trip-maker-field"><span>Special requirements</span><textarea rows="4" placeholder="Wheelchair access, extra luggage, rest stops, child seat, etc."/></label></div>}

        {step === 6 && <div className="wizard-panel"><div className="review-heading"><div><p className="eyebrow">Step 6 · Review</p><h3>Your journey at a glance</h3></div>{saved && <span className="saved-pill">✓ Saved</span>}</div><div className="review-route"><strong>{start || "Starting point"}</strong><span>→</span><strong>{selectedPlaces.join(" → ") || destination.places[0].name}</strong></div><div className="review-grid"><div><span>Region</span><strong>{STATE_OPTIONS.find((s) => s.value === state)?.label}</strong></div><div><span>Duration</span><strong>{days} days</strong></div><div><span>Travellers</span><strong>{travelers}</strong></div><div><span>Style</span><strong>{style}</strong></div><div><span>Vehicle</span><strong>{selectedVehicle?.name || "To be arranged"}</strong></div><div><span>Stops</span><strong>{selectedPlaces.length}</strong></div></div><div className="review-note"><strong>Next step</strong><span>Save this plan or continue to your existing booking/enquiry flow. Final pricing and availability remain subject to the live fleet and trip details.</span></div><div className="review-actions"><button type="button" className="btn btn-outline" onClick={saveTrip}>Save Trip</button><Link to={embedded ? "/dashboard/enquiries" : "/login"} className="btn btn-primary">Continue / Request Booking →</Link></div></div>}

        <div className="wizard-actions"><button type="button" className="btn btn-outline" onClick={back} disabled={step === 1}>← Back</button>{step < 6 && <button type="button" className="btn btn-primary" onClick={next}>{step === 5 ? "Review trip →" : "Continue →"}</button>}</div>
      </section>
      <div className="trip-maker-note"><strong>Transparent recommendations:</strong> group size is the first priority, then travel style, comfort, rating and admin fleet priority. No invented availability or pricing is shown.</div>
      <LoginRequiredModal open={loginPrompt} onClose={() => setLoginPrompt(false)} />
    </div>
  );
}

export default function TripMaker({ embedded = false }) {
  if (embedded) return <ConsumerLayout title="Trip Maker" lead="Create a destination plan and get a vehicle recommendation without leaving your customer portal."><TripMakerContent embedded /></ConsumerLayout>;
  return <><Navbar /><main className="container section"><TripMakerContent /></main><Footer /></>;
}
