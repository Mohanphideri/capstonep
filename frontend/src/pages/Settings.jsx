import { Link } from "react-router-dom";
import ConsumerLayout, { ConsumerIcon as Icon } from "../components/ConsumerLayout.jsx";
import "./Settings.css";

const SETTINGS_ITEMS = [
  { icon: "user", title: "Profile details", body: "Update your name, email address and see the mobile number linked to your account.", to: "/dashboard/profile", cta: "Open Profile" },
  { icon: "message", title: "Enquiries & bookings", body: "Every enquiry and booking you make is tied to your verified mobile number automatically.", to: "/dashboard/bookings", cta: "View My Bookings" },
  { icon: "help", title: "Support", body: "Reach the Kuwarji Travels team any time from the Support link in the sidebar.", to: null, cta: null },
];

export default function Settings() {
  return (
    <ConsumerLayout title="Settings" lead="Manage your customer account preferences.">
      <div className="settings-grid">
        {SETTINGS_ITEMS.map((item) => (
          <section className="ticket settings-card" key={item.title}>
            <span className="settings-card-icon"><Icon name={item.icon} size={19} /></span>
            <h2>{item.title}</h2>
            <p>{item.body}</p>
            {item.to && (
              <Link className="btn btn-outline btn-sm" to={item.to}>
                {item.cta}
              </Link>
            )}
          </section>
        ))}
      </div>
      <section className="ticket settings-security-note">
        <span className="settings-card-icon"><Icon name="settings" size={19} /></span>
        <div>
          <h2>Account security</h2>
          <p>Kuwarji Travels uses mobile OTP sign-in only — there is no separate password to manage or reset.</p>
        </div>
      </section>
    </ConsumerLayout>
  );
}
