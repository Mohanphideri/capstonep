import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Navbar } from "../components/Navbar.jsx";
import { Footer } from "../components/Footer.jsx";
import { apiFetch } from "../api.js";
import { EnquiryDrawer } from "../components/EnquiryDrawer.jsx";
import ConsumerLayout from "../components/ConsumerLayout.jsx";
import "./TourPackages.css";

export default function TourPackages({ embedded = false }) {
  const [packages, setPackages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    apiFetch("/api/tour-packages").then(({ ok, data }) => {
      if (ok && data?.success) setPackages(data.packages || []);
    }).finally(() => setLoading(false));
  }, []);

  const content = (
    <div className="tour-page">
      {!embedded && (
        <section className="tour-hero">
          <div><span className="eyebrow">KUWARJI TRAVELS</span><h1>Tour packages made for memorable journeys.</h1><p>Explore curated group tours with clear itineraries, inclusions and comfortable travel.</p></div>
          <div className="tour-hero-art">✦</div>
        </section>
      )}
      {loading ? <div className="tour-empty">Loading tour packages…</div> : packages.length === 0 ? <div className="tour-empty">No tour packages are available right now.</div> : <div className="tour-grid">
        {packages.map((pkg) => <Link to={embedded ? `/dashboard/tour-packages/${pkg.id}` : `/tour-packages/${pkg.id}`} className="tour-card" key={pkg.id}>
          <div className="tour-card-image" style={pkg.imageUrl ? { backgroundImage: `url(${pkg.imageUrl})` } : undefined}><span>{pkg.durationDays} Days</span></div>
          <div className="tour-card-body"><div className="tour-card-meta"><span>{pkg.destination}</span>{pkg.featured && <b>Featured</b>}</div><h2>{pkg.title}</h2><p>{pkg.description || "A thoughtfully planned journey by Kuwarji Travels."}</p><div className="tour-card-bottom"><strong>₹{Number(pkg.priceFrom || 0).toLocaleString("en-IN")}</strong><span>from</span><button className="btn btn-primary btn-sm" onClick={(e) => { e.preventDefault(); e.stopPropagation(); setSelected(pkg); }}>Enquire</button></div></div>
        </Link>)}
      </div>}
      {selected && <EnquiryDrawer open onClose={() => setSelected(null)} packageId={selected.id} packageTitle={selected.title} />}
    </div>
  );
  if (embedded) return <ConsumerLayout title="Tour Packages" lead="Explore curated journeys and send an enquiry without leaving your customer portal.">{content}</ConsumerLayout>;
  return <div className="page"><Navbar />{content}<Footer /></div>;
}
