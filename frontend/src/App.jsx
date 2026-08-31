import { Navigate, Routes, Route, useParams } from "react-router-dom";
import Home from "./pages/Home.jsx";
import Login from "./pages/Login.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import TripPlanner from "./pages/TripPlanner.jsx";
import Vehicles from "./pages/Vehicles.jsx";
import VehicleDetail from "./pages/VehicleDetail.jsx";
import MyBookings from "./pages/MyBookings.jsx";
import BookingDetail from "./pages/BookingDetail.jsx";
import MyEnquiries from "./pages/MyEnquiries.jsx";
import MyInvoices from "./pages/MyInvoices.jsx";
import MyReviews from "./pages/MyReviews.jsx";
import Profile from "./pages/Profile.jsx";
import Settings from "./pages/Settings.jsx";
import AdminLogin from "./pages/AdminLogin.jsx";
import AdminDashboard from "./pages/AdminDashboard.jsx";
import AdminVehicles from "./pages/admin/AdminVehicles.jsx";
import AdminVehicleForm from "./pages/admin/AdminVehicleForm.jsx";
import AdminCategories from "./pages/admin/AdminCategories.jsx";
import AdminAmenities from "./pages/admin/AdminAmenities.jsx";
import AdminEnquiries from "./pages/admin/AdminEnquiries.jsx";
import AdminEnquiryDetail from "./pages/admin/AdminEnquiryDetail.jsx";
import AdminBookings from "./pages/admin/AdminBookings.jsx";
import AdminBookingCreate from "./pages/admin/AdminBookingCreate.jsx";
import AdminBookingDetail from "./pages/admin/AdminBookingDetail.jsx";
import AdminInvoices from "./pages/admin/AdminInvoices.jsx";
import AdminInvoiceDetail from "./pages/admin/AdminInvoiceDetail.jsx";
import AdminReports from "./pages/admin/AdminReports.jsx";
import AdminBalanceSheet from "./pages/admin/AdminBalanceSheet.jsx";
import AdminSettings, { SETTINGS_SECTIONS } from "./pages/admin/AdminSettings.jsx";
import AdminReviews from "./pages/admin/AdminReviews.jsx";
import AdminCustomers from "./pages/admin/AdminCustomers.jsx";
import AdminCustomerDetail from "./pages/admin/AdminCustomerDetail.jsx";
import AdminAuditLogs from "./pages/admin/AdminAuditLogs.jsx";
import TourPackages from "./pages/TourPackages.jsx";
import TourPackageDetail from "./pages/TourPackageDetail.jsx";
import AdminTourPackages from "./pages/admin/AdminTourPackages.jsx";
import { WhyUs, FleetGallery, LegalPage, LocationPage, AboutPage, FAQPage } from "./pages/PublicContent.jsx";
import { PRIVACY_POLICY_TEXT, COOKIE_POLICY_TEXT, TERMS_TEXT, CANCELLATION_POLICY_TEXT, REFUND_POLICY_TEXT } from "./data/legalContent.js";
import {
  ProtectedRoute,
  PublicOnlyRoute,
  AdminRoute,
  AdminPublicOnlyRoute,
  SuperAdminRoute,
} from "./RouteGuards.jsx";

function AdminSettingsRouter() {
  const { section = "business" } = useParams();
  if (!SETTINGS_SECTIONS[section]) return <Navigate to="/admin/settings/business" replace />;
  return <AdminSettings section={section} />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/vehicles" element={<Vehicles />} />
      <Route path="/vehicles/:id" element={<VehicleDetail />} />
      <Route path="/tour-packages" element={<TourPackages />} />
      <Route path="/tour-packages/:id" element={<TourPackageDetail />} />
      <Route path="/about" element={<AboutPage />} />
      <Route path="/faq" element={<FAQPage />} />
      <Route path="/why-us" element={<WhyUs />} />
      <Route path="/fleet-gallery" element={<FleetGallery />} />
      <Route path="/location" element={<LocationPage />} />
      <Route path="/privacy-policy" element={<LegalPage type="privacyPolicyText" title="Privacy Policy" fallback={PRIVACY_POLICY_TEXT} />} />
      <Route path="/cookie-policy" element={<LegalPage type="cookiePolicyText" title="Cookie Policy" fallback={COOKIE_POLICY_TEXT} />} />
      <Route path="/terms" element={<LegalPage type="termsText" title="Terms & Conditions" fallback={TERMS_TEXT} />} />
      <Route path="/cancellation-policy" element={<LegalPage type="cancellationPolicyText" title="Cancellation Policy" fallback={CANCELLATION_POLICY_TEXT} />} />
      <Route path="/refund-policy" element={<LegalPage type="refundPolicyText" title="Refund Policy" fallback={REFUND_POLICY_TEXT} />} />
      <Route path="/login" element={<PublicOnlyRoute><Login /></PublicOnlyRoute>} />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard/trip-planner"
        element={
          <ProtectedRoute>
            <TripPlanner />
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard/vehicles"
        element={
          <ProtectedRoute>
            <Vehicles embedded />
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard/vehicles/:id"
        element={
          <ProtectedRoute>
            <VehicleDetail embedded />
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard/tour-packages"
        element={
          <ProtectedRoute>
            <TourPackages embedded />
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard/tour-packages/:id"
        element={
          <ProtectedRoute>
            <TourPackageDetail embedded />
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard/bookings"
        element={
          <ProtectedRoute>
            <MyBookings />
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard/bookings/:bookingId"
        element={
          <ProtectedRoute>
            <BookingDetail />
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard/enquiries"
        element={
          <ProtectedRoute>
            <MyEnquiries />
          </ProtectedRoute>
        }
      />
      <Route path="/dashboard/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
      <Route
        path="/dashboard/profile"
        element={
          <ProtectedRoute>
            <Profile />
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard/reviews"
        element={
          <ProtectedRoute>
            <MyReviews />
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard/invoices"
        element={
          <ProtectedRoute>
            <MyInvoices />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/login"
        element={
          <AdminPublicOnlyRoute>
            <AdminLogin />
          </AdminPublicOnlyRoute>
        }
      />
      <Route
        path="/admin"
        element={
          <AdminRoute>
            <AdminDashboard />
          </AdminRoute>
        }
      />
      <Route
        path="/admin/tour-packages"
        element={
          <SuperAdminRoute>
            <AdminTourPackages />
          </SuperAdminRoute>
        }
      />
      <Route
        path="/admin/vehicles"
        element={
          <SuperAdminRoute>
            <AdminVehicles />
          </SuperAdminRoute>
        }
      />
      <Route
        path="/admin/vehicles/new"
        element={
          <SuperAdminRoute>
            <AdminVehicleForm />
          </SuperAdminRoute>
        }
      />
      <Route
        path="/admin/vehicles/:id"
        element={
          <SuperAdminRoute>
            <AdminVehicleForm />
          </SuperAdminRoute>
        }
      />
      <Route
        path="/admin/categories"
        element={
          <SuperAdminRoute>
            <AdminCategories />
          </SuperAdminRoute>
        }
      />
      <Route
        path="/admin/amenities"
        element={
          <SuperAdminRoute>
            <AdminAmenities />
          </SuperAdminRoute>
        }
      />
      <Route
        path="/admin/enquiries"
        element={
          <SuperAdminRoute>
            <AdminEnquiries />
          </SuperAdminRoute>
        }
      />
      <Route
        path="/admin/enquiries/:id"
        element={
          <SuperAdminRoute>
            <AdminEnquiryDetail />
          </SuperAdminRoute>
        }
      />
      <Route
        path="/admin/bookings"
        element={
          <SuperAdminRoute>
            <AdminBookings />
          </SuperAdminRoute>
        }
      />
      <Route
        path="/admin/bookings/create"
        element={
          <SuperAdminRoute>
            <AdminBookingCreate />
          </SuperAdminRoute>
        }
      />
      <Route
        path="/admin/bookings/:id"
        element={
          <SuperAdminRoute>
            <AdminBookingDetail />
          </SuperAdminRoute>
        }
      />
      <Route
        path="/admin/invoices"
        element={
          <SuperAdminRoute>
            <AdminInvoices />
          </SuperAdminRoute>
        }
      />
      <Route
        path="/admin/invoices/:id"
        element={
          <SuperAdminRoute>
            <AdminInvoiceDetail />
          </SuperAdminRoute>
        }
      />
      <Route
        path="/admin/balance-sheet"
        element={
          <SuperAdminRoute>
            <AdminBalanceSheet />
          </SuperAdminRoute>
        }
      />
      <Route
        path="/admin/reports"
        element={
          <SuperAdminRoute>
            <AdminReports />
          </SuperAdminRoute>
        }
      />
      <Route path="/admin/settings" element={<Navigate to="/admin/settings/business" replace />} />
      <Route
        path="/admin/settings/:section"
        element={
          <SuperAdminRoute>
            <AdminSettingsRouter />
          </SuperAdminRoute>
        }
      />
      <Route
        path="/admin/reviews"
        element={
          <SuperAdminRoute>
            <AdminReviews />
          </SuperAdminRoute>
        }
      />
      <Route
        path="/admin/customers"
        element={
          <SuperAdminRoute>
            <AdminCustomers />
          </SuperAdminRoute>
        }
      />
      <Route
        path="/admin/customers/:id"
        element={
          <SuperAdminRoute>
            <AdminCustomerDetail />
          </SuperAdminRoute>
        }
      />
      <Route
        path="/admin/audit-logs"
        element={
          <SuperAdminRoute>
            <AdminAuditLogs />
          </SuperAdminRoute>
        }
      />
      <Route path="*" element={<Home />} />
    </Routes>
  );
}
