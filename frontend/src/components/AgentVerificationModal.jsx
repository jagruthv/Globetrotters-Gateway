import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  ShieldCheck, 
  BadgeCheck, 
  Loader2, 
  CheckCircle2, 
  ArrowRight
} from 'lucide-react';
import confetti from 'canvas-confetti';

export default function AgentVerificationModal({
  isOpen,
  onClose,
  onAgentApproved
}) {
  const [requestStatus, setRequestStatus] = useState('idle'); // 'idle' | 'submitting' | 'approved'
  const [secondsRemaining, setSecondsRemaining] = useState(5);

  const handleClose = useCallback(() => {
    setRequestStatus('idle');
    setSecondsRemaining(5);
    onClose();
  }, [onClose]);

  useEffect(() => {
    if (requestStatus !== 'submitting') return;

    const timer = setTimeout(() => {
      if (secondsRemaining > 1) {
        setSecondsRemaining((prev) => prev - 1);
      } else {
        setSecondsRemaining(0);
        setRequestStatus('approved');
        localStorage.setItem('globetrotter_is_agent', 'true');
        window.dispatchEvent(new Event('agent-status-changed'));

        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#00F2FE', '#10B981', '#F59E0B']
        });

        setTimeout(() => {
          onAgentApproved();
          handleClose();
        }, 1400);
      }
    }, 1000);

    return () => clearTimeout(timer);
  }, [requestStatus, secondsRemaining, onAgentApproved, handleClose]);

  const handleStartRequest = () => {
    setRequestStatus('submitting');
    setSecondsRemaining(5);
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ duration: 0.2 }}
          className="relative w-full max-w-md rounded-3xl bg-[#0B0F17] border border-cyan-500/20 p-6 sm:p-8 shadow-2xl text-slate-100 flex flex-col gap-6"
        >
          {/* Close Button */}
          <button
            onClick={handleClose}
            disabled={requestStatus === 'submitting'}
            className="absolute top-5 right-5 w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center text-slate-400 hover:text-white transition-colors cursor-pointer disabled:opacity-40"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Modal Header */}
          <div className="flex flex-col items-center text-center gap-3 pt-2">
            <div className="w-16 h-16 rounded-2xl bg-cyan-500/10 border border-cyan-400/30 flex items-center justify-center text-cyan-300 shadow-lg shadow-cyan-500/10">
              {requestStatus === 'approved' ? (
                <CheckCircle2 className="w-8 h-8 text-emerald-400 animate-bounce" />
              ) : (
                <ShieldCheck className="w-8 h-8 text-cyan-400" />
              )}
            </div>

            <div className="flex flex-col gap-1.5">
              <span className="text-[10px] font-mono text-cyan-400 uppercase tracking-widest font-semibold">
                Operational Gateways • AP & TG
              </span>
              <h3 className="text-xl sm:text-2xl font-bold text-white font-sans-clean">
                {requestStatus === 'approved' 
                  ? 'Agent Request Approved!' 
                  : 'Field Agent Verification'}
              </h3>
            </div>

            <p className="text-xs text-slate-400 max-w-sm leading-relaxed font-sans-clean">
              {requestStatus === 'approved'
                ? 'Welcome Field Agent. You have been accredited by the Tourism Gate Registry. Redirecting to your operational terminal...'
                : 'This terminal is reserved for authorized Field Agents, Turnstile Operators, and Verification Officers across Andhra Pradesh and Telangana.'}
            </p>
          </div>

          {/* Application State Machine */}
          {requestStatus === 'idle' && (
            <div className="flex flex-col gap-4">
              <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 flex flex-col gap-2.5 text-xs text-slate-300 font-sans-clean">
                <div className="flex items-center gap-2 text-cyan-300 font-medium">
                  <BadgeCheck className="w-4 h-4 text-cyan-400 shrink-0" />
                  <span>Turnstile Gate Scanning & QR Verification</span>
                </div>
                <div className="flex items-center gap-2 text-emerald-300 font-medium">
                  <BadgeCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Real-Time Checkpoint Attendance Tracking</span>
                </div>
                <div className="flex items-center gap-2 text-amber-300 font-medium">
                  <BadgeCheck className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>Autonomous Cloud & Offline Ledger Sync</span>
                </div>
              </div>

              <button
                onClick={handleStartRequest}
                className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-cyan-400 to-emerald-400 text-slate-950 font-bold text-sm flex items-center justify-center gap-2 hover:opacity-95 transition-opacity shadow-lg shadow-cyan-500/20 cursor-pointer font-sans-clean"
              >
                <span>Submit Request to Become an Agent</span>
                <ArrowRight className="w-4 h-4 text-slate-950" />
              </button>
            </div>
          )}

          {requestStatus === 'submitting' && (
            <div className="flex flex-col items-center gap-4 py-4">
              {/* Circular Countdown Ring */}
              <div className="relative w-20 h-20 flex items-center justify-center">
                <Loader2 className="w-20 h-20 text-cyan-400 animate-spin" />
                <span className="absolute text-2xl font-extrabold text-white font-mono">
                  {secondsRemaining}s
                </span>
              </div>

              <div className="flex flex-col items-center text-center gap-1">
                <span className="text-xs font-bold text-white font-sans-clean">
                  Processing Agent Credential
                </span>
                <span className="text-[11px] text-cyan-300 font-sans-clean">
                  Verifying with AP & TG Tourism Registry...
                </span>
              </div>

              {/* Progress Bar */}
              <div className="w-full h-1.5 rounded-full bg-white/10 overflow-hidden mt-2">
                <div 
                  className="h-full bg-gradient-to-r from-cyan-400 to-emerald-400 transition-all duration-1000 ease-linear rounded-full"
                  style={{ width: `${((5 - secondsRemaining) / 5) * 100}%` }}
                />
              </div>
            </div>
          )}

          {requestStatus === 'approved' && (
            <div className="flex flex-col items-center gap-3 py-2">
              <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2 font-sans-clean w-full justify-center">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span className="font-semibold">Accreditation Active • Agent #AGT-8942</span>
              </div>
            </div>
          )}

          {/* Footer note */}
          <div className="text-center text-[10px] text-slate-500 font-mono pt-1 border-t border-white/5">
            Globetrotter Field Agent Protocol • AP & TG Tourism Gateway
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
