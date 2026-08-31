import { useState } from "react";
import "./FaqAccordion.css";

const FAQS = [
  {
    q: "Do I need an account to browse vehicles?",
    a: "No. You can browse categories and vehicle details without logging in. You'll only need to verify your mobile number when you're ready to book.",
  },
  {
    q: "How does login work?",
    a: "There's no password to remember. Enter your mobile number, and we send a one-time code by SMS to verify it's you.",
  },
  {
    q: "How is pricing calculated?",
    a: "Pricing depends on the vehicle, trip type (local or outstation), distance and duration. Exact rates are shown before you confirm a booking — nothing is charged upfront without your review.",
  },
  {
    q: "What if I need to cancel?",
    a: "Each booking shows its own cancellation terms. Refund eligibility and amount depend on how close to the journey date you cancel.",
  },
  {
    q: "How do I reach support?",
    a: "Use the WhatsApp button on any page, call the number in the footer, or raise a complaint from your dashboard once you're logged in.",
  },
];

export function FaqAccordion() {
  const [openIndex, setOpenIndex] = useState(0);

  return (
    <div className="faq">
      {FAQS.map((item, i) => {
        const isOpen = openIndex === i;
        return (
          <div key={item.q} className="faq-item">
            <button
              type="button"
              onClick={() => setOpenIndex(isOpen ? null : i)}
              aria-expanded={isOpen}
              className="faq-question"
            >
              <span className="faq-question-text">{item.q}</span>
              <span className={`faq-icon ${isOpen ? "faq-icon-open" : ""}`} aria-hidden="true">
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <path d="M6 0v12M0 6h12" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                </svg>
              </span>
            </button>
            <div className={`faq-answer-wrap ${isOpen ? "faq-answer-open" : ""}`}>
              <div className="faq-answer-inner">
                <p className="faq-answer">{item.a}</p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
