import { useEffect, useState } from "react";
import ConsumerLayout from "../components/ConsumerLayout.jsx";
import { apiFetch } from "../api.js";
import "./MyReviews.css";

function Stars({ value, onChange, readOnly = false }) {
  return (
    <div className={`review-stars${readOnly ? " is-readonly" : ""}`} aria-label={`${value} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((star) => (
        <button key={star} type="button" disabled={readOnly} onClick={() => onChange?.(star)} aria-label={`${star} star${star > 1 ? "s" : ""}`}>
          {star <= value ? "★" : "☆"}
        </button>
      ))}
    </div>
  );
}

export default function MyReviews() {
  const [bookings, setBookings] = useState([]);
  const [reviews, setReviews] = useState({});
  const [forms, setForms] = useState({});
  const [states, setStates] = useState([]);
  const [districts, setDistricts] = useState({});
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => { apiFetch("/api/locations/states").then(r=>{if(r.ok&&r.data?.success)setStates(r.data.states||[])}); }, []);

  useEffect(() => {
    Promise.all([
      apiFetch("/api/bookings?scope=past"),
      apiFetch("/api/reviews/mine"),
    ]).then(([bookingResult, reviewResult]) => {
      if (bookingResult.ok && bookingResult.data?.success) setBookings(bookingResult.data.bookings.filter((b) => b.status === "COMPLETED"));
      if (reviewResult.ok && reviewResult.data?.success) {
        const map = {};
        reviewResult.data.reviews.forEach((r) => { map[r.bookingId] = r; });
        setReviews(map);
      }
      setLoading(false);
    });
  }, []);

  function updateForm(bookingId, patch) {
    setForms((prev) => ({ ...prev, [bookingId]: { rating: 5, text: "", ...prev[bookingId], ...patch } }));
  }

  async function submit(bookingId) {
    const form = forms[bookingId] || { rating: 5, text: "" };
    setError("");
    setMessage("");
    const { ok, data } = await apiFetch("/api/reviews", {
      method: "POST",
      body: JSON.stringify({ bookingId, rating: form.rating, text: form.text.trim(), name: form.name?.trim(), state: form.state, district: form.district }),
    });
    if (!ok || !data?.success) {
      setError(data?.error || "Unable to submit your review.");
      return;
    }
    setReviews((prev) => ({ ...prev, [bookingId]: { rating: form.rating, text: form.text.trim(), status: "PENDING", state: form.state, district: form.district } }));
    setMessage("Thanks. Your review was sent to the Kuwarji Travels team for approval.");
  }

  return (
    <ConsumerLayout title="Reviews" lead="Share your experience after a completed journey.">
      {message && <div className="review-alert success">{message}</div>}
      {error && <div className="review-alert error">{error}</div>}
      {loading && <p className="vehicles-state">Loading reviews…</p>}
      {!loading && bookings.length === 0 && <div className="review-empty">No completed trips are ready for a review yet.</div>}
      <div className="review-list">
        {bookings.map((booking) => {
          const existing = reviews[booking.bookingId];
          const form = forms[booking.bookingId] || { rating: 5, text: "", name: booking.customer?.name || "", state: "", district: "" };
          return (
            <article className="review-card" key={booking.bookingId}>
              <div className="review-card-head">
                <div>
                  <span className="review-kicker">{booking.bookingId}</span>
                  <h2>{booking.journey.pickup} → {booking.journey.destination}</h2>
                  <p>{booking.vehicles.map((v) => v.name).join(", ")} · {formatDate(booking.journey.journeyStart)}</p>
                </div>
                {existing && <span className={`review-status status-${existing.status.toLowerCase()}`}>{existing.status}</span>}
              </div>
              {existing ? (
                <div className="review-submitted">
                  <Stars value={existing.rating} readOnly />
                  {existing.text && <p>“{existing.text}”</p>}
                  <small>{existing.status === "APPROVED" ? "Published" : "Waiting for admin approval"}</small>
                </div>
              ) : (
                <div className="review-form">
                  <div className="review-form-row">
                    <div><label>Name</label><input value={form.name||""} onChange={e=>updateForm(booking.bookingId,{name:e.target.value})} placeholder="Your name"/></div>
                    <div><label>State</label><select value={form.state||""} onChange={e=>updateForm(booking.bookingId,{state:e.target.value,district:""})}><option value="">Select state</option>{states.map(st=><option key={st.name} value={st.name}>{st.name}</option>)}</select></div>
                    <div><label>District</label><select value={form.district||""} onChange={e=>updateForm(booking.bookingId,{district:e.target.value})} disabled={!form.state}><option value="">Select district</option>{(states.find(st=>st.name===form.state)?.districts||[]).map(d=><option key={d} value={d}>{d}</option>)}</select></div>
                  </div>
                  <label>Your rating</label>
                  <Stars value={form.rating} onChange={(rating) => updateForm(booking.bookingId, { rating })} />
                  <label htmlFor={`review-${booking.bookingId}`}>Write a review</label>
                  <textarea id={`review-${booking.bookingId}`} maxLength={1000} rows={4} value={form.text} onChange={(e) => updateForm(booking.bookingId, { text: e.target.value })} placeholder="Tell us about your journey…" />
                  <div className="review-form-footer"><small>{form.text.length}/1000</small><button type="button" className="btn btn-primary" onClick={() => submit(booking.bookingId)}>Submit review</button></div>
                </div>
              )}
            </article>
          );
        })}
      </div>
    </ConsumerLayout>
  );
}

function formatDate(d) {
  return new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}
