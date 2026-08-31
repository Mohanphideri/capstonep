import { useEffect, useState } from "react";
import { AdminLayout } from "../../components/AdminLayout.jsx";
import { apiFetch } from "../../api.js";
import "./AdminReviews.css";

function Stars({ value }) {
  return <span className="admin-review-stars" aria-label={`${value} out of 5`}>{[1,2,3,4,5].map(n => <span key={n}>{n <= value ? "★" : "☆"}</span>)}</span>;
}

const emptyForm = { customerName: "", customerPhone: "", customerEmail: "", rating: 5, text: "", vehicleId: "", state: "", district: "", status: "APPROVED", featured: true };

export default function AdminReviews() {
  const [reviews, setReviews] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [states, setStates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState(emptyForm);

  async function load() {
    setLoading(true);
    const [{ ok, data }, vehicleResult, stateResult] = await Promise.all([
      apiFetch("/api/admin/reviews"),
      apiFetch("/api/admin/vehicles?limit=100"),
      apiFetch("/api/locations/states"),
    ]);
    if (ok && data?.success) setReviews(data.reviews);
    else setError(data?.error || "Failed to load reviews.");
    if (vehicleResult.ok && vehicleResult.data?.success) setVehicles(vehicleResult.data.vehicles || []);
    if (stateResult.ok && stateResult.data?.success) setStates(stateResult.data.states || []);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);
  const districtOptions = states.find((st) => st.name === form.state)?.districts || [];

  async function update(id, patch) {
    setSaving(id);
    const { ok, data } = await apiFetch(`/api/admin/reviews/${id}`, { method: "PATCH", body: JSON.stringify(patch) });
    setSaving(null);
    if (!ok || !data?.success) { setError(data?.error || "Failed to update review."); return; }
    setReviews((prev) => prev.map((r) => r.id === id ? { ...r, ...data.review } : r));
  }

  async function createReview(e) {
    e.preventDefault();
    setError("");
    if (!form.customerName.trim() || !form.text.trim()) { setError("Enter the customer name and review description."); return; }
    setCreating(true);
    const { ok, data } = await apiFetch("/api/admin/reviews/admin-created", {
      method: "POST",
      body: JSON.stringify({ ...form, rating: Number(form.rating), vehicleId: form.vehicleId || null }),
    });
    setCreating(false);
    if (!ok || !data?.success) { setError(data?.error || "Failed to create review."); return; }
    setReviews((prev) => [data.review, ...prev]);
    setForm(emptyForm);
  }

  return (
    <AdminLayout title="Reviews" lead="Approve customer reviews and add verified business-entered reviews for the landing page.">
      {error && <div className="admin-review-alert">{error}</div>}

      <section className="ticket admin-review-create-card">
        <div>
          <p className="eyebrow">Admin-created review</p>
          <h2 className="admin-review-create-title">Add a customer review manually</h2>
          <p className="admin-subtext">Enter the customer name, rating and review text. You can feature it immediately on the landing page.</p>
        </div>
        <form className="admin-review-create-form" onSubmit={createReview}>
          <div className="admin-review-form-grid">
            <label><span>Customer name *</span><input className="admin-input" value={form.customerName} onChange={e => setForm({...form, customerName:e.target.value})} placeholder="Customer name" /></label>
            <label><span>Phone</span><input className="admin-input" value={form.customerPhone} onChange={e => setForm({...form, customerPhone:e.target.value})} placeholder="Phone number" /></label>
            <label><span>Email</span><input className="admin-input" type="email" value={form.customerEmail} onChange={e => setForm({...form, customerEmail:e.target.value})} placeholder="Email address" /></label>
            <label><span>Vehicle (optional)</span><select className="admin-select" value={form.vehicleId} onChange={e => setForm({...form, vehicleId:e.target.value})}><option value="">General review</option>{vehicles.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}</select></label>
            <label><span>Rating *</span><select className="admin-select" value={form.rating} onChange={e => setForm({...form, rating:e.target.value})}>{[5,4,3,2,1].map(n => <option key={n} value={n}>{n} / 5</option>)}</select></label>
            <label><span>State</span><select className="admin-select" value={form.state} onChange={e => setForm({...form, state:e.target.value, district:""})}><option value="">Select state</option>{states.map(st => <option key={st.name} value={st.name}>{st.name}</option>)}</select></label>
            <label><span>District</span><select className="admin-select" value={form.district} onChange={e => setForm({...form, district:e.target.value})} disabled={!form.state}><option value="">Select district</option>{districtOptions.map(d => <option key={d} value={d}>{d}</option>)}</select></label>
          </div>
          <label><span>Review description *</span><textarea className="admin-textarea" rows={4} value={form.text} onChange={e => setForm({...form, text:e.target.value})} placeholder="Write the customer's review…" /></label>
          <div className="admin-review-create-actions">
            <label className="admin-review-check"><input type="checkbox" checked={form.featured} onChange={e => setForm({...form, featured:e.target.checked})} /> Show on landing page</label>
            <button className="btn btn-primary" type="submit" disabled={creating}>{creating ? "Adding…" : "Add review"}</button>
          </div>
        </form>
      </section>

      {loading ? <div className="admin-review-empty">Loading reviews…</div> : reviews.length === 0 ? <div className="admin-review-empty">No customer reviews yet.</div> : (
        <div className="admin-reviews-grid">
          {reviews.map((review) => (
            <article className="admin-review-card" key={review.id}>
              <div className="admin-review-head">
                <div><span className="admin-review-id">{review.adminCreated ? "ADMIN REVIEW" : review.bookingId}</span><h2>{review.customer}</h2><p>{review.phone}{review.email ? ` · ${review.email}` : ""}</p>{(review.district || review.state) && <p className="admin-review-location">{[review.district, review.state].filter(Boolean).join(", ")}</p>}</div>
                <Stars value={review.rating} />
              </div>
              <div className="admin-review-route">{review.vehicle}</div>
              {review.text && <blockquote>“{review.text}”</blockquote>}
              <div className="admin-review-meta"><span className={`admin-review-status status-${review.status.toLowerCase()}`}>{review.status}</span>{review.featured && <span className="admin-review-featured">★ Featured</span>}</div>
              <div className="admin-review-actions">
                {review.status !== "APPROVED" && <button className="btn btn-primary" disabled={saving===review.id} onClick={() => update(review.id,{status:"APPROVED"})}>Approve</button>}
                {review.status === "APPROVED" && <button className="btn btn-outline" disabled={saving===review.id} onClick={() => update(review.id,{status:"HIDDEN"})}>Hide</button>}
                {review.status === "HIDDEN" && <button className="btn btn-outline" disabled={saving===review.id} onClick={() => update(review.id,{status:"APPROVED"})}>Approve again</button>}
                {review.status === "APPROVED" && <button className={`btn ${review.featured ? "btn-outline" : "btn-primary"}`} disabled={saving===review.id} onClick={() => update(review.id,{featured:!review.featured})}>{review.featured ? "Remove from landing page" : "Show on landing page"}</button>}
              </div>
            </article>
          ))}
        </div>
      )}
    </AdminLayout>
  );
}
