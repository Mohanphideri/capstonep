import { useEffect, useState } from "react";
import { AdminLayout } from "../../components/AdminLayout.jsx";
import { apiFetch } from "../../api.js";
import "./AdminReviews.css";

function Stars({ value }) { return <span className="admin-review-stars" aria-label={`${value} out of 5`}>{[1,2,3,4,5].map(n => <span key={n}>{n <= value ? "★" : "☆"}</span>)}</span>; }

export default function AdminReviews() {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(null);

  function load() {
    setLoading(true);
    apiFetch("/api/admin/reviews").then(({ ok, data }) => {
      if (ok && data?.success) setReviews(data.reviews);
      else setError(data?.error || "Failed to load reviews.");
      setLoading(false);
    });
  }
  useEffect(load, []);

  async function update(id, patch) {
    setSaving(id);
    const { ok, data } = await apiFetch(`/api/admin/reviews/${id}`, { method: "PATCH", body: JSON.stringify(patch) });
    setSaving(null);
    if (!ok || !data?.success) { setError(data?.error || "Failed to update review."); return; }
    setReviews((prev) => prev.map((r) => r.id === id ? { ...r, ...data.review } : r));
  }

  return (
    <AdminLayout title="Reviews" lead="Approve customer reviews and choose which ones appear in the landing page Pride Customers section.">
      {error && <div className="admin-review-alert">{error}</div>}
      {loading ? <div className="admin-review-empty">Loading reviews…</div> : reviews.length === 0 ? <div className="admin-review-empty">No customer reviews yet.</div> : (
        <div className="admin-reviews-grid">
          {reviews.map((review) => (
            <article className="admin-review-card" key={review.id}>
              <div className="admin-review-head">
                <div><span className="admin-review-id">{review.bookingId}</span><h2>{review.customer}</h2><p>{review.phone}{review.email ? ` · ${review.email}` : ""}</p></div>
                <Stars value={review.rating} />
              </div>
              <div className="admin-review-route">{review.vehicle}</div>
              {review.text && <blockquote>“{review.text}”</blockquote>}
              <div className="admin-review-meta"><span className={`admin-review-status status-${review.status.toLowerCase()}`}>{review.status}</span>{review.featured && <span className="admin-review-featured">★ Pride Customer</span>}</div>
              <div className="admin-review-actions">
                {review.status !== "APPROVED" && <button className="btn btn-primary" disabled={saving===review.id} onClick={() => update(review.id,{status:"APPROVED"})}>Approve</button>}
                {review.status === "APPROVED" && <button className="btn btn-outline" disabled={saving===review.id} onClick={() => update(review.id,{status:"HIDDEN"})}>Hide</button>}
                {review.status === "HIDDEN" && <button className="btn btn-outline" disabled={saving===review.id} onClick={() => update(review.id,{status:"APPROVED"})}>Approve again</button>}
                {review.status === "APPROVED" && <button className={`btn ${review.featured ? "btn-outline" : "btn-primary"}`} disabled={saving===review.id} onClick={() => update(review.id,{featured:!review.featured})}>{review.featured ? "Remove from Pride" : "Show on landing"}</button>}
              </div>
            </article>
          ))}
        </div>
      )}
    </AdminLayout>
  );
}
