import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { apiFetch } from "../../api.js";
import { AdminLayout } from "../../components/AdminLayout.jsx";

/**
 * SuperAdmin-only manual booking creation (spec §20). This is the single
 * place a Booking ever gets created — either standalone, or converting
 * an enquiry (when ?enquiryId=... is present, most fields are
 * pre-filled from that enquiry, and the SuperAdmin confirms/adjusts
 * before submitting). There is no payment step here — amountReceived is
 * just a manual ledger entry.
 */
export default function AdminBookingCreate() {
  const [searchParams] = useSearchParams();
  const enquiryId = searchParams.get("enquiryId");
  const navigate = useNavigate();

  const [enquiry, setEnquiry] = useState(null);
  const [enquiries, setEnquiries] = useState([]);
  const [selectedEnquiryId, setSelectedEnquiryId] = useState(enquiryId || "");
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  const [customer, setCustomer] = useState({ name: "", phone: "", email: "" });
  const [selectedVehicleIds, setSelectedVehicleIds] = useState([]);
  const [journey, setJourney] = useState({
    pickup: "",
    destination: "",
    journeyStart: "",
    journeyEnd: "",
    pickupTime: "",
    passengers: "",
    notes: "",
  });
  const [pricing, setPricing] = useState({
    rentalAmount: "",
    additionalCharges: "",
    discount: "",
    taxAmount: "",
    amountReceived: "",
  });
  const [status, setStatus] = useState("CONFIRMED");
  const [terms, setTerms] = useState("");
  

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      const vehiclesReq = apiFetch("/api/admin/vehicles?limit=200");
      const enquiriesReq = apiFetch("/api/admin/enquiries?limit=100&eligibleForBooking=true");
      const enquiryReq = selectedEnquiryId ? apiFetch(`/api/admin/enquiries/${selectedEnquiryId}`) : Promise.resolve(null);
      const [vehiclesRes, enquiriesRes, enquiryRes] = await Promise.all([vehiclesReq, enquiriesReq, enquiryReq]);
      if (cancelled) return;

      if (vehiclesRes.ok && vehiclesRes.data?.success) {
        setVehicles(vehiclesRes.data.vehicles);
      } else {
        setError(vehiclesRes.data?.error || "Failed to load vehicles.");
      }

      if (enquiriesRes?.ok && enquiriesRes.data?.success) {
        setEnquiries(enquiriesRes.data.enquiries || []);
      }

      if (enquiryRes && enquiryRes.ok && enquiryRes.data?.success) {
        const e = enquiryRes.data.enquiry;
        setEnquiry(e);
        setCustomer({ name: e.name, phone: e.phone, email: e.email || "" });
        setSelectedVehicleIds((e.selectedVehicles || []).map((v) => v.vehicleId).filter(Boolean));
        setJourney((j) => ({
          ...j,
          pickup: e.pickupLocation || "",
          destination: e.destination || "",
          journeyStart: e.tripDate || "",
          journeyEnd: e.returnDate || "",
          pickupTime: e.pickupTime || "",
          passengers: e.passengers || "",
          notes: e.message || "",
        }));
      } else if (selectedEnquiryId) {
        setError(enquiryRes?.data?.error || "Enquiry not found.");
      }

      setLoading(false);
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [selectedEnquiryId]);

  function handleEnquirySelect(event) {
    const id = event.target.value;
    setSelectedEnquiryId(id);
    setEnquiry(null);
    if (!id) {
      setCustomer({ name: "", phone: "", email: "" });
      setSelectedVehicleIds([]);
      setJourney({ pickup: "", destination: "", journeyStart: "", journeyEnd: "", pickupTime: "", passengers: "", notes: "" });
    }
  }

  function toggleVehicle(id) {
    setSelectedVehicleIds((prev) => (prev.includes(id) ? prev.filter((v) => v !== id) : [...prev, id]));
  }

  const totals = useMemo(() => {
    const rental = Number(pricing.rentalAmount) || 0;
    const additional = Number(pricing.additionalCharges) || 0;
    const discount = Number(pricing.discount) || 0;
    const tax = Number(pricing.taxAmount) || 0;
    const received = Number(pricing.amountReceived) || 0;
    const total = Math.max(0, rental + additional + tax - discount);
    const balance = Math.max(0, total - Math.min(received, total));
    return { total, balance };
  }, [pricing]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);

    if (selectedVehicleIds.length === 0) {
      setError("Select at least one vehicle.");
      return;
    }
    if (!customer.name.trim() || !customer.phone.trim()) {
      setError("Customer name and mobile number are required.");
      return;
    }
    if (!journey.pickup.trim() || !journey.destination.trim() || !journey.journeyStart || !journey.passengers) {
      setError("Pickup, destination, journey date and passenger count are required.");
      return;
    }

    setSaving(true);
    const payload = {
      enquiryId: enquiry?.id || undefined,
      customer: {
        name: customer.name.trim(),
        phone: customer.phone.trim(),
        email: customer.email.trim() || undefined,
      },
      vehicles: selectedVehicleIds.map((id) => ({ vehicleId: id })),
      journey: {
        pickup: journey.pickup.trim(),
        destination: journey.destination.trim(),
        journeyStart: journey.journeyStart,
        journeyEnd: journey.journeyEnd || undefined,
        pickupTime: journey.pickupTime || undefined,
        passengers: Number(journey.passengers),
        notes: journey.notes.trim() || undefined,
      },
      pricing: {
        rentalAmount: Number(pricing.rentalAmount) || 0,
        additionalCharges: Number(pricing.additionalCharges) || 0,
        discount: Number(pricing.discount) || 0,
        taxAmount: Number(pricing.taxAmount) || 0,
        amountReceived: Number(pricing.amountReceived) || 0,
      },
      status,
      terms: terms.trim() || undefined,
      sendEmail: false,
    };

    const { ok, data } = await apiFetch("/api/admin/bookings", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    setSaving(false);

    if (!ok || !data?.success) {
      setError(data?.error || "Failed to create booking.");
      return;
    }

    navigate(`/admin/bookings/${data.booking.bookingId}`);
  }

  return (
    <AdminLayout title="Create booking" lead="Only SuperAdmin can create or confirm a booking — there is no online payment.">
      <Link to="/admin/bookings" className="admin-subtext" style={{ display: "inline-block", marginBottom: "1rem" }}>
        ← Back to bookings
      </Link>

      {loading ? (
        <p className="admin-loading">Loading…</p>
      ) : (
        <form className="admin-form-grid" onSubmit={handleSubmit} style={{ display: "block" }}>
          <div className="ticket admin-table-card" style={{ marginBottom: "1rem" }}>
            <p className="eyebrow">Enquiry</p>
            <div className="admin-form-field" style={{ marginBottom: 0 }}>
              <label className="otp-label-text" htmlFor="booking-enquiry">Select an enquiry</label>
              <select id="booking-enquiry" className="admin-select" value={selectedEnquiryId} onChange={handleEnquirySelect}>
                <option value="">Create booking without an enquiry</option>
                {enquiries.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.enquiryId || item.id} · {item.name} · {item.phone} · {item.pickupLocation || ""}{item.destination ? ` → ${item.destination}` : ""}
                  </option>
                ))}
              </select>
              <small className="admin-subtext">Selecting an enquiry fills the customer and journey fields. You can edit every value before creating the booking.</small>
            </div>
          </div>

          <div className="ticket admin-table-card" style={{ marginBottom: "1rem" }}>
            <p className="eyebrow">Customer</p>
            <div className="admin-form-grid">
              <div className="admin-form-field">
                <label className="otp-label-text">Name</label>
                <input
                  className="admin-input"
                  value={customer.name}
                  onChange={(ev) => setCustomer((c) => ({ ...c, name: ev.target.value }))}
                />
              </div>
              <div className="admin-form-field">
                <label className="otp-label-text">Mobile</label>
                <input
                  className="admin-input"
                  value={customer.phone}
                  onChange={(ev) => setCustomer((c) => ({ ...c, phone: ev.target.value.replace(/\D/g, "").slice(0, 10) }))}
                />
              </div>
              <div className="admin-form-field">
                <label className="otp-label-text">Email</label>
                <input
                  className="admin-input"
                  type="email"
                  value={customer.email}
                  onChange={(ev) => setCustomer((c) => ({ ...c, email: ev.target.value }))}
                />
              </div>
            </div>
          </div>

          <div className="ticket admin-table-card" style={{ marginBottom: "1rem" }}>
            <p className="eyebrow">Select final vehicle(s)</p>
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th></th>
                    <th>Name</th>
                    <th>Category</th>
                    <th>Capacity</th>
                  </tr>
                </thead>
                <tbody>
                  {vehicles.map((v) => (
                    <tr key={v.id}>
                      <td>
                        <input
                          type="checkbox"
                          checked={selectedVehicleIds.includes(v.id)}
                          onChange={() => toggleVehicle(v.id)}
                        />
                      </td>
                      <td>{v.name}</td>
                      <td>{v.category?.name}</td>
                      <td>{v.capacity}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="ticket admin-table-card" style={{ marginBottom: "1rem" }}>
            <p className="eyebrow">Journey</p>
            <div className="admin-form-grid">
              <div className="admin-form-field">
                <label className="otp-label-text">Pickup</label>
                <input className="admin-input" value={journey.pickup} onChange={(ev) => setJourney((j) => ({ ...j, pickup: ev.target.value }))} />
              </div>
              <div className="admin-form-field">
                <label className="otp-label-text">Destination</label>
                <input className="admin-input" value={journey.destination} onChange={(ev) => setJourney((j) => ({ ...j, destination: ev.target.value }))} />
              </div>
              <div className="admin-form-field">
                <label className="otp-label-text">Journey date</label>
                <input type="date" className="admin-input" value={journey.journeyStart} onChange={(ev) => setJourney((j) => ({ ...j, journeyStart: ev.target.value }))} />
              </div>
              <div className="admin-form-field">
                <label className="otp-label-text">Return date (optional)</label>
                <input type="date" className="admin-input" value={journey.journeyEnd} onChange={(ev) => setJourney((j) => ({ ...j, journeyEnd: ev.target.value }))} />
              </div>
              <div className="admin-form-field">
                <label className="otp-label-text">Pickup time</label>
                <input type="time" className="admin-input" value={journey.pickupTime} onChange={(ev) => setJourney((j) => ({ ...j, pickupTime: ev.target.value }))} />
              </div>
              <div className="admin-form-field">
                <label className="otp-label-text">Passengers</label>
                <input type="number" min="1" className="admin-input" value={journey.passengers} onChange={(ev) => setJourney((j) => ({ ...j, passengers: ev.target.value }))} />
              </div>
            </div>
            <div className="admin-form-field">
              <label className="otp-label-text">Additional requirements</label>
              <textarea className="admin-textarea" rows={2} value={journey.notes} onChange={(ev) => setJourney((j) => ({ ...j, notes: ev.target.value }))} />
            </div>
          </div>

          <div className="ticket admin-table-card" style={{ marginBottom: "1rem" }}>
            <p className="eyebrow">Amount (admin record only — not an online payment)</p>
            <div className="admin-form-grid">
              <div className="admin-form-field">
                <label className="otp-label-text">Rental amount</label>
                <input type="number" min="0" className="admin-input" value={pricing.rentalAmount} onChange={(ev) => setPricing((p) => ({ ...p, rentalAmount: ev.target.value }))} />
              </div>
              <div className="admin-form-field">
                <label className="otp-label-text">Additional charges</label>
                <input type="number" min="0" className="admin-input" value={pricing.additionalCharges} onChange={(ev) => setPricing((p) => ({ ...p, additionalCharges: ev.target.value }))} />
              </div>
              <div className="admin-form-field">
                <label className="otp-label-text">Discount</label>
                <input type="number" min="0" className="admin-input" value={pricing.discount} onChange={(ev) => setPricing((p) => ({ ...p, discount: ev.target.value }))} />
              </div>
              <div className="admin-form-field">
                <label className="otp-label-text">Tax</label>
                <input type="number" min="0" className="admin-input" value={pricing.taxAmount} onChange={(ev) => setPricing((p) => ({ ...p, taxAmount: ev.target.value }))} />
              </div>
              <div className="admin-form-field">
                <label className="otp-label-text">Amount received</label>
                <input type="number" min="0" className="admin-input" value={pricing.amountReceived} onChange={(ev) => setPricing((p) => ({ ...p, amountReceived: ev.target.value }))} />
              </div>
            </div>
            <p className="admin-subtext">Total: ₹{totals.total} · Balance due: ₹{totals.balance}</p>
          </div>

          <div className="ticket admin-table-card" style={{ marginBottom: "1rem" }}>
            <p className="eyebrow">Status & terms</p>
            <div className="admin-form-field">
              <label className="otp-label-text">Booking status</label>
              <select className="admin-select" value={status} onChange={(ev) => setStatus(ev.target.value)}>
                {["DRAFT", "CONFIRMED", "IN_PROGRESS", "COMPLETED", "CANCELLED"].map((s) => (
                  <option key={s} value={s}>{s.replace(/_/g, " ")}</option>
                ))}
              </select>
            </div>
            <div className="admin-form-field">
              <label className="otp-label-text">Terms</label>
              <textarea className="admin-textarea" rows={3} value={terms} onChange={(ev) => setTerms(ev.target.value)} />
            </div>
            <p className="admin-subtext">The booking PDF is not emailed automatically. After creation, use the “Send booking PDF” action on the booking detail page.</p>
          </div>

          {error && <p className="otp-error">{error}</p>}

          <div className="admin-form-actions">
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? "Creating…" : "Confirm booking"}
            </button>
          </div>
        </form>
      )}
    </AdminLayout>
  );
}
