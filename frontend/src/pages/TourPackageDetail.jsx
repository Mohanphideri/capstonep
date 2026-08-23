import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Navbar } from "../components/Navbar.jsx";
import { Footer } from "../components/Footer.jsx";
import { apiFetch } from "../api.js";
import { EnquiryDrawer } from "../components/EnquiryDrawer.jsx";
import ConsumerLayout from "../components/ConsumerLayout.jsx";
import "./TourPackages.css";

export default function TourPackageDetail({ embedded = false }) {
  const { id } = useParams(); const [pkg, setPkg] = useState(null); const [open, setOpen] = useState(false);
  useEffect(() => { apiFetch(`/api/tour-packages/${id}`).then(({ ok, data }) => ok && data?.success && setPkg(data.package)); }, [id]);
  if (!pkg) return embedded ? <ConsumerLayout title="Tour Package"><div className="tour-empty">Loading package…</div></ConsumerLayout> : <div className="page"><Navbar /><div className="tour-empty">Loading package…</div><Footer /></div>;
  const content = <main className="tour-detail"><Link to={embedded ? "/dashboard/tour-packages" : "/tour-packages"} className="tour-back">← All tour packages</Link><div className="tour-detail-card"><div className="tour-detail-image" style={pkg.imageUrl ? { backgroundImage: `url(${pkg.imageUrl})` } : undefined}></div><div className="tour-detail-copy"><span className="eyebrow">{pkg.destination} · {pkg.durationDays} days</span><h1>{pkg.title}</h1><p>{pkg.description}</p><div className="tour-price">₹{Number(pkg.priceFrom || 0).toLocaleString("en-IN")} <small>starting price</small></div><button className="btn btn-primary" onClick={() => setOpen(true)}>Enquire for this package</button></div></div><div className="tour-detail-sections"><section><h2>Itinerary</h2><ol>{(pkg.itinerary || []).map((x,i)=><li key={i}>{x}</li>)}</ol></section><section><h2>Inclusions</h2><ul>{(pkg.inclusions || []).map((x,i)=><li key={i}>{x}</li>)}</ul><h2>Exclusions</h2><ul>{(pkg.exclusions || []).map((x,i)=><li key={i}>{x}</li>)}</ul></section></div></main>;
  return embedded ? <ConsumerLayout title="Tour Package" lead="Review the itinerary and send an enquiry for this journey.">{content}{open && <EnquiryDrawer open onClose={() => setOpen(false)} packageId={pkg.id} packageTitle={pkg.title} />}</ConsumerLayout> : <div className="page"><Navbar />{content}{open && <EnquiryDrawer open onClose={() => setOpen(false)} packageId={pkg.id} packageTitle={pkg.title} />}<Footer /></div>;
}
