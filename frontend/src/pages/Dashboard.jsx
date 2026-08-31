import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ProfileCompletionModal } from "../components/ProfileCompletionModal.jsx";
import { useAuth } from "../AuthContext.jsx";
import { apiFetch } from "../api.js";
import ConsumerLayout, { ConsumerIcon as Icon } from "../components/ConsumerLayout.jsx";
import "./Dashboard.css";

function formatDate(value){ if(!value) return "—"; const d=new Date(value); return Number.isNaN(d.getTime())?String(value):d.toLocaleDateString("en-IN",{day:"2-digit",month:"short",year:"numeric"}); }
function money(value){ const n=Number(value||0); return n?`₹${n.toLocaleString("en-IN")}`:"₹0"; }

export default function Dashboard(){
  const {user}=useAuth();
  const [upcoming,setUpcoming]=useState([]); const [allBookings,setAllBookings]=useState([]); const [loadingBookings,setLoadingBookings]=useState(true);
  const [enquiries,setEnquiries]=useState([]); const [reviews,setReviews]=useState([]); const [publicReviews,setPublicReviews]=useState([]); const [dismissed,setDismissed]=useState(false);
  useEffect(()=>{
    if(!user)return; let mounted=true;
    Promise.all([
      apiFetch("/api/bookings?scope=upcoming"),
      apiFetch("/api/bookings"),
      apiFetch("/api/my-enquiries"),
      apiFetch("/api/reviews/mine"),
      fetch(`${import.meta.env.VITE_API_URL?.replace(/\/$/,"")||""}/api/reviews/featured`,{credentials:"include"}).then(r=>r.ok?r.json():null).catch(()=>null),
    ]).then(([b,all,e,mine,featured])=>{if(!mounted)return; if(b.ok&&b.data?.success)setUpcoming(Array.isArray(b.data.bookings)?b.data.bookings:[]); if(all.ok&&all.data?.success)setAllBookings(Array.isArray(all.data.bookings)?all.data.bookings:[]); if(e.ok&&e.data?.success)setEnquiries(Array.isArray(e.data.enquiries)?e.data.enquiries:[]); if(mine.ok&&mine.data?.success)setReviews(Array.isArray(mine.data.reviews)?mine.data.reviews:[]); if(featured?.success)setPublicReviews(Array.isArray(featured.reviews)?featured.reviews:[]);}).catch(()=>{}).finally(()=>mounted&&setLoadingBookings(false));
    return()=>{mounted=false};
  },[user]);
  if(!user)return null;
  const profileIncomplete=!user.name||!user.email; const displayName=user.name||"Traveller"; const firstName=displayName.split(" ")[0]; const nextTrip=upcoming[0];
  return <ConsumerLayout title="Dashboard">
    {profileIncomplete&&!dismissed&&<ProfileCompletionModal onComplete={()=>setDismissed(true)}/>} 
    <section className="customer-welcome-banner"><div><h2>Welcome back, {displayName}!</h2><p>Plan your next journey with us.</p></div><div className="customer-skyline" aria-hidden="true"><span className="city c1"/><span className="city c2"/><span className="city c3"/><span className="city c4"/><span className="bus-art">▰</span></div></section>

    <section className="customer-stat-grid">
      <Link to="/dashboard/enquiries" className="customer-stat-card"><span className="customer-stat-icon blue"><Icon name="message"/></span><span><small>My Enquiries</small><strong>{enquiries.length}</strong><em>Total Enquiries</em></span></Link>
      <Link to="/dashboard/bookings" className="customer-stat-card"><span className="customer-stat-icon green"><Icon name="calendar"/></span><span><small>My Bookings</small><strong>{allBookings.length}</strong><em>Total Bookings</em></span></Link>
      <Link to="/dashboard/bookings" className="customer-stat-card"><span className="customer-stat-icon violet"><Icon name="truck"/></span><span><small>Upcoming Trips</small><strong>{upcoming.length}</strong><em>Next 30 Days</em></span></Link>
      <Link to="/dashboard/reviews" className="customer-stat-card"><span className="customer-stat-icon orange"><Icon name="star"/></span><span><small>My Reviews</small><strong>{reviews.length}</strong><em>My submitted reviews</em></span></Link>
    </section>

    <section className="customer-panel customer-upcoming-panel">
      <div className="customer-panel-head"><h3>Upcoming Booking</h3><Link to="/dashboard/bookings">View All</Link></div>
      {loadingBookings?<div className="customer-loading">Loading your bookings…</div>:nextTrip?<Link className="customer-booking-card" to={`/dashboard/bookings/${nextTrip.bookingId}`}><div className="customer-booking-vehicle"><Icon name="truck" size={38}/></div><div className="customer-booking-main"><div className="customer-booking-title-row"><strong>{nextTrip.vehicles?.map(v=>v?.name).filter(Boolean).join(", ")||"Upcoming Journey"}</strong><span className="customer-status">{String(nextTrip.status||"CONFIRMED").replace(/_/g," ")}</span></div><div className="customer-booking-route">{nextTrip.journey?.pickup||"Pickup"} <b>→</b> {nextTrip.journey?.destination||"Destination"}</div><div className="customer-booking-meta"><span><Icon name="calendar" size={13}/>{formatDate(nextTrip.journey?.journeyStart)}</span><span>Booking ID <b>{nextTrip.bookingId||"—"}</b></span><span>Amount <b>{money(nextTrip.amount||nextTrip.totalAmount||0)}</b></span></div></div></Link>:<div className="customer-empty">No upcoming booking. <Link to="/dashboard/vehicles">Search vehicles</Link> to plan your next journey.</div>}
    </section>

    <section className="customer-panel customer-recent-panel"><div className="customer-panel-head"><h3>Recent Enquiries</h3><Link to="/dashboard/enquiries">View All</Link></div><div className="customer-table-wrap"><table className="customer-table"><thead><tr><th>Package / Vehicle</th><th>Enquiry Date</th><th>Status</th><th>Action</th></tr></thead><tbody>{enquiries.slice(0,5).map((e,i)=><tr key={e.id||e._id||i}><td>{e.vehicleName||e.packageName||e.vehicle?.name||e.tourPackage?.name||"Travel enquiry"}</td><td>{formatDate(e.createdAt||e.created_at||e.date)}</td><td><span className={`customer-status status-${String(e.status||"NEW").toLowerCase()}`}>{String(e.status||"NEW").replace(/_/g," ")}</span></td><td><Link to="/dashboard/enquiries" className="customer-view-btn">View</Link></td></tr>)}</tbody></table>{!enquiries.length&&<div className="customer-empty">No enquiries yet.</div>}</div></section>

    <section className="customer-quick-grid">
      <Link to="/dashboard/trip-planner" className="customer-quick-card"><span className="quick-violet"><Icon name="calendar"/></span><strong>Trip Planner</strong><small>Plan your route and vehicle</small></Link>
      <Link to="/dashboard/vehicles" className="customer-quick-card"><span className="quick-blue"><Icon name="truck"/></span><strong>Search Vehicles</strong><small>Find the best vehicles</small></Link>
      <Link to="/dashboard/tour-packages" className="customer-quick-card"><span className="quick-green"><Icon name="grid"/></span><strong>Tour Packages</strong><small>Explore packages</small></Link>
      <Link to="/dashboard/enquiries" className="customer-quick-card"><span className="quick-orange"><Icon name="message"/></span><strong>Contact Us</strong><small>Get in touch</small></Link>
    </section>

    <section className="customer-panel customer-reviews-panel"><div className="customer-panel-head"><h3>What Our Customers Say</h3><Link to="/dashboard/reviews">View All Reviews</Link></div><div className="customer-review-grid">{publicReviews.slice(0,4).map((r,i)=><article className="customer-review-card" key={r.id||i}><div className="customer-review-name">{r.customerName||"Kuwarji Customer"}</div><div className="customer-stars">{"★".repeat(Math.max(1,Math.min(5,Number(r.rating)||1)))}</div><p>{r.text||""}</p><span className="quote-mark">”</span></article>)}{!publicReviews.length&&<div className="customer-empty">Approved customer reviews will appear here.</div>}</div></section>
  </ConsumerLayout>;
}
