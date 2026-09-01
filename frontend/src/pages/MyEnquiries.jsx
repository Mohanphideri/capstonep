import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../AuthContext.jsx";
import ConsumerLayout from "../components/ConsumerLayout.jsx";
import { apiFetch } from "../api.js";
import "./MyBookings.css";
import "./MyEnquiries.css";

const STATUS_COPY = {
  NEW: "Your enquiry has been received. Our team will connect with you soon.",
  BOOKED: "Your enquiry has been selected for booking.",
  BOOKING: "Your booking is being processed.",
  CLOSED: "This enquiry has been closed.",
  CANCELLED: "This enquiry has been cancelled.",
};

const EMPTY_FORM = { pickupLocation: "", destination: "", tripDate: "", returnDate: "", passengers: "", vehicleType: "", message: "" };

export default function MyEnquiries() {
  const [enquiries, setEnquiries] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const [form, setForm] = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [formMessage, setFormMessage] = useState("");
  const [formError, setFormError] = useState(false);

  useEffect(() => {
    apiFetch("/api/my-enquiries").then(({ ok, data }) => {
      if (ok && data?.success) setEnquiries(data.enquiries);
      setLoading(false);
    });
  }, []);

  async function createEnquiry(e) {
    e.preventDefault();
    setSubmitting(true);
    setFormMessage("");
    const payload = { name: user?.name || "Traveller", phone: user?.phone, email: user?.email || "", ...form };
    const r = await apiFetch("/api/enquiry", { method: "POST", body: JSON.stringify(payload) });
    setSubmitting(false);
    if (r.ok && r.data?.success) {
      setForm(EMPTY_FORM);
      setFormError(false);
      setFormMessage("Enquiry created successfully.");
      const q = await apiFetch("/api/my-enquiries");
      if (q.ok && q.data?.success) setEnquiries(q.data.enquiries || []);
    } else {
      setFormError(true);
      setFormMessage(r.data?.error || "Please try again.");
    }
  }

  return (
    <ConsumerLayout title="My Enquiries" lead="Track every enquiry and see where it stands.">
      <section className="ticket enquiry-create-card">
        <div className="enquiry-create-head">
          <div>
            <h2>Create Enquiry</h2>
            <p>Logged-in customers do not need OTP verification.</p>
          </div>
        </div>
        <form onSubmit={createEnquiry} className="enquiry-create-form">
          <input className="admin-input" placeholder="Pickup location" required value={form.pickupLocation} onChange={(e) => setForm({ ...form, pickupLocation: e.target.value })} />
          <input className="admin-input" placeholder="Destination" required value={form.destination} onChange={(e) => setForm({ ...form, destination: e.target.value })} />
          <input className="admin-input" type="date" required value={form.tripDate} onChange={(e) => setForm({ ...form, tripDate: e.target.value })} />
          <input className="admin-input" type="date" placeholder="Return date" value={form.returnDate} onChange={(e) => setForm({ ...form, returnDate: e.target.value })} />
          <input className="admin-input" type="number" min="1" placeholder="Passengers" value={form.passengers} onChange={(e) => setForm({ ...form, passengers: e.target.value })} />
          <input className="admin-input" placeholder="Vehicle type" value={form.vehicleType} onChange={(e) => setForm({ ...form, vehicleType: e.target.value })} />
          <textarea className="admin-textarea enquiry-create-message" rows="3" placeholder="Additional requirements" value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} />
          <div className="enquiry-create-footer">
            <button className="btn btn-primary" disabled={submitting}>{submitting ? "Submitting…" : "Submit Enquiry"}</button>
            {formMessage && <span className={`enquiry-create-message-text${formError ? " is-error" : ""}`}>{formMessage}</span>}
          </div>
        </form>
      </section>

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
                  {e.package?.title ? `Tour: ${e.package.title}` : e.selectedVehicles?.length ? e.selectedVehicles.join(", ") : e.vehicleType || "General enquiry"}
                </p>
                {(e.pickupLocation || e.destination || e.package?.destination) && (
                  <p className="my-booking-route">
                    {e.pickupLocation || "-"} → {e.destination || e.package?.destination || "-"}
                  </p>
                )}
                {e.tripDate && <p className="my-booking-dates">Journey date: {e.tripDate}</p>}
                <p className="booking-detail-muted enquiry-progress-note">
                  {STATUS_COPY[e.status] || ""}
                </p>
              </div>
              <div className="my-booking-meta">
                <span className={`my-booking-status status-${e.status.toLowerCase()}`}>
                  {e.status.replace(/_/g, " ")}
                </span>
                {e.convertedToBookingId && (
                  <Link to="/dashboard/bookings" className="btn btn-outline btn-sm enquiry-view-booking-link">
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
