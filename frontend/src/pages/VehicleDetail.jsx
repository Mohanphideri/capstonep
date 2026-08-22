import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Navbar } from "../components/Navbar.jsx";
import { Footer } from "../components/Footer.jsx";
import { WhatsAppButton } from "../components/WhatsAppButton.jsx";
import { VehicleEnquiryDrawer } from "../components/VehicleEnquiryDrawer.jsx";
import { EnquiryCartBar } from "../components/EnquiryCartBar.jsx";
import ConsumerLayout from "../components/ConsumerLayout.jsx";
import { useEnquiryCart } from "../EnquiryCartContext.jsx";
import { apiFetch } from "../api.js";
import "./VehicleDetail.css";

const WHATSAPP_NUMBER = import.meta.env.VITE_WHATSAPP_NUMBER || "";
const BUSINESS_MESSAGE = "Hi, I'm contacting Kuwarji Travels. I need help with a vehicle rental.";

export default function VehicleDetail({ embedded = false }) {
  const { id } = useParams();
  const [vehicle, setVehicle] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [enquiryOpen, setEnquiryOpen] = useState(false);
  const [cartDrawerOpen, setCartDrawerOpen] = useState(false);
  const { vehicles: cartVehicles, toggleVehicle, isSelected } = useEnquiryCart();

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    apiFetch(`/api/vehicles/${id}`).then(({ ok, data }) => {
      if (cancelled) return;
      if (ok && data?.success) {
        setVehicle(data.vehicle);
      } else {
        setError(data?.error || "Vehicle not found.");
      }
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [id]);

  const content = (
      <main className={embedded ? "vehicle-detail-page vehicle-detail-portal-page" : "container vehicle-detail-page"}>
        {loading && <p className="vehicles-state">Loading…</p>}
        {!loading && error && (
          <div className="vehicles-state vehicles-state-error">
            {error} —{" "}
            <Link to={embedded ? "/dashboard/vehicles" : "/vehicles"} className="vehicle-detail-back-link">
              back to vehicles
            </Link>
          </div>
        )}

        {!loading && vehicle && (
          <div className="vehicle-detail-layout">
            <div className="vehicle-detail-main">
              <p className="eyebrow">{vehicle.category?.name}</p>
              <h1 className="vehicle-detail-title">{vehicle.name}</h1>

              <div className="vehicle-detail-gallery">
                {vehicle.photos?.length > 0 ? (
                  vehicle.photos.map((url) => <img key={url} src={url} alt={vehicle.name} />)
                ) : (
                  <div className="vehicle-detail-gallery-fallback">No photos yet</div>
                )}
              </div>

              <div className="vehicle-detail-specs ticket">
                <div>
                  <p className="eyebrow-muted">Capacity</p>
                  <p>{vehicle.capacity} seats</p>
                </div>
                <div>
                  <p className="eyebrow-muted">AC</p>
                  <p>{vehicle.acType === "AC" ? "AC" : "Non-AC"}</p>
                </div>
                <div>
                  <p className="eyebrow-muted">Seating</p>
                  <p>{vehicle.seatType.replace("_", "-").toLowerCase()}</p>
                </div>
                <div>
                  <p className="eyebrow-muted">Rating</p>
                  <p>{vehicle.ratingCount > 0 ? `${vehicle.ratingAvg.toFixed(1)} ★ (${vehicle.ratingCount})` : "No reviews yet"}</p>
                </div>
              </div>

              {vehicle.amenities?.length > 0 && (
                <div className="vehicle-detail-amenities">
                  <h2 className="vehicle-detail-section-title">Amenities</h2>
                  <ul>
                    {vehicle.amenities.map((a) => (
                      <li key={a}>{a}</li>
                    ))}
                  </ul>
                </div>
              )}

              {vehicle.description && (
                <div className="vehicle-detail-description">
                  <h2 className="vehicle-detail-section-title">About this vehicle</h2>
                  <p>{vehicle.description}</p>
                </div>
              )}

              {vehicle.rentalInfo && (
                <div className="vehicle-detail-policy">
                  <h2 className="vehicle-detail-section-title">Rental information</h2>
                  <p>{vehicle.rentalInfo}</p>
                </div>
              )}
            </div>

            <aside className="vehicle-detail-sidebar">
              <div className="ticket vehicle-detail-enquire-card">
                <p className="eyebrow-muted">Interested in this vehicle?</p>
                <p className="vehicle-detail-enquire-copy">
                  Share your trip details and our team will get back to you with availability and a quote.
                </p>
                <button
                  type="button"
                  className="btn btn-primary btn-block"
                  onClick={() => setEnquiryOpen(true)}
                >
                  Enquire Now
                </button>
                <button
                  type="button"
                  className={`btn btn-block ${isSelected(vehicle.id) ? "btn-primary" : "btn-outline"}`}
                  style={{ marginTop: "0.5rem" }}
                  onClick={() =>
                    toggleVehicle({
                      id: vehicle.id,
                      name: vehicle.name,
                      category: vehicle.category?.name,
                      capacity: vehicle.capacity,
                      acType: vehicle.acType,
                      seatType: vehicle.seatType,
                    })
                  }
                >
                  {isSelected(vehicle.id) ? "✓ Added to Enquiry" : "Add to Enquiry"}
                </button>
              </div>
              {WHATSAPP_NUMBER && (
                <a
                  className="btn btn-outline btn-block vehicle-detail-whatsapp"
                  href={`https://wa.me/${WHATSAPP_NUMBER.replace(/\D/g, "")}?text=${encodeURIComponent(BUSINESS_MESSAGE)}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  WhatsApp about this vehicle
                </a>
              )}
            </aside>
          </div>
        )}
      </main>
  );

  return embedded ? (
    <ConsumerLayout title={vehicle?.name || "Vehicle details"} lead="Review vehicle specifications and send an enquiry without leaving the portal.">
      {content}
      <WhatsAppButton number={WHATSAPP_NUMBER} message={BUSINESS_MESSAGE} />
      {vehicle && <VehicleEnquiryDrawer vehicle={vehicle} open={enquiryOpen} onClose={() => setEnquiryOpen(false)} />}
      <EnquiryCartBar onEnquire={() => setCartDrawerOpen(true)} />
      <VehicleEnquiryDrawer vehicles={cartVehicles} open={cartDrawerOpen} onClose={() => setCartDrawerOpen(false)} />
    </ConsumerLayout>
  ) : (
    <div className="page">
      <Navbar />
      {content}
      <Footer />
      <WhatsAppButton number={WHATSAPP_NUMBER} message={BUSINESS_MESSAGE} />
      {vehicle && <VehicleEnquiryDrawer vehicle={vehicle} open={enquiryOpen} onClose={() => setEnquiryOpen(false)} />}
      <EnquiryCartBar onEnquire={() => setCartDrawerOpen(true)} />
      <VehicleEnquiryDrawer vehicles={cartVehicles} open={cartDrawerOpen} onClose={() => setCartDrawerOpen(false)} />
    </div>
  );
}
