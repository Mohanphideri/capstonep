import { Link } from "react-router-dom";
import "./LoginRequiredModal.css";

export default function LoginRequiredModal({ open, onClose }) {
  if (!open) return null;
  return (
    <div className="login-required-backdrop" role="presentation" onMouseDown={onClose}>
      <div className="login-required-modal" role="dialog" aria-modal="true" aria-labelledby="login-required-title" onMouseDown={(e) => e.stopPropagation()}>
        <button className="login-required-close" type="button" onClick={onClose} aria-label="Close">×</button>
        <div className="login-required-icon">⌁</div>
        <p className="eyebrow">Kuwarji Trip Maker</p>
        <h2 id="login-required-title">Your journey is waiting.</h2>
        <p>Please log in to access Trip Maker, build personalized journeys and save your trip plans.</p>
        <div className="login-required-actions">
          <Link to="/login" className="btn btn-primary" onClick={onClose}>Log in to continue →</Link>
          <button type="button" className="btn btn-outline" onClick={onClose}>Maybe later</button>
        </div>
      </div>
    </div>
  );
}
