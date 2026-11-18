import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  Settings, 
  Shield, 
  Volume2, 
  VolumeX, 
  ArrowRight,
  LogOut
} from 'lucide-react';

export default function SettingsModal({
  isOpen,
  onClose,
  isStaffMode,
  onToggleStaffMode
}) {
  const [soundEnabled, setSoundEnabled] = useState(() => {
    return localStorage.getItem('gt_sound_enabled') !== 'false';
  });

  const handleSoundToggle = () => {
    const nextVal = !soundEnabled;
    setSoundEnabled(nextVal);
    localStorage.setItem('gt_sound_enabled', String(nextVal));
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
          className="relative w-full max-w-md rounded-3xl bg-[#0B0F17] border border-white/10 p-6 shadow-2xl text-slate-100 flex flex-col gap-6"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-white/10 pb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-cyan-400">
                <Settings className="w-4 h-4" />
              </div>
              <h3 className="text-base font-bold text-white tracking-wide font-sans-clean">
                Settings & Preferences
              </h3>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center text-slate-400 hover:text-white transition-colors"
              aria-label="Close settings"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Preferences Section */}
          <div className="flex flex-col gap-4">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider font-sans-clean">
              Experience
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
                  <span className="text-xs font-semibold text-white">Audio & Sound Cues</span>
                  <span className="text-[11px] text-slate-400">Play confirmation chime on ticket bookings</span>
                </div>
              </div>
              <button
                onClick={handleSoundToggle}
                className={`w-11 h-6 rounded-full transition-colors relative p-0.5 ${
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
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/20 font-medium">
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
                  className="w-full py-2.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-300 text-xs font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer"
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
                  className="w-full py-2.5 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-slate-950 text-xs font-bold flex items-center justify-center gap-2 transition-colors shadow-sm cursor-pointer"
                >
                  <span>Open Staff Scanner</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Footer Info */}
          <div className="text-center text-[10px] text-slate-500 pt-1 border-t border-white/5">
            Globetrotter Gateway • Version 3.2
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
