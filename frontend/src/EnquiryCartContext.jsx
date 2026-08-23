import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

const STORAGE_KEY = "kt_enquiry_cart";
const EnquiryCartContext = createContext(null);

function loadInitial() {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/**
 * Cross-page "N Vehicles Selected" enquiry cart (spec §7). This is not a
 * shopping cart in the booking/payment sense — it never creates a
 * reservation or a price. It just lets a customer pick several vehicles
 * across the listing page (and a vehicle detail page) and submit them
 * together in one enquiry form.
 */
export function EnquiryCartProvider({ children }) {
  const [vehicles, setVehicles] = useState(loadInitial);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(vehicles));
    } catch {
      // Storage can fail in private browsing — the cart just won't
      // persist across a reload, which is a harmless degradation.
    }
  }, [vehicles]);

  const addVehicle = useCallback((vehicle) => {
    setVehicles((prev) => (prev.some((v) => v.id === vehicle.id) ? prev : [...prev, vehicle]));
  }, []);

  const removeVehicle = useCallback((id) => {
    setVehicles((prev) => prev.filter((v) => v.id !== id));
  }, []);

  const toggleVehicle = useCallback((vehicle) => {
    setVehicles((prev) =>
      prev.some((v) => v.id === vehicle.id)
        ? prev.filter((v) => v.id !== vehicle.id)
        : [...prev, vehicle]
    );
  }, []);

  const clear = useCallback(() => setVehicles([]), []);

  const isSelected = useCallback((id) => vehicles.some((v) => v.id === id), [vehicles]);

  const value = useMemo(
    () => ({ vehicles, addVehicle, removeVehicle, toggleVehicle, clear, isSelected, count: vehicles.length }),
    [vehicles, addVehicle, removeVehicle, toggleVehicle, clear, isSelected]
  );

  return <EnquiryCartContext.Provider value={value}>{children}</EnquiryCartContext.Provider>;
}

export function useEnquiryCart() {
  const ctx = useContext(EnquiryCartContext);
  if (!ctx) throw new Error("useEnquiryCart must be used within EnquiryCartProvider");
  return ctx;
}
