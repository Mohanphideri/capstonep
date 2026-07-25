import { Navigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext.jsx";

export default function ProtectedRoute({ children, requiredRole }) {
  const { isAuthenticated, user, loading, initializing } = useAuth();

  // While we're re-validating a persisted token against the backend (page
  // refresh / app startup), don't make any redirect decision yet - that's
  // what previously caused a refresh to bounce straight to /login before the
  // session had a chance to be restored.
  if (initializing) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 h-screen text-slate-soft">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-crimson border-t-transparent" />
        <div className="text-sm font-medium">Restoring session...</div>
      </div>
    );
  }

  if (loading) {
    return <div className="flex items-center justify-center h-screen">Loading...</div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (requiredRole) {
    const allowedRoles = Array.isArray(requiredRole) ? requiredRole : [requiredRole];
    if (!allowedRoles.includes(user?.role)) {
      return (
        <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center">
          <div className="rounded-2xl border border-red-200 bg-red-50 px-8 py-10 max-w-md">
            <h2 className="text-lg font-semibold text-red-700">Access Denied</h2>
            <p className="mt-2 text-sm text-red-600">
              Your account doesn't have permission to view this page.
            </p>
            <a
              href={user?.role ? `/${user.role}` : "/"}
              className="mt-6 inline-block rounded-full bg-crimson px-5 py-2 text-sm font-semibold text-white hover:bg-crimson-dark transition-colors"
            >
              Go to my portal
            </a>
          </div>
        </div>
      );
    }
  }

  return children;
}
