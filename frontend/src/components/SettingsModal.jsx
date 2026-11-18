import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  Settings, 
  Volume2, 
  VolumeX, 
  User,
  CheckCircle2,
  Mail,
  Phone,
  RotateCcw
} from 'lucide-react';
import { authService } from '../services/api';

export default function SettingsModal({
  isOpen,
  onClose,
  onOpenAgentPortal
}) {
  const [soundEnabled, setSoundEnabled] = useState(() => {
    return localStorage.getItem('gt_sound_enabled') !== 'false';
  });

  const [currentUser, setCurrentUser] = useState(() => authService.getCurrentUser());

  // In-modal Mobile Verification State
  const [isVerifyingPhone, setIsVerifyingPhone] = useState(false);
  const [phoneInput, setPhoneInput] = useState('');
  const [otpStep, setOtpStep] = useState('phone'); // 'phone' | 'otp'
  const [enteredOtp, setEnteredOtp] = useState('');
  const [dispatchedOtp, setDispatchedOtp] = useState(null);
  const [phoneError, setPhoneError] = useState(null);
  const [phoneSuccess, setPhoneSuccess] = useState(null);
  const [resendTimer, setResendTimer] = useState(30);

  const isAgent = typeof window !== 'undefined' && localStorage.getItem('globetrotter_is_agent') === 'true';

  useEffect(() => {
    const handleAuth = () => {
      setCurrentUser(authService.getCurrentUser());
    };
    window.addEventListener('auth-change', handleAuth);
    return () => window.removeEventListener('auth-change', handleAuth);
  }, []);

  useEffect(() => {
    let timer;
    if (isVerifyingPhone && otpStep === 'otp' && resendTimer > 0) {
      timer = setTimeout(() => setResendTimer((prev) => prev - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [isVerifyingPhone, otpStep, resendTimer]);

  const handleSoundToggle = () => {
    const nextVal = !soundEnabled;
    setSoundEnabled(nextVal);
    localStorage.setItem('gt_sound_enabled', String(nextVal));
  };

  const handleSignOut = () => {
    authService.logout();
    onClose();
  };

  const handleStartPhoneVerification = () => {
    setIsVerifyingPhone(true);
    setOtpStep('phone');
    setPhoneInput('');
    setEnteredOtp('');
    setPhoneError(null);
    setPhoneSuccess(null);
  };

  const handleSendLinkOtp = async (e) => {
    if (e) e.preventDefault();
    setPhoneError(null);
    try {
      const res = await authService.sendMobileOtp(phoneInput);
      setDispatchedOtp(res.demoOtp);
      setOtpStep('otp');
      setResendTimer(30);
    } catch (err) {
      setPhoneError(err.message || 'Failed to send OTP.');
    }
  };

  const handleVerifyLinkOtp = async (e) => {
    if (e) e.preventDefault();
    setPhoneError(null);
    try {
      const updatedUser = await authService.verifyAndLinkMobile(phoneInput, enteredOtp);
      setCurrentUser(updatedUser);
      setPhoneSuccess('Mobile number verified & linked for WhatsApp tickets!');
      setTimeout(() => {
        setIsVerifyingPhone(false);
        setPhoneSuccess(null);
      }, 1500);
    } catch (err) {
      setPhoneError(err.message || 'Invalid verification OTP.');
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-xl">
        
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
                <div className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-amber-400">
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
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider font-mono">
                Account
              </span>

              <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="w-12 h-12 rounded-2xl bg-amber-400/20 border border-amber-400/30 flex items-center justify-center text-amber-300 font-bold text-lg shadow-md shrink-0">
                    <User className="w-6 h-6 text-amber-300" />
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="text-sm font-bold text-white truncate font-sans-clean">
                      {currentUser?.fullName || 'Guest Traveler'}
                    </span>
                    <span className="text-xs text-slate-400 truncate font-sans-clean">
                      {currentUser?.email || currentUser?.phone || 'Sign in to save your passes across devices'}
                    </span>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className={`w-1.5 h-1.5 rounded-full ${currentUser ? 'bg-emerald-400' : 'bg-amber-400'}`} />
                      <span className={`text-[10px] font-sans-clean font-medium ${currentUser ? 'text-emerald-400' : 'text-amber-400'}`}>
                        {currentUser ? 'Signed In' : 'Guest'}
                      </span>
                    </div>
                  </div>
                </div>

                {currentUser ? (
                  <button
                    onClick={handleSignOut}
                    className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-rose-500/20 text-slate-400 hover:text-rose-300 text-xs font-semibold transition-colors cursor-pointer shrink-0 font-sans-clean"
                  >
                    Sign Out
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      onClose();
                      window.dispatchEvent(new CustomEvent('open-auth-modal'));
                    }}
                    className="px-3 py-1.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-bold transition-all cursor-pointer shrink-0 font-sans-clean shadow-sm"
                  >
                    Sign In
                  </button>
                )}
              </div>
            </div>

            {/* SECTION 2: PASS DELIVERY */}
            <div className="flex flex-col gap-3 pt-2 border-t border-white/10">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider font-mono">
                  Pass Delivery
                </span>
                <span className="text-[10px] text-slate-400 font-sans-clean">
                  Where we send your tickets
                </span>
              </div>

              {/* Channel 1: Mobile & WhatsApp */}
              <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 flex flex-col gap-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0 mt-0.5">
                      <Phone className="w-4 h-4" />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-xs font-bold text-white font-sans-clean">
                        Mobile Number
                      </span>
                      <p className="text-[11px] text-slate-400 leading-relaxed font-sans-clean">
                        Receive entry tickets and gate check-in alerts on your phone.
                      </p>
                    </div>
                  </div>

                  {currentUser?.phone ? (
                    <span className="px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-mono font-semibold flex items-center gap-1 shrink-0">
                      <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                      <span>{currentUser.phone}</span>
                    </span>
                  ) : (
                    <button
                      onClick={handleStartPhoneVerification}
                      className="px-3 py-1.5 rounded-xl bg-emerald-400 text-slate-950 font-bold text-xs hover:bg-emerald-300 transition-colors cursor-pointer shrink-0 font-sans-clean"
                    >
                      + Add Mobile
                    </button>
                  )}
                </div>

                {/* Inline Phone OTP Verification Sub-Flow */}
                {isVerifyingPhone && (
                  <div className="p-3.5 rounded-xl bg-black/40 border border-emerald-500/30 flex flex-col gap-3 mt-1 animate-in fade-in">
                    
                    {phoneError && (
                      <p className="text-xs text-rose-300 bg-rose-500/10 p-2 rounded-lg font-sans-clean">
                        {phoneError}
                      </p>
                    )}
                    {phoneSuccess && (
                      <p className="text-xs text-emerald-300 bg-emerald-500/10 p-2 rounded-lg font-sans-clean">
                        {phoneSuccess}
                      </p>
                    )}

                    {otpStep === 'phone' ? (
                      <div className="flex flex-col gap-2">
                        <span className="text-xs text-slate-300 font-sans-clean">
                          Enter your 10-digit number to receive a verification OTP:
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="px-2.5 py-2 rounded-lg bg-white/5 border border-white/10 text-xs font-mono">🇮🇳 +91</span>
                          <input
                            type="tel"
                            maxLength={10}
                            value={phoneInput}
                            onChange={(e) => setPhoneInput(e.target.value.replace(/\D/g, '').slice(0, 10))}
                            placeholder="98765 43210"
                            className="flex-1 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white placeholder-slate-500 text-xs font-mono focus:outline-none focus:border-emerald-400"
                          />
                          <button
                            onClick={handleSendLinkOtp}
                            disabled={phoneInput.length !== 10}
                            className="px-3.5 py-2 rounded-lg bg-emerald-400 text-slate-950 font-bold text-xs hover:bg-emerald-300 disabled:opacity-40 cursor-pointer font-sans-clean"
                          >
                            Send OTP
                          </button>
                          <button
                            onClick={() => setIsVerifyingPhone(false)}
                            className="px-2.5 py-2 rounded-lg bg-white/5 text-slate-400 text-xs hover:text-white cursor-pointer"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col gap-2.5">
                        <div className="flex items-center justify-between text-xs text-slate-300">
                          <span>Enter code sent to +91 {phoneInput}:</span>
                          {dispatchedOtp && (
                            <button
                              onClick={() => setEnteredOtp(dispatchedOtp)}
                              className="text-[10px] text-emerald-400 underline font-mono"
                            >
                              Autofill ({dispatchedOtp})
                            </button>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            maxLength={6}
                            value={enteredOtp}
                            onChange={(e) => setEnteredOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                            placeholder="6-digit code"
                            className="flex-1 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm font-mono tracking-widest text-center focus:outline-none focus:border-emerald-400"
                          />
                          <button
                            onClick={handleVerifyLinkOtp}
                            disabled={enteredOtp.length !== 6}
                            className="px-4 py-2 rounded-lg bg-emerald-400 text-slate-950 font-bold text-xs hover:bg-emerald-300 disabled:opacity-40 cursor-pointer font-sans-clean"
                          >
                            Verify & Link
                          </button>
                        </div>
                        <div className="text-[11px] text-slate-400 flex items-center justify-between">
                          <span>Resend in {resendTimer}s</span>
                          {resendTimer === 0 && (
                            <button onClick={handleSendLinkOtp} className="text-amber-400 hover:underline flex items-center gap-1 cursor-pointer">
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
              <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 flex items-center justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-400/20 flex items-center justify-center text-amber-400 shrink-0 mt-0.5">
                    <Mail className="w-4 h-4" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-white font-sans-clean">
                      Email Address
                    </span>
                    <p className="text-[11px] text-slate-400 leading-relaxed font-sans-clean">
                      Receive booking confirmations and pass receipts.
                    </p>
                  </div>
                </div>

                {currentUser?.email ? (
                  <span className="px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 text-[10px] font-mono font-medium shrink-0 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                    <span>{currentUser.email}</span>
                  </span>
                ) : (
                  <span className="px-2.5 py-1 rounded-full bg-white/[0.04] text-slate-400 border border-white/10 text-[10px] font-sans-clean font-medium shrink-0">
                    Not Connected
                  </span>
                )}
              </div>
            </div>

            {/* SECTION 3: AUDIO & SOUND */}
            <div className="flex flex-col gap-3 pt-2 border-t border-white/10">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider font-mono">
                Sound Effects
              </span>

              <div className="flex items-center justify-between p-3 rounded-2xl bg-white/[0.02] border border-white/5">
                <div className="flex items-center gap-3">
                  {soundEnabled ? (
                    <Volume2 className="w-4 h-4 text-emerald-400" />
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
                    soundEnabled ? 'bg-emerald-500' : 'bg-slate-700'
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

            {/* AGENT MODE */}
            <div className="pt-3 border-t border-white/10 flex items-center justify-between">
              <div className="flex flex-col">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-white font-sans-clean">Agent Mode</span>
                  <span className={`text-[9px] px-2 py-0.5 rounded-full font-mono font-semibold ${
                    isAgent
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      : 'bg-amber-500/10 text-amber-300 border border-amber-500/20'
                  }`}>
                    {isAgent ? 'Active' : 'Off'}
                  </span>
                </div>
                <span className="text-[11px] text-slate-400 font-sans-clean">
                  Ticket scanning for gate conductors & verified staff
                </span>
              </div>
              <button
                onClick={() => {
                  onClose();
                  if (onOpenAgentPortal) onOpenAgentPortal();
                }}
                className="px-3.5 py-1.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-bold transition-all shadow-sm cursor-pointer font-sans-clean active:scale-95"
              >
                {isAgent ? 'Open Agent Mode' : 'Switch to Agent Mode'}
              </button>
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
