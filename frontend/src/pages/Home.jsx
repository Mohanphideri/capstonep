import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Navbar } from "../components/Navbar.jsx";
import { Footer } from "../components/Footer.jsx";
import { HeroIllustration } from "../components/HeroIllustration.jsx";
import { VehicleIcon } from "../components/VehicleIcon.jsx";
import { FaqAccordion } from "../components/FaqAccordion.jsx";
import { EnquiryDrawer } from "../components/EnquiryDrawer.jsx";
import { Reveal } from "../components/Reveal.jsx";
import SiteBanner from "../components/SiteBanner.jsx";
import "./Home.css";

// Placeholders — wire these to admin-configured settings in a later phase.

// Illustrative categories only — category management (create / edit /
// activate / reorder) is a later admin-portal phase, backed by MongoDB.
const CATEGORIES = [
  {
    name: "Volvo",
    note: "Long-distance, premium seating",
    icon: "bus",
  },
  {
    name: "AC Bus",
    note: "Group travel, cooled cabin",
    icon: "bus",
  },
  {
    name: "Non-AC Bus",
    note: "Budget-friendly group travel",
    icon: "bus",
  },
  {
    name: "Semi-Sleeper",
    note: "Overnight, reclining seats",
    icon: "sleeper",
  },
  {
    name: "Sleeper",
    note: "Overnight, berths",
    icon: "sleeper",
  },
  {
    name: "Tempo Traveller",
    note: "Small groups, short trips",
    icon: "van",
  },
  {
    name: "Van",
    note: "Local transfers",
    icon: "van",
  },
  {
    name: "Vanity Van",
    note: "Luxury, custom interiors",
    icon: "luxury",
  },
];

const STEPS = [
  {
    n: "01",
    title: "Verify your number",
    body:
      "Log in with a one-time SMS code — no password to create or remember.",
  },
  {
    n: "02",
    title: "Search your route",
    body:
      "Give us from, to, dates and passenger count. We show vehicles that fit.",
  },
  {
    n: "03",
    title: "Book and track it",
    body:
      "Confirm your trip and follow its status from your dashboard, start to finish.",
  },
];

export default function Home() {
  const [enquiryOpen, setEnquiryOpen] = useState(false);
  const [featuredReviews, setFeaturedReviews] = useState([]);

  useEffect(() => {
    let cancelled = false;

    fetch(
      `${import.meta.env.VITE_API_URL?.replace(/\/$/, "") || ""}/api/reviews/featured`,
      {
        credentials: "include",
      }
    )
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!cancelled && data?.success) {
          setFeaturedReviews(data.reviews || []);
        }
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, []);

  const openEnquiry = () => {
    setEnquiryOpen(true);
  };

  return (
    <div className="page">
      <SiteBanner />

      <Navbar />

      {/* HERO */}
      <section className="hero">
        <div className="container hero-grid">
          <div>
            <h1 className="hero-title">
              Comfortable travel.
              <br />
              Reliable vehicles.
              <br />
              <span className="hero-title-accent">
                Wherever you need.
              </span>
            </h1>

            <p className="hero-body">
              Kuwarji Travels provides buses and other vehicles on rent —
              for outstation journeys, group travel and local packages.
            </p>

            <div className="hero-actions">
              <Link
                to="/trip-maker"
                className="btn btn-primary"
              >
                Plan My Trip →
              </Link>

              <Link
                to="/vehicles"
                className="btn btn-outline"
              >
                Search Vehicles
              </Link>
            </div>
          </div>

          <div className="hero-illustration-wrap">
            <HeroIllustration className="hero-illustration" />

            <div className="ticket ticket-stub hero-route-card">
              <div>
                <p className="eyebrow-muted hero-route-label">
                  Route
                </p>

                <p className="hero-route-value">
                  Origin → Destination
                </p>
              </div>

              <span className="hero-route-badge">
                Open seats
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* TRIP MAKER */}
      <section className="section-bordered trip-maker-home-section">
        <Reveal className="container section">
          <div className="trip-maker-home-card ticket">
            <div
              className="trip-maker-home-icon"
              aria-hidden="true"
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
              >
                <path
                  d="M4 5.5A2.5 2.5 0 0 1 6.5 3H19v16.5A1.5 1.5 0 0 0 17.5 18H6.5A2.5 2.5 0 0 1 4 15.5v-10Z"
                  stroke="currentColor"
                  strokeWidth="1.7"
                />

                <path
                  d="M7 7h7M7 10h5"
                  stroke="currentColor"
                  strokeWidth="1.7"
                  strokeLinecap="round"
                />

                <path
                  d="m15 13 1.2 2.2L18.5 16l-2.3.8L15 19l-1.2-2.2-2.3-.8 2.3-.8L15 13Z"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinejoin="round"
                />
              </svg>
            </div>

            <div>
              <p className="eyebrow">
                New · Trip Maker
              </p>

              <h2 className="section-title">
                Build a complete journey, not just a booking.
              </h2>

              <p className="section-body">
                Choose destinations, dates, travellers, stops and travel
                style. Trip Maker then helps you shape the itinerary and
                find a suitable vehicle from the live Kuwarji fleet.
              </p>
            </div>

            <Link
              to="/trip-maker"
              className="btn btn-primary"
            >
              Open Trip Maker →
            </Link>
          </div>
        </Reveal>
      </section>

      {/* ABOUT */}
      <section
        id="about"
        className="section-bordered"
      >
        <Reveal className="container section">
          <div className="about-content">
            <p className="eyebrow">
              About Kuwarji Travels
            </p>

            <h2 className="section-title">
              Buses and vehicles on rent, run by people who know the road.
            </h2>

            <p className="section-body">
              Kuwarji Travels provides a range of vehicles for rent — from
              Volvo and AC buses to sleeper coaches, tempo travellers and
              vans — for outstation trips, group travel and local packages.
              Full fleet details, photos and exact pricing are configured by
              our team and shown once you search for your journey.
            </p>
          </div>
        </Reveal>
      </section>

      {/* HOW IT WORKS */}
      <section
        id="how-it-works"
        className="container section"
      >
        <Reveal>
          <p className="eyebrow">
            How it works
          </p>

          <h2 className="section-title">
            Three steps, start to finish
          </h2>
        </Reveal>

        <div className="steps-grid">
          {STEPS.map((step, i) => (
            <Reveal
              key={step.n}
              delayMs={i * 100}
              className="step-item"
            >
              <span className="step-number">
                {step.n}
              </span>

              <h3 className="step-title">
                {step.title}
              </h3>

              <p className="step-body">
                {step.body}
              </p>
            </Reveal>
          ))}
        </div>
      </section>

      {/* VEHICLE CATEGORIES */}
      <section
        id="categories"
        className="section-bordered"
      >
        <div className="container section">
          <Reveal>
            <p className="eyebrow">
              Vehicle categories
            </p>

            <h2 className="section-title">
              A category for every kind of trip
            </h2>
          </Reveal>

          <div className="categories-grid">
            {CATEGORIES.map((cat, i) => (
              <Reveal
                key={cat.name}
                delayMs={(i % 4) * 60}
              >
                <div className="ticket category-card">
                  <VehicleIcon
                    kind={cat.icon}
                    className="category-icon"
                  />

                  <p className="category-name">
                    {cat.name}
                  </p>

                  <p className="category-note">
                    {cat.note}
                  </p>
                </div>
              </Reveal>
            ))}
          </div>

          <p className="categories-disclaimer">
            Categories shown are illustrative. Live availability and pricing
            are configured by Kuwarji Travels and shown at search time.
          </p>
        </div>
      </section>

      {/* PRIDE CUSTOMERS */}
      {featuredReviews.length > 0 && (
        <section
          className="section-bordered pride-customers-section"
          aria-label="Our Pride Customers"
        >
          <div className="container section">
            <Reveal>
              <p className="eyebrow">
                Our Pride Customers
              </p>

              <h2 className="section-title">
                Loved by travellers who choose Kuwarji.
              </h2>
            </Reveal>
          </div>

          <div
            className="pride-marquee"
            aria-label="Customer reviews"
          >
            <div className="pride-track">
              {[...featuredReviews, ...featuredReviews].map(
                (review, index) => (
                  <article
                    className="pride-review-card"
                    key={`${review.id}-${index}`}
                  >
                    <div
                      className="pride-review-stars"
                      aria-label={`${review.rating} out of 5 stars`}
                    >
                      {[1, 2, 3, 4, 5].map((star) => (
                        <span key={star}>
                          {star <= review.rating ? "★" : "☆"}
                        </span>
                      ))}
                    </div>

                    <p className="pride-review-text">
                      “{review.text}”
                    </p>

                    <strong className="pride-review-name">
                      {review.customerName}
                    </strong>

                    <span className="pride-review-rating">
                      {review.rating}/5 rating
                    </span>
                  </article>
                )
              )}
            </div>
          </div>
        </section>
      )}

      {/* FAQ */}
      <section
        id="faq"
        className="container-sm section"
      >
        <Reveal>
          <p className="eyebrow">
            FAQ
          </p>

          <h2 className="section-title">
            Good to know
          </h2>
        </Reveal>

        <Reveal
          delayMs={100}
          className="faq-wrap"
        >
          <FaqAccordion />
        </Reveal>
      </section>

      {/* ENQUIRY */}
      <section
        id="enquiry"
        className="section-bordered"
      >
        <div className="container section enquiry-section">
          <Reveal className="enquiry-intro">
            <p className="eyebrow">
              Get an enquiry
            </p>

            <h2 className="section-title">
              Tell us about your trip
            </h2>

            <p className="section-body">
              Share a few details and verify your mobile number with an
              OTP — our team will call you back with vehicle options and
              pricing. No spam, no fake leads: every enquiry here comes
              from a real, SMS-verified number.
            </p>
          </Reveal>

          <Reveal
            delayMs={100}
            className="enquiry-cta-wrap"
          >
            <div className="ticket enquiry-cta-card">
              <div
                className="enquiry-cta-icon"
                aria-hidden="true"
              >
                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 26 26"
                  fill="none"
                >
                  <path
                    d="M2 4h22M2 4l10.2 8.4a2.3 2.3 0 002.6 0L25 4M2 4v15.4A1.6 1.6 0 003.6 21H24a1.6 1.6 0 001.6-1.6V4"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>

              <p className="enquiry-cta-title">
                Ready when you are
              </p>

              <ul className="enquiry-cta-list">
                <li>
                  Takes under a minute to fill in
                </li>

                <li>
                  Mobile number verified with an OTP — no spam, no fake
                  leads
                </li>

                <li>
                  Our team calls back with vehicle options and pricing
                </li>
              </ul>

              <button
                type="button"
                onClick={openEnquiry}
                className="btn btn-primary btn-block"
              >
                Open enquiry form
              </button>
            </div>
          </Reveal>
        </div>
      </section>

      {/* CTA */}
      <section className="container cta-section">
        <Reveal>
          <div className="ticket cta-card">
            <div>
              <h2 className="cta-title">
                Ready to plan your trip?
              </h2>

              <p className="cta-body">
                Plan your route, compare vehicles and send your trip
                requirements to the Kuwarji Travels team.
              </p>
            </div>

            <Link
              to="/trip-maker"
              className="btn btn-primary cta-btn"
            >
              Start Trip Maker →
            </Link>
          </div>
        </Reveal>
      </section>

      {/* FOOTER */}
      <Footer />

      {/* ENQUIRY DRAWER */}
      <EnquiryDrawer
        open={enquiryOpen}
        onClose={() => setEnquiryOpen(false)}
      />
    </div>
  );
}