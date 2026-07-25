import { Component } from "react";

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    // Keep a trace in the console for debugging; a real deployment would
    // ship this to a logging/monitoring service instead.
    console.error("ErrorBoundary caught:", error, info);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    if (this.props.onReset) this.props.onReset();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 px-6 text-center">
          <div className="rounded-2xl border border-red-200 bg-red-50 px-8 py-10 max-w-md">
            <h2 className="text-lg font-semibold text-red-700">Something went wrong</h2>
            <p className="mt-2 text-sm text-red-600">
              {this.state.error?.message || "This section hit an unexpected error while loading."}
            </p>
            <div className="mt-6 flex justify-center gap-3">
              <button
                onClick={this.handleReset}
                className="rounded-full bg-crimson px-5 py-2 text-sm font-semibold text-white hover:bg-crimson-dark transition-colors"
              >
                Try again
              </button>
              <button
                onClick={() => (window.location.href = "/")}
                className="rounded-full border border-slate-300 bg-white px-5 py-2 text-sm font-semibold text-ink hover:border-crimson/40 transition-colors"
              >
                Go home
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
