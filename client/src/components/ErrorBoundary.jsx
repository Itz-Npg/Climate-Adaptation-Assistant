import { Component } from 'react';

/**
 * Catches render-time crashes so a single broken component cannot leave the
 * user with a blank white page.
 */
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error('[ui] Unhandled render error:', error, info?.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <div className="flex min-h-screen items-center justify-center bg-canvas px-5 py-16">
        <div className="w-full max-w-lg rounded-3xl border border-line bg-white p-8 text-center shadow-card">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50 text-red-600">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-7 w-7">
              <path d="M12 9v4m0 4h.01M10.3 3.9 2.4 18a2 2 0 0 0 1.7 3h15.8a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
          <h1 className="mt-5 text-2xl font-extrabold">Something went wrong</h1>
          <p className="mt-2 text-sm leading-relaxed text-muted">
            The page hit an unexpected error. Reloading usually fixes it. If it keeps happening, go
            back to the home page and try again.
          </p>
          <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
            <button type="button" onClick={() => window.location.reload()} className="btn-primary">
              Reload the page
            </button>
            <a href="/" className="btn-outline">
              Back to home
            </a>
          </div>
          {import.meta.env.DEV && this.state.error ? (
            <pre className="mt-6 overflow-auto rounded-xl bg-canvas p-3 text-left text-[11px] leading-relaxed text-muted">
              {String(this.state.error?.stack || this.state.error?.message || this.state.error)}
            </pre>
          ) : null}
        </div>
      </div>
    );
  }
}
