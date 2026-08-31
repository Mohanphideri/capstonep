import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "./AuthContext";

// Mirrors the backend's own admin authorization exactly (see
// backend/src/middleware/requireAuth.js and models/User.js): only
// super_admin is a real, authorized admin role. "staff" and "admin"
// remain valid enum values purely so old seeded documents don't fail
// schema validation — nothing in the app creates or authorizes them
// going forward, and every admin API call from such an account would
// be rejected with 403 regardless of what the frontend shows. Letting
// them into the /admin shell here would just produce a broken-looking
// dashboard full of failed requests instead of a clean redirect.
const ADMIN_ROLES = ["super_admin"];

// Mirrors the original Next.js middleware: /dashboard requires a session,
// /login redirects away if you already have one.

export function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return null;

  if (!user) {
    const next = encodeURIComponent(location.pathname);
    return <Navigate to={`/login?next=${next}`} replace />;
  }

  return children;
}

export function PublicOnlyRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) return null;

  if (user) {
    return <Navigate to="/dashboard/trip-planner" replace />;
  }

  return children;
}

// /admin requires a staff/admin/super_admin session — a logged-in
// customer is redirected to the admin login, not given access.
export function AdminRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) return null;

  if (!user || !ADMIN_ROLES.includes(user.role)) {
    return <Navigate to="/admin/login" replace />;
  }

  return children;
}

// /admin/login redirects straight to the dashboard if an admin session
// already exists.
export function AdminPublicOnlyRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) return null;

  if (user && ADMIN_ROLES.includes(user.role)) {
    return <Navigate to="/admin" replace />;
  }

  return children;
}

// Fleet management, categories, amenities, and enquiry administration
// (Phase 2) are SUPER_ADMIN-only — there is exactly one administrative
// role for these pages, unlike the broader /admin (staff/admin/super_admin
// dashboard). A logged-in staff/admin user isn't redirected away (they do
// have a valid admin session) — they see an in-page "Unauthorized" state
// instead, since the backend would reject the underlying API calls with
// 403 regardless of what the frontend shows.
export function SuperAdminRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) return null;

  if (!user || !ADMIN_ROLES.includes(user.role)) {
    return <Navigate to="/admin/login" replace />;
  }

  if (user.role !== "super_admin") {
    return (
      <div className="container admin-unauthorized">
        <p className="eyebrow">Access restricted</p>
        <h1>Super admin access required</h1>
        <p>This section is only available to super admin accounts. Contact your administrator if you need access.</p>
      </div>
    );
  }

  return children;
}
