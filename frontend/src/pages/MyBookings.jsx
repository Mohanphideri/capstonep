import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import ConsumerLayout from "../components/ConsumerLayout.jsx";
import { apiFetch } from "../api.js";
import "./MyBookings.css";

const TABS = [
  { value: "upcoming", label: "Upcoming" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
];

export default function MyBookings() {
  const [scope, setScope] = useState("upcoming");
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    apiFetch(`/api/bookings?scope=${scope}`).then(({ ok, data }) => {
      if (cancelled) return;
      if (ok && data?.success) setBookings(data.bookings);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [scope]);

  return (
    <ConsumerLayout title="My Bookings" lead="Review upcoming, past, and cancelled journeys from one place.">
        <div className="my-bookings-tabs">
          {TABS.map((t) => (
            <button
              key={t.value}
              type="button"
              className={`my-bookings-tab ${scope === t.value ? "is-active" : ""}`}
              onClick={() => setScope(t.value)}
            >
              {t.label}
            </button>
          ))}
        </div>

        {loading && <p className="vehicles-state">Loading…</p>}

        {!loading && bookings.length === 0 && (
          <p className="vehicles-state">You don&apos;t have any {scope} bookings.</p>
        )}

        {!loading && bookings.length > 0 && (
          <div className="my-bookings-list">
            {bookings.map((b) => (
              <Link key={b.bookingId} to={`/dashboard/bookings/${b.bookingId}`} className="ticket my-booking-card">
                <div className="my-booking-main">
                  <div className="my-booking-id-row"><p className="eyebrow-muted">Booking ID</p><strong>{b.bookingId}</strong></div>
                  <p className="my-booking-vehicle">{b.vehicles.map((v) => v.name).join(", ")}</p>
                  <p className="my-booking-route">
                    {b.journey.pickup} → {b.journey.destination}
                  </p>
                  <p className="my-booking-dates"><span>Travel date</span>
                    {formatDate(b.journey.journeyStart)}
                    {b.journey.journeyEnd ? ` – ${formatDate(b.journey.journeyEnd)}` : ""}
                  </p>
                </div>
                <div className="my-booking-meta">
                  <span className={`my-booking-status status-${b.status.toLowerCase()}`}>
                    {b.status === "CANCELLED" ? "Cancelled" : b.status === "CONFIRMED" ? "Confirmed" : b.status.replace(/_/g, " ")}
                  </span>
                  {b.status === "CANCELLED" && b.refundAmount > 0 ? (
                    <span className="my-booking-refund">Refund ₹{Number(b.refundAmount).toLocaleString("en-IN")}</span>
                  ) : b.pricing?.totalAmount > 0 ? (
                    <span className="my-booking-amount">₹{b.pricing.totalAmount}</span>
                  ) : null}
                </div>
              </Link>
            ))}
          </div>
        )}
    </ConsumerLayout>
  );
}

function formatDate(d) {
  return new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}
