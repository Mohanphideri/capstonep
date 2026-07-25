import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./contexts/AuthContext.jsx";
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import PortalShell from "./components/PortalShell";
import Section from "./pages/Section";
import ProtectedRoute from "./components/ProtectedRoute";
import PasswordReset from "./pages/PasswordReset";
import { portals } from "./data/portals";

export default function App() {
  const { isAuthenticated, user } = useAuth();

  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route path="/password-reset" element={<ProtectedRoute><PasswordReset /></ProtectedRoute>} />

      {Object.entries(portals).map(([key, config]) => {
        return (
          <Route
            key={key}
            path={`/${key}/*`}
            element={
              <ProtectedRoute requiredRole={[config.role]}>
                <PortalShell config={config} />
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to={config.sections[0].path} replace />} />
            <Route path=":section" element={<Section />} />
          </Route>
        );
      })}

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
