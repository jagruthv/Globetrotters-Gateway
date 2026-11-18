import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  Settings, 
  Shield, 
  Volume2, 
  VolumeX, 
  ArrowRight,
  LogOut,
  User,
  CheckCircle,
  Phone,
  Mail
} from 'lucide-react';
import { authService } from '../services/api';

export default function SettingsModal({
  isOpen,
  onClose,
  isStaffMode,
  onToggleStaffMode
}) {
  const [soundEnabled, setSoundEnabled] = useState(() => {
    return localStorage.getItem('gt_sound_enabled') !== 'false';
  });

  const currentUser = authService.getCurrentUser();
  const [linkingProvider, setLinkingProvider] = useState(null);
  const [inputVal, setInputVal] = useState('');
  const [linkSuccess, setLinkSuccess] = useState(null);

  const handleSoundToggle = () => {
    const nextVal = !soundEnabled;
    setSoundEnabled(nextVal);
    localStorage.setItem('gt_sound_enabled', String(nextVal));
  };

  const handleLinkNewAccount = (provider) => {
    if (!inputVal.trim()) return;
    authService.linkAccount(provider, inputVal.trim());
    setLinkSuccess(`Linked ${provider} successfully!`);
    setLinkingProvider(null);
    setInputVal('');
    setTimeout(() => setLinkSuccess(null), 3000);
  };

  if (!isOpen) return null;

  const linkedList = currentUser?.linkedAccounts || [
    { provider: 'email', identifier: currentUser?.email || 'guest@globetrotter.in', linkedAt: 'Active' }
  ];

  const hasGoogle = linkedList.some(a => a.provider === 'google');
  const hasWhatsApp = linkedList.some(a => a.provider === 'whatsapp' || a.provider === 'phone');
  const hasEmail = linkedList.some(a => a.provider === 'email');

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ duration: 0.2 }}
          className="relative w-full max-w-md rounded-3xl bg-[#0B0F17] border border-white/10 p-6 shadow-2xl text-slate-100 flex flex-col gap-5 max-h-[90vh] overflow-y-auto no-scrollbar"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-white/10 pb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-cyan-400">
                <Settings className="w-4 h-4" />
              </div>
              <h3 className="text-base font-bold text-white tracking-wide font-sans-clean">
                Settings & Account Hub
              </h3>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center text-slate-400 hover:text-white transition-colors cursor-pointer"
              aria-label="Close settings"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Account & Multi-Provider Linking Section */}
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider font-sans-clean">
                Linked Sign-In Methods
              </span>
              <span className="text-[10px] text-cyan-400 font-mono">
                {linkedList.length} Connected
              </span>
            </div>

            {/* Tourist Profile Capsule */}
            <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/10 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-cyan-500 to-emerald-500 flex items-center justify-center text-slate-950 font-bold text-sm shrink-0">
                <User className="w-5 h-5 text-slate-950" />
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-xs font-bold text-white truncate font-sans-clean">
                  {currentUser?.fullName || 'Verified Explorer'}
                </span>
                <span className="text-[11px] text-slate-400 truncate font-mono">
                  {currentUser?.email || 'explorer@globetrotter.in'}
                </span>
              </div>
            </div>

            {linkSuccess && (
              <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
                <CheckCircle className="w-3.5 h-3.5 shrink-0" />
                <span>{linkSuccess}</span>
              </div>
            )}

            {/* Linked Providers Badges */}
            <div className="flex flex-col gap-2">
              {/* Google */}
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-white/[0.02] border border-white/5 text-xs">
                <div className="flex items-center gap-2.5">
                  <div className="w-6 h-6 rounded-lg bg-white flex items-center justify-center shrink-0">
                    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                    </svg>
                  </div>
                  <span className="font-sans-clean font-medium">Google Account</span>
                </div>
                {hasGoogle ? (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-semibold flex items-center gap-1 font-sans-clean">
                    <CheckCircle className="w-3 h-3" /> Linked
                  </span>
                ) : (
                  <button
                    onClick={() => setLinkingProvider('google')}
                    className="text-[10px] px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-cyan-300 font-semibold cursor-pointer transition-colors"
                  >
                    + Link Google
                  </button>
                )}
              </div>

              {/* WhatsApp / Phone */}
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-white/[0.02] border border-white/5 text-xs">
                <div className="flex items-center gap-2.5">
                  <div className="w-6 h-6 rounded-lg bg-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
                    <Phone className="w-3.5 h-3.5" />
                  </div>
                  <span className="font-sans-clean font-medium">WhatsApp / Mobile</span>
                </div>
                {hasWhatsApp ? (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-semibold flex items-center gap-1 font-sans-clean">
                    <CheckCircle className="w-3 h-3" /> Linked
                  </span>
                ) : (
                  <button
                    onClick={() => setLinkingProvider('whatsapp')}
                    className="text-[10px] px-2.5 py-1 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 font-semibold cursor-pointer transition-colors"
                  >
                    + Link WhatsApp
                  </button>
                )}
              </div>

              {/* Email */}
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-white/[0.02] border border-white/5 text-xs">
                <div className="flex items-center gap-2.5">
                  <div className="w-6 h-6 rounded-lg bg-cyan-500/20 flex items-center justify-center text-cyan-400 shrink-0">
                    <Mail className="w-3.5 h-3.5" />
                  </div>
                  <span className="font-sans-clean font-medium">Email Address</span>
                </div>
                {hasEmail ? (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-semibold flex items-center gap-1 font-sans-clean">
                    <CheckCircle className="w-3 h-3" /> Linked
                  </span>
                ) : (
                  <button
                    onClick={() => setLinkingProvider('email')}
                    className="text-[10px] px-2.5 py-1 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 font-semibold cursor-pointer transition-colors"
                  >
                    + Link Email
                  </button>
                )}
              </div>

              {/* Inline Link Input Box */}
              {linkingProvider && (
                <div className="p-3 rounded-xl bg-black/40 border border-cyan-500/30 flex flex-col gap-2 mt-1">
                  <span className="text-[11px] text-cyan-300 font-medium">
                    Enter your {linkingProvider === 'google' ? 'Google email' : linkingProvider === 'whatsapp' ? 'WhatsApp phone number (+91)' : 'Email address'}:
                  </span>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={inputVal}
                      onChange={(e) => setInputVal(e.target.value)}
                      placeholder={linkingProvider === 'whatsapp' ? '+91 9876543210' : 'name@example.com'}
                      className="flex-1 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400"
                    />
                    <button
                      onClick={() => handleLinkNewAccount(linkingProvider)}
                      className="px-3 py-1.5 rounded-lg bg-cyan-400 text-slate-950 font-bold text-xs hover:bg-cyan-300 cursor-pointer"
                    >
                      Connect
                    </button>
                    <button
                      onClick={() => setLinkingProvider(null)}
                      className="px-2 py-1.5 rounded-lg bg-white/5 text-slate-400 text-xs hover:text-white cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Preferences Section */}
          <div className="flex flex-col gap-3 pt-2 border-t border-white/10">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider font-sans-clean">
              Audio Preferences
            </span>

            {/* Sound Toggle */}
            <div className="flex items-center justify-between p-3 rounded-2xl bg-white/[0.02] border border-white/5">
              <div className="flex items-center gap-3">
                {soundEnabled ? (
                  <Volume2 className="w-4 h-4 text-emerald-400" />
                ) : (
                  <VolumeX className="w-4 h-4 text-slate-500" />
                )}
                <div className="flex flex-col">
                  <span className="text-xs font-semibold text-white">Booking Chime</span>
                  <span className="text-[11px] text-slate-400">Audio cue on ticket issuance</span>
                </div>
              </div>
              <button
                onClick={handleSoundToggle}
                className={`w-11 h-6 rounded-full transition-colors relative p-0.5 cursor-pointer ${
                  soundEnabled ? 'bg-cyan-500' : 'bg-slate-700'
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

          {/* Staff & Agent Portal Section */}
          <div className="flex flex-col gap-3 pt-2 border-t border-white/10">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider font-sans-clean">
                Operations
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/20 font-medium font-mono">
                Gate Personnel
              </span>
            </div>

            <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 flex flex-col gap-3">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shrink-0 mt-0.5">
                  <Shield className="w-4 h-4" />
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-xs font-bold text-white">Staff & Agent Mode</span>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    Access the monument gate scanner to verify visitor entry passes and synchronize offline records.
                  </p>
                </div>
              </div>

              {isStaffMode ? (
                <button
                  onClick={() => {
                    onToggleStaffMode(false);
                    onClose();
                  }}
                  className="w-full py-2.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-300 text-xs font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer font-sans-clean"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Exit Staff Mode (Return to Tourist View)</span>
                </button>
              ) : (
                <button
                  onClick={() => {
                    onToggleStaffMode(true);
                    onClose();
                  }}
                  className="w-full py-2.5 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-slate-950 text-xs font-bold flex items-center justify-center gap-2 transition-colors shadow-sm cursor-pointer font-sans-clean"
                >
                  <span>Open Staff Scanner</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Footer Info */}
          <div className="text-center text-[10px] text-slate-500 pt-1 border-t border-white/5 font-mono">
            Globetrotter Gateway • Version 3.2 • Unified AP & TG
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
