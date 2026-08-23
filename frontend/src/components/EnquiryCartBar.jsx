import { useEnquiryCart } from "../EnquiryCartContext.jsx";
import "./EnquiryCartBar.css";

/**
 * Persistent floating bar shown whenever the enquiry cart has at least
 * one vehicle in it — the "3 Vehicles Selected" indicator required by
 * spec §7, plus the entry point into the multi-vehicle enquiry drawer.
 */
export function EnquiryCartBar({ onEnquire }) {
  const { vehicles, count, clear } = useEnquiryCart();

  if (count === 0) return null;

  return (
    <div className="enquiry-cart-bar" role="status">
      <div className="enquiry-cart-bar-inner">
        <span className="enquiry-cart-bar-count">
          {count} {count === 1 ? "vehicle" : "vehicles"} selected
        </span>
        <span className="enquiry-cart-bar-names">
          {vehicles.map((v) => v.name).join(", ")}
        </span>
        <div className="enquiry-cart-bar-actions">
          <button type="button" className="btn btn-outline btn-sm" onClick={clear}>
            Clear all
          </button>
          <button type="button" className="btn btn-primary btn-sm" onClick={onEnquire}>
            Enquire About Selected Vehicles
          </button>
        </div>
      </div>
    </div>
  );
}
