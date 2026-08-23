import React from "react";
import { BrandLogo } from "./BrandLogo.jsx";
import { Link } from "react-router-dom";
import "./Footer.css";

const DELHI_MAP =
  "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d14003.950800694367!2d77.24323940089654!3d28.66008694927767!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x390cfced1137d4a3%3A0x55da257d6f4f66f2!2sKuwarji%20Travels!5e0!3m2!1sen!2sus!4v1787394767733!5m2!1sen!2sus";

const GURUGRAM_MAP =
  "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3508.6421679641044!2d77.03881557388962!3d28.430052275775875!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x390d19937dfb9a7f%3A0x6d7974351c28ee76!2sKuwarji%20Mansion!5e0!3m2!1sen!2sus!4v1787394823744!5m2!1sen!2sus";

export function Footer() {
  return (
    <footer className="footer" id="contact">
      <div className="container">

        {/* =====================================================
            FOOTER TOP
        ===================================================== */}
        <div className="footer-top">

          {/* BRAND */}
          <div className="footer-brand-col">
            <div className="footer-brand">
              <BrandLogo variant="full" showTagline className="footer-logo" />
              <h2>Kuwarji Travels</h2>

              <p className="footer-tagline">
                Route booking, made simple.
              </p>
            </div>

            <div className="footer-socials">
              <a href="#contact" className="footer-social">
                Contact
              </a>

              <a href="#about" className="footer-social">
                About
              </a>
            </div>
          </div>

          {/* CONTACT */}
          <div className="footer-column">
            <h3 className="footer-heading">
              Contact
            </h3>

            <ul className="footer-list">
              <li>
                <span>Get in touch with our team.</span>
              </li>

              <li>
                <a
                  href="mailto:Kuwarjitravellers@gmail.com"
                  className="footer-link"
                >
                 Mail to : Kuwarjitravellers@gmail.com
                </a>
              </li>
            </ul>
          </div>

          {/* QUICK LINKS */}
          <div className="footer-column">
            <h3 className="footer-heading">
              Quick Links
            </h3>

            <ul className="footer-list">
              <li>
                <a href="/" className="footer-link">
                  Home
                </a>
              </li>

              <li>
                <a href="#vehicles" className="footer-link">
                  Vehicles
                </a>
              </li>

              <li>
                <a href="#services" className="footer-link">
                  Services
                </a>
              </li>

              <li>
                <a href="#contact" className="footer-link">
                  Contact
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* =====================================================
            OFFICE LOCATIONS
        ===================================================== */}
        <section className="footer-offices">

          {/* DELHI */}
          <div className="footer-office">

            <div className="footer-office-header">
              <h3 className="footer-office-title">
                Delhi Office
              </h3>

              <p className="footer-office-subtitle">
                Kuwarji Travels
              </p>
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

          {/* GURUGRAM */}
          <div className="footer-office">

            <div className="footer-office-header">
              <h3 className="footer-office-title">
                Gurugram Office
              </h3>

              <p className="footer-office-subtitle">
                Kuwarji Mansion
              </p>
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

        {/* =====================================================
            LEGAL
        ===================================================== */}
        <div className="footer-legal">

          <div className="footer-legal-links">
            <Link to="/privacy-policy" className="footer-link">
              Privacy Policy
            </Link>

            <Link to="/terms" className="footer-link">
              Terms & Conditions
            </Link>
          </div>

        </div>

        {/* =====================================================
            BOTTOM
        ===================================================== */}
        <div className="footer-bottom">

          <span>
            © {new Date().getFullYear()} Kuwarji Travels. All rights reserved.
          </span>

          <span className="footer-mono">
            Route booking, made simple.
          </span>

        </div>

      </div>
    </footer>
  );
}