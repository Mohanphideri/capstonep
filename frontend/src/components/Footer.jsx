import { Link, useLocation } from "react-router-dom";
import { BrandLogo } from "./BrandLogo.jsx";
import "./Footer.css";

const DELHI_MAP =
  "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d14003.950800694367!2d77.24323940089654!3d28.66008694927767!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x390cfced1137d4a3%3A0x55da257d6f4f66f2!2sKuwarji%20Travels!5e0!3m2!1sen!2sus!4v1787394767733!5m2!1sen!2sus";

const GURUGRAM_MAP =
  "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3508.6421679641044!2d77.03881557388962!3d28.430052275775875!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x390d19937dfb9a7f%3A0x6d7974351c28ee76!2sKuwarji%20Mansion!5e0!3m2!1sen!2sus!4v1787394823744!5m2!1sen!2sus";

const WHATSAPP_NUMBER = import.meta.env.VITE_WHATSAPP_NUMBER || import.meta.env.VITE_BUSINESS_PHONE || "";

// Small, consistent line-style social + contact icons (SVG, currentColor)
// instead of mismatched text glyphs/emoji standing in for real icons.
function SocialGlyph({ name }) {
  const common = { width: 16, height: 16, viewBox: "0 0 24 24", fill: "none", "aria-hidden": "true" };
  const icons = {
    facebook: <path d="M14 9h3V5h-3c-2.2 0-4 1.8-4 4v2H7v4h3v7h4v-7h3l1-4h-4V9c0-.6.4-1 1-1Z" fill="currentColor" />,
    instagram: <><rect x="3.2" y="3.2" width="17.6" height="17.6" rx="5" stroke="currentColor" strokeWidth="1.7" /><circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="1.7" /><circle cx="17.2" cy="6.8" r="1.15" fill="currentColor" /></>,
    whatsapp: <path d="M12 3.5a8.5 8.5 0 0 0-7.3 12.8L3.5 20.5l4.3-1.13A8.5 8.5 0 1 0 12 3.5Zm4.86 12.02c-.2.58-1.17 1.11-1.62 1.15-.42.05-.86.22-2.9-.6-2.44-.99-4-3.4-4.13-3.56-.12-.16-.98-1.3-.98-2.48 0-1.18.62-1.75.84-1.99.2-.22.45-.28.6-.28h.44c.14 0 .34-.05.53.4.2.48.68 1.66.74 1.78.06.12.1.26.02.42-.08.16-.12.26-.24.4-.12.14-.26.31-.37.42-.12.12-.25.25-.11.5.15.24.65 1.06 1.4 1.72.96.84 1.77 1.1 2.02 1.22.24.12.39.1.53-.06.15-.16.63-.72.8-.97.16-.24.32-.2.53-.12.22.08 1.38.65 1.62.77.24.12.4.18.46.28.06.1.06.58-.14 1.14Z" fill="currentColor" />,
    youtube: <><rect x="2.6" y="6" width="18.8" height="12" rx="3.4" stroke="currentColor" strokeWidth="1.7" /><path d="m10.3 9.6 4.6 2.4-4.6 2.4V9.6Z" fill="currentColor" /></>,
  };
  return <svg {...common}>{icons[name]}</svg>;
}

function ContactGlyph({ name }) {
  const common = { width: 15, height: 15, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": "true" };
  const icons = {
    phone: <path d="M6.6 3.5h3l1.4 4.2-2.1 1.6a13 13 0 0 0 5.8 5.8l1.6-2.1 4.2 1.4v3a2 2 0 0 1-2.2 2c-4.1-.3-8-2.1-11-5.1s-4.8-6.9-5.1-11a2 2 0 0 1 2-2.2Z" />,
    mail: <><rect x="2.5" y="5" width="19" height="14" rx="2.4" /><path d="m3.3 6 8.7 6.6L20.7 6" /></>,
    pin: <><path d="M12 21.5s7-6.7 7-12A7 7 0 0 0 5 9.5c0 5.3 7 12 7 12Z" /><circle cx="12" cy="9.5" r="2.4" /></>,
  };
  return <svg {...common}>{icons[name]}</svg>;
}

const SOCIALS = [
  { label: "Facebook", href: "#", glyph: "facebook" },
  { label: "Instagram", href: "#", glyph: "instagram" },
  { label: "WhatsApp", href: WHATSAPP_NUMBER ? `https://wa.me/${WHATSAPP_NUMBER.replace(/\D/g, "")}` : "#", glyph: "whatsapp" },
  { label: "YouTube", href: "#", glyph: "youtube" },
];

export function Footer() {
  const { pathname } = useLocation();
  const isLandingPage = pathname === "/";
  return (
    <footer className="footer" id="contact">
      <div className="container">
        {/* TOP */}
        <div className="footer-top">
          <div className="footer-brand-col">
            <BrandLogo variant="full" className="footer-logo" />
            <p className="footer-tagline">
              Your trusted travel partner for comfortable, safe journeys — buses,
              cars and tempo travellers for every trip across India.
            </p>
            <div className="footer-socials">
              {SOCIALS.map((social) => (
                <a
                  key={social.label}
                  href={social.href}
                  aria-label={social.label}
                  className="footer-social-icon"
                  target={social.href.startsWith("http") ? "_blank" : undefined}
                  rel={social.href.startsWith("http") ? "noreferrer" : undefined}
                >
                  <SocialGlyph name={social.glyph} />
                </a>
              ))}
            </div>
          </div>

          <div className="footer-column">
            <h3 className="footer-heading">Quick Links</h3>
            <ul className="footer-list">
              <li><Link to="/" className="footer-link">Home</Link></li>
              <li><Link to="/about" className="footer-link">About Us</Link></li>
              <li><Link to="/vehicles" className="footer-link">Vehicles</Link></li>
              <li><Link to="/fleet-gallery" className="footer-link">Fleet Gallery</Link></li>
              <li><Link to="/tour-packages" className="footer-link">Tour Packages</Link></li>
              <li><Link to="/why-us" className="footer-link">Why Us</Link></li>
              <li><Link to="/faq" className="footer-link">FAQ</Link></li>
            </ul>
          </div>

          <div className="footer-column footer-contact-col">
            <h3 className="footer-heading">Contact Us</h3>
            <ul className="footer-list footer-contact-list">
              <li>
                <span className="footer-contact-icon" aria-hidden="true"><ContactGlyph name="phone" /></span>
                <a href="tel:+919910053155" className="footer-link">+91 99100 53155</a>
              </li>
              <li>
                <span className="footer-contact-icon" aria-hidden="true"><ContactGlyph name="mail" /></span>
                <a href="mailto:Kuwarjitravellers@gmail.com" className="footer-link">Kuwarjitravellers@gmail.com</a>
              </li>
              <li>
                <span className="footer-contact-icon" aria-hidden="true"><ContactGlyph name="pin" /></span>
                <span className="footer-link footer-static">
                  Available 24x7 for enquiries &amp; support
                </span>
              </li>
            </ul>
          </div>
        </div>

        {/* OFFICE LOCATIONS — shown only on the landing page footer, per
            request; inner pages keep their footer focused on links and
            contact info instead. */}
        {isLandingPage && (
        <section className="footer-offices">
          <div className="footer-office">
            <div className="footer-office-header">
              <h3 className="footer-office-title">Delhi Office</h3>
              <p className="footer-office-subtitle">Kuwarji Travels</p>
            </div>
            <div className="footer-map-wrap">
              <iframe
                src={DELHI_MAP}
                title="Kuwarji Travels Delhi Office"
                loading="lazy"
                allowFullScreen
                referrerPolicy="strict-origin-when-cross-origin"
              />
            </div>
          </div>

          <div className="footer-office">
            <div className="footer-office-header">
              <h3 className="footer-office-title">Gurugram Office</h3>
              <p className="footer-office-subtitle">Kuwarji Mansion</p>
            </div>
            <div className="footer-map-wrap">
              <iframe
                src={GURUGRAM_MAP}
                title="Kuwarji Mansion Gurugram Office"
                loading="lazy"
                allowFullScreen
                referrerPolicy="strict-origin-when-cross-origin"
              />
            </div>
          </div>
        </section>
        )}

        {/* BOTTOM */}
        <div className="footer-bottom">
          <span>© {new Date().getFullYear()} Kuwarji Travels. All Rights Reserved.</span>
          <div className="footer-legal-links">
            <Link to="/privacy-policy" className="footer-link">Privacy Policy</Link>
            <span className="footer-divider">|</span>
            <Link to="/cookie-policy" className="footer-link">Cookie Policy</Link>
            <span className="footer-divider">|</span>
            <Link to="/terms" className="footer-link">Terms &amp; Conditions</Link>
            <span className="footer-divider">|</span>
            <Link to="/refund-policy" className="footer-link">Refund Policy</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
