import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { apiFetch, API_URL } from "../api.js";
import ConsumerLayout from "../components/ConsumerLayout.jsx";
import "./BookingDetail.css";

// Bookings are admin-managed only — there is no customer-side
// cancellation, refund, or payment workflow (spec §1/§23). This page is
// read-only from the customer's point of view aside from reporting an
// issue, which is unrelated to payment.

const COMPLAINT_CATEGORIES = [
  { value: "DRIVER_ISSUE", label: "Driver issue" },
  { value: "VEHICLE_CONDITION", label: "Vehicle condition" },
  { value: "DELAY", label: "Delay" },
  { value: "PICKUP_ISSUE", label: "Pickup issue" },
  { value: "DROP_ISSUE", label: "Drop issue" },
  { value: "STAFF_BEHAVIOUR", label: "Staff behaviour" },
  { value: "OTHER", label: "Other" },
];

export default function BookingDetail() {
  const { bookingId } = useParams();
  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [showComplaintForm, setShowComplaintForm] = useState(false);
  const [complaint, setComplaint] = useState({ category: "OTHER", subject: "", description: "" });
  const [complaintSubmitting, setComplaintSubmitting] = useState(false);
  const [complaintError, setComplaintError] = useState("");
  const [complaintTicket, setComplaintTicket] = useState(null);

  function load() {
    setLoading(true);
    apiFetch(`/api/bookings/${bookingId}`).then(({ ok, data }) => {
      if (ok && data?.success) setBooking(data.booking);
      else setError(data?.error || "Booking not found.");
      setLoading(false);
    });
  }

  useEffect(load, [bookingId]);

  async function handleComplaintSubmit(e) {
    e.preventDefault();
    setComplaintError("");
    if (complaint.description.trim().length < 10) {
      setComplaintError("Please describe the issue in a bit more detail.");
      return;
    }
    setComplaintSubmitting(true);
    const { ok, data } = await apiFetch("/api/complaints", {
      method: "POST",
      body: JSON.stringify({ ...complaint, bookingId }),
    });
    setComplaintSubmitting(false);
    if (!ok || !data?.success) {
      setComplaintError(data?.error || "Failed to submit complaint.");
      return;
    }
    setComplaintTicket(data.complaint.ticketId);
    setShowComplaintForm(false);
  }

  return (
    <ConsumerLayout title="Booking details" lead="Your booking information, journey details, and support options.">
      <div className="booking-detail-main">
        {loading && <p className="vehicles-state">Loading…</p>}
        {!loading && error && <p className="vehicles-state vehicles-state-error">{error}</p>}

        {!loading && booking && (
          <>
            <div className="booking-detail-head">
              <div>
                <h1 className="dashboard-title">{booking.bookingId}</h1>
                <span className={`my-booking-status status-${booking.status.toLowerCase()}`}>
                  {booking.status.replace(/_/g, " ")}
                </span>
              </div>
              <a
                className="btn btn-outline"
                href={`${API_URL}/api/bookings/${booking.bookingId}/pdf`}
                target="_blank"
                rel="noreferrer"
              >
                Download Booking PDF
              </a>
            </div>

            <div className="booking-detail-grid">
              <section className="ticket booking-detail-section">
                <h2 className="vehicle-detail-section-title">
                  Vehicle{booking.vehicles.length > 1 ? "s" : ""}
                </h2>
                {booking.vehicles.map((v, i) => (
                  <div key={i} className={i < booking.vehicles.length - 1 ? "booking-detail-vehicle-row" : undefined}>
                    <p>{v.name}</p>
                    <p className="booking-detail-muted">
                      {v.category} · {v.capacity} seats · {v.acType} ·{" "}
                      {v.seatType?.replace("_", "-").toLowerCase()}
                    </p>
                  </div>
                ))}
              </section>

              <section className="ticket booking-detail-section">
                <h2 className="vehicle-detail-section-title">Journey</h2>
                <p>
                  {booking.journey.pickup} → {booking.journey.destination}
                </p>
                <p className="booking-detail-muted">
                  {formatDate(booking.journey.journeyStart)}
                  {booking.journey.journeyEnd ? ` – ${formatDate(booking.journey.journeyEnd)}` : ""}
                  {booking.journey.pickupTime ? ` · Pickup ${booking.journey.pickupTime}` : ""}
                </p>
                <p className="booking-detail-muted">Passengers: {booking.journey.passengers}</p>
                {booking.journey.notes && <p className="booking-detail-muted">Notes: {booking.journey.notes}</p>}
              </section>

              {booking.pricing?.totalAmount > 0 && (
                <section className="ticket booking-detail-section">
                  <h2 className="vehicle-detail-section-title">Amount</h2>
                  <div className="price-rows">
                    <div className="price-row">
                      <span>Rental amount</span>
                      <span>₹{booking.pricing.rentalAmount}</span>
                    </div>
                    {booking.pricing.additionalCharges > 0 && (
                      <div className="price-row">
                        <span>Additional charges</span>
                        <span>₹{booking.pricing.additionalCharges}</span>
                      </div>
                    )}
                    {booking.pricing.discount > 0 && (
                      <div className="price-row">
                        <span>Discount</span>
                        <span>−₹{booking.pricing.discount}</span>
                      </div>
                    )}
                    {booking.pricing.taxAmount > 0 && (
                      <div className="price-row">
                        <span>Tax</span>
                        <span>₹{booking.pricing.taxAmount}</span>
                      </div>
                    )}
                    <div className="price-row price-row-total">
                      <span>Total</span>
                      <span>₹{booking.pricing.totalAmount}</span>
                    </div>
                    <div className="price-row">
                      <span>Amount received</span>
                      <span>₹{booking.pricing.amountReceived}</span>
                    </div>
                    <div className="price-row">
                      <span>Balance due</span>
                      <span>₹{booking.pricing.balanceAmount}</span>
                    </div>
                  </div>
                  <p className="booking-detail-muted">
                    This is a record kept by our team, not an online payment — please settle any balance
                    directly with Kuwarji Travels.
                  </p>
                </section>
              )}

              {booking.invoice && (
                <section className="ticket booking-detail-section">
                  <h2 className="vehicle-detail-section-title">Invoice</h2>
                  <p>{booking.invoice.invoiceNumber}</p>
                  <p className="booking-detail-muted">
                    Total ₹{booking.invoice.total} · Balance ₹{booking.invoice.balance}
                  </p>
                  <Link to="/dashboard/invoices" className="btn btn-outline booking-detail-invoice-link">
                    View invoices
                  </Link>
                </section>
              )}
            </div>

            <div className="booking-detail-actions">
              {!showComplaintForm && !complaintTicket && (
                <button type="button" className="btn btn-outline" onClick={() => setShowComplaintForm(true)}>
                  Report an issue
                </button>
              )}
            </div>

            {showComplaintForm && (
              <form className="ticket booking-detail-section complaint-form" onSubmit={handleComplaintSubmit}>
                <h2 className="vehicle-detail-section-title">Report an issue</h2>
                <select
                  value={complaint.category}
                  onChange={(e) => setComplaint({ ...complaint, category: e.target.value })}
                >
                  {COMPLAINT_CATEGORIES.map((c) => (
                    <option key={c.value} value={c.value}>
                      {c.label}
                    </option>
                  ))}
                </select>
                <input
                  type="text"
                  placeholder="Subject"
                  value={complaint.subject}
                  onChange={(e) => setComplaint({ ...complaint, subject: e.target.value })}
                  required
                />
                <textarea
                  rows={4}
                  placeholder="Describe what happened"
                  value={complaint.description}
                  onChange={(e) => setComplaint({ ...complaint, description: e.target.value })}
                  required
                />
                {complaintError && <p className="booking-flow-error">{complaintError}</p>}
                <div className="booking-detail-actions">
                  <button type="submit" className="btn btn-primary" disabled={complaintSubmitting}>
                    {complaintSubmitting ? "Submitting…" : "Submit"}
                  </button>
                  <button type="button" className="btn btn-outline" onClick={() => setShowComplaintForm(false)}>
                    Cancel
                  </button>
                </div>
              </form>
            )}

            {complaintTicket && (
              <p className="booking-detail-muted">
                Your ticket <strong>{complaintTicket}</strong> has been created. Our team will follow up.
              </p>
            )}
          </>
        )}
      </div>
    </ConsumerLayout>
  );
}

function formatDate(d) {
  return new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}
