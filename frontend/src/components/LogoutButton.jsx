import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { useAuth } from "../AuthContext.jsx";

export function LogoutButton() {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [loading, setLoading] = useState(false);

  async function handleLogout() {
    setLoading(true);
    await logout();
    navigate("/");
  }

  return (
    <button onClick={handleLogout} disabled={loading} className="btn btn-outline">
      {loading ? "Logging out…" : "Logout"}
    </button>
  );
}
