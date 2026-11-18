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
  Sparkles,
  Phone,
  Smartphone,
  Link2
} from 'lucide-react';
import { authService } from '../services/api';

export default function AuthModal({ isOpen, onClose, onAuthSuccess }) {
  // Method views: 'options' | 'email' | 'phone'
  const [authMethod, setAuthMethod] = useState('options');
  const [isRegister, setIsRegister] = useState(false);
  
  // Email states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  
  // Phone / WhatsApp states
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otpStep, setOtpStep] = useState(false);
  const [otpCode, setOtpCode] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  if (!isOpen) return null;

  const handleFinishAuth = (userData, message) => {
    setLoading(false);
    setSuccessMsg(message);
    if (onAuthSuccess) onAuthSuccess(userData);
    setTimeout(() => {
      onClose();
      setSuccessMsg(null);
      setAuthMethod('options');
      setOtpStep(false);
    }, 900);
  };

  // 1. Google One-Click Sign-In
  const handleGoogleSignIn = () => {
    setLoading(true);
    setError(null);
    setTimeout(() => {
      const email = 'tourist.explorer@gmail.com';
      const userData = authService.socialLogin('google', {
        fullName: 'Tourist Explorer',
        identifier: email
      });
      handleFinishAuth(userData, 'Signed in with Google! Account linked.');
    }, 450);
  };

  // 2. WhatsApp / Phone OTP Flow
  const handleSendOtp = (e) => {
    e.preventDefault();
    if (!phoneNumber.trim() || phoneNumber.length < 10) {
      setError('Please enter a valid 10-digit mobile number.');
      return;
    }
    setLoading(true);
    setError(null);
    setTimeout(() => {
      setLoading(false);
      setOtpStep(true);
    }, 400);
  };

  const handleVerifyOtp = (e) => {
    e.preventDefault();
    if (!otpCode.trim() || otpCode.length < 4) {
      setError('Please enter the 4-digit verification code.');
      return;
    }
    setLoading(true);
    setError(null);
    setTimeout(() => {
      const cleanPhone = phoneNumber.startsWith('+91') ? phoneNumber : `+91 ${phoneNumber}`;
      const userData = authService.socialLogin('whatsapp', {
        fullName: `Traveler (${cleanPhone.slice(-4)})`,
        identifier: cleanPhone
      });
      handleFinishAuth(userData, `Verified mobile ${cleanPhone}! Account linked.`);
    }, 450);
  };

  // 3. Email & Password Flow
  const handleEmailSubmit = (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccessMsg(null);

    setTimeout(() => {
      const displayName = fullName.trim() || email.split('@')[0] || 'Verified Explorer';
      const cleanEmail = email.trim().toLowerCase();
      const userData = authService.socialLogin('email', {
        fullName: displayName,
        identifier: cleanEmail
      });
      handleFinishAuth(userData, `Welcome, ${displayName}! Authenticated via email.`);
    }, 450);
  };

  // 4. Instant Explorer Guest Session
  const handleGuestSignIn = () => {
    setLoading(true);
    setError(null);
    setTimeout(() => {
      const guestId = `guest_${Math.floor(1000 + Math.random() * 9000)}`;
      const userData = authService.socialLogin('guest', {
        fullName: `Explorer #${guestId.slice(-4)}`,
        identifier: `${guestId}@guest.globetrotter.in`
      });
      handleFinishAuth(userData, 'Instant Explorer guest pass active!');
    }, 300);
  };

  const handleFillTestCredentials = () => {
    setAuthMethod('email');
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
            className="absolute top-5 right-5 w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center text-slate-400 hover:text-white transition-colors cursor-pointer"
            aria-label="Close dialog"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Header */}
          <div className="flex flex-col gap-2 mb-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 w-fit">
              <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
              <span className="text-[10px] uppercase font-semibold text-cyan-300 tracking-wider font-sans-clean">
                Official Tourist Account Portal
              </span>
            </div>
            <h3 className="text-2xl font-bold text-white font-sans-clean">
              {authMethod === 'options' ? 'Sign In or Link Account' : 
               authMethod === 'phone' ? 'WhatsApp & Mobile Sign-In' :
               isRegister ? 'Create Tourist Account' : 'Sign In with Email'}
            </h3>
            <p className="text-xs text-slate-400 font-sans-clean leading-relaxed">
              Link multiple sign-in methods (Google, WhatsApp, Email) to access your unified digital tickets, gate QR codes, and saved itineraries.
            </p>
          </div>

          {/* Feedback Alerts */}
          {error && (
            <p className="mb-4 text-xs text-rose-400 bg-rose-500/10 border border-rose-500/20 p-2.5 rounded-xl font-sans-clean">
              {error}
            </p>
          )}

          {successMsg && (
            <p className="mb-4 text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 p-2.5 rounded-xl flex items-center gap-2 font-sans-clean">
              <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{successMsg}</span>
            </p>
          )}

          {/* MAIN MULTI-PROVIDER SELECTION SCREEN */}
          {authMethod === 'options' && (
            <div className="flex flex-col gap-3">
              {/* Google Button */}
              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={loading}
                className="w-full py-3 px-4 rounded-xl bg-white hover:bg-slate-100 text-slate-900 font-bold text-xs flex items-center justify-center gap-3 transition-colors shadow-md cursor-pointer disabled:opacity-50 font-sans-clean"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                </svg>
                <span>Continue with Google</span>
              </button>

              {/* WhatsApp / Mobile OTP Button */}
              <button
                type="button"
                onClick={() => setAuthMethod('phone')}
                disabled={loading}
                className="w-full py-3 px-4 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/40 text-emerald-300 font-bold text-xs flex items-center justify-center gap-2.5 transition-colors shadow-sm cursor-pointer disabled:opacity-50 font-sans-clean"
              >
                <Phone className="w-4 h-4 text-emerald-400" />
                <span>Continue with WhatsApp / Mobile Number</span>
              </button>

              {/* Email Button */}
              <button
                type="button"
                onClick={() => setAuthMethod('email')}
                disabled={loading}
                className="w-full py-3 px-4 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-slate-200 font-semibold text-xs flex items-center justify-center gap-2.5 transition-colors cursor-pointer disabled:opacity-50 font-sans-clean"
              >
                <Mail className="w-4 h-4 text-cyan-400" />
                <span>Continue with Email & Password</span>
              </button>

              {/* Divider */}
              <div className="relative my-2">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-white/10" />
                </div>
                <div className="relative flex justify-center text-[10px] uppercase font-mono tracking-widest text-slate-500">
                  <span className="bg-[#0A0D14] px-2">Fast Access</span>
                </div>
              </div>

              {/* Instant Guest Tourist Pass */}
              <button
                type="button"
                onClick={handleGuestSignIn}
                disabled={loading}
                className="w-full py-2.5 px-4 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/20 text-cyan-300 font-semibold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer font-sans-clean"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Instant Explorer Guest Pass (No Password)</span>
              </button>

              {/* Account Linking Informational Callout */}
              <div className="mt-3 p-3 rounded-2xl bg-white/[0.02] border border-white/5 flex items-start gap-2.5 text-[11px] text-slate-400 font-sans-clean">
                <Link2 className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                <span>
                  <strong>Account Linking:</strong> You can link both Google and WhatsApp to the same account. Sign in with either one later and your tickets remain fully synchronized.
                </span>
              </div>
            </div>
          )}

          {/* PHONE / WHATSAPP OTP VIEW */}
          {authMethod === 'phone' && (
            <div className="flex flex-col gap-4">
              {!otpStep ? (
                <form onSubmit={handleSendOtp} className="flex flex-col gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1.5 font-sans-clean">
                      Mobile or WhatsApp Number
                    </label>
                    <div className="relative">
                      <Smartphone className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="tel"
                        required
                        value={phoneNumber}
                        onChange={(e) => setPhoneNumber(e.target.value)}
                        placeholder="e.g. 9876543210"
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-emerald-400/60 transition-colors font-mono"
                      />
                    </div>
                    <span className="text-[10px] text-slate-500 font-sans-clean mt-1 block">
                      We will send an instant 4-digit verification code via SMS/WhatsApp.
                    </span>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer disabled:opacity-50 font-sans-clean shadow-lg shadow-emerald-500/20"
                  >
                    <span>{loading ? 'Sending Code...' : 'Send Verification Code'}</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </form>
              ) : (
                <form onSubmit={handleVerifyOtp} className="flex flex-col gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1.5 font-sans-clean">
                      Enter 4-Digit Code sent to {phoneNumber}
                    </label>
                    <input
                      type="text"
                      maxLength={4}
                      required
                      value={otpCode}
                      onChange={(e) => setOtpCode(e.target.value)}
                      placeholder="••••"
                      className="w-full text-center py-2.5 tracking-[1em] rounded-xl bg-white/[0.04] border border-white/10 text-white text-lg font-mono focus:outline-none focus:border-emerald-400/60 transition-colors"
                    />
                    <div className="flex items-center justify-between text-[11px] text-slate-400 mt-2 font-sans-clean">
                      <button
                        type="button"
                        onClick={() => setOtpStep(false)}
                        className="text-cyan-400 hover:underline"
                      >
                        Change Number
                      </button>
                      <span>Simulated OTP: any 4 digits</span>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer disabled:opacity-50 font-sans-clean shadow-lg shadow-emerald-500/20"
                  >
                    <span>{loading ? 'Verifying...' : 'Verify Code & Sign In'}</span>
                    <CheckCircle className="w-4 h-4" />
                  </button>
                </form>
              )}

              <button
                type="button"
                onClick={() => setAuthMethod('options')}
                className="text-xs text-slate-400 hover:text-white transition-colors text-center font-sans-clean"
              >
                ← Back to other sign-in methods
              </button>
            </div>
          )}

          {/* EMAIL & PASSWORD VIEW */}
          {authMethod === 'email' && (
            <div className="flex flex-col gap-4">
              {/* Demo Credentials Autofill Banner */}
              <div className="p-3 rounded-2xl bg-cyan-950/30 border border-cyan-500/20 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-xs text-cyan-200">
                  <Sparkles className="w-4 h-4 text-cyan-400 shrink-0" />
                  <span className="text-[11px]">Instant Demo: <strong className="text-white">demo.tourist</strong></span>
                </div>
                <button
                  type="button"
                  onClick={handleFillTestCredentials}
                  className="text-[10px] px-2.5 py-1 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 font-semibold transition-colors shrink-0 cursor-pointer"
                >
                  Autofill
                </button>
              </div>

              <form onSubmit={handleEmailSubmit} className="flex flex-col gap-3.5">
                {isRegister && (
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1 font-sans-clean">
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
                        className="w-full pl-10 pr-4 py-2 rounded-xl bg-white/[0.04] border border-white/10 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-cyan-400/60 transition-colors font-sans-clean"
                      />
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1 font-sans-clean">
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
                      className="w-full pl-10 pr-4 py-2 rounded-xl bg-white/[0.04] border border-white/10 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-cyan-400/60 transition-colors font-sans-clean"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1 font-sans-clean">
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
                      className="w-full pl-10 pr-4 py-2 rounded-xl bg-white/[0.04] border border-white/10 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-cyan-400/60 transition-colors font-sans-clean"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="mt-1 w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-cyan-500 to-emerald-500 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 hover:opacity-95 transition-opacity disabled:opacity-50 shadow-md cursor-pointer font-sans-clean"
                >
                  <span>{loading ? 'Authenticating...' : isRegister ? 'Register Account' : 'Sign In'}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </form>

              <div className="flex items-center justify-between text-xs text-slate-400 pt-1 font-sans-clean">
                <button
                  type="button"
                  onClick={() => setIsRegister(!isRegister)}
                  className="text-cyan-400 hover:underline font-semibold"
                >
                  {isRegister ? 'Already registered? Sign In' : 'Need an account? Register'}
                </button>
                <button
                  type="button"
                  onClick={() => setAuthMethod('options')}
                  className="text-slate-400 hover:text-white transition-colors"
                >
                  ← Other options
                </button>
              </div>
            </div>
          )}

        </motion.div>
      </div>
    </AnimatePresence>
  );
}
