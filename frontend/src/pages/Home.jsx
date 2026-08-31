import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Navbar } from "../components/Navbar.jsx";
import { Footer } from "../components/Footer.jsx";
import { FaqAccordion } from "../components/FaqAccordion.jsx";
import { EnquiryDrawer } from "../components/EnquiryDrawer.jsx";
import { Reveal } from "../components/Reveal.jsx";
import SiteBanner from "../components/SiteBanner.jsx";
import { WhatsAppButton } from "../components/WhatsAppButton.jsx";
import { BenefitIcon } from "../components/BenefitIcon.jsx";
import { HeroIllustration } from "../components/HeroIllustration.jsx";
import { useAuth } from "../AuthContext.jsx";
import { apiFetch } from "../api.js";
import "./Home.css";

const TRIP_PLANNER_PATH = "/dashboard/trip-planner";

const WHATSAPP_NUMBER = import.meta.env.VITE_WHATSAPP_NUMBER || import.meta.env.VITE_BUSINESS_PHONE || "";
const BUSINESS_MESSAGE = "Hi, I'm contacting Kuwarji Travels. I need help with a vehicle rental.";
const BENEFITS = [
  ["Wide Range of Vehicles", "For every group size", "fleet"],
  ["Best Price Guarantee", "Transparent & Affordable", "price"],
  ["Safe & Reliable", "Verified Fleet", "shield"],
  ["On-time Service", "Punctual & Professional", "clock"],
  ["24x7 Customer Support", "We're Here to Help", "support"],
];
const DEFAULT_HERO = {
  title: "Travel Comfortably.",
  accent: "Travel With Confidence.",
  body: "Reliable buses, cars and tempo travellers for local, outstation and group travel.",
};
// Premium rotating headline: the hero swaps between a handful of
// polished taglines every couple of seconds instead of sitting static.
// The admin-configured line (if set in Site Content) always leads the
// rotation, followed by two additional on-brand lines.
const ROTATING_TAGLINES = [
  { title: "Book In Minutes.", accent: "Ride In Total Comfort." },
  { title: "Premium Fleet.", accent: "Punctual, Every Single Time." },
];
const HEADLINE_INTERVAL_MS = 2000;

function HeroHeadline({ title, accent }) {
  const lines = useMemo(() => [{ title, accent }, ...ROTATING_TAGLINES], [title, accent]);
  const [index, setIndex] = useState(0);
  useEffect(() => {
    setIndex(0);
    const timer = setInterval(() => setIndex((i) => (i + 1) % lines.length), HEADLINE_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [lines]);
  const current = lines[index];
  return (
    <div className="home-hero-headline">
      <h1 key={index} className="home-hero-headline-animate">
        {current.title}
        <span>{current.accent}</span>
      </h1>
      <div className="home-hero-headline-dots" aria-hidden="true">
        {lines.map((_, i) => (
          <i key={i} className={i === index ? "is-active" : ""} />
        ))}
      </div>
    </div>
  );
}

export default function Home() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [enquiryOpen, setEnquiryOpen] = useState(false);
  const [site, setSite] = useState(null);
  const [vehicles, setVehicles] = useState([]);
  const [packages, setPackages] = useState([]);
  const [featuredReviews, setFeaturedReviews] = useState([]);
  const [loading, setLoading] = useState(true);

  function goToTripPlanner() {
    // Same login grant either way: logged-in travellers go straight to the
    // planner, guests are sent through login first and land on the planner
    // right after — one consistent AI trip-planning entry point.
    navigate(user ? TRIP_PLANNER_PATH : `/login?next=${encodeURIComponent(TRIP_PLANNER_PATH)}`);
  }

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      apiFetch("/api/site-content"),
      apiFetch("/api/vehicles?limit=12&sort=recommended"),
      apiFetch("/api/tour-packages?limit=6"),
      apiFetch("/api/reviews/featured"),
    ])
      .then(([siteResult, vehicleResult, packageResult, reviewResult]) => {
        if (cancelled) return;
        if (siteResult.ok && siteResult.data?.success) setSite(siteResult.data.settings);
        if (vehicleResult.ok && vehicleResult.data?.success) setVehicles(vehicleResult.data.vehicles || []);
        if (packageResult.ok && packageResult.data?.success) setPackages(packageResult.data.packages || []);
        if (reviewResult.ok && reviewResult.data?.success) setFeaturedReviews(reviewResult.data.reviews || []);
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const landingVehicles = useMemo(() => {
    const curated = vehicles.filter((vehicle) => vehicle.landingPhotos?.length);
    if (curated.length) return curated.slice(0, 6);
    // No admin-curated landing photos yet — fall back to the live vehicle
    // catalogue (same /api/vehicles data already loaded) so the fleet
    // section always shows real vehicles instead of an empty placeholder.
    return vehicles.filter((vehicle) => vehicle.photos?.length).slice(0, 6);
  }, [vehicles]);
  const fleetPhotoFor = (vehicle) => vehicle.landingPhotos?.[0] || vehicle.photos?.[0] || "";
  const heroImage = site?.homepage?.heroImageUrl || fleetPhotoFor(landingVehicles[0] || {}) || "";
  const hero = site?.homepage || DEFAULT_HERO;
  const whyUs = site?.whyUs;
  const reviewLoop = useMemo(() => featuredReviews.length ? [...featuredReviews, ...featuredReviews, ...featuredReviews] : [], [featuredReviews]);

  return (
    <div className="page home-page">
      <SiteBanner />
      <Navbar />

      <section className="home-hero home-hero-light">
        <div className="container home-hero-inner">
          <div className="home-hero-copy">
            <HeroHeadline title={hero.title || DEFAULT_HERO.title} accent={hero.accent || DEFAULT_HERO.accent} />
            <p>{hero.body || DEFAULT_HERO.body}</p>
            <div className="home-hero-actions">
              <button type="button" className="home-btn home-btn-primary" onClick={goToTripPlanner}>Plan My Trip</button>
              <Link to="/tour-packages" className="home-btn home-btn-outline-nav">Tour Packages</Link>
            </div>
          </div>
          <div className="home-hero-photo">
            {heroImage ? (
              <img src={heroImage} alt="Kuwarji Travels bus" loading="eager" fetchpriority="high" />
            ) : (
              <div className="home-hero-illustration">
                <HeroIllustration className="home-hero-illustration-svg" />
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="home-benefits-wrap"><div className="container home-benefits">
        {BENEFITS.map(([title, body, icon], i) => <Reveal delayMs={i*70} className="home-benefit-reveal" key={title}><div className="home-benefit"><span className="home-benefit-icon"><BenefitIcon kind={icon} className="home-benefit-svg" /></span><div><strong>{title}</strong><span>{body}</span></div></div></Reveal>)}
      </div></section>

      <section className="home-section home-fleet" id="vehicles"><div className="container">
        <Reveal><div className="home-section-heading centered-title"><div><h2>Explore Our Fleet</h2><span className="home-title-underline" /></div><Link to="/vehicles" className="home-text-link">View All Vehicles →</Link></div></Reveal>
        {loading && <div className="home-state">Loading fleet…</div>}
        {!loading && landingVehicles.length === 0 && <div className="home-empty">Vehicle photos will appear here once added from the Admin Panel.</div>}
        {!loading && landingVehicles.length > 0 && <div className="home-fleet-grid">
          {landingVehicles.map((vehicle, i) => <Reveal delayMs={i*60} className="home-fleet-reveal" key={vehicle.id}><Link to={`/vehicles/${vehicle.id}`} className="home-fleet-card">
            <div className="home-fleet-image"><img src={fleetPhotoFor(vehicle)} alt={vehicle.name} loading="lazy" /></div>
            <div className="home-fleet-body"><span>{vehicle.category?.name || "Vehicle"}</span><h3>{vehicle.name}</h3><p>{vehicle.capacity} seats · {vehicle.acType === "AC" ? "AC" : "Non-AC"}</p><b>View Details <span>→</span></b></div>
          </Link></Reveal>)}
        </div>}
      </div></section>

      <section className="home-section home-why" id="why-us"><div className="container home-why-grid">
        <Reveal className="home-why-copy"><span className="home-eyebrow">WHY KUWARJI</span><h2>{whyUs?.title || "Why travellers choose Kuwarji Travels"}</h2><p>{whyUs?.intro || "Reliable vehicles, clear communication and support from planning to return."}</p>
          <div className="home-why-list">{(whyUs?.items?.length ? whyUs.items : [
            { title: "Reliable Fleet", body: "Well-presented vehicles for local, outstation and group journeys." },
            { title: "Simple Trip Planning", body: "Tell us what you need and we help match the right vehicle." },
            { title: "Human Support", body: "Get practical help before, during and after your journey." },
          ]).slice(0,4).map((item,index) => <div key={`${item.title}-${index}`}><span>{String(index+1).padStart(2,"0")}</span><div><strong>{item.title}</strong><p>{item.body}</p></div></div>)}</div>
        </Reveal>
        <Reveal delayMs={120} className="home-why-image">{whyUs?.imageUrl ? <img src={whyUs.imageUrl} alt="Why choose Kuwarji Travels" loading="lazy" /> : <div className="home-why-image-empty"><svg width="46" height="46" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M3 7.5 12 3l9 4.5M3 7.5v9L12 21m-9-4.5L12 21m9-4.5-9 4.5m9-4.5v-9M12 21V12M3 7.5 12 12m9-4.5L12 12" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/></svg><span>Our fleet, ready for the road.</span></div>}</Reveal>
      </div></section>

      <Reveal className="container home-trip-section"><div className="home-trip-card"><div><span className="home-eyebrow">TRIP PLANNER</span><h2>Not sure which vehicle is right for you?</h2><p>Tell us where you're headed, for how many people and for how long — we'll suggest a route, pace and the right vehicle from the live Kuwarji fleet.</p><button type="button" className="home-btn home-btn-light" onClick={goToTripPlanner}>Plan My Trip →</button></div><div className="home-trip-art">{fleetPhotoFor(landingVehicles[1] || {}) ? <img src={fleetPhotoFor(landingVehicles[1] || {})} alt="Kuwarji Travels vehicle" loading="lazy" /> : <span>PLAN<br/>MY TRIP</span>}</div></div></Reveal>

      {packages.length > 0 && <section className="home-section home-packages" id="tour-packages"><div className="container">
        <Reveal><div className="home-section-heading"><div><span className="home-eyebrow">TOUR PACKAGES</span><h2>Journeys made for memories</h2><p>Handpicked multi-day tours, planned and looked after by our team.</p></div><Link to="/tour-packages" className="home-text-link">View All Packages →</Link></div></Reveal>
        <div className="home-package-grid">{packages.slice(0,3).map((pkg, i)=><Reveal delayMs={i*90} key={pkg.id} className="home-package-reveal"><Link to={`/tour-packages/${pkg.id}`} className="home-package-card"><div className="home-package-image">{pkg.imageUrl ? <img src={pkg.imageUrl} alt={pkg.title} loading="lazy"/> : <div>No package image</div>}<span>{pkg.durationDays} Days</span></div><div className="home-package-body"><small>{pkg.destination}</small><h3>{pkg.title}</h3><p>{pkg.description || "A thoughtfully planned journey by Kuwarji Travels."}</p><b>Explore Package →</b></div></Link></Reveal>)}</div>
      </div></section>}

      {featuredReviews.length > 0 && <section className="home-section home-reviews" aria-label="Customer Reviews"><div className="container">
        <div className="home-reviews-heading"><h2>What Our Customers Say</h2><div className="home-reviews-rating"><span className="home-reviews-stars">★★★★★</span><b>{(featuredReviews.reduce((s,r)=>s+(Number(r.rating)||0),0)/featuredReviews.length).toFixed(1)}/5</b><span>({featuredReviews.length}+ Reviews)</span></div></div>
        <div className="home-review-marquee">
          <div className="home-review-track">
            {reviewLoop.map((review,index)=>{
              const avatarColors=["#c9d6ff","#bff0d8","#ffd6df","#c6e6ff"];
              const initial=(review.customerName||"K").trim().charAt(0).toUpperCase();
              return <article className="home-review-card" key={`${review.id||index}-${index}`}>
                <div className="home-review-top"><span className="home-review-avatar" style={{background:avatarColors[index%avatarColors.length]}}>{initial}</span><div><strong>{review.customerName || "Kuwarji customer"}</strong><div className="home-review-stars-row">{"★".repeat(Math.max(0,Math.min(5,Number(review.rating)||5)))}</div></div></div>
                <p>{review.text || "Excellent travel experience with Kuwarji Travels."}</p>
                <small>{review.city || ""}</small>
              </article>;
            })}
          </div>
        </div>
      </div></section>}

      <section className="container home-faq"><div className="home-section-heading"><div><span className="home-eyebrow">FAQ</span><h2>Good to know before you travel</h2></div></div><FaqAccordion /></section>

      <section className="container home-final-cta"><div><span className="home-eyebrow">READY WHEN YOU ARE</span><h2>Planning your next journey?</h2><p>Browse the live fleet, plan your trip, or send the Kuwarji Travels team an enquiry.</p></div><div className="home-final-actions"><Link to="/vehicles" className="home-btn home-btn-primary">Search Vehicles</Link><button type="button" onClick={()=>setEnquiryOpen(true)} className="home-btn home-btn-outline">Get a Quote</button></div></section>

      <Footer />
      <button type="button" className="home-enquiry-fab" onClick={()=>setEnquiryOpen(true)}>
        Enquiry
      </button>
      <WhatsAppButton number={WHATSAPP_NUMBER} message={BUSINESS_MESSAGE} />
      <EnquiryDrawer open={enquiryOpen} onClose={()=>setEnquiryOpen(false)} />
    </div>
  );
}
