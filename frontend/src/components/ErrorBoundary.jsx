import { Component } from "react";

// Catches render errors anywhere below it in the tree so a single broken
// component (e.g. a third-party chat widget) can't blank the whole site.
// Logs to the console always; wire up a reporting service in production
// by extending componentDidCatch below.
export class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    console.error("[ErrorBoundary] Unhandled render error:", error, info);
  }

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div
          role="alert"
          style={{
            minHeight: "60vh",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: "12px",
            padding: "24px",
            textAlign: "center",
            fontFamily: "sans-serif",
          }}
        >
          <h1 style={{ fontSize: "20px", margin: 0 }}>Something went wrong.</h1>
          <p style={{ margin: 0, color: "#666" }}>
            Please refresh the page. If the problem continues, contact Kuwarji Travels support.
          </p>
          <button
            type="button"
            onClick={this.handleReload}
            style={{
              marginTop: "8px",
              padding: "10px 20px",
              border: "none",
              borderRadius: "8px",
              background: "#111",
              color: "#fff",
              cursor: "pointer",
            }}
          >
            Reload Page
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
