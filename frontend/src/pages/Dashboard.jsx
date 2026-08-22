import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ProfileCompletionModal } from "../components/ProfileCompletionModal.jsx";
import { useAuth } from "../AuthContext.jsx";
import { apiFetch } from "../api.js";
import ConsumerLayout, {
  ConsumerIcon as Icon,
} from "../components/ConsumerLayout.jsx";
import "./Dashboard.css";

function formatDate(value) {
  if (!value) return "Date not available";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default function Dashboard() {
  const { user } = useAuth();

  const [upcoming, setUpcoming] = useState([]);
  const [loadingBookings, setLoadingBookings] = useState(true);
  const [enquiries, setEnquiries] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [dismissedProfileModal, setDismissedProfileModal] = useState(false);

  useEffect(() => {
    if (!user) return;

    let mounted = true;

    setLoadingBookings(true);

    apiFetch("/api/bookings?scope=upcoming")
      .then(({ ok, data }) => {
        if (!mounted) return;

        if (ok && data?.success) {
          setUpcoming(Array.isArray(data.bookings) ? data.bookings : []);
        } else {
          setUpcoming([]);
        }
      })
      .catch(() => {
        if (mounted) {
          setUpcoming([]);
        }
      })
      .finally(() => {
        if (mounted) {
          setLoadingBookings(false);
        }
      });

    apiFetch("/api/my-enquiries")
      .then(({ ok, data }) => {
        if (!mounted) return;

        if (ok && data?.success) {
          setEnquiries(
            Array.isArray(data.enquiries) ? data.enquiries : []
          );
        } else {
          setEnquiries([]);
        }
      })
      .catch(() => {
        if (mounted) {
          setEnquiries([]);
        }
      });

    apiFetch("/api/invoices")
      .then(({ ok, data }) => {
        if (!mounted) return;

        if (ok && data?.success) {
          setInvoices(
            Array.isArray(data.invoices) ? data.invoices : []
          );
        } else {
          setInvoices([]);
        }
      })
      .catch(() => {
        if (mounted) {
          setInvoices([]);
        }
      });

    return () => {
      mounted = false;
    };
  }, [user]);

  if (!user) return null;

  const profileIncomplete = !user.name || !user.email;
  const displayName = user.name || "Traveller";
  const nextTrip = upcoming[0];
  const firstName = displayName.split(" ")[0];

  return (
    <ConsumerLayout title="Overview">
      {profileIncomplete && !dismissedProfileModal && (
        <ProfileCompletionModal
          onComplete={() => setDismissedProfileModal(true)}
        />
      )}

      {/* =========================================================
          WELCOME
      ========================================================= */}
      <section className="consumer-welcome">
        <div>
          <span className="consumer-kicker">
            YOUR TRAVEL DESK
          </span>

          <h2>
            Everything for your next journey, in one place.
          </h2>

          <p>
            Search vehicles, send an enquiry, keep track of bookings
            and access invoices without jumping between pages.
          </p>

          <div className="consumer-welcome-actions">
            <Link
              to="/dashboard/vehicles"
              className="btn consumer-primary-btn"
            >
              Find your vehicle
              <Icon name="arrow" size={17} />
            </Link>

            <Link
              to="/dashboard/bookings"
              className="consumer-secondary-btn"
            >
              View bookings
            </Link>
          </div>
        </div>

        <div className="consumer-route-art">
          <div className="route-point">
            <span></span>
            <small>YOUR TRIP</small>
            <strong>Plan</strong>
          </div>

          <div className="route-line"></div>

          <div className="route-point route-point-end">
            <span></span>
            <small>DESTINATION</small>
            <strong>Explore</strong>
          </div>
        </div>
      </section>

      {/* =========================================================
          PROFILE ALERT
      ========================================================= */}
      {profileIncomplete && (
        <section className="consumer-profile-alert">
          <div className="consumer-alert-icon">
            <Icon name="user" size={18} />
          </div>

          <div>
            <strong>Complete your profile</strong>

            <p>
              {!user.name
                ? "Add your name"
                : "Add your email"}{" "}
              so bookings and enquiries can be processed smoothly.
            </p>
          </div>

          <button
            type="button"
            className="consumer-alert-action"
            onClick={() => setDismissedProfileModal(false)}
          >
            Complete now
            <Icon name="arrow" size={15} />
          </button>
        </section>
      )}

      {/* =========================================================
          STATS
      ========================================================= */}
      <section className="consumer-stats">
        <Link
          to="/dashboard/bookings"
          className="consumer-stat-card"
        >
          <span className="consumer-stat-icon blue">
            <Icon name="calendar" />
          </span>

          <span>
            <small>Upcoming bookings</small>

            <strong>
              {loadingBookings ? "…" : upcoming.length}
            </strong>
          </span>

          <Icon name="arrow" size={16} />
        </Link>

        <Link
          to="/dashboard/enquiries"
          className="consumer-stat-card"
        >
          <span className="consumer-stat-icon violet">
            <Icon name="message" />
          </span>

          <span>
            <small>Active enquiries</small>

            <strong>{enquiries.length}</strong>
          </span>

          <Icon name="arrow" size={16} />
        </Link>

        <Link
          to="/dashboard/invoices"
          className="consumer-stat-card"
        >
          <span className="consumer-stat-icon green">
            <Icon name="receipt" />
          </span>

          <span>
            <small>Invoices</small>

            <strong>{invoices.length}</strong>
          </span>

          <Icon name="arrow" size={16} />
        </Link>

        <div className="consumer-stat-card">
          <span className="consumer-stat-icon orange">
            <Icon name="user" />
          </span>

          <span>
            <small>Account</small>

            <strong>
              {profileIncomplete ? "75%" : "100%"}
            </strong>
          </span>

          <span className="consumer-stat-note">
            {profileIncomplete ? "Complete" : "Ready"}
          </span>
        </div>
      </section>

      {/* =========================================================
          MAIN DASHBOARD GRID
      ========================================================= */}
      <section className="consumer-section-grid">

        {/* NEXT TRIP */}
        <div className="consumer-panel">
          <div className="consumer-panel-head">
            <div>
              <span className="consumer-kicker">
                NEXT UP
              </span>

              <h3>Your next trip</h3>
            </div>

            <Link to="/dashboard/bookings">
              View all
              <Icon name="arrow" size={14} />
            </Link>
          </div>

          {nextTrip ? (
            <Link
              to={`/dashboard/bookings/${nextTrip.bookingId}`}
              className="consumer-trip-card"
            >
              <div className="consumer-trip-top">
                <span className="consumer-booking-id">
                  {nextTrip.bookingId || "Booking"}
                </span>

                <span
                  className={`consumer-status status-${String(
                    nextTrip.status || "CONFIRMED"
                  ).toLowerCase()}`}
                >
                  {String(
                    nextTrip.status || "CONFIRMED"
                  ).replace(/_/g, " ")}
                </span>
              </div>

              <div className="consumer-trip-route">
                <div>
                  <small>FROM</small>

                  <strong>
                    {nextTrip.journey?.pickup ||
                      "Pickup not available"}
                  </strong>
                </div>

                <div className="consumer-route-arrow">
                  <Icon name="arrow" size={18} />
                </div>

                <div>
                  <small>TO</small>

                  <strong>
                    {nextTrip.journey?.destination ||
                      "Destination not available"}
                  </strong>
                </div>
              </div>

              <div className="consumer-trip-footer">
                <span>
                  <Icon name="calendar" size={15} />

                  {formatDate(
                    nextTrip.journey?.journeyStart
                  )}
                </span>

                <span>
                  <Icon name="route" size={15} />

                  {nextTrip.vehicles?.length
                    ? nextTrip.vehicles
                        .map((vehicle) => vehicle?.name)
                        .filter(Boolean)
                        .join(", ")
                    : "Vehicle not assigned"}
                </span>

                <span>
                  View details
                  <Icon name="arrow" size={14} />
                </span>
              </div>
            </Link>
          ) : (
            <div className="consumer-empty">
              <div className="consumer-empty-icon">
                <Icon name="route" size={24} />
              </div>

              <strong>No upcoming trip yet</strong>

              <p>
                Start planning your next journey by exploring
                our vehicles.
              </p>

              <Link
                to="/dashboard/vehicles"
                className="btn consumer-primary-btn"
              >
                Explore vehicles
              </Link>
            </div>
          )}
        </div>

        {/* QUICK ACTIONS */}
        <div className="consumer-panel consumer-quick-panel">
          <div className="consumer-panel-head">
            <div>
              <span className="consumer-kicker">
                QUICK ACTIONS
              </span>

              <h3>What would you like to do?</h3>
            </div>
          </div>

          <div className="consumer-action-list">

            <Link
              to="/dashboard/vehicles"
              className="consumer-action-row"
            >
              <span className="consumer-action-icon">
                <Icon name="search" />
              </span>

              <span>
                <strong>Find a vehicle</strong>
                <small>
                  Browse available travel options
                </small>
              </span>

              <Icon name="arrow" size={16} />
            </Link>

            <Link
              to="/dashboard/enquiries"
              className="consumer-action-row"
            >
              <span className="consumer-action-icon">
                <Icon name="plus" />
              </span>

              <span>
                <strong>Send an enquiry</strong>
                <small>
                  Tell us about your journey
                </small>
              </span>

              <Icon name="arrow" size={16} />
            </Link>

            <Link
              to="/dashboard/bookings"
              className="consumer-action-row"
            >
              <span className="consumer-action-icon">
                <Icon name="calendar" />
              </span>

              <span>
                <strong>Manage bookings</strong>
                <small>
                  Check dates, routes and status
                </small>
              </span>

              <Icon name="arrow" size={16} />
            </Link>

            <Link
              to="/dashboard/invoices"
              className="consumer-action-row"
            >
              <span className="consumer-action-icon">
                <Icon name="receipt" />
              </span>

              <span>
                <strong>View invoices</strong>
                <small>
                  Access your billing documents
                </small>
              </span>

              <Icon name="arrow" size={16} />
            </Link>

          </div>
        </div>
      </section>

      {/* =========================================================
          RECENT ACTIVITY
      ========================================================= */}
      <section className="consumer-panel consumer-recent-panel">
        <div className="consumer-panel-head">
          <div>
            <span className="consumer-kicker">
              RECENT ACTIVITY
            </span>

            <h3>Your enquiries</h3>
          </div>

          <Link to="/dashboard/enquiries">
            View all
            <Icon name="arrow" size={14} />
          </Link>
        </div>

        {enquiries.length ? (
          <div className="consumer-enquiry-list">
            {enquiries.slice(0, 3).map((enquiry) => (
              <div
                key={enquiry.id}
                className="consumer-enquiry-row"
              >
                <span className="consumer-enquiry-dot"></span>

                <div>
                  <strong>
                    {enquiry.enquiryId || "Enquiry"}
                  </strong>

                  <p>
                    {enquiry.selectedVehicles?.length
                      ? enquiry.selectedVehicles.join(", ")
                      : enquiry.vehicleType ||
                        "General enquiry"}
                  </p>
                </div>

                <span
                  className={`consumer-status status-${String(
                    enquiry.status || "NEW"
                  ).toLowerCase()}`}
                >
                  {String(
                    enquiry.status || "NEW"
                  ).replace(/_/g, " ")}
                </span>

                <span className="consumer-enquiry-date">
                  {enquiry.tripDate ||
                    "Date to be confirmed"}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="consumer-recent-empty">
            <Icon name="message" size={20} />

            <span>
              You have no enquiries yet.
            </span>

            <Link to="/dashboard/enquiries">
              Create your first enquiry
            </Link>
          </div>
        )}
      </section>
    </ConsumerLayout>
  );
}