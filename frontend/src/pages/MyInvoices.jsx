import { useEffect, useState } from "react";
import { apiFetch, API_URL } from "../api.js";
import ConsumerLayout from "../components/ConsumerLayout.jsx";
import "./MyBookings.css";

export default function MyInvoices() {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch("/api/invoices").then(({ ok, data }) => {
      if (ok && data?.success) setInvoices(data.invoices);
      setLoading(false);
    });
  }, []);

  return (
    <ConsumerLayout title="Invoices" lead="Download your billing documents whenever you need them.">
        {loading && <p className="vehicles-state">Loading…</p>}
        {!loading && invoices.length === 0 && (
          <p className="vehicles-state">You don&apos;t have any invoices yet.</p>
        )}

        {!loading && invoices.length > 0 && (
          <div className="my-bookings-list">
            {invoices.map((inv) => (
              <div key={inv.id} className="ticket my-booking-card">
                <div>
                  <p className="eyebrow-muted">{inv.invoiceNumber}</p>
                  <p className="my-booking-vehicle">
                    {new Date(inv.invoiceDate).toLocaleDateString("en-IN", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    })}
                  </p>
                  <p className="my-booking-route">
                    Total ₹{inv.total} · Received ₹{inv.amountReceived} · Balance ₹{inv.balance}
                  </p>
                </div>
                <div className="my-booking-meta">
                  <span className={`my-booking-status status-${inv.status.toLowerCase()}`}>{inv.status}</span>
                  <a
                    className="btn btn-outline btn-sm my-invoice-download"
                    href={`${API_URL}/api/invoices/${inv.invoiceNumber}/pdf`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Download PDF
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}
    </ConsumerLayout>
  );
}
