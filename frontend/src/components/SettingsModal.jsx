import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  Settings, 
  Volume2, 
  VolumeX, 
  User, 
  Mail, 
  Phone, 
  RotateCcw,
  Check,
  Shield,
  Bus,
  ExternalLink
} from 'lucide-react';
import { authService } from '../services/api';

export default function SettingsModal({
  isOpen,
  onClose,
  onOpenAgentPortal,
  onOpenAuth
}) {
  const [soundEnabled, setSoundEnabled] = useState(() => {
    return localStorage.getItem('gt_sound_enabled') !== 'false';
  });

  const [currentUser, setCurrentUser] = useState(() => authService.getCurrentUser());

  // In-modal Phone Verification State
  const [isVerifyingPhone, setIsVerifyingPhone] = useState(false);
  const [phoneInput, setPhoneInput] = useState('');
  const [phoneOtpStep, setPhoneOtpStep] = useState('phone'); // 'phone' | 'otp'
  const [enteredPhoneOtp, setEnteredPhoneOtp] = useState('');
  const [dispatchedPhoneOtp, setDispatchedPhoneOtp] = useState(null);
  const [phoneError, setPhoneError] = useState(null);
  const [phoneSuccess, setPhoneSuccess] = useState(null);
  const [phoneResendTimer, setPhoneResendTimer] = useState(30);

  // In-modal Email Verification State
  const [isVerifyingEmail, setIsVerifyingEmail] = useState(false);
  const [emailInput, setEmailInput] = useState('');
  const [emailOtpStep, setEmailOtpStep] = useState('email'); // 'email' | 'otp'
  const [enteredEmailOtp, setEnteredEmailOtp] = useState('');
  const [dispatchedEmailOtp, setDispatchedEmailOtp] = useState(null);
  const [emailError, setEmailError] = useState(null);
  const [emailSuccess, setEmailSuccess] = useState(null);
  const [emailResendTimer, setEmailResendTimer] = useState(30);

  const isAgent = typeof window !== 'undefined' && localStorage.getItem('globetrotter_is_agent') === 'true';

  useEffect(() => {
    const handleAuth = () => {
      setCurrentUser(authService.getCurrentUser());
    };
    window.addEventListener('auth-change', handleAuth);
    return () => window.removeEventListener('auth-change', handleAuth);
  }, []);

  // Phone countdown timer
  useEffect(() => {
    let timer;
    if (isVerifyingPhone && phoneOtpStep === 'otp' && phoneResendTimer > 0) {
      timer = setTimeout(() => setPhoneResendTimer((prev) => prev - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [isVerifyingPhone, phoneOtpStep, phoneResendTimer]);

  // Email countdown timer
  useEffect(() => {
    let timer;
    if (isVerifyingEmail && emailOtpStep === 'otp' && emailResendTimer > 0) {
      timer = setTimeout(() => setEmailResendTimer((prev) => prev - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [isVerifyingEmail, emailOtpStep, emailResendTimer]);

  const handleSoundToggle = () => {
    const nextVal = !soundEnabled;
    setSoundEnabled(nextVal);
    localStorage.setItem('gt_sound_enabled', String(nextVal));
  };

  const handleSignOut = () => {
    authService.logout();
    setCurrentUser(null);
    onClose();
  };

  const handleSignInClick = () => {
    onClose();
    if (onOpenAuth) {
      onOpenAuth();
    } else {
      window.dispatchEvent(new CustomEvent('open-auth-modal'));
    }
  };

  // ── Phone Verification Handlers ──
  const handleStartPhoneVerification = () => {
    setIsVerifyingPhone(true);
    setIsVerifyingEmail(false);
    setPhoneOtpStep('phone');
    setPhoneInput('');
    setEnteredPhoneOtp('');
    setPhoneError(null);
    setPhoneSuccess(null);
  };

  const handleSendPhoneOtp = async (e) => {
    if (e) e.preventDefault();
    setPhoneError(null);
    try {
      const res = await authService.sendMobileOtp(phoneInput);
      setDispatchedPhoneOtp(res.demoOtp);
      setPhoneOtpStep('otp');
      setPhoneResendTimer(30);
    } catch (err) {
      setPhoneError(err.message || 'Failed to send OTP.');
    }
  };

  const handleVerifyPhoneOtp = async (e) => {
    if (e) e.preventDefault();
    setPhoneError(null);
    try {
      const updatedUser = await authService.verifyAndLinkMobile(phoneInput, enteredPhoneOtp);
      setCurrentUser(updatedUser);
      setPhoneSuccess('Mobile number connected.');
      setTimeout(() => {
        setIsVerifyingPhone(false);
        setPhoneSuccess(null);
      }, 1400);
    } catch (err) {
      setPhoneError(err.message || 'Invalid verification OTP.');
    }
  };

  // ── Email Verification Handlers ──
  const handleStartEmailVerification = () => {
    setIsVerifyingEmail(true);
    setIsVerifyingPhone(false);
    setEmailOtpStep('email');
    setEmailInput('');
    setEnteredEmailOtp('');
    setEmailError(null);
    setEmailSuccess(null);
  };

  const handleSendEmailOtp = async (e) => {
    if (e) e.preventDefault();
    setEmailError(null);
    try {
      const res = await authService.sendEmailOtp(emailInput);
      setDispatchedEmailOtp(res.devCode);
      setEmailOtpStep('otp');
      setEmailResendTimer(30);
    } catch (err) {
      setEmailError(err.message || 'Failed to send verification email.');
    }
  };

  const handleVerifyEmailOtp = async (e) => {
    if (e) e.preventDefault();
    setEmailError(null);
    try {
      const updatedUser = await authService.verifyEmailOtp(emailInput, enteredEmailOtp);
      setCurrentUser(updatedUser);
      setEmailSuccess('Email address connected.');
      setTimeout(() => {
        setIsVerifyingEmail(false);
        setEmailSuccess(null);
      }, 1400);
    } catch (err) {
      setEmailError(err.message || 'Invalid verification code.');
    }
  };

  if (!isOpen) return null;

  // Signed in check: has verified user data, not a bare guest session
  const isSignedIn = Boolean(
    currentUser &&
    !currentUser.isGuest &&
    (currentUser.email || currentUser.phoneNumber || currentUser.phone || (currentUser.token && !currentUser.token.startsWith('guest_')))
  );

  const connectedPhone = currentUser?.phoneNumber || currentUser?.phone || null;
  const connectedEmail = currentUser?.email || null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
        
        {/* CARD CONTAINER */}
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 12 }}
          transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
          className="relative w-full max-w-lg p-1.5 rounded-[2rem] bg-white/[0.05] border border-white/10 shadow-2xl text-slate-200"
        >
          {/* INNER CORE */}
          <div className="w-full max-h-[85vh] overflow-y-auto no-scrollbar rounded-[calc(2rem-0.375rem)] bg-[#090D16] p-6 sm:p-7 flex flex-col gap-6 border border-white/5 relative">
            
            {/* Header */}
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-slate-300">
                  <Settings className="w-4 h-4" />
                </div>
                <div className="flex flex-col">
                  <h3 className="text-base font-bold text-white tracking-tight font-sans-clean">
                    Account & Preferences
                  </h3>
                  <span className="text-[11px] text-slate-400 font-sans-clean">
                    Manage your traveler profile and pass delivery
                  </span>
                </div>
              </div>

              <button
                onClick={onClose}
                className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center text-slate-400 hover:text-white transition-colors cursor-pointer"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* SECTION 1: ACCOUNT PROFILE */}
            <div className="flex flex-col gap-3">
              <span className="text-xs font-semibold text-slate-400 font-sans-clean">
                Account
              </span>

              <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="w-11 h-11 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-slate-300 shrink-0">
                    <User className="w-5 h-5 text-slate-300" />
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="text-sm font-semibold text-white truncate font-sans-clean">
                      {isSignedIn ? (currentUser?.fullName || 'Traveler') : 'Guest Traveler'}
                    </span>
                    <span className="text-xs text-slate-400 truncate font-sans-clean">
                      {isSignedIn 
                        ? (currentUser?.email || currentUser?.phoneNumber || currentUser?.phone || 'Signed in')
                        : 'Sign in to save your passes across devices'
                      }
                    </span>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="text-[11px] text-slate-400 font-sans-clean">
                        {isSignedIn ? 'Signed in' : 'Not signed in'}
                      </span>
                    </div>
                  </div>
                </div>

                {isSignedIn ? (
                  <button
                    onClick={handleSignOut}
                    className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-400 hover:text-white text-xs font-medium transition-colors cursor-pointer shrink-0 font-sans-clean"
                  >
                    Sign Out
                  </button>
                ) : (
                  <button
                    onClick={handleSignInClick}
                    className="px-3.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 border border-white/15 text-white text-xs font-medium transition-colors cursor-pointer shrink-0 font-sans-clean"
                  >
                    Sign In
                  </button>
                )}
              </div>
            </div>

            {/* SECTION 2: PASS DELIVERY — ONLY SHOWN WHEN SIGNED IN */}
            {isSignedIn && (
              <div className="flex flex-col gap-3 pt-2 border-t border-white/10">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-400 font-sans-clean">
                    Pass delivery
                  </span>
                  <span className="text-[10px] text-slate-400 font-sans-clean">
                    Where we send your tickets
                  </span>
                </div>

                {/* Channel 1: Mobile & SMS */}
                <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 flex flex-col gap-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-slate-300 shrink-0 mt-0.5">
                        <Phone className="w-4 h-4" />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-xs font-semibold text-white font-sans-clean">
                          Mobile Number
                        </span>
                        <p className="text-[11px] text-slate-400 leading-relaxed font-sans-clean">
                          Receive entry tickets and gate check-in alerts on your phone.
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {connectedPhone ? (
                        <>
                          <div className="flex flex-col items-end">
                            <span className="text-xs text-slate-200 font-mono">{connectedPhone}</span>
                            <span className="text-[10px] text-slate-400">Connected</span>
                          </div>
                          <button
                            onClick={handleStartPhoneVerification}
                            className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white text-xs font-medium transition-colors cursor-pointer font-sans-clean"
                          >
                            Change
                          </button>
                        </>
                      ) : (
                        <>
                          <span className="text-[11px] text-slate-400">Not connected</span>
                          <button
                            onClick={handleStartPhoneVerification}
                            className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-slate-200 hover:text-white text-xs font-medium transition-colors cursor-pointer font-sans-clean"
                          >
                            Connect
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Inline Phone Verification Flow */}
                  {isVerifyingPhone && (
                    <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/10 flex flex-col gap-3 mt-1">
                      {phoneError && (
                        <p className="text-xs text-rose-300 bg-rose-500/10 p-2 rounded-lg font-sans-clean">
                          {phoneError}
                        </p>
                      )}
                      {phoneSuccess && (
                        <p className="text-xs text-emerald-300 bg-emerald-500/10 p-2 rounded-lg font-sans-clean flex items-center gap-1.5">
                          <Check className="w-3.5 h-3.5" />
                          <span>{phoneSuccess}</span>
                        </p>
                      )}

                      {phoneOtpStep === 'phone' ? (
                        <div className="flex flex-col gap-2">
                          <span className="text-xs text-slate-300 font-sans-clean">
                            Enter your 10-digit mobile number:
                          </span>
                          <div className="flex items-center gap-2">
                            <span className="px-2.5 py-2 rounded-lg bg-white/5 border border-white/10 text-xs font-mono text-slate-400">+91</span>
                            <input
                              type="tel"
                              maxLength={10}
                              value={phoneInput}
                              onChange={(e) => setPhoneInput(e.target.value.replace(/\D/g, '').slice(0, 10))}
                              placeholder="98765 43210"
                              className="flex-1 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white placeholder-slate-500 text-xs font-mono focus:outline-none focus:border-white/30"
                            />
                            <button
                              onClick={handleSendPhoneOtp}
                              disabled={phoneInput.length !== 10}
                              className="px-3.5 py-2 rounded-lg bg-white/10 hover:bg-white/15 border border-white/15 text-white font-medium text-xs disabled:opacity-40 cursor-pointer font-sans-clean transition-colors"
                            >
                              Send OTP
                            </button>
                            <button
                              onClick={() => setIsVerifyingPhone(false)}
                              className="px-2.5 py-2 rounded-lg bg-transparent text-slate-400 text-xs hover:text-white cursor-pointer"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-col gap-2.5">
                          <div className="flex items-center justify-between text-xs text-slate-300">
                            <span>Enter code sent to +91 {phoneInput}:</span>
                            {dispatchedPhoneOtp && (
                              <button
                                onClick={() => setEnteredPhoneOtp(dispatchedPhoneOtp)}
                                className="text-[10px] text-slate-400 hover:text-slate-200 underline font-mono"
                              >
                                Autofill ({dispatchedPhoneOtp})
                              </button>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <input
                              type="text"
                              maxLength={6}
                              value={enteredPhoneOtp}
                              onChange={(e) => setEnteredPhoneOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                              placeholder="6-digit code"
                              className="flex-1 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm font-mono tracking-widest text-center focus:outline-none focus:border-white/30"
                            />
                            <button
                              onClick={handleVerifyPhoneOtp}
                              disabled={enteredPhoneOtp.length !== 6}
                              className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/15 border border-white/15 text-white font-medium text-xs disabled:opacity-40 cursor-pointer font-sans-clean transition-colors"
                            >
                              Verify
                            </button>
                          </div>
                          <div className="text-[11px] text-slate-400 flex items-center justify-between">
                            <span>Resend in {phoneResendTimer}s</span>
                            {phoneResendTimer === 0 && (
                              <button onClick={handleSendPhoneOtp} className="text-slate-300 hover:text-white hover:underline flex items-center gap-1 cursor-pointer">
                                <RotateCcw className="w-3 h-3" /> Resend
                              </button>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Channel 2: Email Address */}
                <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 flex flex-col gap-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-slate-300 shrink-0 mt-0.5">
                        <Mail className="w-4 h-4" />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-xs font-semibold text-white font-sans-clean">
                          Email Address
                        </span>
                        <p className="text-[11px] text-slate-400 leading-relaxed font-sans-clean">
                          Receive booking confirmations and pass receipts.
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {connectedEmail ? (
                        <>
                          <div className="flex flex-col items-end">
                            <span className="text-xs text-slate-200 font-mono truncate max-w-[150px] sm:max-w-[190px]">{connectedEmail}</span>
                            <span className="text-[10px] text-slate-400">Connected</span>
                          </div>
                          <button
                            onClick={handleStartEmailVerification}
                            className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white text-xs font-medium transition-colors cursor-pointer font-sans-clean"
                          >
                            Change
                          </button>
                        </>
                      ) : (
                        <>
                          <span className="text-[11px] text-slate-400">Not connected</span>
                          <button
                            onClick={handleStartEmailVerification}
                            className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-slate-200 hover:text-white text-xs font-medium transition-colors cursor-pointer font-sans-clean"
                          >
                            Connect
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Inline Email Verification Flow */}
                  {isVerifyingEmail && (
                    <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/10 flex flex-col gap-3 mt-1">
                      {emailError && (
                        <p className="text-xs text-rose-300 bg-rose-500/10 p-2 rounded-lg font-sans-clean">
                          {emailError}
                        </p>
                      )}
                      {emailSuccess && (
                        <p className="text-xs text-emerald-300 bg-emerald-500/10 p-2 rounded-lg font-sans-clean flex items-center gap-1.5">
                          <Check className="w-3.5 h-3.5" />
                          <span>{emailSuccess}</span>
                        </p>
                      )}

                      {emailOtpStep === 'email' ? (
                        <div className="flex flex-col gap-2">
                          <span className="text-xs text-slate-300 font-sans-clean">
                            Enter your email address:
                          </span>
                          <div className="flex items-center gap-2">
                            <input
                              type="email"
                              value={emailInput}
                              onChange={(e) => setEmailInput(e.target.value)}
                              placeholder="traveler@example.com"
                              className="flex-1 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white placeholder-slate-500 text-xs font-sans-clean focus:outline-none focus:border-white/30"
                            />
                            <button
                              onClick={handleSendEmailOtp}
                              disabled={!emailInput.includes('@')}
                              className="px-3.5 py-2 rounded-lg bg-white/10 hover:bg-white/15 border border-white/15 text-white font-medium text-xs disabled:opacity-40 cursor-pointer font-sans-clean transition-colors"
                            >
                              Send Code
                            </button>
                            <button
                              onClick={() => setIsVerifyingEmail(false)}
                              className="px-2.5 py-2 rounded-lg bg-transparent text-slate-400 text-xs hover:text-white cursor-pointer"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-col gap-2.5">
                          <div className="flex items-center justify-between text-xs text-slate-300">
                            <span>Enter code sent to {emailInput}:</span>
                            {dispatchedEmailOtp && (
                              <button
                                onClick={() => setEnteredEmailOtp(dispatchedEmailOtp)}
                                className="text-[10px] text-slate-400 hover:text-slate-200 underline font-mono"
                              >
                                Autofill ({dispatchedEmailOtp})
                              </button>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <input
                              type="text"
                              maxLength={6}
                              value={enteredEmailOtp}
                              onChange={(e) => setEnteredEmailOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                              placeholder="6-digit code"
                              className="flex-1 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm font-mono tracking-widest text-center focus:outline-none focus:border-white/30"
                            />
                            <button
                              onClick={handleVerifyEmailOtp}
                              disabled={enteredEmailOtp.length !== 6}
                              className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/15 border border-white/15 text-white font-medium text-xs disabled:opacity-40 cursor-pointer font-sans-clean transition-colors"
                            >
                              Verify
                            </button>
                          </div>
                          <div className="text-[11px] text-slate-400 flex items-center justify-between">
                            <span>Resend in {emailResendTimer}s</span>
                            {emailResendTimer === 0 && (
                              <button onClick={handleSendEmailOtp} className="text-slate-300 hover:text-white hover:underline flex items-center gap-1 cursor-pointer">
                                <RotateCcw className="w-3 h-3" /> Resend
                              </button>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* SECTION 3: AUDIO & SOUND */}
            <div className="flex flex-col gap-3 pt-2 border-t border-white/10">
              <span className="text-xs font-semibold text-slate-400 font-sans-clean">
                Sound effects
              </span>

              <div className="flex items-center justify-between p-3.5 rounded-2xl bg-white/[0.02] border border-white/5">
                <div className="flex items-center gap-3">
                  {soundEnabled ? (
                    <Volume2 className="w-4 h-4 text-slate-300" />
                  ) : (
                    <VolumeX className="w-4 h-4 text-slate-500" />
                  )}
                  <div className="flex flex-col">
                    <span className="text-xs font-semibold text-white font-sans-clean">
                      Sound Effects
                    </span>
                    <span className="text-[11px] text-slate-400 font-sans-clean">
                      Audio chimes when booking passes and scanning tickets
                    </span>
                  </div>
                </div>
                <button
                  onClick={handleSoundToggle}
                  className={`w-11 h-6 rounded-full transition-colors relative p-0.5 cursor-pointer ${
                    soundEnabled ? 'bg-slate-600' : 'bg-slate-800'
                  }`}
                  aria-label="Toggle sound"
                >
                  <div
                    className={`w-5 h-5 rounded-full bg-white transition-transform ${
                      soundEnabled ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            </div>

            {/* SECTION 4: OFFICIAL REGIONAL TRANSIT & BUS TRACKING */}
            <div className="flex flex-col gap-3 pt-2 border-t border-white/10">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-400 font-sans-clean">
                  State Transit & Bus Tracking
                </span>
                <span className="text-[10px] font-mono text-amber-300/80 bg-amber-400/10 px-2 py-0.5 rounded-full border border-amber-400/20">
                  APSRTC & TSRTC Portals
                </span>
              </div>

              <div className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/5 flex flex-col gap-3">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-400/20 flex items-center justify-center text-amber-400 shrink-0 mt-0.5">
                    <Bus className="w-4 h-4" />
                  </div>
                  <div className="flex flex-col gap-1 text-xs">
                    <span className="font-semibold text-white font-sans-clean">
                      Live Highway & Intercity Bus Portals
                    </span>
                    <p className="text-[11px] text-slate-400 font-sans-clean leading-relaxed">
                      APSRTC and TSRTC operate verified GPS fleet trackers across all 59 districts. Use these official links and hotlines for live bus schedules and seat booking:
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                  <a
                    href="https://www.apsrtconline.in/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2.5 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/10 flex items-center justify-between text-xs text-slate-200 transition-colors group"
                  >
                    <div className="flex flex-col">
                      <span className="font-bold text-amber-300">APSRTC Live Portal</span>
                      <span className="text-[10px] text-slate-400">Andhra Pradesh Buses</span>
                    </div>
                    <ExternalLink className="w-3.5 h-3.5 text-slate-400 group-hover:text-amber-300 transition-colors" />
                  </a>

                  <a
                    href="https://tsrtconline.in/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2.5 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/10 flex items-center justify-between text-xs text-slate-200 transition-colors group"
                  >
                    <div className="flex flex-col">
                      <span className="font-bold text-cyan-300">TSRTC Gamyam Tracker</span>
                      <span className="text-[10px] text-slate-400">Telangana Live Tracking</span>
                    </div>
                    <ExternalLink className="w-3.5 h-3.5 text-slate-400 group-hover:text-cyan-300 transition-colors" />
                  </a>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-white/5 text-[11px] text-slate-400 font-sans-clean">
                  <div className="flex items-center gap-1.5">
                    <Phone className="w-3 h-3 text-slate-500" />
                    <span>APSRTC Helpline: <a href="tel:08662570005" className="text-amber-300 hover:underline font-mono">0866-2570005</a></span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Phone className="w-3 h-3 text-slate-500" />
                    <span>TSRTC Helpline: <a href="tel:04069440000" className="text-cyan-300 hover:underline font-mono">040-69440000</a></span>
                  </div>
                </div>
              </div>
            </div>

            {/* SECTION 5: AGENT MODE (Staff gate access) */}
            <div className="flex flex-col gap-3 pt-2 border-t border-white/10">
              <span className="text-xs font-semibold text-slate-400 font-sans-clean">
                Gate Staff Portal
              </span>

              <div className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/5 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-slate-400 shrink-0">
                    <Shield className="w-4 h-4" />
                  </div>
                  <div className="flex flex-col min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-white font-sans-clean">
                        Agent Mode
                      </span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-sans-clean border ${
                        isAgent 
                          ? 'bg-white/10 text-slate-200 border-white/15'
                          : 'bg-white/[0.03] text-slate-400 border-white/5'
                      }`}>
                        {isAgent ? 'Active' : 'Off'}
                      </span>
                    </div>
                    <span className="text-[11px] text-slate-400 font-sans-clean truncate">
                      Ticket verification for monument gate officers
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => {
                    onClose();
                    if (onOpenAgentPortal) {
                      onOpenAgentPortal();
                    }
                  }}
                  className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white text-xs font-medium transition-colors cursor-pointer shrink-0 font-sans-clean"
                >
                  {isAgent ? 'Open Scanner' : 'Staff Login'}
                </button>
              </div>
            </div>

            {/* Footer */}
            <div className="text-center text-[10px] text-slate-500 pt-1 border-t border-white/5 font-mono">
              Globetrotter Gateway • Unified Andhra Pradesh & Telangana
            </div>

          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
