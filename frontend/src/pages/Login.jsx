import { Link, useSearchParams } from "react-router-dom";
import { OtpLogin } from "../components/OtpLogin.jsx";
import { RouteLine } from "../components/RouteLine.jsx";
import "./Login.css";
import { BrandLogo } from "../components/BrandLogo.jsx";

export default function Login() {
  const [searchParams] = useSearchParams();
  const rawNext = searchParams.get("next");
  const nextPath = rawNext && rawNext.startsWith("/") ? rawNext : "/dashboard";

  return (
    <div className="page login-page">
      <header className="container login-header">
        <BrandLogo className="login-brand" />
      </header>

      <main className="container login-main">
        <div className="login-grid">
          <div className="login-intro">
            <p className="eyebrow">Welcome back</p>
            <h2 className="login-intro-title">Log in to search, book and manage your trips.</h2>
            <p className="login-intro-body">
              No password needed — just verify your mobile number with a one-time code.
            </p>
            <RouteLine className="login-route-line" />
          </div>

          <div className="login-form-wrap">
            <OtpLogin nextPath={nextPath} />
          </div>
        </div>
      </main>
    </div>
  );
}
