import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldCheck, Cookie, X } from 'lucide-react';

export default function CookieConsentBanner() {
  const [isVisible, setIsVisible] = useState(false);
  const [showPreferences, setShowPreferences] = useState(false);
  const [analyticsEnabled, setAnalyticsEnabled] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem('gt_cookie_consent');
    if (!consent) {
      // Delay display slightly so it doesn't jarringly block initial render
      const timer = setTimeout(() => setIsVisible(true), 1200);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleAcceptAll = () => {
    localStorage.setItem(
      'gt_cookie_consent',
      JSON.stringify({ essential: true, analytics: true, timestamp: new Date().toISOString() })
    );
    setIsVisible(false);
  };

  const handleSavePreferences = () => {
    localStorage.setItem(
      'gt_cookie_consent',
      JSON.stringify({ essential: true, analytics: analyticsEnabled, timestamp: new Date().toISOString() })
    );
    setIsVisible(false);
  };

  const handleDeclineNonEssential = () => {
    localStorage.setItem(
      'gt_cookie_consent',
      JSON.stringify({ essential: true, analytics: false, timestamp: new Date().toISOString() })
    );
    setIsVisible(false);
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.aside
          initial={{ opacity: 0, y: 50, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 30, scale: 0.95 }}
          transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
          aria-label="Cookie consent banner"
          role="region"
          className="fixed bottom-20 md:bottom-6 left-4 right-4 md:left-auto md:right-6 md:max-w-md z-50 p-5 rounded-2xl bg-[#090D16]/95 backdrop-blur-xl border border-white/15 shadow-2xl text-slate-200"
        >
          <div className="flex items-start gap-3.5 mb-3">
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 shrink-0">
              <Cookie className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <h3 className="font-display font-bold text-sm text-white tracking-wide">
                  Privacy & Cookie Preferences
                </h3>
                <button
                  onClick={handleDeclineNonEssential}
                  aria-label="Close and decline non-essential cookies"
                  className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                We keep your data private. We only use essential memory cookies to save your booked passes and preferences offline. No advertising trackers.
              </p>
            </div>
          </div>

          {showPreferences && (
            <div className="my-3 p-3 rounded-xl bg-white/5 border border-white/10 space-y-2.5 text-xs">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-semibold text-white">Essential Cookies</div>
                  <div className="text-[11px] text-slate-400">QR ticket verification & offline access</div>
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-medium">
                  Always Active
                </span>
              </div>
              <div className="flex items-center justify-between pt-2 border-t border-white/10">
                <div>
                  <div className="font-semibold text-white">Anonymous Analytics</div>
                  <div className="text-[11px] text-slate-400">Help improve tourism route estimates</div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={analyticsEnabled}
                    onChange={(e) => setAnalyticsEnabled(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-500"></div>
                </label>
              </div>
            </div>
          )}

          <div className="flex flex-col sm:flex-row items-center gap-2 pt-2 text-xs">
            {!showPreferences ? (
              <>
                <button
                  type="button"
                  onClick={handleAcceptAll}
                  className="w-full sm:flex-1 py-2.5 px-4 rounded-xl bg-[#E5C158] hover:bg-[#F3D57A] text-[#0A0D14] font-semibold transition-all shadow-md min-h-[44px] flex items-center justify-center gap-1.5"
                >
                  <ShieldCheck className="w-4 h-4" />
                  Accept All
                </button>
                <button
                  type="button"
                  onClick={() => setShowPreferences(true)}
                  className="w-full sm:w-auto py-2.5 px-3 rounded-xl bg-white/10 hover:bg-white/15 text-slate-200 font-medium transition-colors min-h-[44px]"
                >
                  Preferences
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={handleSavePreferences}
                className="w-full py-2.5 px-4 rounded-xl bg-[#E5C158] hover:bg-[#F3D57A] text-[#0A0D14] font-semibold transition-all shadow-md min-h-[44px]"
              >
                Save Preferences
              </button>
            )}
          </div>

          <div className="mt-3 text-center text-[10px] text-slate-400 flex items-center justify-center gap-3">
            <a href="/privacy.html" target="_blank" rel="noopener noreferrer" className="hover:text-amber-300 underline">
              Privacy Policy
            </a>
            <span>•</span>
            <a href="/terms.html" target="_blank" rel="noopener noreferrer" className="hover:text-amber-300 underline">
              Terms & Refund Policy
            </a>
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}
