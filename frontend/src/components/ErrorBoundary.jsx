import React from 'react';
import { AlertTriangle, RotateCcw, Home } from 'lucide-react';

/**
 * ErrorBoundary: Anti-Silent Failure Defense (Reel 30 - Nata in Data)
 * Prevents unhandled JavaScript runtime exceptions from crashing the application root into a blank screen.
 * Renders an institutional fallback view with state-preserving recovery actions.
 */
export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null
    };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Globetrotter Runtime Boundary Caught Exception:', error, errorInfo);
    this.setState({ errorInfo });
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  handleReload = () => {
    if (typeof window !== 'undefined') {
      window.location.hash = '';
      window.location.reload();
    }
  };

  render() {
    if (this.state.hasError) {
      return (
        <section className="w-full min-h-[60vh] flex items-center justify-center p-6 bg-[#080A0F] text-slate-200">
          <div className="w-full max-w-lg p-8 rounded-3xl bg-[#0E121A] border border-white/10 shadow-2xl flex flex-col items-center text-center gap-5">
            <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-400/30 flex items-center justify-center text-amber-300">
              <AlertTriangle className="w-7 h-7 text-amber-400" />
            </div>

            <div className="flex flex-col gap-1.5">
              <span className="text-[11px] font-sans-clean font-semibold text-amber-400">
                Anti-silent failure protection
              </span>
              <h2 className="text-xl sm:text-2xl font-bold text-white font-sans-clean">
                {this.props.fallbackTitle || 'Section Encountered an Interruption'}
              </h2>
              <p className="text-xs sm:text-sm text-slate-400 leading-relaxed font-sans-clean max-w-md mx-auto">
                {this.props.fallbackMessage || 
                  'A component encountered an issue rendering this view. Your booked passes, active itinerary, and account data remain intact.'}
              </p>
            </div>

            {/* Recovery Action Buttons */}
            <div className="flex flex-wrap items-center justify-center gap-3 w-full pt-2">
              <button
                type="button"
                onClick={this.handleReset}
                className="px-5 py-2.5 rounded-full bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs flex items-center gap-2 transition-all shadow-md cursor-pointer font-sans-clean active:scale-95"
              >
                <RotateCcw className="w-3.5 h-3.5 text-slate-950" />
                <span>Try Reloading Section</span>
              </button>

              <button
                type="button"
                onClick={this.handleReload}
                className="px-5 py-2.5 rounded-full bg-white/5 hover:bg-white/10 text-white font-semibold text-xs border border-white/10 flex items-center gap-2 transition-all cursor-pointer font-sans-clean active:scale-95"
              >
                <Home className="w-3.5 h-3.5 text-slate-300" />
                <span>Return to Overview</span>
              </button>
            </div>

            {/* Collapsible Technical Diagnostics for Transparency */}
            {this.state.error && (
              <details className="w-full text-left mt-2 p-3 rounded-xl bg-black/40 border border-white/5 text-[11px] text-slate-400 font-mono">
                <summary className="cursor-pointer text-slate-400 hover:text-slate-300 select-none">
                  Diagnostic details
                </summary>
                <div className="mt-2 text-rose-300 break-words whitespace-pre-wrap">
                  {this.state.error.toString()}
                </div>
              </details>
            )}
          </div>
        </section>
      );
    }

    return this.props.children;
  }
}
