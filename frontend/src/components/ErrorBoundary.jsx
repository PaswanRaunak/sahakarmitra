// ─────────────────────────────────────────────
// ErrorBoundary — catches runtime crashes in its child tree and renders
// a graceful fallback instead of a blank white page.
//
// Usage:
//   <ErrorBoundary>          → top-level (full-app fallback + Reload)
//   <ErrorBoundary compact>  → section-level (inline fallback, no Reload)
//
// Errors are always logged to the console with the component stack so
// the failing subtree is identifiable in production builds.
// ─────────────────────────────────────────────

import React from 'react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    // React calls this during render: signal the fallback UI
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    // Full error + React component stack for debugging
    console.error('[ErrorBoundary] caught:', error);
    if (info?.componentStack) {
      console.error('[ErrorBoundary] component stack:', info.componentStack);
    }
  }

  handleReload = () => {
    // A crash may leave in-memory state corrupted; a full reload is the
    // only guaranteed recovery for a top-level failure.
    window.location.reload();
  };

  handleReset = () => {
    // Section-level recovery: remount just this subtree
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      const compact = this.props.compact;
      const name = this.props.name || 'this section';

      if (compact) {
        return (
          <div
            role="alert"
            className="m-4 p-4 rounded-2xl bg-error/10 border border-error/40 text-error text-xs space-y-2"
          >
            <p className="font-bold">Something went wrong loading {name}.</p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={this.handleReset}
                className="px-3 py-1.5 bg-error hover:bg-error text-white text-xs font-bold rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-error"
              >
                Try again
              </button>
              {this.props.onOpenHome && (
                <button
                  type="button"
                  onClick={this.props.onOpenHome}
                  className="px-3 py-1.5 bg-elevated hover:bg-sunken border border-line text-ink-soft text-xs font-bold rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-400"
                >
                  Go home
                </button>
              )}
            </div>
          </div>
        );
      }

      return (
        <div className="min-h-[60vh] flex items-center justify-center p-8 bg-surface">
          <div
            role="alert"
            className="max-w-md w-full bg-elevated border border-line rounded-3xl shadow-card p-8 space-y-5 text-center"
          >
            <div className="w-14 h-14 mx-auto rounded-2xl bg-error/10 text-error flex items-center justify-center">
              <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h2 className="text-lg font-extrabold text-ink tracking-tight">
              Something went wrong loading this section
            </h2>
            <p className="text-xs text-ink-muted leading-relaxed">
              The rest of the app is still available. Try reloading; if the problem persists, clear the site data and sign in again.
            </p>
            <div className="flex items-center justify-center gap-3 pt-1">
              <button
                type="button"
                onClick={this.handleReload}
                className="px-5 py-2.5 bg-accent hover:bg-accent-strong text-white text-xs font-extrabold rounded-xl shadow-md transition-[transform,box-shadow,background-color] hover:-translate-y-0.5 active:translate-y-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
              >
                Reload
              </button>
              {this.props.onGoLanding && (
                <button
                  type="button"
                  onClick={this.props.onGoLanding}
                  className="px-5 py-2.5 bg-elevated hover:bg-sunken border border-line text-ink text-xs font-bold rounded-xl transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-400"
                >
                  Go to home page
                </button>
              )}
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
