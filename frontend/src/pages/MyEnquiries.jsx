import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import ConsumerLayout from "../components/ConsumerLayout.jsx";
import { apiFetch } from "../api.js";
import "./MyBookings.css";

const STATUS_COPY = {
  NEW: "Your enquiry has been received. Our team will connect with you soon.",
  IN_REVIEW: "Our team is reviewing your enquiry and will connect with you soon.",
  CONTACTED: "Our team has been in touch about this enquiry.",
  QUOTED: "A quotation has been shared for this enquiry.",
  CONVERTED: "This enquiry has been converted into a booking.",
  CLOSED: "This enquiry has been closed.",
  CANCELLED: "This enquiry has been cancelled.",
};

export default function MyEnquiries() {
  const [enquiries, setEnquiries] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch("/api/my-enquiries").then(({ ok, data }) => {
      if (ok && data?.success) setEnquiries(data.enquiries);
      setLoading(false);
    });
  }, []);

  return (
    <ConsumerLayout title="My Enquiries" lead="Track every enquiry and see where it stands.">
        <p className="eyebrow">
          <Link to="/dashboard" className="my-bookings-back">
            ← Dashboard
          </Link>
        </p>

        {loading && <p className="vehicles-state">Loading…</p>}
        {!loading && enquiries.length === 0 && (
          <p className="vehicles-state">You don&apos;t have any enquiries yet.</p>
        )}

        {!loading && enquiries.length > 0 && (
          <div className="my-bookings-list">
            {enquiries.map((e) => (
              <div key={e.id} className="ticket my-booking-card">
                <div>
                  <p className="eyebrow-muted">{e.enquiryId}</p>
                  <p className="my-booking-vehicle">
                    {e.selectedVehicles?.length ? e.selectedVehicles.join(", ") : e.vehicleType || "General enquiry"}
                  </p>
                  {(e.pickupLocation || e.destination) && (
                    <p className="my-booking-route">
                      {e.pickupLocation || "-"} → {e.destination || "-"}
                    </p>
                  )}
                  {e.tripDate && <p className="my-booking-dates">Journey date: {e.tripDate}</p>}
                  <p className="booking-detail-muted" style={{ marginTop: "0.5rem" }}>
                    {STATUS_COPY[e.status] || ""}
                  </p>
                </div>
                <div className="my-booking-meta">
                  <span className={`my-booking-status status-${e.status.toLowerCase()}`}>
                    {e.status.replace(/_/g, " ")}
                  </span>
                  {e.convertedToBookingId && (
                    <Link to="/dashboard/bookings" className="btn btn-outline btn-sm" style={{ marginTop: "0.5rem" }}>
                      View booking
                    </Link>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
    </ConsumerLayout>
  );
}
