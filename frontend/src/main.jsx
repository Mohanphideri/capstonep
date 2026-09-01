import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App.jsx";
import { AuthProvider } from "./AuthContext.jsx";
import { EnquiryCartProvider } from "./EnquiryCartContext.jsx";
import "./styles/index.css";
import GlobalLoadingBus from "./components/GlobalLoadingBus.jsx";
import { ErrorBoundary } from "./components/ErrorBoundary.jsx";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <ErrorBoundary>
      <BrowserRouter>
        <AuthProvider>
          <EnquiryCartProvider>
            <App />
            <GlobalLoadingBus />
          </EnquiryCartProvider>
        </AuthProvider>
      </BrowserRouter>
    </ErrorBoundary>
  </React.StrictMode>
);
