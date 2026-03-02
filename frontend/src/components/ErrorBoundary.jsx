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
    console.error("ErrorBoundary caught:", error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-black px-6 text-center">
          <p className="mb-4 text-5xl">⚠️</p>
          <h1 className="text-xl font-black text-white">Something went wrong</h1>
          <p className="mt-2 max-w-sm text-sm text-zinc-500">
            An unexpected error occurred. Please refresh the page or go back home.
          </p>
          <div className="mt-6 flex gap-3">
            <button
              onClick={() => this.setState({ hasError: false, error: null })}
              className="rounded-xl border border-zinc-700 px-5 py-2.5 text-sm font-medium text-zinc-300 hover:text-white transition"
            >
              Try Again
            </button>
            <a href="/" className="rounded-xl bg-amber-500 px-5 py-2.5 text-sm font-bold text-black hover:bg-amber-400 transition">
              Go Home
            </a>
          </div>
          {import.meta.env.DEV && this.state.error && (
            <pre className="mt-6 max-w-lg overflow-auto rounded-xl bg-zinc-900 p-4 text-left text-xs text-red-400">
              {this.state.error.toString()}
            </pre>
          )}
        </div>
      );
    }
    return this.props.children;
  }
}
