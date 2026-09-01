import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "../api.js";
import "./FaqAccordion.css";

// Sensible defaults shown until (or unless) the admin-managed FAQ list
// loads from the API. Grouped into categories so the sidebar always has
// something meaningful to show.
const FALLBACK_FAQS = [
  { category: "Journey", question: "Is a driver included with every booking?", answer: "Yes. Every vehicle comes with an experienced, verified driver — you never need to arrange one separately." },
  { category: "Journey", question: "Can I get the driver's contact details before the trip?", answer: "Yes, driver and vehicle details are shared with you once your booking is confirmed." },
  { category: "Reschedule", question: "Can I reschedule my booking?", answer: "Rescheduling depends on vehicle availability and your booking terms. Contact support as early as possible so we can help." },
  { category: "Reschedule", question: "How do I request a new travel date?", answer: "Share your booking details and preferred new date with support. We will check availability and applicable charges." },
  { category: "Cancellation & Refund", question: "What if I need to cancel?", answer: "Each booking shows its own cancellation terms. Refund eligibility and amount depend on how close to the journey date you cancel." },
  { category: "Cancellation & Refund", question: "How long do refunds take to process?", answer: "Approved refunds are credited back to your original payment method, typically within 5-7 business days." },
  { category: "Lounge", question: "Do you provide lounge access?", answer: "Lounge availability depends on the selected service and boarding location. Please check with our team before your journey." },
  { category: "Lounge", question: "Can I ask about lounge facilities?", answer: "Yes. Our support team can confirm available lounge facilities and access rules for your route." },
  { category: "Payment", question: "How is pricing calculated?", answer: "Pricing depends on the vehicle, trip type (local or outstation), distance and duration. Exact rates are shown before you confirm a booking." },
  { category: "Payment", question: "What payment methods are accepted?", answer: "We accept UPI, debit and credit cards, and net banking. All accepted methods are shown at checkout." },
  { category: "Booking", question: "Do I need an account to browse vehicles?", answer: "No. You can browse categories and vehicle details without logging in. You'll only need to verify your mobile number when you're ready to book." },
  { category: "Booking", question: "How does login work?", answer: "There's no password to remember. Enter your mobile number, and we send a one-time code by SMS to verify it's you." },
];

export function FaqAccordion() {
  const [items, setItems] = useState(FALLBACK_FAQS);
  const [activeCategory, setActiveCategory] = useState(FALLBACK_FAQS[0].category);
  const [openIndex, setOpenIndex] = useState(0);

  useEffect(() => {
    let cancelled = false;
    apiFetch("/api/faqs")
      .then((res) => {
        if (cancelled) return;
        if (res.ok && res.data?.success && res.data.faqs?.length) {
          const mapped = res.data.faqs.map((f) => ({
            question: f.question,
            answer: f.answer,
            category: f.category || "General",
          }));
          setItems(mapped);
          setActiveCategory(mapped[0].category);
          setOpenIndex(0);
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const categories = useMemo(() => {
    const seen = [];
    items.forEach((item) => {
      if (!seen.includes(item.category)) seen.push(item.category);
    });
    return seen;
  }, [items]);

  const visibleItems = useMemo(
    () => items.filter((item) => item.category === activeCategory),
    [items, activeCategory]
  );

  return (
    <div className="faq">
      <div className="faq-sidebar" role="tablist" aria-label="FAQ categories">
        {categories.map((cat) => (
          <button
            key={cat}
            type="button"
            role="tab"
            aria-selected={cat === activeCategory}
            className={`faq-tab ${cat === activeCategory ? "faq-tab-active" : ""}`}
            onClick={() => {
              setActiveCategory(cat);
              setOpenIndex(0);
            }}
          >
            {cat}
          </button>
        ))}
      </div>

      <div className="faq-panel">
        {visibleItems.map((item, i) => {
          const isOpen = openIndex === i;
          return (
            <div key={item.question} className={`faq-item ${isOpen ? "faq-item-open" : ""}`}>
              <button
                type="button"
                onClick={() => setOpenIndex(isOpen ? null : i)}
                aria-expanded={isOpen}
                className="faq-question"
              >
                <span className="faq-question-text">{item.question}</span>
                <span className={`faq-icon ${isOpen ? "faq-icon-open" : ""}`} aria-hidden="true">
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                    <path d="M6 0v12M0 6h12" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                  </svg>
                </span>
              </button>
              <div className={`faq-answer-wrap ${isOpen ? "faq-answer-open" : ""}`}>
                <div className="faq-answer-inner">
                  <p className="faq-answer">{item.answer}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
