import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "../api.js";
import "./FaqAccordion.css";

// Sensible defaults shown until (or unless) the admin-managed FAQ list
// loads from the API. Grouped into categories so the sidebar always has
// something meaningful to show.
const FALLBACK_FAQS = [
  { category: "Journey", question: "Is a driver included with every booking?", answer: "Yes. Every vehicle comes with an experienced, verified driver — you never need to arrange one separately." },
  { category: "Journey", question: "Can I get the driver's contact details before the trip?", answer: "Yes, driver and vehicle details are shared with you once your booking is confirmed." },
  { category: "Journey", question: "Can I make stops along the way?", answer: "Yes. Let us know your planned stops when you submit your enquiry so we can factor them into the route and timing." },
  { category: "Journey", question: "What if my journey runs longer than planned?", answer: "Extra hours or distance beyond what was booked are billed as per the applicable rate, which our team will confirm with you before continuing." },
  { category: "Reschedule", question: "Can I reschedule my booking?", answer: "Rescheduling depends on vehicle availability and your booking terms. Contact support as early as possible so we can help." },
  { category: "Reschedule", question: "How do I request a new travel date?", answer: "Share your booking details and preferred new date with support. We will check availability and applicable charges." },
  { category: "Reschedule", question: "Is there a charge for rescheduling?", answer: "Some bookings may involve a rescheduling fee depending on how close to the original date the change is made. Our team will confirm any charges upfront." },
  { category: "Reschedule", question: "How far in advance should I request a reschedule?", answer: "The earlier you let us know, the more likely we can accommodate your new date without extra charges or availability issues." },
  { category: "Cancellation & Refund", question: "What if I need to cancel?", answer: "Each booking shows its own cancellation terms. Refund eligibility and amount depend on how close to the journey date you cancel." },
  { category: "Cancellation & Refund", question: "How long do refunds take to process?", answer: "Approved refunds are credited back to your original payment method, typically within 5-7 business days." },
  { category: "Cancellation & Refund", question: "Who do I contact to cancel a booking?", answer: "Reach out to our support team with your booking details and we'll guide you through the cancellation process." },
  { category: "Payment", question: "How is pricing calculated?", answer: "Pricing depends on the vehicle, trip type (local or outstation), distance and duration. Exact rates are shown before you confirm a booking." },
  { category: "Payment", question: "Do I need to pay the full amount upfront?", answer: "Payment terms vary by booking and are clearly shared with you before you confirm, so there are no surprises." },
  { category: "Payment", question: "Will I get an invoice for my booking?", answer: "Yes. An invoice is generated for every confirmed booking and made available to you." },
  { category: "Booking", question: "Do I need an account to browse vehicles?", answer: "No. You can browse categories and vehicle details without logging in. You'll only need to verify your mobile number when you're ready to book." },
  { category: "Booking", question: "How do I know if my booking is confirmed?", answer: "Once our team converts your enquiry into a booking, you'll be able to see the confirmed status and details in your customer portal." },
  { category: "Booking", question: "Can I book a vehicle for a group trip or tour?", answer: "Yes. Kuwarji Travels handles local, outstation and group travel, including planned tours — just share your requirements in your enquiry." },
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
