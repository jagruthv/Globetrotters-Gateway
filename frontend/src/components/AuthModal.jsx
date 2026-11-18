import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  User, 
  Lock, 
  Mail, 
  X, 
  ShieldCheck, 
  CheckCircle, 
  ArrowRight,
  Sparkles
} from 'lucide-react';

export default function AuthModal({ isOpen, onClose, onAuthSuccess }) {
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccessMsg(null);

    // Simulate verified authentic login & offline token issuance
    setTimeout(() => {
      setLoading(false);
      const displayName = fullName.trim() || email.split('@')[0] || 'Verified Explorer';
      const userData = {
        email: email.trim().toLowerCase(),
        fullName: displayName,
        role: 'ROLE_TOURIST',
        token: `gt_jwt_${btoa(email.trim().toLowerCase())}_${Date.now()}`
      };

      try {
        localStorage.setItem('globetrotter_user', JSON.stringify(userData));
        localStorage.setItem('globetrotter_token', userData.token);
        window.dispatchEvent(new Event('auth-change'));
      } catch (err) {
        console.error('Local storage error:', err);
      }

      setSuccessMsg(`Welcome, ${displayName}! Account authenticated.`);
      if (onAuthSuccess) onAuthSuccess(userData);
      setTimeout(() => {
        onClose();
        setSuccessMsg(null);
      }, 900);
    }, 400);
  };

  const handleFillTestCredentials = () => {
    setEmail('demo.tourist@globetrotter.com');
    setPassword('TouristPass@2026');
    setFullName('Verified Tourist');
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ duration: 0.2 }}
          className="relative w-full max-w-md bg-[#0A0D14] border border-white/10 rounded-3xl p-6 sm:p-8 shadow-2xl overflow-hidden text-slate-200"
        >
          {/* Subtle Ambient Glow */}
          <div className="absolute -top-24 -right-24 w-48 h-48 bg-cyan-500/15 rounded-full blur-3xl pointer-events-none" />

          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute top-5 right-5 w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center text-slate-400 hover:text-white transition-colors"
            aria-label="Close dialog"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Header */}
          <div className="flex flex-col gap-2 mb-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 w-fit">
              <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
              <span className="text-[10px] uppercase font-semibold text-cyan-300 tracking-wider">
                Sovereign Tourist Gateway
              </span>
            </div>
            <h3 className="text-2xl font-bold text-white font-sans-clean">
              {isRegister ? 'Create Tourist Account' : 'Sign In to Globetrotter'}
            </h3>
            <p className="text-xs text-slate-400 font-sans-clean leading-relaxed">
              Access instant holographic passes, saved itineraries, and verified gate entry across 59 districts.
            </p>
          </div>

          {/* Quick Demo Credentials Autofill Banner */}
          <div className="mb-5 p-3 rounded-2xl bg-cyan-950/30 border border-cyan-500/20 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-xs text-cyan-200">
              <Sparkles className="w-4 h-4 text-cyan-400 shrink-0" />
              <span className="text-[11px]">Instant Demo Tourist Account: <strong className="text-white">demo.tourist</strong></span>
            </div>
            <button
              type="button"
              onClick={handleFillTestCredentials}
              className="text-[10px] px-2.5 py-1 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 font-semibold transition-colors shrink-0"
            >
              Autofill
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {isRegister && (
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5 font-sans-clean">
                  Full Legal Name
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="e.g. Verified Tourist"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-cyan-400/60 transition-colors"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5 font-sans-clean">
                Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-cyan-400/60 transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5 font-sans-clean">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-cyan-400/60 transition-colors"
                />
              </div>
            </div>

            {error && (
              <p className="text-xs text-rose-400 bg-rose-500/10 border border-rose-500/20 p-2.5 rounded-xl">
                {error}
              </p>
            )}

            {successMsg && (
              <p className="text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 p-2.5 rounded-xl flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{successMsg}</span>
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="mt-2 w-full py-3 px-4 rounded-xl bg-gradient-to-r from-cyan-500 to-emerald-500 text-slate-950 font-bold text-sm flex items-center justify-center gap-2 hover:opacity-95 transition-opacity disabled:opacity-50 shadow-lg shadow-cyan-500/20"
            >
              {loading ? (
                <span>Authenticating...</span>
              ) : (
                <>
                  <span>{isRegister ? 'Register Account' : 'Sign In'}</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Toggle between Login and Register */}
          <div className="mt-5 text-center text-xs text-slate-400">
            {isRegister ? (
              <span>
                Already have an account?{' '}
                <button
                  type="button"
                  onClick={() => setIsRegister(false)}
                  className="text-cyan-400 hover:underline font-semibold"
                >
                  Sign In
                </button>
              </span>
            ) : (
              <span>
                Need a new account?{' '}
                <button
                  type="button"
                  onClick={() => setIsRegister(true)}
                  className="text-cyan-400 hover:underline font-semibold"
                >
                  Register here
                </button>
              </span>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
