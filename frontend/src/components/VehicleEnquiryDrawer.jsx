import { useEffect } from "react";
import { VehicleEnquiryForm } from "./VehicleEnquiryForm.jsx";
import "./EnquiryDrawer.css";

/**
 * Same slide-in panel pattern as EnquiryDrawer, but always tied to a
 * specific vehicle — this is what "Enquire Now" on a vehicle detail page
 * opens, replacing the old booking flow (see VehicleDetail.jsx).
 */
export function VehicleEnquiryDrawer({ vehicle, vehicles, open, onClose }) {
  const selectedVehicles = vehicles?.length ? vehicles : vehicle ? [vehicle] : [];
  useEffect(() => {
    if (!open) return undefined;

    function handleKeyDown(e) {
      if (e.key === "Escape") onClose();
    }

    document.addEventListener("keydown", handleKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [open, onClose]);

  return (
    <>
      <div
        className={`enquiry-drawer-backdrop${open ? " is-open" : ""}`}
        onClick={onClose}
        aria-hidden="true"
      />
      <aside
        className={`enquiry-drawer${open ? " is-open" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-label={`Enquire about ${selectedVehicles.length > 1 ? `${selectedVehicles.length} vehicles` : selectedVehicles[0]?.name || "this vehicle"}`}
      >
        <div className="enquiry-drawer-head">
          <div>
            <p className="eyebrow">Enquire now</p>
            <h2 className="enquiry-drawer-title">
              {selectedVehicles.length > 1
                ? `${selectedVehicles.length} vehicles selected`
                : selectedVehicles[0]?.name || "Tell us about your trip"}
            </h2>
          </div>
          <button
            type="button"
            className="enquiry-drawer-close"
            onClick={onClose}
            aria-label="Close enquiry form"
          >
            <svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path
                d="M1.5 1.5L14.5 14.5M14.5 1.5L1.5 14.5"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>
        <div className="enquiry-drawer-body">
          {open && <VehicleEnquiryForm vehicles={selectedVehicles} clearCartOnSuccess={Boolean(selectedVehicles.length)} />}
        </div>
      </aside>
    </>
  );
}
