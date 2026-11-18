import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, X, Copy, Check } from 'lucide-react';

export default function SmsGatewayToast() {
  const [toast, setToast] = useState(null); // { phone: string, otp: string }
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const handleSms = (e) => {
      if (e.detail) {
        setToast(e.detail);
        setCopied(false);
      }
    };

    window.addEventListener('gt-sms-gateway-dispatched', handleSms);
    return () => window.removeEventListener('gt-sms-gateway-dispatched', handleSms);
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => {
      setToast(null);
    }, 12000);
    return () => clearTimeout(timer);
  }, [toast]);

  if (!toast) return null;

  const handleCopy = () => {
    if (navigator.clipboard && toast.otp) {
      navigator.clipboard.writeText(toast.otp);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed top-20 right-4 sm:right-8 z-50 max-w-sm w-full pointer-events-none">
        <motion.div
          initial={{ opacity: 0, y: -20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.95 }}
          transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
          className="pointer-events-auto p-4 rounded-2xl bg-[#0B101D]/95 border border-emerald-500/30 shadow-2xl backdrop-blur-xl text-slate-100 flex flex-col gap-2"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
                <MessageSquare className="w-4 h-4" />
              </div>
              <span className="text-xs font-semibold text-emerald-300 font-sans-clean">
                SMS & WhatsApp gateway
              </span>
            </div>

            <button
              onClick={() => setToast(null)}
              className="text-slate-400 hover:text-white p-1 rounded-md cursor-pointer"
              aria-label="Close notification"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="text-xs text-slate-300 font-sans-clean leading-relaxed">
            Verification code for <strong className="text-white">{toast.phone}</strong>:
          </div>

          <div className="flex items-center justify-between p-2 rounded-xl bg-black/40 border border-white/10 font-mono">
            <span className="text-xl font-extrabold tracking-widest text-emerald-400 pl-2">
              {toast.otp}
            </span>
            <button
              onClick={handleCopy}
              className="px-2.5 py-1 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 text-xs font-sans-clean font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied' : 'Copy'}</span>
            </button>
          </div>

          <span className="text-[10px] text-slate-400 font-sans-clean">
            Enter this 6-digit code in the prompt to verify phone ownership.
          </span>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
