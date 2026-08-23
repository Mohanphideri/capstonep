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
  return <div className="page"><SiteBanner /><Navbar /><main className="public-page"><section className="public-hero container"><p className="eyebrow">Why Us</p><h1 className="public-title">{why?.title || "Why travellers choose Kuwarji Travels"}</h1><p className="public-intro">{why?.intro || "Reliable vehicles, clear communication and support from planning to return."}</p></section><section className="container public-feature-grid">{why?.imageUrl && <div className="public-feature-image"><img src={why.imageUrl} alt="Why choose Kuwarji Travels" /></div>}<div className="public-reasons">{(why?.items?.length ? why.items : [{title:"Reliable fleet",body:"Well-presented vehicles for local, outstation and group journeys."},{title:"Simple planning",body:"Tell us your route and requirements and we help match the right vehicle."},{title:"Human support",body:"Get practical help before, during and after your journey."}]).map((item,i)=><article className="public-reason" key={`${item.title}-${i}`}><span>{String(i+1).padStart(2,"0")}</span><h2>{item.title}</h2><p>{item.body}</p></article>)}</div></section></main><Footer /></div>;
}

export function FleetGallery() {
  const [photos, setPhotos] = useState([]); const [loading, setLoading] = useState(true);
  useEffect(() => { apiFetch("/api/site-content").then(({ ok, data }) => { if(ok&&data?.success) setPhotos(data.settings.fleetGallery||[]); setLoading(false); }); }, []);
  const groups = photos.reduce((acc, photo) => { const key = photo.categoryName || "Other"; (acc[key] ||= []).push(photo); return acc; }, {});
  return <div className="page"><SiteBanner /><Navbar /><main className="public-page"><section className="public-hero container"><p className="eyebrow">Fleet Gallery</p><h1 className="public-title">Explore our fleet by vehicle type.</h1><p className="public-intro">Bus, van and other fleet photos are organized by category so you can quickly find the kind of vehicle you need. Gallery photos are managed by the Kuwarji Travels admin team.</p></section><section className="container">{loading ? <p className="public-state">Loading gallery…</p> : !photos.length ? <div className="public-empty">Fleet gallery photos will appear here after the admin team uploads them.</div> : Object.entries(groups).map(([category, items]) => <section className="fleet-category-section" key={category}><h2 className="fleet-category-title">{category}</h2><div className="fleet-gallery-grid">{items.map((p)=><div className="fleet-gallery-card" key={p.id}><img src={p.imageUrl} alt={p.altText||`${category} fleet photo`} loading="lazy" /></div>)}</div></section>)}<div className="gallery-controls"><span>Need a vehicle? Browse the live fleet catalogue.</span><Link to="/vehicles" className="btn btn-primary">Search Vehicles →</Link></div></section></main><Footer /></div>;
}

export function AboutPage() {
  return <div className="page"><SiteBanner /><Navbar /><main className="public-page"><section className="public-hero container"><p className="eyebrow">About Kuwarji Travels</p><h1 className="public-title">Practical travel support for people who need to get somewhere together.</h1><p className="public-intro">Kuwarji Travels provides buses and other vehicles on rent for outstation journeys, group travel and local packages. The platform keeps vehicle discovery, trip planning, enquiries and booking information together in one place.</p></section><section className="container public-section-grid"><article className="public-info-card"><h2>Fleet-first planning</h2><p>Browse the live vehicle catalogue, compare capacity and comfort details, then send an enquiry for the journey you actually need.</p></article><article className="public-info-card"><h2>Trip Maker</h2><p>Build a multi-stop journey with destinations, dates, travellers and travel style, then continue into the existing enquiry flow.</p></article><article className="public-info-card"><h2>Human support</h2><p>Enquiries and bookings remain visible in the customer portal so you can follow progress after you submit a request.</p></article></section></main><Footer /></div>;
}

const FALLBACK_FAQS = [
  ["How do I request a vehicle?", "Open Search Vehicles, choose a vehicle and add it to your enquiry. You can then submit your journey details to the Kuwarji Travels team."],
  ["Can I plan a multi-stop trip?", "Yes. Trip Maker lets you choose destinations, dates, travellers, stops and travel style before continuing to the existing enquiry or booking flow."],
  ["How do I track my enquiry or booking?", "After signing in, use My Enquiries or My Bookings in your customer portal to see the latest status and available details."],
  ["Can I review a completed journey?", "Yes. Once a booking is completed, the Reviews section lets you submit a rating and written feedback for admin approval."],
  ["How do tour packages work?", "Open Tour Packages to view active packages, their destinations, duration, pricing and itinerary. Use Enquire to start a package enquiry."],
];

export function FAQPage() {
  const [faqs,setFaqs]=useState([]); const [loading,setLoading]=useState(true);
  useEffect(()=>{apiFetch("/api/faqs").then(({ok,data})=>{if(ok&&data?.success)setFaqs(data.faqs||[]);}).finally(()=>setLoading(false));},[]);
  const items=faqs.length?faqs.map(f=>[f.question,f.answer]):FALLBACK_FAQS;
  return <div className="page"><SiteBanner /><Navbar /><main className="public-page"><section className="public-hero container"><p className="eyebrow">FAQ</p><h1 className="public-title">Answers before you start your journey.</h1><p className="public-intro">A quick guide to vehicles, trip planning, enquiries, bookings and reviews.</p></section><section className="container"><div className="public-faq-list">{loading?<p className="public-state">Loading FAQs…</p>:items.map(([q,a],i)=><details className="public-faq-item" key={`${q}-${i}`}><summary>{q}</summary><div className="public-faq-answer">{a}</div></details>)}</div></section></main><Footer /></div>;
}

export function LegalPage({ type, title, fallback }) {
  const [text,setText]=useState(""); const [loading,setLoading]=useState(true);
  useEffect(()=>{apiFetch("/api/site-content").then(({ok,data})=>{if(ok&&data?.success)setText(data.settings[type]||fallback);setLoading(false);});},[type,fallback]);
  return <div className="page"><Navbar /><main className="public-page"><section className="container legal-page"><p className="eyebrow">Legal</p><h1 className="public-title">{title}</h1>{loading?<p className="public-state">Loading…</p>:<div className="legal-copy">{text.split(/\n\s*\n/).map((p,i)=><p key={i}>{p}</p>)}</div>}</section></main><Footer /></div>;
}

export function LocationPage() {
  const [s,setS]=useState(null); useEffect(()=>{apiFetch("/api/site-content").then(({ok,data})=>ok&&data?.success&&setS(data.settings));},[]);
  const src=s?.mapEmbedUrl || (s?.address ? `https://www.google.com/maps?q=${encodeURIComponent(s.address)}&output=embed` : "");
  return <div className="page"><Navbar /><main className="public-page"><section className="container public-hero"><p className="eyebrow">Visit Us</p><h1 className="public-title">Our location</h1><p className="public-intro">{s?.address || "Business address is configured by the admin team."}</p></section><section className="container location-card">{src ? <iframe title="Kuwarji Travels location" src={src} loading="lazy" referrerPolicy="no-referrer-when-downgrade" /> : <div className="public-empty">Add the business address or a Google Maps embed URL from Admin → Business Profile.</div>}</section></main><Footer /></div>;
}
