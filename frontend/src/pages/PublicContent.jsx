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
  return <div className="page"><SiteBanner /><Navbar /><main className="public-page"><section className="public-hero container"><p className="eyebrow">Fleet Gallery</p><h1 className="public-title">Our vehicles, in real photos.</h1><p className="public-intro">A dedicated gallery managed by the Kuwarji Travels team. These images are independent from booking inventory.</p></section><section className="container"><div className="fleet-gallery-viewport"><div className="fleet-gallery-track">{loading ? <p className="public-state">Loading gallery…</p> : photos.length ? photos.map((p)=><div className="fleet-gallery-card" key={p.id}><img src={p.imageUrl} alt={p.altText||"Kuwarji Travels fleet"} loading="lazy" /></div>) : <div className="public-empty">Fleet gallery photos will appear here after the admin team uploads them.</div>}</div></div><div className="gallery-controls"><span>Scroll left / right to explore more</span><Link to="/vehicles" className="btn btn-primary">Search Vehicles →</Link></div></section></main><Footer /></div>;
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
