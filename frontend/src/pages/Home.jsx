import Icon from "../components/Icon.jsx";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Navbar } from "../components/Navbar.jsx";
import { Footer } from "../components/Footer.jsx";
import { FaqAccordion } from "../components/FaqAccordion.jsx";
import { EnquiryDrawer } from "../components/EnquiryDrawer.jsx";
import HomeAiChat from "../components/HomeAiChat.jsx";
import { Reveal } from "../components/Reveal.jsx";
import SiteBanner from "../components/SiteBanner.jsx";
import { BenefitIcon } from "../components/BenefitIcon.jsx";
import { useAuth } from "../AuthContext.jsx";
import heroLocal from "../kuwarji-home-hero-local.png";
import { HeroIllustration } from "../components/HeroIllustration.jsx";
import { apiFetch } from "../api.js";
import "./Home.css";

const HERO_TAGLINE = "Your journey,\nour wheels.";

function HeroHeadline() {
  const [text, setText] = useState("");

  useEffect(() => {
    let timer;
    let index = 0;

    const tick = () => {
      index += 1;
      setText(HERO_TAGLINE.slice(0, index));

      if (index < HERO_TAGLINE.length) {
        timer = setTimeout(tick, 75);
      }
    };

    timer = setTimeout(tick, 120);
    return () => clearTimeout(timer);
  }, []);

  const lines = text.split("\n");

  return (
    <h1 className="home-hero-typewriter" aria-label={HERO_TAGLINE.replace("\n", " ")}>
      {lines.map((line, i) => (
        <span className="home-hero-typewriter-line" key={i}>
          {line}
          {i === 0 && lines.length > 1 ? <br /> : null}
        </span>
      ))}
    </h1>
  );
}

export default function Home() {
  const { user, loading: authLoading, logout } = useAuth();
  const [enquiryOpen, setEnquiryOpen] = useState(false);
  const [site, setSite] = useState(null);
  const [vehicles, setVehicles] = useState([]);
  const [packages, setPackages] = useState([]);
  const [featuredReviews, setFeaturedReviews] = useState([]);
  const [loading, setLoading] = useState(true);

  // Returning to the public landing page ends an active customer session.
  // This keeps the customer portal session scoped to the portal itself.
  useEffect(() => {
    if (!authLoading && user) logout();
  }, [authLoading, user, logout]);

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
    if (curated.length) return curated.slice(0, 4);
    // No admin-curated landing photos yet — fall back to the live vehicle
    // catalogue (same /api/vehicles data already loaded) so the fleet
    // section always shows real vehicles instead of an empty placeholder.
    return vehicles.filter((vehicle) => vehicle.photos?.length).slice(0, 4);
  }, [vehicles]);
  const fleetPhotoFor = (vehicle) => vehicle.landingPhotos?.[0] || vehicle.photos?.[0] || "";
  const whyUs = site?.whyUs;
  const reviewLoop = useMemo(() => featuredReviews.length ? [...featuredReviews, ...featuredReviews, ...featuredReviews] : [], [featuredReviews]);

  return (
    <div className="page home-page">
      <SiteBanner />
      <Navbar />

      <section className="home-hero home-hero-modern" aria-label="Kuwarji Travels welcome banner">
        <div className="home-hero-modern-media" aria-hidden="true">
          <img
            src="/kuwarji-two-buses.jpg"
            alt=""
            loading="eager"
            fetchpriority="high"
          />
          <span className="home-hero-modern-wash" />
          <span className="home-hero-modern-glow" />
        </div>
        <div className="container home-hero-modern-inner">
          <div className="home-hero-modern-copy">
            <HeroHeadline />
            <div className="home-hero-modern-actions">
              <Link to="/trip-planner" className="home-modern-btn home-modern-btn-primary">
                Plan My Trip
              </Link>
              <Link to="/vehicles" className="home-modern-btn home-modern-btn-light">
                Search Vehicles
              </Link>
            </div>
          </div>
        </div>
        <div className="home-hero-modern-scroll" aria-hidden="true"><span /> Scroll to explore</div>
      </section>

      <section className="home-section home-fleet" id="vehicles"><div className="container">
        <Reveal><div className="home-section-heading centered-title"><div><h2>Explore Our Fleet</h2><span className="home-title-underline" /></div><Link to="/vehicles" className="home-text-link">View All Vehicles <Icon name="arrowRight" size={15}/></Link></div></Reveal>
        {loading && <div className="home-state">Loading fleet…</div>}
        {!loading && landingVehicles.length === 0 && <div className="home-empty">Vehicle photos will appear here once added from the Admin Panel.</div>}
        {!loading && landingVehicles.length > 0 && <div className="home-fleet-grid">
          {landingVehicles.map((vehicle, i) => <Reveal delayMs={i*60} className="home-fleet-reveal" key={vehicle.id}><Link to={`/vehicles/${vehicle.id}`} className="home-fleet-card">
            <div className="home-fleet-image"><img src={fleetPhotoFor(vehicle)} alt={vehicle.name} loading="lazy" /></div>
            <div className="home-fleet-body"><span>{vehicle.category?.name || "Vehicle"}</span><h3>{vehicle.name}</h3><p>{vehicle.capacity} seats · {vehicle.acType === "AC" ? "AC" : "Non-AC"}</p><b>View Details <Icon name="arrowRight" size={14}/></b></div>
          </Link></Reveal>)}
        </div>}
      </div></section>

      <section className="home-section home-why" id="why-us">
        <div className="container">
          <Reveal>
            <div className="home-why-heading">
              <span className="home-eyebrow">WHY KUWARJI</span>
              <h2>{whyUs?.title || "Why Kuwarji Travels"}</h2>
              <p>{whyUs?.intro || "Comfortable journeys, dependable vehicles and support you can count on."}</p>
            </div>
          </Reveal>
          <div className="home-why-cards">
            {[
              { kind: "clock", title: "On-time Departure", body: "We value your time and plan every journey with punctual service in mind." },
              { kind: "shield", title: "Safe & Comfortable", body: "Well-maintained vehicles and a professional travel experience for every group." },
              { kind: "support", title: "24×7 Customer Support", body: "Our team is here to help with enquiries, bookings and travel arrangements." },
              { kind: "fleet", title: "Clean & Spacious Vehicles", body: "Travel comfortably with neat interiors and vehicles suited to your group size." },
            ].map((item, index) => (
              <Reveal delayMs={index * 80} key={item.title} className="home-why-card-reveal">
                <article className="home-why-card">
                  <span className="home-why-card-icon"><BenefitIcon kind={item.kind} className="home-why-card-svg" /></span>
                  <h3>{item.title}</h3>
                  <p>{item.body}</p>
                </article>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {packages.length > 0 && <section className="home-section home-packages" id="tour-packages"><div className="container">
        <Reveal><div className="home-section-heading"><div><span className="home-eyebrow">TOUR PACKAGES</span><h2>Journeys made for memories</h2><p>Handpicked multi-day tours, planned and looked after by our team.</p></div><Link to="/tour-packages" className="home-text-link">View All Packages →</Link></div></Reveal>
        <div className="home-package-grid">{packages.slice(0,3).map((pkg, i)=><Reveal delayMs={i*90} key={pkg.id} className="home-package-reveal"><Link to={`/tour-packages/${pkg.id}`} className="home-package-card"><div className="home-package-image">{pkg.imageUrl ? <img src={pkg.imageUrl} alt={pkg.title} loading="lazy"/> : <div>No package image</div>}<span>{pkg.durationDays} Days</span></div><div className="home-package-body"><small>{pkg.destination}</small><h3>{pkg.title}</h3><p>{pkg.description || "A thoughtfully planned journey by Kuwarji Travels."}</p><b>Explore Package <Icon name="arrowRight" size={14}/></b></div></Link></Reveal>)}</div>
      </div></section>}

      {featuredReviews.length > 0 && <section className="home-section home-reviews" aria-label="Customer Reviews"><div className="container">
        <div className="home-reviews-heading"><h2>What Our Customers Say</h2><div className="home-reviews-rating"><span className="home-reviews-stars">★★★★★</span><b>{(featuredReviews.reduce((s,r)=>s+(Number(r.rating)||0),0)/featuredReviews.length).toFixed(1)}/5</b><span>({featuredReviews.length}+ Reviews)</span></div></div>
        <div className="home-review-marquee">
          <div className="home-review-track">
            {reviewLoop.map((review,index)=>{
              const avatarColors=["#c9d6ff","#bff0d8","#ffd6df","#c6e6ff"];
              const initial=(review.customerName||"K").trim().charAt(0).toUpperCase();
              return <article className="home-review-card" key={`${review.id||index}-${index}`}>
                <div className="home-review-top"><span className="home-review-avatar" style={{background:avatarColors[index%avatarColors.length]}}>{initial}</span><div><strong>{(review.customerName || "Kuwarji customer").trim().toLowerCase().replace(/(^|\s|[-'\.])([a-z])/g, (_, p, c) => `${p}${c.toUpperCase()}`)}</strong><div className="home-review-stars-row">{"★".repeat(Math.max(0,Math.min(5,Number(review.rating)||5)))}{"☆".repeat(Math.max(0,5-Math.min(5,Number(review.rating)||5)))}</div></div></div>
                <p>{review.text || "Excellent travel experience with Kuwarji Travels."}</p>
                <small>{review.district && review.state ? `${review.district}, ${review.state}` : review.state || review.district || "Verified traveller"}</small>
              </article>;
            })}
          </div>
        </div>
      </div></section>}

      <section className="container home-faq"><div className="home-section-heading"><div><span className="home-eyebrow">FAQ</span><h2>Frequently Asked Questions</h2></div></div><FaqAccordion /></section>

      <Footer />
      <button type="button" className="home-enquiry-fab" onClick={()=>setEnquiryOpen(true)}>
        Enquiry
      </button>
      <HomeAiChat />
      {site?.whatsappNumber && (() => {
        const whatsappDigits = String(site.whatsappNumber).replace(/\D/g, "");
        if (!whatsappDigits) return null;
        const message = encodeURIComponent("Hello Kuwarji Travels, I need assistance with my travel requirement.");
        return (
          <a
            className="home-whatsapp-fab"
            href={`https://wa.me/${whatsappDigits}?text=${message}`}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Chat with Kuwarji Travels on WhatsApp"
          >
            <span className="home-whatsapp-label">Chat with us on WhatsApp</span>
            <svg viewBox="0 0 48 48" aria-hidden="true" fill="none">
              <path fill="currentColor" d="M24 5.5C13.8 5.5 5.5 13.7 5.5 23.8c0 3.2.8 6.2 2.4 8.9L5.5 42.5l10-2.4c2.6 1.4 5.5 2.1 8.5 2.1h.1c10.1 0 18.4-8.2 18.4-18.3S34.2 5.5 24 5.5Z"/>
              <path fill="#25d366" d="M24 8.9c8.3 0 15 6.7 15 14.9s-6.7 15-15 15c-2.7 0-5.3-.7-7.6-2l-.7-.4-5.9 1.4 1.4-5.7-.4-.7c-1.4-2.3-2.1-4.9-2.1-7.6C8.7 15.6 15.5 8.9 24 8.9Z"/>
              <path fill="#fff" d="M17.4 14.9c-.4-.9-.8-.9-1.2-.9h-1c-.4 0-.9.2-1.2.6-.4.4-1.6 1.5-1.6 3.7s1.6 4.3 1.8 4.6c.2.3 3.1 5 7.6 6.8 3.8 1.5 4.6 1.2 5.4 1.1.8-.1 2.7-1.1 3.1-2.2.4-1.1.4-2 .3-2.2-.1-.2-.4-.3-.9-.6-.5-.2-2.7-1.3-3.1-1.4-.4-.2-.7-.2-1 .2-.3.5-1.2 1.4-1.5 1.7-.3.3-.6.4-1.1.1-.5-.2-1.9-.7-3.6-2.2-1.3-1.2-2.2-2.6-2.5-3-.3-.5 0-.7.2-1 .2-.2.5-.6.7-.8.2-.3.3-.5.5-.9.2-.3.1-.6 0-.9-.1-.2-1-2.5-1.4-3.4Z"/>
            </svg>
          </a>
        );
      })()}
      <EnquiryDrawer open={enquiryOpen} onClose={()=>setEnquiryOpen(false)} />
    </div>
  );
}