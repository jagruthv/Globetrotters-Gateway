import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  Settings, 
  Shield, 
  Volume2, 
  VolumeX, 
  ArrowRight,
  User,
  CheckCircle,
  Mail,
  Lock
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

  const currentUser = authService.getCurrentUser();
  const isAgent = typeof window !== 'undefined' && localStorage.getItem('globetrotter_is_agent') === 'true';

  const handleSoundToggle = () => {
    const nextVal = !soundEnabled;
    setSoundEnabled(nextVal);
    localStorage.setItem('gt_sound_enabled', String(nextVal));
  };

  const handleSignOut = () => {
    authService.logout();
    onClose();
  };

  if (!isOpen) return null;

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
                Settings & Account
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

          {/* Account Profile Section */}
          <div className="flex flex-col gap-3">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider font-mono">
              Account Profile
            </span>

            {/* Tourist Capsule */}
            <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/10 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-cyan-500 to-emerald-500 flex items-center justify-center text-slate-950 font-bold text-sm shrink-0">
                  <User className="w-5 h-5 text-slate-950" />
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-xs font-bold text-white truncate font-sans-clean">
                    {currentUser?.fullName || 'Verified Explorer'}
                  </span>
                  <span className="text-[11px] text-slate-400 truncate font-mono">
                    {currentUser?.email || 'guest@globetrotter.in'}
                  </span>
                </div>
              </div>

              {currentUser && (
                <button
                  onClick={handleSignOut}
                  className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-rose-500/20 text-slate-400 hover:text-rose-300 text-[11px] transition-colors cursor-pointer shrink-0 font-sans-clean"
                >
                  Sign Out
                </button>
              )}
            </div>

            {/* Verified Auth Badges */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-white/[0.02] border border-white/5 text-xs font-sans-clean">
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-cyan-400" />
                  <span>Email & Database Authentication</span>
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-semibold flex items-center gap-1 font-mono">
                  <CheckCircle className="w-3 h-3" /> Active
                </span>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-xl bg-white/[0.02] border border-white/5 text-xs font-sans-clean">
                <div className="flex items-center gap-2">
                  <Lock className="w-4 h-4 text-emerald-400" />
                  <span>Password Security (BCrypt Hashing)</span>
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-semibold flex items-center gap-1 font-mono">
                  <CheckCircle className="w-3 h-3" /> 24/7 AWS RDS
                </span>
              </div>
            </div>
          </div>

          {/* Preferences Section */}
          <div className="flex flex-col gap-3 pt-2 border-t border-white/10">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider font-mono">
              Sound & Feedback
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
                  <span className="text-xs font-semibold text-white font-sans-clean">Scanner Audio Cues</span>
                  <span className="text-[11px] text-slate-400 font-sans-clean">Chime sound on valid ticket scans</span>
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

          {/* Field Agent Portal Section */}
          <div className="flex flex-col gap-3 pt-2 border-t border-white/10">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider font-mono">
                Field Agent Operations
              </span>
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-medium ${
                isAgent 
                  ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20' 
                  : 'bg-cyan-500/10 text-cyan-300 border border-cyan-500/20'
              }`}>
                {isAgent ? 'Accredited Agent' : 'Field Agent Access'}
              </span>
            </div>

            <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 flex flex-col gap-3">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shrink-0 mt-0.5">
                  <Shield className="w-4 h-4" />
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-xs font-bold text-white font-sans-clean">
                    Gate Turnstile Scanner
                  </span>
                  <p className="text-[11px] text-slate-400 leading-relaxed font-sans-clean">
                    {isAgent
                      ? 'Access the dedicated turnstile verification console to scan QR passes with instant green/red admittance.'
                      : 'This operational console is reserved for verified field agents and gate turnstile conductors.'}
                  </p>
                </div>
              </div>

              <button
                onClick={() => {
                  onClose();
                  if (onOpenAgentPortal) onOpenAgentPortal();
                }}
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-cyan-400 to-emerald-400 hover:opacity-95 text-slate-950 text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-sm cursor-pointer font-sans-clean"
              >
                <span>{isAgent ? 'Open Field Agent Terminal' : 'Request Agent Accreditation'}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Footer Info */}
          <div className="text-center text-[10px] text-slate-500 pt-1 border-t border-white/5 font-mono">
            Globetrotter Gateway • Version 3.2
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
