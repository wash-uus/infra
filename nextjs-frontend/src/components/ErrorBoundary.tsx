'use client';

import React from 'react';

interface Props {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

export default class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    this.setState({ errorInfo });
    // Structured console output so DevTools / log drains can parse it
    console.error(
      JSON.stringify({
        type: 'react_render_error',
        message: error.message,
        name: error.name,
        stack: error.stack,
        componentStack: errorInfo.componentStack,
        ts: new Date().toISOString(),
      }),
    );
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    if (this.props.fallback) return this.props.fallback;

    const isDev = process.env.NODE_ENV !== 'production';

    return (
      <div className="flex min-h-[40vh] flex-col items-center justify-center gap-4 p-8 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
          <svg className="h-8 w-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
          </svg>
        </div>
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Something went wrong</h2>
          <p className="mt-1 text-sm text-gray-500">An unexpected error occurred in this section.</p>
        </div>
        {isDev && this.state.error && (
          <details className="mt-2 max-w-lg rounded-lg border border-red-200 bg-red-50 p-4 text-left">
            <summary className="cursor-pointer text-sm font-medium text-red-800">
              {this.state.error.name}: {this.state.error.message}
            </summary>
            <pre className="mt-2 overflow-auto text-xs text-red-700 whitespace-pre-wrap">
              {this.state.errorInfo?.componentStack}
            </pre>
          </details>
        )}
        <button
          onClick={this.handleReset}
          className="mt-2 rounded-lg bg-infra-primary px-4 py-2 text-sm font-medium text-white hover:bg-infra-primary transition-colors"
        >
          Try again
        </button>
      </div>
    );
  }
}
