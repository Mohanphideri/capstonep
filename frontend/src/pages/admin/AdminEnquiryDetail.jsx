import Icon from "../../components/Icon.jsx";
import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { apiFetch } from "../../api.js";
import { AdminLayout } from "../../components/AdminLayout.jsx";

const STATUS_OPTIONS = ["NEW", "BOOKED", "CLOSED", "CANCELLED"];

// Main forward flow shown as a stepper. "Booking" is a real step in the
// lifecycle, but it's only ever reached via actual conversion (the
// "Convert to booking" button below) — it's shown as the end state once
// reached, never offered as something to click into directly, since doing
// so would mark the enquiry booked without an actual booking existing.
const FLOW_STEPS = [
  { value: "NEW", label: "New" },
  { value: "BOOKED", label: "Booked" },
];

function formatDate(value) {
  if (!value) return "—";
  try {
    return new Date(value).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });
  } catch {
    return value;
  }
}

const TRIP_TYPE_LABELS = {
  ONE_WAY: "One-way",
  ROUND_TRIP: "Round trip",
  LOCAL: "Local / in-city",
  OUTSTATION: "Outstation",
};

function Field({ label, value }) {
  return (
    <div className="admin-field-row">
      <span className="admin-field-label">{label}</span>
      <span className="admin-field-value">{value ?? "—"}</span>
    </div>
  );
}

export default function AdminEnquiryDetail() {
  const { id } = useParams();
  const [enquiry, setEnquiry] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [statusSaving, setStatusSaving] = useState(false);
  const [statusError, setStatusError] = useState(null);

  const [noteText, setNoteText] = useState("");
  const [noteSaving, setNoteSaving] = useState(false);
  const [noteError, setNoteError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { ok, data } = await apiFetch(`/api/admin/enquiries/${id}`);
    if (ok && data?.success) {
      setEnquiry(data.enquiry);
    } else {
      setError(data?.error || "Enquiry not found.");
    }
    setLoading(false);
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleStatusChange(newStatus) {
    setStatusError(null);
    setStatusSaving(true);
    const prevStatus = enquiry.status;
    setEnquiry((prev) => ({ ...prev, status: newStatus }));
    const { ok, data } = await apiFetch(`/api/admin/enquiries/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status: newStatus }),
    });
    setStatusSaving(false);
    if (!ok || !data?.success) {
      setEnquiry((prev) => ({ ...prev, status: prevStatus }));
      setStatusError(data?.error || "Failed to update status.");
    }
  }

  async function handleAddNote(e) {
    e.preventDefault();
    setNoteError(null);
    if (!noteText.trim()) {
      setNoteError("Enter a note before saving.");
      return;
    }
    setNoteSaving(true);
    const { ok, data } = await apiFetch(`/api/admin/enquiries/${id}/notes`, {
      method: "POST",
      body: JSON.stringify({ message: noteText.trim() }),
    });
    setNoteSaving(false);
    if (ok && data?.success) {
      setEnquiry((prev) => ({ ...prev, notes: data.notes }));
      setNoteText("");
    } else {
      setNoteError(data?.error || "Failed to save note.");
    }
  }

  if (loading) {
    return (
      <AdminLayout title="Enquiry">
        <p className="admin-loading">Loading enquiry…</p>
      </AdminLayout>
    );
  }

  if (error || !enquiry) {
    return (
      <AdminLayout title="Enquiry">
        <div className="admin-empty">
          <strong>{error || "Enquiry not found."}</strong>
          <Link to="/admin/enquiries" className="btn btn-outline btn-sm">
            Back to enquiries
          </Link>
        </div>
      </AdminLayout>
    );
  }

  const isTerminalOffPath = enquiry.status === "CLOSED" || enquiry.status === "CANCELLED";
  const isConverted = enquiry.status === "BOOKING" && Boolean(enquiry.convertedToBookingId);
  const currentStepIndex = FLOW_STEPS.findIndex((s) => s.value === enquiry.status);

  return (
    <AdminLayout title={`Enquiry ${enquiry.enquiryId || ""}`} lead={`Submitted by ${enquiry.name}`}>
      <Link to="/admin/enquiries" className="admin-back-link">
        ← Back to enquiries
      </Link>

      <div className="admin-detail-grid">
        <div className="admin-detail-main">
          <div className="ticket admin-detail-card">
            <div className="admin-detail-card-head">
              <p className="eyebrow">Customer</p>
              <span className={`admin-badge admin-badge-${enquiry.status.toLowerCase()}`}>
                {enquiry.status.replace(/_/g, " ")}
              </span>
            </div>
            <Field label="Name" value={enquiry.name} />
            <Field label="Phone" value={<a href={`tel:+91${enquiry.phone}`}>+91 {enquiry.phone}</a>} />
            <Field label="Email" value={enquiry.email || "Not provided"} />
          </div>

          <div className="ticket admin-detail-card">
            <p className="eyebrow">Journey</p>
            <div className="admin-route-line">
              <strong>{enquiry.pickupLocation || "—"}</strong>
              <span className="admin-route-arrow"><Icon name="arrowRight" size={16}/></span>
              <strong>{enquiry.destination || "—"}</strong>
            </div>
            <Field label="Travel date" value={enquiry.tripDate} />
            <Field label="Return date" value={enquiry.returnDate} />
            <Field label="Passengers" value={enquiry.passengers} />
            <Field label="Trip type" value={enquiry.tripType ? TRIP_TYPE_LABELS[enquiry.tripType] || enquiry.tripType : "—"} />
          </div>

          <div className="ticket admin-detail-card">
            <p className="eyebrow">Vehicle{enquiry.selectedVehicles?.length > 1 ? "s" : ""} requested</p>
            {enquiry.selectedVehicles?.length > 0 ? (
              <ul className="admin-plain-list">
                {enquiry.selectedVehicles.map((v, i) => (
                  <li key={i}>
                    {v.name} {v.capacity ? `— ${v.capacity} seats` : ""}
                  </li>
                ))}
              </ul>
            ) : (
              <p>
                {enquiry.vehicle?.name || enquiry.vehicleType || "Not specified"}
                {enquiry.vehicle?.capacity ? ` — ${enquiry.vehicle.capacity} seats` : ""}
              </p>
            )}
          </div>

          {enquiry.message && (
            <div className="ticket admin-detail-card">
              <p className="eyebrow">Additional requirements</p>
              <p>{enquiry.message}</p>
            </div>
          )}

          <p className="admin-subtext">
            Received {formatDate(enquiry.createdAt)} · Last updated {formatDate(enquiry.updatedAt)}
          </p>
        </div>

        <div className="admin-detail-side">
          <div className="ticket admin-detail-card">
            <p className="eyebrow">Enquiry status</p>

            <ol className="admin-stepper">
              {FLOW_STEPS.map((step, i) => {
                const done = isConverted || (!isTerminalOffPath && i < currentStepIndex);
                const current = !isConverted && !isTerminalOffPath && i === currentStepIndex;
                return (
                  <li
                    key={step.value}
                    className={`admin-stepper-step${done ? " is-done" : ""}${current ? " is-current" : ""}`}
                  >
                    <button
                      type="button"
                      disabled={statusSaving || isConverted}
                      onClick={() => handleStatusChange(step.value)}
                    >
                      <span className="admin-stepper-dot" />
                      {step.label}
                    </button>
                  </li>
                );
              })}
            </ol>

            {isConverted && (
              <p className="admin-subtext" style={{ marginTop: "0.5rem" }}>
                Converted to a real booking — status is locked.
              </p>
            )}
            {isTerminalOffPath && (
              <p className="admin-subtext" style={{ marginTop: "0.5rem" }}>
                Marked <strong>{enquiry.status.replace(/_/g, " ")}</strong> — outside the normal flow.
              </p>
            )}

            {!isConverted && (
              <label className="admin-form-field" style={{ marginTop: "1rem" }}>
                <span className="admin-field-label">Set status manually</span>
                <select
                  className="admin-select"
                  value={enquiry.status}
                  onChange={(e) => handleStatusChange(e.target.value)}
                  disabled={statusSaving}
                >
                  {STATUS_OPTIONS.map((s) => (
                    <option key={s} value={s}>
                      {s.replace(/_/g, " ")}
                    </option>
                  ))}
                </select>
              </label>
            )}
            {statusError && <p className="otp-error">{statusError}</p>}
          </div>

          <div className="ticket admin-detail-card admin-detail-actions">
            <p className="eyebrow">Quick actions</p>
            <a href={`tel:+91${enquiry.phone}`} className="btn btn-outline btn-sm btn-block">
              Call customer
            </a>
            {enquiry.email && (
              <a href={`mailto:${enquiry.email}`} className="btn btn-outline btn-sm btn-block">
                Email customer
              </a>
            )}
            {enquiry.convertedToBookingId ? (
              <>
                <p className="admin-subtext">This enquiry has already been converted.</p>
                <Link to="/admin/bookings" className="btn btn-outline btn-sm btn-block">
                  View bookings
                </Link>
              </>
            ) : (
              <Link to={`/admin/bookings/create?enquiryId=${enquiry.id}`} className="btn btn-primary btn-sm btn-block">
                Convert to booking
              </Link>
            )}
          </div>

          <div className="ticket admin-detail-card">
            <p className="eyebrow">Internal notes</p>
            <p className="admin-subtext">Visible to admin only — never shown to the customer.</p>

            {enquiry.notes.length === 0 ? (
              <p className="admin-empty-note">No notes yet.</p>
            ) : (
              <ul className="admin-note-list">
                {enquiry.notes.map((n, i) => (
                  <li key={i}>
                    <p>{n.message}</p>
                    <p className="admin-subtext">
                      {n.authorRole?.replace(/_/g, " ") || "admin"} · {formatDate(n.createdAt)}
                    </p>
                  </li>
                ))}
              </ul>
            )}

            <form onSubmit={handleAddNote}>
              <textarea
                className="admin-textarea"
                rows={3}
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                placeholder="Add an internal note…"
              />
              {noteError && <p className="otp-error">{noteError}</p>}
              <div className="admin-form-actions">
                <button type="submit" className="btn btn-primary btn-sm" disabled={noteSaving}>
                  {noteSaving ? "Saving…" : "Add note"}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
