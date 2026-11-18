import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle, X, ExternalLink } from 'lucide-react';

/**
 * WhatsAppConcierge — Official 24/7 Smart Tourism Support Action
 * Implements the WhatsApp integration requirement from Website Pre-Launch Quality Audit (Reel 19).
 * Connects tourists directly to official verified support with pre-filled encoded inquiries.
 */
export default function WhatsAppConcierge() {
  const [isOpen, setIsOpen] = useState(false);

  // Official Helpline Number (Andhra Pradesh & Telangana Tourism Support)
  const officialNumber = "918008882026";

  const presetMessages = [
    { label: "Book Priority Pass", text: "Hello Globetrotter, I need assistance booking an official entry pass for an Andhra/Telangana heritage circuit." },
    { label: "Monument Timings & Gate Fee", text: "Hi, could you share the authentic monument timings and entry fee for today?" },
    { label: "Emergency / Tourist Helpline", text: "Emergency inquiry: I need immediate tourist assistance in Andhra Pradesh / Telangana." }
  ];

  const handleLaunchWhatsApp = (customText) => {
    const message = customText || "Hello Globetrotter Gateway, I need assistance with Andhra Pradesh & Telangana tourism corridors.";
    const url = `https://wa.me/${officialNumber}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <aside aria-label="Official WhatsApp Support Concierge" className="fixed bottom-24 right-5 md:bottom-8 md:right-8 z-40">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 15, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 15, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 350, damping: 25 }}
            className="mb-3 w-80 rounded-2xl bg-slate-900/95 border border-emerald-500/30 p-4 shadow-2xl backdrop-blur-xl text-slate-100"
          >
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <div className="h-2.5 w-2.5 rounded-full bg-emerald-400 animate-pulse" />
                <div>
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-emerald-400">Official Concierge</h4>
                  <p className="text-[10px] text-slate-400">AP & TG Tourism Desk (24/7)</p>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                aria-label="Close WhatsApp Concierge"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Body */}
            <div className="py-3 text-xs text-slate-300 space-y-2">
              <p className="text-[11px] leading-relaxed">
                Connect directly with verified tourism officers for ticket verification, circuit advice, or route emergencies.
              </p>
              
              <div className="space-y-1.5 pt-1">
                {presetMessages.map((pm, i) => (
                  <button
                    key={i}
                    onClick={() => handleLaunchWhatsApp(pm.text)}
                    className="w-full text-left px-2.5 py-1.5 rounded-lg bg-slate-800/80 hover:bg-emerald-950/40 hover:border-emerald-500/40 border border-slate-700/60 text-[11px] text-slate-200 transition-all flex items-center justify-between group"
                  >
                    <span>{pm.label}</span>
                    <ExternalLink className="w-3 h-3 text-emerald-400 opacity-60 group-hover:opacity-100 transition-opacity" />
                  </button>
                ))}
              </div>
            </div>

            {/* Footer Direct CTA */}
            <button
              onClick={() => handleLaunchWhatsApp()}
              className="w-full mt-2 py-2 px-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-medium text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-950/40 transition-all active:scale-[0.98]"
            >
              <MessageCircle className="w-4 h-4" />
              <span>Start WhatsApp Chat</span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Action Trigger Button */}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2.5 px-3.5 py-3 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white shadow-xl shadow-emerald-950/50 border border-emerald-400/30 backdrop-blur-md transition-colors"
        aria-label="Open Official WhatsApp Support"
      >
        <MessageCircle className="w-5 h-5 fill-current" />
        <span className="hidden sm:inline text-xs font-semibold tracking-wide">WhatsApp Support</span>
      </motion.button>
    </aside>
  );
}
