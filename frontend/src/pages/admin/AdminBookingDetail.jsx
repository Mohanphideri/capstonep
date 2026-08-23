import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { apiFetch, API_URL } from "../../api.js";
import { AdminLayout } from "../../components/AdminLayout.jsx";

function formatDate(value) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

export default function AdminBookingDetail() {
  const { id } = useParams();
  const [booking, setBooking] = useState(null);
  const [invoice, setInvoice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [statusSaving, setStatusSaving] = useState(false);
  const [noteText, setNoteText] = useState("");
  const [noteSaving, setNoteSaving] = useState(false);
  const [generatingInvoice, setGeneratingInvoice] = useState(false);
  const [sendingBooking, setSendingBooking] = useState(false);
  const [actionError, setActionError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { ok, data } = await apiFetch(`/api/admin/bookings/${id}`);
    if (ok && data?.success) {
      setBooking(data.booking);
    } else {
      setError(data?.error || "Booking not found.");
    }
    setLoading(false);
  }, [id]);

  const loadInvoice = useCallback(async () => {
    if (!booking?.id) return;
    const { ok, data } = await apiFetch(`/api/admin/invoices?bookingId=${booking.id}`);
    if (ok && data?.success && data.invoices.length) {
      setInvoice(data.invoices[0]);
    }
  }, [booking?.id]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (booking) loadInvoice();
  }, [booking, loadInvoice]);

  async function handleStatusChange(newStatus) {
    setActionError(null);
    setStatusSaving(true);
    const { ok, data } = await apiFetch(`/api/admin/bookings/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ status: newStatus }),
    });
    setStatusSaving(false);
    if (ok && data?.success) setBooking(data.booking);
    else setActionError(data?.error || "Failed to update status.");
  }

  async function handleAddNote(e) {
    e.preventDefault();
    if (!noteText.trim()) return;
    setNoteSaving(true);
    const { ok, data } = await apiFetch(`/api/admin/bookings/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ note: noteText.trim() }),
    });
    setNoteSaving(false);
    if (ok && data?.success) {
      setBooking(data.booking);
      setNoteText("");
    } else {
      setActionError(data?.error || "Failed to add note.");
    }
  }

  async function handleCancel() {
    if (!window.confirm("Cancel this booking? The customer will be notified by email.")) return;
    setActionError(null);
    const { ok, data } = await apiFetch(`/api/admin/bookings/${id}/cancel`, {
      method: "POST",
      body: JSON.stringify({}),
    });
    if (ok && data?.success) setBooking(data.booking);
    else setActionError(data?.error || "Failed to cancel booking.");
  }

  async function handleSendBooking() {
    setSendingBooking(true);
    setActionError(null);
    const { ok, data } = await apiFetch(`/api/admin/bookings/${id}/email`, { method: "POST", body: JSON.stringify({}) });
    setSendingBooking(false);
    setActionError(ok && data?.success ? "Booking PDF emailed to customer." : data?.error || "Failed to send booking PDF.");
  }

  async function handleGenerateInvoice() {
    setGeneratingInvoice(true);
    setActionError(null);
    const { ok, data } = await apiFetch("/api/admin/invoices", {
      method: "POST",
      body: JSON.stringify({ bookingId: booking.id, sendEmail: false }),
    });
    setGeneratingInvoice(false);
    if (ok && data?.success) setInvoice(data.invoice);
    else setActionError(data?.error || "Failed to generate invoice.");
  }

  if (loading) {
    return (
      <AdminLayout title="Booking">
        <p className="admin-loading">Loading booking…</p>
      </AdminLayout>
    );
  }

  if (error || !booking) {
    return (
      <AdminLayout title="Booking">
        <p className="admin-error">{error || "Booking not found."}</p>
        <Link to="/admin/bookings" className="btn btn-outline btn-sm">Back to bookings</Link>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title={booking.bookingId} lead={`Created ${formatDate(booking.createdAt)}`}>
      <Link to="/admin/bookings" className="admin-subtext" style={{ display: "inline-block", marginBottom: "1rem" }}>
        ← Back to bookings
      </Link>

      {actionError && <p className="otp-error">{actionError}</p>}

      <div className="admin-form-grid">
        <div className="ticket admin-table-card">
          <p className="eyebrow">Customer</p>
          <p><strong>{booking.customer.name}</strong></p>
          <p>+91 {booking.customer.phone}</p>
          <p>{booking.customer.email || "No email"}</p>

          <p className="eyebrow" style={{ marginTop: "1.25rem" }}>Vehicle(s)</p>
          {booking.vehicles.map((v, i) => (
            <p key={i}>{v.name} — {v.category}, {v.capacity} seats</p>
          ))}

          <p className="eyebrow" style={{ marginTop: "1.25rem" }}>Journey</p>
          <p>{booking.journey.pickup} → {booking.journey.destination}</p>
          <p className="admin-subtext">
            {formatDate(booking.journey.journeyStart)}
            {booking.journey.journeyEnd ? ` – ${formatDate(booking.journey.journeyEnd)}` : ""}
            {booking.journey.pickupTime ? ` · ${booking.journey.pickupTime}` : ""}
          </p>
          <p className="admin-subtext">Passengers: {booking.journey.passengers}</p>

          <p className="eyebrow" style={{ marginTop: "1.25rem" }}>Amount</p>
          <p>Total: ₹{booking.pricing.totalAmount}</p>
          <p className="admin-subtext">Received: ₹{booking.pricing.amountReceived} · Balance: ₹{booking.pricing.balanceAmount}</p>

          <a
            className="btn btn-outline btn-sm"
            style={{ marginTop: "1rem" }}
            href={`${API_URL}/api/admin/bookings/${booking.bookingId}/pdf`}
            target="_blank"
            rel="noreferrer"
          >
            Download booking PDF
          </a>
          <button
            type="button"
            className="btn btn-primary btn-sm"
            style={{ marginTop: "0.75rem", marginLeft: "0.5rem" }}
            onClick={handleSendBooking}
            disabled={sendingBooking || !booking.customer?.email}
          >
            {sendingBooking ? "Sending…" : "Send booking PDF"}
          </button>
        </div>

        <div>
          <div className="ticket admin-table-card">
            <p className="eyebrow">Status</p>
            <select
              className="admin-select"
              value={booking.status}
              onChange={(e) => handleStatusChange(e.target.value)}
              disabled={statusSaving}
            >
              {["DRAFT", "CONFIRMED", "IN_PROGRESS", "COMPLETED", "CANCELLED"].map((s) => (
                <option key={s} value={s}>{s.replace(/_/g, " ")}</option>
              ))}
            </select>
            {booking.status !== "CANCELLED" && (
              <button type="button" className="btn btn-outline btn-sm" style={{ marginTop: "0.75rem" }} onClick={handleCancel}>
                Cancel booking
              </button>
            )}
          </div>

          <div className="ticket admin-table-card" style={{ marginTop: "1rem" }}>
            <p className="eyebrow">Invoice</p>
            {invoice ? (
              <>
                <p>{invoice.invoiceNumber}</p>
                <p className="admin-subtext">Total ₹{invoice.total} · Balance ₹{invoice.balance}</p>
                <Link to={`/admin/invoices/${invoice.id}`} className="btn btn-outline btn-sm" style={{ marginTop: "0.5rem" }}>
                  View invoice
                </Link>
              </>
            ) : (
              <>
                <p className="admin-subtext">No invoice generated yet for this booking.</p>
                <button type="button" className="btn btn-primary btn-sm" style={{ marginTop: "0.5rem" }} onClick={handleGenerateInvoice} disabled={generatingInvoice}>
                  {generatingInvoice ? "Generating…" : "Generate invoice"}
                </button>
              </>
            )}
          </div>

          <div className="ticket admin-table-card" style={{ marginTop: "1rem" }}>
            <p className="eyebrow">Internal notes</p>
            {booking.adminNotes?.length === 0 ? (
              <p className="admin-empty">No notes yet.</p>
            ) : (
              <ul style={{ listStyle: "none", padding: 0, margin: "0.75rem 0" }}>
                {booking.adminNotes?.map((n, i) => (
                  <li key={i} style={{ borderTop: "1px dashed var(--color-paper-line)", padding: "0.6rem 0" }}>
                    <p style={{ margin: 0 }}>{n.note}</p>
                    <p className="admin-subtext">{formatDate(n.addedAt)}</p>
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
