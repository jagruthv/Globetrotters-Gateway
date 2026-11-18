import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldCheck, QrCode, ArrowRight, Zap, CheckCircle2 } from 'lucide-react';
import confetti from 'canvas-confetti';
import DecryptedText from './reactbits/DecryptedText';

/**
 * PassIssuanceModal — Grounded on Reel 06 (@designmotionhq):
 * 1. Skeleton Screen preview
 * 2. Optimistic instant client update
 * 3. Non-Linear Psychological Progress Curve (Fast 0->70% in 180ms, smooth glide to 100%)
 */
export default function PassIssuanceModal({ 
  isOpen, 
  passData, 
  onClose, 
  onViewPass 
}) {
  const [phase, setPhase] = useState('skeleton'); // 'skeleton', 'accelerating', 'completed'
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!isOpen) return;

    // Step 1: Brief skeleton state (150ms)
    const t0 = setTimeout(() => {
      setPhase('accelerating');
      // Step 2: Non-linear fast start (0% to 70% in 220ms)
      setProgress(72);
    }, 150);

    // Step 3: Psychological glide to 100% (at 480ms)
    const t1 = setTimeout(() => {
      setProgress(100);
      setPhase('completed');
      try {
        confetti({
          particleCount: 50,
          spread: 60,
          origin: { y: 0.6 },
          colors: ['#00F2FE', '#05D59E', '#F59E0B']
        });
      } catch {
        // Fallback gracefully
      }
    }, 480);

    return () => {
      clearTimeout(t0);
      clearTimeout(t1);
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl">
        <motion.div
          initial={{ opacity: 0, scale: 0.92, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 12 }}
          transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
          className="relative w-full max-w-md p-6 rounded-3xl bg-[#0B0F17] border border-cyan-500/30 shadow-[0_25px_60px_rgba(0,0,0,0.8)] overflow-hidden text-slate-100"
        >
          {/* Ambient Top Glow */}
          <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-64 h-32 bg-cyan-500/20 rounded-full blur-3xl pointer-events-none" />

          {phase === 'skeleton' ? (
            /* Technique #1: Skeleton Preview */
            <div className="space-y-4 animate-pulse">
              <div className="w-12 h-12 rounded-2xl bg-white/10" />
              <div className="h-6 w-3/4 bg-white/10 rounded-lg" />
              <div className="h-4 w-1/2 bg-white/5 rounded-lg" />
              <div className="h-20 bg-white/5 rounded-2xl" />
            </div>
          ) : (
            <div className="flex flex-col gap-5">
              {/* Header Badge */}
              <div className="flex items-center justify-between">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-xs font-semibold font-sans-clean">
                  <Zap className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Optimistic Fast-Pass Issuance</span>
                </div>
                {phase === 'completed' && (
                  <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-400 font-sans-clean">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Instant Authenticated</span>
                  </span>
                )}
              </div>

              {/* Title & Target */}
              <div>
                <h3 className="text-xl font-bold text-white font-sans-clean">
                  {passData?.circuitName || 'Corridor Priority Pass'}
                </h3>
                <p className="text-xs text-slate-400 mt-1 font-sans-clean">
                  Cryptographic turnstile authorization • HMAC-SHA256 token issued in 0.48s
                </p>
              </div>

              {/* Technique #3: Non-Linear Psychological Progress Bar */}
              <div className="flex flex-col gap-1.5">
                <div className="flex justify-between text-[11px] font-telemetry">
                  <span className="text-slate-400">
                    {progress < 100 ? 'Synthesizing Biometric Hash...' : 'Pass Sealed & Signed'}
                  </span>
                  <span className="text-cyan-400 font-bold">{progress}%</span>
                </div>
                <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden">
                  <motion.div
                    className="h-full bg-gradient-to-r from-cyan-400 via-teal-400 to-emerald-400"
                    initial={{ width: '0%' }}
                    animate={{ width: `${progress}%` }}
                    transition={{
                      duration: progress === 100 ? 0.2 : 0.35,
                      ease: [0.22, 1, 0.36, 1] // Fast start curve
                    }}
                  />
                </div>
              </div>

              {/* Pass Payload Container */}
              <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 flex items-center justify-between">
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] uppercase font-share tracking-wider text-slate-400">
                    Pass Reference
                  </span>
                  <span className="font-telemetry font-bold text-cyan-300 text-sm">
                    {phase === 'completed' ? (
                      <DecryptedText text={passData?.reference || 'GT-2026-PASS'} speed={35} />
                    ) : (
                      'GT-2026-XXXXX'
                    )}
                  </span>
                  <span className="text-[11px] text-slate-400 font-sans-clean">
                    Fee: <strong className="text-white">{passData?.gateFeeTotal || 'Included'}</strong>
                  </span>
                </div>
                <div className="w-12 h-12 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center">
                  <QrCode className="w-6 h-6 text-cyan-400" />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={onViewPass}
                  disabled={phase !== 'completed'}
                  className="flex-1 py-3 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-black font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-[0_0_25px_rgba(0,242,254,0.3)] disabled:opacity-50 cursor-pointer font-sans-clean"
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>Open Holographic Pass</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-3 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-slate-300 text-xs font-semibold transition-colors cursor-pointer font-sans-clean"
                >
                  Dismiss
                </button>
              </div>

            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
