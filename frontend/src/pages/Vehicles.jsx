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

const SORT_OPTIONS = [
  { value: "recommended", label: "Recommended" },
  { value: "price_asc", label: "Price: Low to High" },
  { value: "price_desc", label: "Price: High to Low" },
  { value: "capacity", label: "Capacity" },
  { value: "rating", label: "Rating" },
];

export default function Vehicles({ embedded = false }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const [categories, setCategories] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [enquiryOpen, setEnquiryOpen] = useState(false);
  const { vehicles: cartVehicles, toggleVehicle, isSelected } = useEnquiryCart();

  const page = Number(searchParams.get("page") || 1);
  const limit = 12;

  useEffect(() => {
    apiFetch("/api/vehicles/categories").then(({ ok, data }) => {
      if (ok && data?.success) setCategories(data.categories);
    });
  }, []);

  const loadVehicles = useCallback(async () => {
    setLoading(true);
    setError("");
    const params = new URLSearchParams(searchParams);
    params.set("limit", limit);
    const { ok, data } = await apiFetch(`/api/vehicles?${params.toString()}`);
    if (ok && data?.success) {
      setVehicles(data.vehicles);
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
        <p className="eyebrow">Fleet catalogue</p>
        <h1 className="vehicles-title">Find a Vehicle</h1>
        <p className="vehicles-intro">Browse buses, cars, vans, tempo travellers and other vehicles. Booked vehicles stay visible in the catalogue; booking availability is checked for your trip dates.</p>

        <div className="vehicles-searchbar ticket">
          <span aria-hidden="true">⌕</span>
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

          <select
            value={searchParams.get("sort") || "recommended"}
            onChange={(e) => updateFilter("sort", e.target.value)}
          >
            {SORT_OPTIONS.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
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
                      {v.photos?.[0] ? (
                        <img src={v.photos[0]} alt={v.name} />
                      ) : (
                        <div className="vehicle-card-photo-fallback">{v.category?.name || "Vehicle"}</div>
                      )}
                    </div>
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
                        <span className="vehicle-card-price">
                          {v.startingPrice != null ? `From ₹${v.startingPrice}/day` : "Price on enquiry"}
                        </span>
                        <span className="vehicle-card-cta">View details →</span>
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
                      {isSelected(v.id) ? "✓ Added to Enquiry" : "Add to Enquiry"}
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
