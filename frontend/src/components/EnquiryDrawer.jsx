import { useEffect } from "react";
import { EnquiryForm } from "./EnquiryForm.jsx";
import "./EnquiryDrawer.css";

/**
 * Fixed tab pinned to the top-right of the viewport. Always visible, opens
 * the enquiry drawer on click — the only entry point besides the hero and
 * in-page CTA buttons, all of which call the same onOpen handler.
 */
export function EnquiryTab({ onClick }) {
  return (
    <button type="button" className="enquiry-tab" onClick={onClick}>
      <svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden="true">
        <path
          d="M1 2.5h14M1 2.5l6.2 5.1a1.4 1.4 0 001.6 0L15 2.5M1 2.5v9.4a1 1 0 001 1h12a1 1 0 001-1V2.5"
          stroke="currentColor"
          strokeWidth="1.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <span>Enquiry</span>
    </button>
  );
}

/**
 * Slide-in panel from the right holding the enquiry form. The form itself
 * is never rendered inline on the page — it only mounts here, and only
 * becomes visible once `open` is true.
 */
export function EnquiryDrawer({ open, onClose, packageId = null, packageTitle = "", initialTrip = null }) {
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
        aria-label="Send an enquiry"
      >
        <div className="enquiry-drawer-head">
          <div>
            <p className="eyebrow">Get an enquiry</p>
            <h2 className="enquiry-drawer-title">Tell us about your trip</h2>
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
          <EnquiryForm packageId={packageId} packageTitle={packageTitle} initialTrip={initialTrip} />
        </div>
      </aside>
    </>
  );
}
