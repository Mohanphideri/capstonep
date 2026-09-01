import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { apiFetch, API_URL } from "../api.js";
import ConsumerLayout from "../components/ConsumerLayout.jsx";
import "./BookingDetail.css";

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
  const [complaint, setComplaint] = useState({ category: "OTHER", subject: "", description: "", vehicleIndex: null, vehicleName: "" });
  const [complaintSubmitting, setComplaintSubmitting] = useState(false);
  const [complaintError, setComplaintError] = useState("");
  const [complaintTicket, setComplaintTicket] = useState(null);
  const [bookingComplaints, setBookingComplaints] = useState([]);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelText, setCancelText] = useState("");
  const [cancelError, setCancelError] = useState("");
  const [cancelling, setCancelling] = useState(false);

  function load() {
    setLoading(true);
    apiFetch(`/api/bookings/${bookingId}`).then(({ ok, data }) => {
      if (ok && data?.success) setBooking(data.booking);
      else setError(data?.error || "Booking not found.");
      setLoading(false);
    });
    apiFetch(`/api/complaints?bookingId=${encodeURIComponent(bookingId)}`).then(({ ok, data }) => {
      if (ok && data?.success) setBookingComplaints(data.complaints || []);
    });
  }

  useEffect(load, [bookingId]);

  async function handleCancelBooking() {
    setCancelError("");
    if (cancelText.trim().toLowerCase() !== "cancel") {
      setCancelError('Type "cancel" exactly to confirm.');
      return;
    }
    setCancelling(true);
    const payload = { method: "POST", body: JSON.stringify({ confirmation: cancelText.trim() }) };
    let result = await apiFetch(`/api/bookings/${bookingId}/cancel`, payload);
    if (!result.ok || !result.data?.success) {
      // If the first response was lost/failed after the server processed it,
      // confirm the current booking state before retrying. Then retry once.
      const check = await apiFetch(`/api/bookings/${bookingId}`);
      if (check.ok && check.data?.success && check.data.booking?.status === "CANCELLED") {
        result = { ok: true, data: check.data };
      } else {
        await new Promise((resolve) => setTimeout(resolve, 250));
        result = await apiFetch(`/api/bookings/${bookingId}/cancel`, payload);
        if (!result.ok || !result.data?.success) {
          const finalCheck = await apiFetch(`/api/bookings/${bookingId}`);
          if (finalCheck.ok && finalCheck.data?.success && finalCheck.data.booking?.status === "CANCELLED") result = { ok: true, data: finalCheck.data };
        }
      }
    }
    setCancelling(false);
    if (!result.ok || !result.data?.success) {
      setCancelError(result.data?.error || "Unable to cancel this booking. Please try again.");
      return;
    }
    setBooking(result.data.booking);
    setCancelOpen(false);
    setCancelText("");
  }

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
    setBookingComplaints((items) => [data.complaint, ...items]);
    setComplaint({ category: "OTHER", subject: "", description: "", vehicleIndex: null, vehicleName: "" });
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
              <div className="booking-detail-title-block">
                <p className="eyebrow-muted">Booking ID</p>
                <h1 className="dashboard-title">{booking.bookingId}</h1>
                <span className={`my-booking-status status-${booking.status.toLowerCase()}`}>
                  {booking.status === "CANCELLED" ? "Cancelled" : booking.status === "CONFIRMED" ? "Confirmed" : booking.status.replace(/_/g, " ")}
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

            {booking.status === "CANCELLED" && (
              <section className="booking-status-alert booking-status-alert-cancelled">
                <strong>This booking has been cancelled.</strong>
                <span>The latest status is shown here and in your My Bookings section.</span>{booking.refundAmount > 0 && <span>Refund amount: ₹{booking.refundAmount.toLocaleString("en-IN")} · Expected within {booking.refundExpectedDays || "5–7 business days"}.</span>}
              </section>
            )}

            {booking.status !== "CANCELLED" && ["DRAFT", "CONFIRMED"].includes(booking.status) && !cancelOpen && (
              <div className="booking-cancel-action">
                <button type="button" className="btn btn-outline booking-cancel-button" onClick={() => setCancelOpen(true)}>Cancel booking</button>
              </div>
            )}
            {cancelOpen && (
              <section className="ticket booking-cancel-panel">
                <h2 className="vehicle-detail-section-title">Cancel this booking?</h2>
                <p>Cancellation will update this booking immediately. If an amount is refundable, it will be processed within <strong>5–7 business days</strong>.</p>
                <label htmlFor="booking-cancel-confirm">Type <strong>cancel</strong> to confirm</label>
                <input id="booking-cancel-confirm" value={cancelText} onChange={(e) => setCancelText(e.target.value)} placeholder="Type cancel" autoComplete="off" />
                {cancelError && <p className="booking-flow-error">{cancelError}</p>}
                <div className="booking-detail-actions">
                  <button type="button" className="btn btn-primary" onClick={handleCancelBooking} disabled={cancelling}>{cancelling ? "Cancelling…" : "Confirm cancellation"}</button>
                  <button type="button" className="btn btn-outline" onClick={() => { setCancelOpen(false); setCancelError(""); }}>Keep booking</button>
                </div>
              </section>
            )}

            <div className="booking-detail-grid">
              <section className="ticket booking-detail-section booking-detail-section-wide">
                <div className="booking-section-heading">
                  <span className="booking-section-kicker">01</span>
                  <div>
                    <p className="eyebrow-muted">Selected vehicle</p>
                    <h2 className="vehicle-detail-section-title">Vehicle{booking.vehicles.length > 1 ? "s" : ""}</h2>
                  </div>
                </div>
                <div className="booking-vehicle-list">
                  {booking.vehicles.map((v, i) => (
                    <div key={i} className={i < booking.vehicles.length - 1 ? "booking-detail-vehicle-row" : undefined}>
                      <p>{v.name}</p>
                      <p className="booking-detail-muted">
                        {v.category} · {v.capacity} seats · {v.acType} ·{" "}
                        {v.seatType?.replace("_", "-").toLowerCase()}
                      </p>
                    </div>
                  ))}
                </div>
              </section>

              <section className="ticket booking-detail-section">
                <div className="booking-section-heading"><span className="booking-section-kicker">02</span><div><p className="eyebrow-muted">Travel plan</p><h2 className="vehicle-detail-section-title">Journey</h2></div></div>
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
                {Array.isArray(booking.vehicles) && booking.vehicles.length > 1 && (
                  <select
                    value={complaint.vehicleIndex == null ? "" : String(complaint.vehicleIndex)}
                    onChange={(e) => {
                      const value = e.target.value === "" ? null : Number(e.target.value);
                      const vehicle = value == null ? null : booking.vehicles[value];
                      setComplaint({ ...complaint, vehicleIndex: value, vehicleName: vehicle?.name || "" });
                    }}
                  >
                    <option value="">Which vehicle is affected? (optional)</option>
                    {booking.vehicles.map((vehicle, index) => (
                      <option key={`${vehicle.name}-${index}`} value={index}>{vehicle.name || `Vehicle ${index + 1}`}</option>
                    ))}
                  </select>
                )}
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
              <p className="booking-detail-muted">Your ticket <strong>{complaintTicket}</strong> has been created. Our team will follow up here.</p>
            )}

            <section className="ticket booking-detail-section booking-issues-section">
              <div className="booking-section-heading"><span className="booking-section-kicker">!</span><div><p className="eyebrow-muted">Support</p><h2 className="vehicle-detail-section-title">Report issues for this booking</h2></div></div>
              <p className="booking-detail-muted">If an issue affects only one passenger or part of a shared booking, report it here. Each booking has its own support ticket.</p>
              {bookingComplaints.length ? <div className="booking-issue-list">{bookingComplaints.map((c)=><article className="booking-issue-card" key={c.ticketId}><div><strong>{c.ticketId}</strong><span className={`issue-status issue-${String(c.status).toLowerCase()}`}>{String(c.status).replace(/_/g," ")}</span></div><h3>{c.subject}</h3>{c.vehicleName && <p><strong>Vehicle:</strong> {c.vehicleName}</p>}<p>{c.description}</p>{c.messages?.slice(-3).map((m,j)=><div className={`issue-message ${m.authorRole === "customer" ? "customer" : "team"}`} key={`${c.ticketId}-${j}`}><small>{m.authorRole === "customer" ? "You" : "Kuwarji Travels"}</small><span>{m.message}</span></div>)}<small className="booking-detail-muted">Updated {formatDate(c.updatedAt || c.createdAt)}</small></article>)}</div> : <div className="booking-issue-empty">No issues reported for this booking yet.</div>}
            </section>
          </>
        )}
      </div>
    </ConsumerLayout>
  );
}

function formatDate(d) {
  return new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}
