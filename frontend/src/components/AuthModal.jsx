import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  User, 
  Lock, 
  Mail, 
  X, 
  ShieldCheck, 
  CheckCircle2, 
  ArrowRight,
  Phone,
  KeyRound,
  RotateCcw,
  Sparkles,
  Ticket
} from 'lucide-react';
import { authService } from '../services/api';
import { logger } from '../utils/telemetryLogger';

export default function AuthModal({ isOpen, onClose, onAuthSuccess, reason = null }) {
  const [isRegister, setIsRegister] = useState(false);
  const [googleButtonRendered, setGoogleButtonRendered] = useState(false);
  const googleBtnRef = useRef(null);

  // ── Option B: Email OTP State ──────────────────────────────────────────────
  const [emailForOtp, setEmailForOtp] = useState('');
  const [emailOtpStep, setEmailOtpStep] = useState('input_email'); // 'input_email' | 'input_otp'
  const [enteredEmailOtp, setEnteredEmailOtp] = useState('');
  const [emailResendTimer, setEmailResendTimer] = useState(60);

  // ── Password Login State ───────────────────────────────────────────────────
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');

  // ── Mobile Phone State ─────────────────────────────────────────────────────
  const [phoneNumber, setPhoneNumber] = useState('');
  const [phoneOtpStep, setPhoneOtpStep] = useState('input_phone');
  const [enteredPhoneOtp, setEnteredPhoneOtp] = useState('');
  const [phoneResendTimer, setPhoneResendTimer] = useState(60);

  // ── Status State ───────────────────────────────────────────────────────────
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  const handleFinishAuth = useCallback((userData, message) => {
    logger.success('AUTH', message, { userId: userData?.id, role: userData?.role });
    setLoading(false);
    setSuccessMsg(message);
    if (onAuthSuccess) onAuthSuccess(userData);
    setTimeout(() => {
      onClose();
      setSuccessMsg(null);
      setEmailOtpStep('input_email');
      setEnteredEmailOtp('');
      setPhoneOtpStep('input_phone');
      setEnteredPhoneOtp('');
    }, 700);
  }, [onAuthSuccess, onClose]);

  // Email OTP countdown timer
  useEffect(() => {
    let timer;
    if (emailOtpStep === 'input_otp' && emailResendTimer > 0) {
      timer = setTimeout(() => setEmailResendTimer((prev) => prev - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [emailOtpStep, emailResendTimer]);

  // Phone OTP countdown timer
  useEffect(() => {
    let timer;
    if (phoneOtpStep === 'input_otp' && phoneResendTimer > 0) {
      timer = setTimeout(() => setPhoneResendTimer((prev) => prev - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [phoneOtpStep, phoneResendTimer]);

  // ── Option A: Initialize Google Identity Services (GIS) ─────────────────────
  useEffect(() => {
    if (!isOpen) return;

    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || '1070287601380-09kulm6f8oaucov7gek75unss022l3su.apps.googleusercontent.com';

    const initGoogleGis = () => {
      if (window.google?.accounts?.id) {
        try {
          window.google.accounts.id.initialize({
            client_id: clientId,
            callback: async (response) => {
              if (response?.credential) {
                setLoading(true);
                setError(null);
                try {
                  const googleUser = await authService.loginWithGoogle(response.credential);
                  handleFinishAuth(googleUser, `Signed in as ${googleUser.fullName || googleUser.email || 'Traveler'}`);
                } catch (err) {
                  setError(err.message || 'Google verification failed.');
                  setLoading(false);
                }
              }
            },
            auto_select: false,
            cancel_on_tap_outside: true
          });

          // Render native Google Button if container exists
          if (googleBtnRef.current) {
            window.google.accounts.id.renderButton(googleBtnRef.current, {
              theme: 'filled_black',
              size: 'large',
              width: '100%',
              shape: 'pill',
              text: 'continue_with'
            });
            setGoogleButtonRendered(true);
          }
        } catch (e) {
          console.warn('GIS Init notice:', e);
        }
      }
    };

    if (window.google?.accounts?.id) {
      initGoogleGis();
    } else {
      const timer = setTimeout(initGoogleGis, 800);
      return () => clearTimeout(timer);
    }
  }, [isOpen, handleFinishAuth]);

  if (!isOpen) return null;

  // ── 1. GOOGLE ONE-CLICK HANDLER ────────────────────────────────────────────
  const handleGoogleSignInClick = () => {
    setLoading(true);
    setError(null);

    if (window.google?.accounts?.id) {
      try {
        window.google.accounts.id.prompt((notification) => {
          if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
            setLoading(false);
            setError('Google sign-in was closed or blocked. You can sign in using Email OTP or Phone below.');
          }
        });
      } catch {
        setLoading(false);
        setError('Google sign-in could not be opened. Please use Email OTP or Phone below.');
      }
    } else {
      setLoading(false);
      setError('Google Sign-In is unavailable in this browser. Please use Email OTP or Phone below.');
    }
  };

  // ── 2. OPTION B: EMAIL 6-DIGIT OTP FLOW ────────────────────────────────────
  const handleSendEmailOtp = async (e) => {
    if (e) e.preventDefault();
    const clean = emailForOtp.trim().toLowerCase();
    if (!clean || !clean.includes('@')) {
      setError('Please enter a valid email address.');
      return;
    }
    setError(null);
    setLoading(true);

    try {
      await authService.sendEmailOtp(clean);
      setEmailOtpStep('input_otp');
      setEmailResendTimer(60);
      setLoading(false);
    } catch (err) {
      setError(err.message || 'Failed to dispatch verification email.');
      setLoading(false);
    }
  };

  const handleVerifyEmailOtp = async (e) => {
    if (e) e.preventDefault();
    if (!enteredEmailOtp || enteredEmailOtp.trim().length < 6) {
      setError('Please enter the 6-digit code sent to your email.');
      return;
    }
    setError(null);
    setLoading(true);

    try {
      const userData = await authService.verifyEmailOtp(emailForOtp, enteredEmailOtp.trim());
      handleFinishAuth(userData, `Email verified! Welcome ${userData.fullName || 'Explorer'}`);
    } catch (err) {
      setError(err.message || 'Invalid or expired verification code.');
      setLoading(false);
    }
  };

  // ── 3. EMAIL & PASSWORD LOGIN ──────────────────────────────────────────────
  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (isRegister) {
        if (!fullName.trim()) {
          setError('Please provide your full name.');
          setLoading(false);
          return;
        }
        const data = await authService.register({
          fullName: fullName.trim(),
          email: email.trim().toLowerCase(),
          password
        });
        handleFinishAuth(data, 'Account registered and secured!');
      } else {
        const data = await authService.login(email.trim().toLowerCase(), password);
        handleFinishAuth(data, 'Signed in successfully!');
      }
    } catch (err) {
      setError(err.message || 'Incorrect email or password. Please try again or use Email OTP.');
      setLoading(false);
    }
  };

  // ── 4. MOBILE PHONE OTP ────────────────────────────────────────────────────
  const handleSendPhoneOtp = async (e) => {
    if (e) e.preventDefault();
    const clean = phoneNumber.replace(/\D/g, '').slice(-10);
    if (clean.length !== 10) {
      setError('Please enter a valid 10-digit Indian mobile number.');
      logger.warn('AUTH', 'User entered invalid mobile length', { input: phoneNumber });
      return;
    }
    setError(null);
    setLoading(true);
    logger.info('AUTH', `Dispatching mobile OTP to +91 ${clean}`);

    try {
      await authService.sendMobileOtp(clean);
      setPhoneOtpStep('input_otp');
      setPhoneResendTimer(60);
      setLoading(false);
      logger.success('AUTH', `OTP dispatched to +91 ${clean}`);
    } catch (err) {
      const msg = err.message || 'Failed to dispatch SMS code. Please try again.';
      setError(msg);
      logger.error('AUTH', `Failed to dispatch OTP to +91 ${clean}`, { error: msg });
      setLoading(false);
    }
  };

  const handleVerifyPhoneOtp = async (e) => {
    if (e) e.preventDefault();
    const cleanOtp = enteredPhoneOtp.trim();
    if (!cleanOtp || cleanOtp.length < 4) {
      setError('Please enter the 4 to 6-digit verification code.');
      logger.warn('AUTH', 'User entered short OTP', { length: cleanOtp?.length });
      return;
    }
    setError(null);
    setLoading(true);
    logger.info('AUTH', `Verifying mobile OTP for +91 ${phoneNumber}`);

    try {
      const userData = await authService.verifyMobileOtp(phoneNumber, cleanOtp);
      logger.success('AUTH', `Mobile verification confirmed for +91 ${phoneNumber}`);
      handleFinishAuth(userData, `Phone verified! Welcome ${userData.fullName}`);
    } catch (err) {
      const msg = err.message || 'Invalid verification OTP.';
      setError(msg);
      logger.error('AUTH', `Mobile verification failed for +91 ${phoneNumber}`, { error: msg });
      setLoading(false);
    }
  };

  // ── 5. INSTANT GUEST PASS ──────────────────────────────────────────────────
  const handleGuestSignIn = () => {
    setLoading(true);
    setError(null);
    setTimeout(() => {
      const guestId = Math.floor(1000 + Math.random() * 9000);
      const guestUser = authService.socialLogin('guest', {
        fullName: `Guest Traveler #${guestId}`,
        identifier: null
      });
      handleFinishAuth(guestUser, 'Guest Pass active!');
    }, 300);
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-xl">
        
        {/* CARD CONTAINER */}
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 12 }}
          transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
          className="relative w-full max-w-md p-1.5 rounded-[2rem] bg-white/[0.05] border border-white/10 shadow-2xl text-slate-200"
        >
          {/* INNER CORE */}
          <div className="w-full rounded-[calc(2rem-0.375rem)] bg-[#090D16] p-6 sm:p-7 flex flex-col gap-5 border border-white/5 relative overflow-hidden">
            
            {/* Close Button */}
            <button
              onClick={onClose}
              className="absolute top-5 right-5 w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center text-slate-400 hover:text-white transition-colors cursor-pointer"
              aria-label="Close dialog"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Header */}
            <div className="flex flex-col gap-1.5 pt-1">
              <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-white/5 border border-white/10 w-fit text-slate-300">
                <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
                <span className="text-[11px] font-sans-clean font-medium text-slate-300">
                  Secure tourist access
                </span>
              </div>
              <h3 className="text-xl sm:text-2xl font-bold text-white tracking-tight font-sans-clean">
                Sign In to Globetrotter
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed font-sans-clean">
                Access verified entry passes, digital tickets, and custom circuits across all 59 districts.
              </p>
            </div>

            {/* Context Intent Banner (e.g. Booking Required Login) */}
            {reason && (
              <div className="p-3.5 rounded-2xl bg-amber-500/15 border border-amber-400/30 text-amber-200 text-xs font-sans-clean flex items-center gap-2.5 shadow-sm">
                <Ticket className="w-4 h-4 text-amber-400 shrink-0" />
                <span className="font-medium">{reason}</span>
              </div>
            )}

            {/* ── OPTION A: GOOGLE ONE-CLICK SIGN-IN (TOP PROMINENT) ── */}
            <div className="flex flex-col gap-2">
              <div ref={googleBtnRef} className="w-full flex justify-center empty:hidden min-h-[40px]" />
              
              {!googleButtonRendered && (
                <button
                  type="button"
                  onClick={handleGoogleSignInClick}
                  disabled={loading}
                  className="w-full py-3 px-4 rounded-xl bg-white hover:bg-slate-100 text-slate-900 font-bold text-xs flex items-center justify-center gap-3 transition-colors shadow-sm cursor-pointer disabled:opacity-50 font-sans-clean active:scale-[0.98]"
                >
                  <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                  </svg>
                  <span>Continue with Google</span>
                </button>
              )}
            </div>

            {/* DIVIDER */}
            <div className="relative my-0.5">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-white/10" />
              </div>
              <div className="relative flex justify-center text-xs font-sans-clean text-slate-500">
                <span className="bg-[#090D16] px-2.5">or sign in with</span>
              </div>
            </div>

            {/* 2-TAB SELECTOR: Instant One-Time Password (OTP) vs Password Account */}
            <div className="grid grid-cols-2 p-1 rounded-xl bg-white/[0.03] border border-white/10 font-sans-clean text-xs">
              <button
                type="button"
                onClick={() => {
                  setActiveTab('otp');
                  setError(null);
                }}
                className={`py-2 rounded-lg font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  activeTab === 'otp'
                    ? 'bg-white/10 text-white shadow-sm border border-white/10'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <KeyRound className="w-3.5 h-3.5 text-amber-400" />
                <span>One-Time Password (OTP)</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveTab('password');
                  setError(null);
                }}
                className={`py-2 rounded-lg font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  activeTab === 'password'
                    ? 'bg-white/10 text-white shadow-sm border border-white/10'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Lock className="w-3.5 h-3.5 text-sky-400" />
                <span>Password Account</span>
              </button>
            </div>

            {/* Alerts */}
            {error && (
              <p className="text-xs text-rose-300 bg-rose-500/10 border border-rose-500/20 p-3 rounded-xl font-sans-clean">
                {error}
              </p>
            )}

            {successMsg && (
              <div className="flex items-center gap-2 text-xs text-emerald-300 bg-emerald-500/10 border border-emerald-500/20 p-3 rounded-xl font-sans-clean">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{successMsg}</span>
              </div>
            )}

            {/* ── TAB 1: ONE-TIME PASSWORD (OTP) FLOW WITH SUB-TOGGLE ─────── */}
            {activeTab === 'otp' && (
              <div className="flex flex-col gap-4">
                {/* OTP Sub-Toggle: Email Code vs Mobile SMS */}
                <div className="flex items-center p-0.5 rounded-lg bg-white/[0.04] border border-white/5 text-[11px] font-sans-clean">
                  <button
                    type="button"
                    onClick={() => {
                      setOtpChannel('email');
                      setError(null);
                    }}
                    className={`flex-1 py-1.5 rounded-md flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                      otpChannel === 'email'
                        ? 'bg-amber-400/20 text-amber-300 font-semibold border border-amber-400/30'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <Mail className="w-3 h-3 text-amber-400" />
                    <span>Email Code</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setOtpChannel('mobile');
                      setError(null);
                    }}
                    className={`flex-1 py-1.5 rounded-md flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                      otpChannel === 'mobile'
                        ? 'bg-emerald-400/20 text-emerald-300 font-semibold border border-emerald-400/30'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <Phone className="w-3 h-3 text-emerald-400" />
                    <span>Mobile SMS</span>
                  </button>
                </div>

                {/* Email OTP Channel */}
                {otpChannel === 'email' && (
                  <div>
                    {emailOtpStep === 'input_email' ? (
                      <form onSubmit={handleSendEmailOtp} className="flex flex-col gap-3">
                        <div className="flex flex-col gap-1.5">
                          <label className="text-xs font-semibold text-slate-300 font-sans-clean">
                            Your Email Address
                          </label>
                          <div className="relative">
                            <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                            <input
                              type="email"
                              required
                              value={emailForOtp}
                              onChange={(e) => setEmailForOtp(e.target.value)}
                              placeholder="jagruth@gmail.com"
                              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-amber-400 transition-colors font-sans-clean"
                            />
                          </div>
                          <p className="text-[11px] text-slate-400">
                            We will send a 6-digit authentication code directly to your email.
                          </p>
                        </div>

                        <button
                          type="submit"
                          disabled={loading || !emailForOtp.includes('@')}
                          className="w-full py-3 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 transition-all disabled:opacity-40 cursor-pointer shadow-md font-sans-clean active:scale-[0.98]"
                        >
                          {loading ? (
                            <span>Sending Code...</span>
                          ) : (
                            <>
                              <span>Send 6-Digit Verification Code</span>
                              <ArrowRight className="w-3.5 h-3.5" />
                            </>
                          )}
                        </button>
                      </form>
                    ) : (
                      <form onSubmit={handleVerifyEmailOtp} className="flex flex-col gap-4">
                        <div className="flex flex-col gap-1.5">
                          <div className="flex items-center justify-between text-xs font-sans-clean">
                            <label className="text-slate-300 font-semibold">
                              Enter 6-Digit Code
                            </label>
                            <button
                              type="button"
                              onClick={() => setEmailOtpStep('input_email')}
                              className="text-[11px] text-amber-400 hover:underline cursor-pointer"
                            >
                              Change {emailForOtp}
                            </button>
                          </div>

                          <div className="relative">
                            <KeyRound className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                            <input
                              type="text"
                              required
                              autoFocus
                              maxLength={6}
                              value={enteredEmailOtp}
                              onChange={(e) => setEnteredEmailOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                              placeholder="6-digit code"
                              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-500 text-lg font-mono tracking-widest text-center focus:outline-none focus:border-amber-400 transition-colors"
                            />
                          </div>
                          <p className="text-[11px] text-slate-400 text-center">
                            Check your inbox for the code sent to <strong className="text-slate-200">{emailForOtp}</strong>
                          </p>
                        </div>

                        <button
                          type="submit"
                          disabled={loading || enteredEmailOtp.length !== 6}
                          className="w-full py-3 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 transition-colors disabled:opacity-40 cursor-pointer shadow-md font-sans-clean active:scale-[0.98]"
                        >
                          {loading ? <span>Verifying Code...</span> : <span>Verify & Sign In</span>}
                        </button>

                        <div className="flex items-center justify-center text-xs text-slate-400 font-sans-clean">
                          {emailResendTimer > 0 ? (
                            <span>Resend code in <strong className="font-mono text-slate-200">{emailResendTimer}s</strong></span>
                          ) : (
                            <button
                              type="button"
                              onClick={handleSendEmailOtp}
                              className="flex items-center gap-1.5 text-amber-400 hover:underline cursor-pointer font-medium"
                            >
                              <RotateCcw className="w-3 h-3" />
                              <span>Resend verification code</span>
                            </button>
                          )}
                        </div>
                      </form>
                    )}
                  </div>
                )}

                {/* Mobile SMS OTP Channel */}
                {otpChannel === 'mobile' && (
                  <div>
                    {phoneOtpStep === 'input_phone' ? (
                      <form onSubmit={handleSendPhoneOtp} className="flex flex-col gap-3">
                        <div className="flex flex-col gap-1.5">
                          <label className="text-xs font-semibold text-slate-300 font-sans-clean">
                            Indian Mobile Number
                          </label>
                          <div className="flex items-center gap-2">
                            <div className="px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-slate-300 text-xs font-mono">
                              +91
                            </div>
                            <input
                              type="tel"
                              required
                              maxLength={10}
                              value={phoneNumber}
                              onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, '').slice(0, 10))}
                              placeholder="9876543210"
                              className="flex-1 px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-500 text-xs font-mono focus:outline-none focus:border-emerald-400 transition-colors"
                            />
                          </div>
                        </div>

                        <button
                          type="submit"
                          disabled={loading || phoneNumber.length !== 10}
                          className="w-full py-3 rounded-xl bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 transition-all disabled:opacity-40 cursor-pointer shadow-md font-sans-clean active:scale-[0.98]"
                        >
                          {loading ? (
                            <span>Sending SMS...</span>
                          ) : (
                            <>
                              <span>Send Mobile OTP</span>
                              <ArrowRight className="w-3.5 h-3.5" />
                            </>
                          )}
                        </button>
                      </form>
                    ) : (
                      <form onSubmit={handleVerifyPhoneOtp} className="flex flex-col gap-4">
                        <div className="flex flex-col gap-1.5">
                          <div className="flex items-center justify-between text-xs font-sans-clean">
                            <label className="text-slate-300 font-semibold">
                              Enter Verification Code (4 or 6 digits)
                            </label>
                            <button
                              type="button"
                              onClick={() => setPhoneOtpStep('input_phone')}
                              className="text-[11px] text-emerald-400 hover:underline cursor-pointer"
                            >
                              Change +91 {phoneNumber}
                            </button>
                          </div>

                          <div className="relative">
                            <KeyRound className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                            <input
                              type="text"
                              required
                              autoFocus
                              maxLength={6}
                              value={enteredPhoneOtp}
                              onChange={(e) => setEnteredPhoneOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                              placeholder="4 or 6-digit code"
                              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-500 text-lg font-mono tracking-widest text-center focus:outline-none focus:border-emerald-400 transition-colors"
                            />
                          </div>
                        </div>

                        <button
                          type="submit"
                          disabled={loading || enteredPhoneOtp.length < 4}
                          className="w-full py-3 rounded-xl bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 transition-colors disabled:opacity-40 cursor-pointer shadow-md font-sans-clean active:scale-[0.98]"
                        >
                          {loading ? <span>Verifying OTP...</span> : <span>Verify & Enter Gateway</span>}
                        </button>

                        <div className="flex items-center justify-center text-xs text-slate-400 font-sans-clean">
                          {phoneResendTimer > 0 ? (
                            <span>Resend OTP in <strong className="font-mono text-slate-200">{phoneResendTimer}s</strong></span>
                          ) : (
                            <button
                              type="button"
                              onClick={handleSendPhoneOtp}
                              className="flex items-center gap-1.5 text-emerald-400 hover:underline cursor-pointer font-medium"
                            >
                              <RotateCcw className="w-3 h-3" />
                              <span>Resend verification code</span>
                            </button>
                          )}
                        </div>
                      </form>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* ── TAB 2: EMAIL & PASSWORD LOGIN ─────────────────────────────── */}
            {activeTab === 'password' && (
              <form onSubmit={handlePasswordSubmit} className="flex flex-col gap-3">
                {isRegister && (
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-medium text-slate-300 font-sans-clean">
                      Full Name
                    </label>
                    <div className="relative">
                      <User className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        required
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="Your full name"
                        className="w-full pl-9 pr-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-amber-400 font-sans-clean"
                      />
                    </div>
                  </div>
                )}

                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-slate-300 font-sans-clean">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="name@example.com"
                      className="w-full pl-9 pr-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-amber-400 font-sans-clean"
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-slate-300 font-sans-clean">
                    Password
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full pl-9 pr-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-amber-400 font-sans-clean"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 transition-colors disabled:opacity-50 cursor-pointer shadow-md font-sans-clean active:scale-[0.98] mt-1"
                >
                  {loading ? <span>Authenticating...</span> : <span>{isRegister ? 'Create Account' : 'Sign In with Password'}</span>}
                </button>

                <div className="text-center text-xs text-slate-400 font-sans-clean">
                  {isRegister ? (
                    <span>Already have an account?{' '}
                      <button
                        type="button"
                        onClick={() => setIsRegister(false)}
                        className="text-amber-400 hover:underline font-semibold cursor-pointer"
                      >
                        Sign in
                      </button>
                    </span>
                  ) : (
                    <span>New explorer?{' '}
                      <button
                        type="button"
                        onClick={() => setIsRegister(true)}
                        className="text-amber-400 hover:underline font-semibold cursor-pointer"
                      >
                        Create an account
                      </button>
                    </span>
                  )}
                </div>
              </form>
            )}

            {/* ── FOOTER: INSTANT GUEST PASS ─────────────────────────────────── */}
            <div className="pt-2 border-t border-white/5 flex items-center justify-between text-xs text-slate-400 font-sans-clean">
              <span className="text-[11px] text-slate-500">Need instant access?</span>
              <button
                type="button"
                onClick={handleGuestSignIn}
                className="text-amber-400 hover:text-amber-300 font-semibold flex items-center gap-1.5 cursor-pointer text-xs"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Instant Explorer Guest Pass</span>
              </button>
            </div>

          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
