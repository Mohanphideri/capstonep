import { useState } from "react";
import { apiFetch } from "../api.js";
import { useAuth } from "../AuthContext.jsx";
import "./ProfileCompletionModal.css";

/**
 * Shown whenever the logged-in user's profile is missing a name or email.
 * Name is mandatory; email is required before a booking can be completed
 * (enforced again server-side in the booking-hold route, this modal is
 * the friendly front door to that requirement).
 */
export function ProfileCompletionModal({ onComplete }) {
  const { user, refresh } = useAuth();
  const [name, setName] = useState(user?.name || "");
  const [email, setEmail] = useState(user?.email || "");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    if (name.trim().length < 2) {
      setError("Please enter your full name.");
      return;
    }

    setSubmitting(true);
    try {
      const { ok, data } = await apiFetch("/api/auth/profile", {
        method: "PATCH",
        body: JSON.stringify({ name: name.trim(), email: email.trim() || undefined }),
      });
      if (!ok || !data?.success) {
        setError(data?.error || "Something went wrong. Please try again.");
        return;
      }
      await refresh();
      onComplete?.();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="profile-modal-backdrop">
      <div className="profile-modal ticket">
        <p className="eyebrow">One quick step</p>
        <h2 className="profile-modal-title">Complete Your Profile</h2>
        <p className="profile-modal-lead">
          We need a couple of details before you can book a vehicle or get emailed your confirmation.
        </p>

        <form onSubmit={handleSubmit} className="profile-modal-form">
          <label className="profile-modal-field">
            <span>Name *</span>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your full name"
              autoFocus
              required
            />
          </label>
          <label className="profile-modal-field">
            <span>Email</span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
            />
          </label>

          {error && <p className="profile-modal-error">{error}</p>}

          <button type="submit" className="btn btn-primary btn-block" disabled={submitting}>
            {submitting ? "Saving…" : "Save and continue"}
          </button>
        </form>
      </div>
    </div>
  );
}
