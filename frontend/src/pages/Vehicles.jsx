import Icon from "../components/Icon.jsx";
import { useEffect, useState, useCallback } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Navbar } from "../components/Navbar.jsx";
import { Footer } from "../components/Footer.jsx";
import ConsumerLayout from "../components/ConsumerLayout.jsx";
import { EnquiryCartBar } from "../components/EnquiryCartBar.jsx";
import { VehicleEnquiryDrawer } from "../components/VehicleEnquiryDrawer.jsx";
import { useEnquiryCart } from "../EnquiryCartContext.jsx";
import { apiFetch } from "../api.js";
import "./Vehicles.css";

export default function Vehicles({ embedded = false }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const [categories, setCategories] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [enquiryOpen, setEnquiryOpen] = useState(false);
  const [lightbox, setLightbox] = useState(null);
  const { vehicles: cartVehicles, toggleVehicle, isSelected } = useEnquiryCart();

  const page = Number(searchParams.get("page") || 1);
  const limit = 12;

  useEffect(() => {
    apiFetch("/api/vehicles/categories").then(({ ok, data }) => {
      if (ok && data?.success) setCategories(Array.from(new Map((data.categories || []).map((item) => [item.id || item.slug, item])).values()));
    });
  }, []);

  const loadVehicles = useCallback(async () => {
    setLoading(true);
    setError("");
    const params = new URLSearchParams(searchParams);
    params.set("limit", limit);
    const { ok, data } = await apiFetch(`/api/vehicles?${params.toString()}`);
    if (ok && data?.success) {
      setVehicles(Array.from(new Map((data.vehicles || []).map((item) => [item.id, item])).values()));
      setTotal(data.total);
    } else {
      setError(data?.error || "Failed to load vehicles.");
    }
    setLoading(false);
  }, [searchParams]);

  useEffect(() => {
    loadVehicles();
  }, [loadVehicles]);

  function updateFilter(key, value) {
    const next = new URLSearchParams(searchParams);
    if (value) next.set(key, value);
    else next.delete(key);
    if (key !== "page") next.delete("page");
    setSearchParams(next);
  }

  const totalPages = Math.max(1, Math.ceil(total / limit));

  const content = (
    <>
    <main className={embedded ? "vehicles-dashboard-content" : "container vehicles-page"}>
        {!embedded && (
          <>
            <p className="eyebrow">Fleet catalogue</p>
            <h1 className="vehicles-title">Find a Vehicle</h1>
            <p className="vehicles-intro">Browse buses, cars, vans, tempo travellers and other vehicles. Booked vehicles stay visible in the catalogue; booking availability is checked for your trip dates.</p>
          </>
        )}

        <div className="vehicles-searchbar ticket">
          <Icon name="search" size={17}/>
          <input
            type="search"
            value={searchParams.get("search") || ""}
            onChange={(e) => updateFilter("search", e.target.value)}
            placeholder="Search buses, cars, vans, tempo travellers…"
            aria-label="Search vehicles"
          />
        </div>

        <div className="vehicles-filters ticket">
          <select
            value={searchParams.get("category") || ""}
            onChange={(e) => updateFilter("category", e.target.value)}
          >
            <option value="">All categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.slug}>
                {c.name}
              </option>
            ))}
          </select>

          <select
            value={searchParams.get("acType") || ""}
            onChange={(e) => updateFilter("acType", e.target.value)}
          >
            <option value="">AC / Non-AC</option>
            <option value="AC">AC</option>
            <option value="NON_AC">Non-AC</option>
          </select>

          <select
            value={searchParams.get("seatType") || ""}
            onChange={(e) => updateFilter("seatType", e.target.value)}
          >
            <option value="">Seater / Sleeper</option>
            <option value="SEATER">Seater</option>
            <option value="SEMI_SLEEPER">Semi-Sleeper</option>
            <option value="SLEEPER">Sleeper</option>
          </select>

        </div>

        {loading && <p className="vehicles-state">Loading vehicles…</p>}
        {!loading && error && <p className="vehicles-state vehicles-state-error">{error}</p>}
        {!loading && !error && vehicles.length === 0 && (
          <p className="vehicles-state">No vehicles match your search. Try another vehicle name, type, or filter.</p>
        )}

        {!loading && !error && vehicles.length > 0 && (
          <>
            <div className="vehicles-grid">
              {vehicles.map((v) => (
                <div key={v.id} className="ticket vehicle-card">
                  <Link to={embedded ? `/dashboard/vehicles/${v.id}` : `/vehicles/${v.id}`} className="vehicle-card-link">
                    <div className="vehicle-card-photo">
                      {v.photos?.[0] ? <img src={v.photos[0]} alt={v.name} onError={(e) => { e.currentTarget.style.display = "none"; e.currentTarget.nextElementSibling?.removeAttribute("hidden"); }} /> : null}
                      <div className="vehicle-card-photo-fallback" hidden={Boolean(v.photos?.[0])}>{v.category?.name || "Vehicle"}</div>
                    </div>
                    {Array.isArray(v.photos) && v.photos.length > 1 && <div className="vehicle-photo-strip" onClick={e=>e.preventDefault()}>{v.photos.map((photo,i)=><button type="button" key={photo+i} onClick={e=>{e.preventDefault();e.stopPropagation();setLightbox({photos:v.photos,index:i,name:v.name})}}><img src={photo} alt={`${v.name} photo ${i+1}`}/></button>)}</div>}
                    <div className="vehicle-card-body">
                      <p className="eyebrow-muted">{v.category?.name}</p>
                      <h3 className="vehicle-card-name">{v.name}</h3>
                      <p className="vehicle-card-meta">
                        {v.capacity} seats · {v.acType === "AC" ? "AC" : "Non-AC"} ·{" "}
                        {v.seatType.replace("_", "-").toLowerCase()}
                      </p>
                      {v.amenities?.length > 0 && (
                        <p className="vehicle-card-amenities">{v.amenities.slice(0, 3).join(" · ")}</p>
                      )}
                      <div className="vehicle-card-footer">
                        <span className="vehicle-card-price">Enquire for pricing</span>
                        <span className="vehicle-card-cta">View details <Icon name="arrowRight" size={14}/></span>
                      </div>
                    </div>
                  </Link>
                  <div className="vehicle-card-enquiry-actions">
                    <button
                      type="button"
                      className={`btn btn-sm ${isSelected(v.id) ? "btn-primary" : "btn-outline"}`}
                      onClick={() =>
                        toggleVehicle({
                          id: v.id,
                          name: v.name,
                          category: v.category?.name,
                          capacity: v.capacity,
                          acType: v.acType,
                          seatType: v.seatType,
                        })
                      }
                    >
                      {isSelected(v.id) ? "Added to Enquiry" : "Add to Enquiry"}
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {totalPages > 1 && (
              <div className="vehicles-pagination">
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() => updateFilter("page", String(page - 1))}
                  className="btn btn-outline"
                >
                  Previous
                </button>
                <span>
                  Page {page} of {totalPages}
                </span>
                <button
                  type="button"
                  disabled={page >= totalPages}
                  onClick={() => updateFilter("page", String(page + 1))}
                  className="btn btn-outline"
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </main>
      {lightbox&&<div className="vehicle-lightbox" onClick={()=>setLightbox(null)}><div className="vehicle-lightbox-inner" onClick={e=>e.stopPropagation()}><button type="button" className="vehicle-lightbox-close" onClick={()=>setLightbox(null)}><Icon name="close" size={20}/></button><img src={lightbox.photos[lightbox.index]} alt={`${lightbox.name} selected`} /><div className="vehicle-lightbox-controls"><button type="button" onClick={()=>setLightbox(x=>({...x,index:(x.index-1+x.photos.length)%x.photos.length}))}><Icon name="arrowLeft" size={18}/></button><span>{lightbox.index+1} / {lightbox.photos.length}</span><button type="button" onClick={()=>setLightbox(x=>({...x,index:(x.index+1)%x.photos.length}))}><Icon name="arrowRight" size={18}/></button></div></div></div>}
      <EnquiryCartBar onEnquire={() => setEnquiryOpen(true)} />
      <VehicleEnquiryDrawer vehicles={cartVehicles} open={enquiryOpen} onClose={() => setEnquiryOpen(false)} />
    </>
  );

  return embedded ? (
    <ConsumerLayout title="Find a Vehicle" lead="Search and compare vehicles without leaving your customer portal.">
      {content}
    </ConsumerLayout>
  ) : (
    <div className="page">
      <Navbar />
      {content}
      <Footer />
    </div>
  );
}
