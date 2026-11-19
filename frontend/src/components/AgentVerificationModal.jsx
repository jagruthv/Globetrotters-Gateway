import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  ShieldCheck, 
  Loader2, 
  CheckCircle2, 
  ArrowRight,
  AlertTriangle,
  Lock,
  Mail
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { authService } from '../services/api';

export default function AgentVerificationModal({
  isOpen,
  onClose,
  onAgentApproved
}) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleClose = useCallback(() => {
    if (loading) return;
    setError('');
    setSuccess(false);
    onClose();
  }, [loading, onClose]);

  const handleLogin = async (e) => {
    if (e) e.preventDefault();
    if (!email.trim() || !password.trim()) {
      setError('Please provide officer email and security passkey.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const data = await authService.login(email.trim(), password);
      
      // Strict Server-Side Role Enforcement
      const role = data?.role || '';
      const isAuthorizedOfficer = role === 'ROLE_ADMIN' || role === 'ROLE_STAFF' || role === 'ROLE_AGENT';

      if (!isAuthorizedOfficer) {
        authService.logout();
        setError('Access Denied: This account is not registered as a gate officer.');
        setLoading(false);
        return;
      }

      setSuccess(true);
      localStorage.setItem('globetrotter_is_agent', 'true');
      window.dispatchEvent(new Event('agent-status-changed'));

      try {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#00F2FE', '#10B981', '#F59E0B'],
          disableForReducedMotion: true,
          useWorker: false
        });
      } catch {
        // Confetti fallback
      }

      setTimeout(() => {
        setLoading(false);
        onAgentApproved();
        handleClose();
      }, 1000);
    } catch (err) {
      setError(err.message || 'Authentication failed. Please verify your officer credentials.');
      setLoading(false);
    }
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
          className="relative w-full max-w-md rounded-3xl bg-[#0B0F17] border border-amber-500/30 p-6 sm:p-8 shadow-2xl text-slate-100 flex flex-col gap-5"
        >
          {/* Close Button */}
          <button
            onClick={handleClose}
            disabled={loading}
            className="absolute top-5 right-5 w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center text-slate-400 hover:text-white transition-colors cursor-pointer disabled:opacity-40"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Modal Header */}
          <div className="flex flex-col items-center text-center gap-2.5 pt-1">
            <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-400/40 flex items-center justify-center text-amber-300 shadow-sm">
              {success ? (
                <CheckCircle2 className="w-7 h-7 text-emerald-400" />
              ) : (
                <ShieldCheck className="w-7 h-7 text-amber-400" />
              )}
            </div>

            <div className="flex flex-col gap-1">
              <span className="text-[11px] text-amber-400 font-sans-clean font-semibold">
                Authorized gate officer login • AP & TG
              </span>
              <h3 className="text-xl font-bold text-white font-sans-clean">
                {success ? 'Staff Access Confirmed' : 'Gate Officer Login'}
              </h3>
            </div>

            <p className="text-xs text-slate-400 max-w-xs leading-relaxed font-sans-clean">
              {success
                ? 'Staff login confirmed. Opening gate scanner...'
                : 'Gate Officer Mode is reserved for verified monument admission staff.'}
            </p>
          </div>

          {/* Error Alert */}
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2.5"
            >
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <span className="leading-snug">{error}</span>
            </motion.div>
          )}

          {/* Login Form */}
          {!success && (
            <form onSubmit={handleLogin} className="flex flex-col gap-3.5">
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-semibold text-slate-300 font-sans-clean flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-amber-400" />
                    <span>Officer Email / Staff ID</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setEmail('agent@gmail.com');
                      setPassword('agent@123');
                    }}
                    className="text-[10px] text-amber-400/90 hover:text-amber-300 underline underline-offset-2 transition-colors cursor-pointer"
                  >
                    Quick Fill: agent@gmail.com
                  </button>
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="agent@gmail.com"
                  required
                  disabled={loading}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-white text-xs placeholder:text-slate-500 focus:outline-none focus:border-amber-400/60 transition-colors"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-semibold text-slate-300 font-sans-clean flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-amber-400" />
                    <span>Security Passkey</span>
                  </label>
                  <span className="text-[10px] text-slate-500 font-mono">
                    pass: agent@123
                  </span>
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="agent@123"
                  required
                  disabled={loading}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-white text-xs placeholder:text-slate-500 focus:outline-none focus:border-amber-400/60 transition-colors"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full mt-2 py-3 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-md cursor-pointer disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
                    <span>Verifying with Server...</span>
                  </>
                ) : (
                  <>
                    <span>Enter Agent Mode</span>
                    <ArrowRight className="w-4 h-4 text-slate-950" />
                  </>
                )}
              </button>
            </form>
          )}

          {/* Success State */}
          {success && (
            <div className="flex flex-col items-center gap-3 py-4">
              <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2 font-sans-clean w-full justify-center">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span className="font-semibold">Staff Clearance Confirmed</span>
              </div>
            </div>
          )}

          {/* Footer note */}
          <div className="text-center text-[10px] text-slate-500 font-mono pt-1 border-t border-white/5">
            Authorized tourism department personnel only.
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
