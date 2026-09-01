import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Navbar } from "../components/Navbar.jsx";
import { Footer } from "../components/Footer.jsx";
import SiteBanner from "../components/SiteBanner.jsx";
import { apiFetch } from "../api.js";
import "./PublicContent.css";

export function WhyUs() {
  const [content, setContent] = useState(null);
  useEffect(() => { apiFetch("/api/site-content").then(({ ok, data }) => ok && data?.success && setContent(data.settings)); }, []);
  const why = content?.whyUs;
  return <div className="page"><SiteBanner /><Navbar /><main className="public-page"><section className="public-hero container"><p className="eyebrow">Why Us</p><h1 className="public-title">{why?.title || "Why travellers choose Kuwarji Travels"}</h1><p className="public-intro">{why?.intro || "Reliable vehicles, clear communication and support from planning to return."}</p></section><section className="container public-feature-grid"><div className="public-feature-image"><img src="/about-story.jpg" alt="Why choose Kuwarji Travels" loading="lazy" /></div><div className="public-reasons">{(why?.items?.length ? why.items : [{title:"Reliable fleet",body:"Well-presented vehicles for local, outstation and group journeys."},{title:"Simple planning",body:"Tell us your route and requirements and we help match the right vehicle."},{title:"Human support",body:"Get practical help before, during and after your journey."}]).map((item,i)=><article className="public-reason" key={`${item.title}-${i}`}><span>{String(i+1).padStart(2,"0")}</span><h2>{item.title}</h2><p>{item.body}</p></article>)}</div></section></main><Footer /></div>;
}

export function FleetGallery() {
  const [photos, setPhotos] = useState([]); const [loading, setLoading] = useState(true);
  useEffect(() => { apiFetch("/api/site-content").then(({ ok, data }) => { if(ok&&data?.success) setPhotos(data.settings.fleetGallery||[]); setLoading(false); }); }, []);
  const groups = photos.reduce((acc, photo) => { const key = photo.categoryName || "Other"; (acc[key] ||= []).push(photo); return acc; }, {});
  return <div className="page"><SiteBanner /><Navbar /><main className="public-page"><section className="public-hero container"><p className="eyebrow">Fleet Gallery</p><h1 className="public-title">Explore our fleet by vehicle type.</h1><p className="public-intro">Bus, van and other fleet photos are organized by category so you can quickly find the kind of vehicle you need. Gallery photos are managed by the Kuwarji Travels admin team.</p></section><section className="container">{loading ? <p className="public-state">Loading gallery…</p> : !photos.length ? <div className="public-empty">Fleet gallery photos will appear here after the admin team uploads them.</div> : Object.entries(groups).map(([category, items]) => <section className="fleet-category-section" key={category}><h2 className="fleet-category-title">{category}</h2><div className="fleet-gallery-grid">{items.map((p)=><div className="fleet-gallery-card" key={p.id}><img src={p.imageUrl} alt={p.altText||`${category} fleet photo`} loading="lazy" /></div>)}</div></section>)}<div className="gallery-controls"><span>Need a vehicle? Browse the live fleet catalogue.</span><Link to="/vehicles" className="btn btn-primary">Search Vehicles →</Link></div></section></main><Footer /></div>;
}

export function AboutPage() {
  const aboutPhotos = [
    { src: "/about-story.jpg", alt: "Kuwarji Travels coach ready for a journey", effect: "about-photo-in" },
    { src: "/kuwarji-two-buses.jpg", alt: "Kuwarji Travels buses on the road", effect: "about-photo-slide" },
  ];
  const [photoIndex, setPhotoIndex] = useState(0);

  useEffect(() => {
    const timer = window.setInterval(() => setPhotoIndex((index) => (index + 1) % aboutPhotos.length), 2000);
    return () => window.clearInterval(timer);
  }, []);

  const activePhoto = aboutPhotos[photoIndex];

  return <div className="page"><SiteBanner /><Navbar /><main className="public-page about-page">
    <section className="public-hero container about-hero">
      <p className="eyebrow">ABOUT KUWARJI TRAVELS</p>
      <h1 className="public-title">Travel planning that feels simple, clear and dependable.</h1>
      <p className="public-intro">Kuwarji Travels helps families, groups, companies and travellers arrange buses, cars and tempo travellers for local journeys, outstation travel and organised tours — with practical support from enquiry to the end of the trip.</p>
    </section>

    <section className="container about-story-grid about-story-grid--premium">
      <div className="about-story-copy">
        <p className="eyebrow">WHO WE ARE</p>
        <h2>A travel service built around the journey, not just the booking.</h2>
        <p>Choosing a vehicle for a group trip should not mean dealing with confusing options or scattered conversations. Kuwarji Travels brings vehicle discovery, trip requirements, enquiries and booking support into one straightforward experience.</p>
        <p>Whether the journey is local, outstation or part of a planned tour, the focus is practical: understand the group, route, dates, comfort requirements and budget, then help the customer move forward with the right option.</p>
        <p>We believe good travel service is about clear communication. Customers should know what they requested, what has been booked, what happens next and where to get help when something changes.</p>
        <div className="about-story-stats">
          <div><strong>Local</strong><span>And outstation travel</span></div>
          <div><strong>Group</strong><span>Travel solutions</span></div>
          <div><strong>24×7</strong><span>Support access</span></div>
        </div>
      </div>
      <div className="about-story-media about-photo-showcase" aria-live="polite">
        <div className={`about-photo-frame ${activePhoto.effect}`} key={activePhoto.src}>
          <img src={activePhoto.src} alt={activePhoto.alt} loading="eager" />
          <div className="about-photo-overlay"><span>KUWARJI TRAVELS</span><strong>{photoIndex === 0 ? "Ready for the road" : "Travel together"}</strong></div>
        </div>
        <div className="about-photo-dots" aria-label="About photos">
          {aboutPhotos.map((photo, index) => <button key={photo.src} type="button" className={index === photoIndex ? "active" : ""} aria-label={`Show about photo ${index + 1}`} onClick={() => setPhotoIndex(index)} />)}
        </div>
      </div>
    </section>

    <section className="container about-values">
      <div className="about-section-heading"><p className="eyebrow">WHAT MATTERS TO US</p><h2>A better experience at every step.</h2></div>
      <div className="public-section-grid">
        <article className="public-info-card"><span className="about-card-number">01</span><h2>Right vehicle</h2><p>Vehicle choices are presented around capacity, comfort and the needs of the journey instead of making customers guess what will work.</p></article>
        <article className="public-info-card"><span className="about-card-number">02</span><h2>Clear communication</h2><p>From an enquiry to a confirmed booking, important trip information stays easy to understand and follow.</p></article>
        <article className="public-info-card"><span className="about-card-number">03</span><h2>Support when needed</h2><p>Questions, booking changes and post-booking issues can be raised through the customer support experience.</p></article>
      </div>
    </section>

    <section className="container about-contact-strip"><div><span className="eyebrow">LET'S TALK</span><h2>Planning a journey?</h2><p>For enquiries, booking support, cancellations or general travel questions, email <a href="mailto:kuwarjitravellers@gmail.com">kuwarjitravellers@gmail.com</a>.</p></div><a className="about-contact-button" href="mailto:kuwarjitravellers@gmail.com">Contact us →</a></section>
  </main><Footer /></div>;
}

const FALLBACK_FAQS = [
  ["How do I request a vehicle?", "Open Search Vehicles, choose a vehicle and add it to your enquiry. You can then submit your journey details to the Kuwarji Travels team."],
  ["Can I plan a multi-stop trip?", "Yes. Use the Trip Planner with your destinations, dates, travellers and travel style, then continue into the existing enquiry or booking flow."],
  ["How do I track my enquiry or booking?", "After signing in, use My Enquiries or My Bookings in your customer portal to see the latest status and available details."],
  ["Can I review a completed journey?", "Yes. Once a booking is completed, the Reviews section lets you submit a rating and written feedback for admin approval."],
  ["How do tour packages work?", "Open Tour Packages to view active packages, their destinations, duration, pricing and itinerary. Use Enquire to start a package enquiry."],
];

export function FAQPage() {
  const [faqs,setFaqs]=useState([]); const [loading,setLoading]=useState(true);
  useEffect(()=>{apiFetch("/api/faqs").then(({ok,data})=>{if(ok&&data?.success)setFaqs(data.faqs||[]);}).finally(()=>setLoading(false));},[]);
  const items=faqs.length?faqs.map(f=>[f.question,f.answer]):FALLBACK_FAQS;
  return <div className="page"><SiteBanner /><Navbar /><main className="public-page faq-reference-page">
    <section className="container faq-reference-hero"><div className="faq-question-mark">?</div><h1 className="public-title">Frequently Asked Questions</h1></section>
    <section className="container faq-reference-layout">
      <aside className="faq-topic-nav" aria-label="FAQ categories">{["Journey","Reschedule","Cancellation & Refund","Lounge","Payment","Booking"].map((x,i)=><button type="button" key={x} className={i===0?"active":""}>{x}</button>)}</aside>
      <div className="faq-reference-list">{loading?<p className="public-state">Loading FAQs…</p>:items.map(([q,a],i)=><details className="faq-reference-item" key={`${q}-${i}`} open={i<2}><summary><span>{q}</span><b>{i<2?"−":"+"}</b></summary><div className="faq-reference-answer">{a}</div></details>)}</div>
    </section>
  </main><Footer /></div>;
}

export function LegalPage({ type, title, fallback }) {
  const [text,setText]=useState(""); const [loading,setLoading]=useState(true);
  useEffect(()=>{apiFetch("/api/site-content").then(({ok,data})=>{if(ok&&data?.success)setText(data.settings[type]||fallback);setLoading(false);});},[type,fallback]);
  const sections = splitLegalSections(text || fallback);
  return <div className="page"><Navbar /><main className="public-page legal-reference-page">
    <section className="container legal-reference-hero"><p className="eyebrow">Kuwarji Travels</p><h1 className="public-title">{title}</h1><p className="public-intro">Clear, transparent information about how we provide and manage our travel services.</p></section>
    <section className="container legal-reference-layout">
      <aside className="legal-on-page"><strong>On this page</strong>{sections.map((s,i)=><a key={i} href={`#legal-${i}`}>{s.heading}</a>)}</aside>
      <article className="legal-reference-card">{loading?<p className="public-state">Loading…</p>:sections.map((s,i)=><section id={`legal-${i}`} className="legal-reference-section" key={i}><h2>{s.heading}</h2><p>{s.body}</p></section>)}<div className="legal-help"><strong>Still have questions?</strong><span>Our team is happy to help with anything not covered here.</span><a href="mailto:kuwarjitravellers@gmail.com" className="legal-help-link">kuwarjitravellers@gmail.com</a><Link to="/about" className="legal-help-link">Contact Kuwarji Travels →</Link></div></article>
    </section>
  </main><Footer /></div>;
}

function splitLegalSections(value) {
  const paragraphs = String(value || "").split(/\n\s*\n/).map(x=>x.trim()).filter(Boolean);
  return paragraphs.map((paragraph,i)=>{
    const match=paragraph.match(/^([^:]{2,80}):\s*(.+)$/s);
    return { heading: match ? match[1] : (i===0 ? "Overview" : `Information ${i+1}`), body: match ? match[2] : paragraph };
  });
}

export function LocationPage() {
  const [s,setS]=useState(null); useEffect(()=>{apiFetch("/api/site-content").then(({ok,data})=>ok&&data?.success&&setS(data.settings));},[]);
  const src=s?.mapEmbedUrl || (s?.address ? `https://www.google.com/maps?q=${encodeURIComponent(s.address)}&output=embed` : "");
  return <div className="page"><Navbar /><main className="public-page"><section className="container public-hero"><p className="eyebrow">Visit Us</p><h1 className="public-title">Our location</h1><p className="public-intro">{s?.address || "Get in touch with our team for directions and office hours."}</p></section><section className="container location-card">{src ? <iframe title="Kuwarji Travels location" src={src} loading="lazy" referrerPolicy="no-referrer-when-downgrade" /> : <div className="public-empty">Map details are coming soon — please reach out to us directly using the contact details in the footer.</div>}</section></main><Footer /></div>;
}
