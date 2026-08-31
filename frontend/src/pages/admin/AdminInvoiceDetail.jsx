import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { apiFetch, API_URL } from "../../api.js";
import { AdminLayout } from "../../components/AdminLayout.jsx";

function Field({ label, value }) {
  return (
    <div className="admin-field-row">
      <span className="admin-field-label">{label}</span>
      <span className="admin-field-value">{value ?? "—"}</span>
    </div>
  );
}

function PaymentBadge({ invoice }) {
  if (invoice.status === "VOID") {
    return <span className="admin-badge admin-badge-void">Void</span>;
  }
  if (Number(invoice.balance) <= 0) {
    return <span className="admin-badge admin-badge-paid">Paid</span>;
  }
  return <span className="admin-badge admin-badge-pending">Pending</span>;
}

export default function AdminInvoiceDetail() {
  const { id } = useParams();
  const [invoice, setInvoice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);
  const [actionMessage, setActionMessage] = useState(null);

  const [discount, setDiscount] = useState(0);
  const [tax, setTax] = useState(0);
  const [amountReceived, setAmountReceived] = useState(0);
  const [terms, setTerms] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { ok, data } = await apiFetch(`/api/admin/invoices/${id}`);
    if (ok && data?.success) {
      setInvoice(data.invoice);
      setDiscount(data.invoice.discount);
      setTax(data.invoice.tax);
      setAmountReceived(data.invoice.amountReceived);
      setTerms(data.invoice.terms || "");
    } else {
      setError(data?.error || "Invoice not found.");
    }
    setLoading(false);
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleSave() {
    setSaving(true);
    setActionMessage(null);
    const { ok, data } = await apiFetch(`/api/admin/invoices/${id}`, {
      method: "PATCH",
      body: JSON.stringify({
        discount: Number(discount) || 0,
        tax: Number(tax) || 0,
        amountReceived: Number(amountReceived) || 0,
        terms: terms.trim() || null,
      }),
    });
    setSaving(false);
    if (ok && data?.success) {
      setInvoice(data.invoice);
      setActionMessage("Saved.");
    } else {
      setActionMessage(data?.error || "Failed to save invoice.");
    }
  }

  async function handleResend() {
    setSending(true);
    setActionMessage(null);
    const { ok, data } = await apiFetch(`/api/admin/invoices/${id}/email`, { method: "POST", body: JSON.stringify({}) });
    setSending(false);
    setActionMessage(ok && data?.success ? "Invoice emailed to customer." : data?.error || "Failed to send email.");
  }

  if (loading) {
    return (
      <AdminLayout title="Invoice">
        <p className="admin-loading">Loading invoice…</p>
      </AdminLayout>
    );
  }

  if (error || !invoice) {
    return (
      <AdminLayout title="Invoice">
        <div className="admin-empty">
          <strong>{error || "Invoice not found."}</strong>
          <Link to="/admin/invoices" className="btn btn-outline btn-sm">Back to invoices</Link>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title={invoice.invoiceNumber} lead={`Billed to ${invoice.customer.name}`}>
      <Link to="/admin/invoices" className="admin-back-link">
        ← Back to invoices
      </Link>

      <div className="admin-detail-grid">
        <div className="admin-detail-main">
          <div className="ticket admin-detail-card">
            <div className="admin-detail-card-head">
              <p className="eyebrow">Customer</p>
              <PaymentBadge invoice={invoice} />
            </div>
            <Field label="Name" value={invoice.customer.name} />
            <Field label="Phone" value={<a href={`tel:+91${invoice.customer.phone}`}>+91 {invoice.customer.phone}</a>} />
            <Field label="Email" value={invoice.customer.email || "Not provided"} />
          </div>

          <div className="ticket admin-detail-card">
            <p className="eyebrow">Line items</p>
            {invoice.lineItems.map((item, i) => (
              <div className="admin-field-row" key={i}>
                <span className="admin-field-label">{item.description}</span>
                <span className="admin-field-value">₹{item.amount}</span>
              </div>
            ))}
            <Field label="Subtotal" value={`₹${invoice.subtotal}`} />
            <Field label="Total" value={<strong>₹{invoice.total}</strong>} />
            <Field label="Balance due" value={`₹${invoice.balance}`} />

            <a
              className="btn btn-outline btn-sm"
              style={{ marginTop: "1rem" }}
              href={`${API_URL}/api/admin/invoices/${invoice.id}/pdf`}
              target="_blank"
              rel="noreferrer"
            >
              Download PDF
            </a>
          </div>
        </div>

        <div className="admin-detail-side">
          <div className="ticket admin-detail-card">
            <p className="eyebrow">Edit before finalizing</p>
            <div className="admin-form-field">
              <label className="otp-label-text">Discount</label>
              <input type="number" min="0" className="admin-input" value={discount} onChange={(e) => setDiscount(e.target.value)} />
            </div>
            <div className="admin-form-field">
              <label className="otp-label-text">Tax</label>
              <input type="number" min="0" className="admin-input" value={tax} onChange={(e) => setTax(e.target.value)} />
            </div>
            <div className="admin-form-field">
              <label className="otp-label-text">Amount received</label>
              <input type="number" min="0" className="admin-input" value={amountReceived} onChange={(e) => setAmountReceived(e.target.value)} />
            </div>
            <div className="admin-form-field">
              <label className="otp-label-text">Terms</label>
              <textarea className="admin-textarea" rows={3} value={terms} onChange={(e) => setTerms(e.target.value)} />
            </div>
            <p className="admin-subtext">Current balance: ₹{invoice.balance}</p>

            {actionMessage && <p className="admin-subtext">{actionMessage}</p>}

            <div className="admin-form-actions">
              <button type="button" className="btn btn-primary btn-sm" onClick={handleSave} disabled={saving}>
                {saving ? "Saving…" : "Save changes"}
              </button>
              <button type="button" className="btn btn-outline btn-sm" onClick={handleResend} disabled={sending}>
                {sending ? "Sending…" : "Email invoice to customer"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
