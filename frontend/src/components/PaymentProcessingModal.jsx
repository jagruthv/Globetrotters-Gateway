import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, CheckCircle2, Zap, CreditCard, Sparkles, Loader2, FlaskConical } from 'lucide-react';
import confetti from 'canvas-confetti';
import { generateCryptographicPassToken } from '../utils/cryptoPassService';

function playBookingSuccessSound() {
  try {
    const soundPref = localStorage.getItem('gt_sound_enabled');
    if (soundPref === 'false') return;

    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    // Uplifting melodic booking confirmation chime (C5 -> E5 -> G5)
    osc.type = 'sine';
    osc.frequency.setValueAtTime(523.25, ctx.currentTime);
    osc.frequency.setValueAtTime(659.25, ctx.currentTime + 0.09);
    osc.frequency.setValueAtTime(783.99, ctx.currentTime + 0.18);

    gain.gain.setValueAtTime(0.12, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.42);

    osc.start();
    osc.stop(ctx.currentTime + 0.42);
  } catch {
    // Audio autoplay restrictions ignored
  }
}

export default function PaymentProcessingModal({
  isOpen,
  onClose,
  bookingDetails,
  onPaymentSuccess
}) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(5);
  const [paymentFinished, setPaymentFinished] = useState(false);
  const timerRef = useRef(null);

  const rawVal = bookingDetails?.totalAmount !== undefined ? bookingDetails.totalAmount : bookingDetails?.price;
  let parsedAmount = 0;
  if (rawVal !== undefined && rawVal !== null) {
    if (rawVal === 0 || rawVal === '0' || rawVal === '₹0' || String(rawVal).toLowerCase().includes('free')) {
      parsedAmount = 0;
    } else {
      const parsed = parseFloat(String(rawVal).replace(/[^0-9.]/g, ''));
      parsedAmount = Number.isFinite(parsed) ? parsed : 0;
    }
  }

  const [prevIsOpen, setPrevIsOpen] = useState(isOpen);
  if (isOpen !== prevIsOpen) {
    setPrevIsOpen(isOpen);
    if (isOpen) {
      setIsProcessing(false);
      setSecondsLeft(5);
      setPaymentFinished(false);
    }
  }

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const completeBooking = useCallback(async (paymentMethod = 'PAID_ONLINE', customRefNumber = null) => {
    const randomCode = Math.random().toString(36).substring(2, 7).toUpperCase();
    const destinations = bookingDetails?.destinations || ['Cultural Heritage Gate'];
    const circuitName = bookingDetails?.circuitName || 'Official Monument Pass';
    const touristName = bookingDetails?.touristName || 'Verified Visitor';
    const numTourists = bookingDetails?.touristCount || 1;
    const refNumber = customRefNumber || `GT-${new Date().getFullYear()}-${randomCode}`;
    const today = new Date().toISOString().split('T')[0];
    
    // Calculate authentic trip validity window matching user-selected visit date and trip duration
    const startDate = (bookingDetails?.date && String(bookingDetails.date).match(/^\d{4}-\d{2}-\d{2}$/))
      ? String(bookingDetails.date)
      : (bookingDetails?.date === 'Tomorrow'
        ? new Date(Date.now() + 86400000).toISOString().split('T')[0]
        : today);

    const durationDays = Math.max(1, parseInt(bookingDetails?.durationDays || bookingDetails?.days || 1, 10));
    const startMs = new Date(startDate + 'T00:00:00').getTime();
    const endMs = startMs + (durationDays - 1) * 24 * 60 * 60 * 1000;
    const validUntil = new Date(endMs).toISOString().split('T')[0];

    // Generate real cryptographic HMAC-SHA256 signed pass token
    let signedToken = '';
    const targetPlaceId = Number(bookingDetails?.circuitId || bookingDetails?.placeId || 1);
    try {
      signedToken = await generateCryptographicPassToken(refNumber, targetPlaceId, numTourists);
    } catch {
      signedToken = refNumber;
    }

    const isCounterPay = paymentMethod === 'PAY_AT_COUNTER';
    const feeLabel = parsedAmount === 0 
      ? 'Free Public Entry (₹0.00)' 
      : isCounterPay 
        ? `₹${parsedAmount}.00 (Pay at Gate)` 
        : `₹${parsedAmount}.00 (Official Paid Entry)`;

    const passPayload = {
      reference: refNumber,
      token: signedToken,
      circuitName: circuitName,
      touristName: touristName,
      touristCount: numTourists,
      gateFeeTotal: feeLabel,
      validFrom: startDate,
      validUntil: validUntil,
      durationDays: durationDays,
      validityLabel: durationDays === 1 ? `Valid on ${startDate}` : `Valid for ${durationDays} Days (${startDate} to ${validUntil})`,
      placesAllowed: destinations,
      status: isCounterPay ? 'PENDING_GATE_PAYMENT' : 'ACTIVE_AUTHENTICATED'
    };

    try {
      const stored = localStorage.getItem('globetrotter_passes');
      const list = stored ? JSON.parse(stored) : [];
      const updated = [passPayload, ...(Array.isArray(list) ? list.filter(p => p && p.reference !== passPayload.reference) : [])];
      localStorage.setItem('globetrotter_passes', JSON.stringify(updated));
    } catch (e) {
      if (import.meta.env.DEV) console.warn('Failed to persist pass:', e);
    }

    setPaymentFinished(true);
    playBookingSuccessSound();
    try {
      confetti({ particleCount: 75, spread: 65, origin: { y: 0.6 }, disableForReducedMotion: true, useWorker: false });
    } catch {
      // Confetti fallback
    }

    setTimeout(() => {
      if (onPaymentSuccess) {
        onPaymentSuccess(passPayload);
      }
    }, 600);
  }, [bookingDetails, onPaymentSuccess, parsedAmount]);

  // Start 5-second simulated test payment
  const handleStartSimulatedPayment = () => {
    setIsProcessing(true);
    setSecondsLeft(5);

    if (timerRef.current) clearInterval(timerRef.current);

    let remaining = 5;
    timerRef.current = setInterval(() => {
      remaining -= 1;
      setSecondsLeft(remaining);

      if (remaining <= 0) {
        clearInterval(timerRef.current);
        const randomCode = Math.random().toString(36).substring(2, 7).toUpperCase();
        const refNumber = `GT-${new Date().getFullYear()}-${randomCode}`;
        completeBooking('PAID_ONLINE', refNumber);
      }
    }, 1000);
  };

  const handlePayAtCounter = () => {
    completeBooking('PAY_AT_COUNTER');
  };

  const handleFreePassIssuance = () => {
    completeBooking('FREE_PASS');
  };

  if (!isOpen) return null;

  const progressPercent = Math.min(100, Math.max(0, ((5 - secondsLeft) / 5) * 100));

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 12 }}
          className="relative w-full max-w-md bg-[#0B0F17] border border-white/10 rounded-3xl p-6 sm:p-7 shadow-2xl text-white font-sans-clean flex flex-col gap-5 overflow-hidden"
        >
          {/* Close button */}
          <button
            onClick={onClose}
            disabled={isProcessing || paymentFinished}
            className="absolute top-5 right-5 w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center text-slate-400 hover:text-white transition-colors cursor-pointer disabled:opacity-30"
          >
            <X className="w-4 h-4" />
          </button>

          {/* ── STATE A: ACTIVE 5-SECOND PROCESSING ANIMATION ── */}
          {isProcessing ? (
            <div className="flex flex-col items-center text-center py-6 gap-5">
              <div className="relative w-20 h-20 flex items-center justify-center">
                <div className="absolute inset-0 rounded-full border-4 border-amber-500/20 animate-pulse" />
                <div 
                  className="absolute inset-0 rounded-full border-4 border-amber-400 border-t-transparent animate-spin"
                  style={{ animationDuration: '1.2s' }}
                />
                <Loader2 className="w-8 h-8 text-amber-400 animate-spin" />
              </div>

              <div className="flex flex-col gap-1.5">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-400/20 text-amber-300 text-[11px] font-mono mx-auto">
                  <FlaskConical className="w-3.5 h-3.5 text-amber-400 animate-bounce" />
                  <span>Demo Mode • Instant Pass</span>
                </div>
                
                <h3 className="text-xl font-bold tracking-tight text-white mt-1">
                  Processing Pass...
                </h3>

                <p className="text-xs text-slate-400 font-mono">
                  {secondsLeft > 3 && 'Connecting to ticket gateway...'}
                  {secondsLeft === 3 && 'Validating visitor credentials...'}
                  {secondsLeft === 2 && 'Generating verified digital pass...'}
                  {secondsLeft === 1 && 'Finalizing entry barcode...'}
                  {secondsLeft <= 0 && 'Verified! Issuing pass...'}
                </p>
              </div>

              {/* 5-Second Animated Progress Bar */}
              <div className="w-full flex flex-col gap-1.5">
                <div className="w-full h-2 rounded-full bg-white/5 overflow-hidden border border-white/10">
                  <motion.div
                    className="h-full bg-gradient-to-r from-amber-500 to-emerald-400 rounded-full"
                    initial={{ width: '0%' }}
                    animate={{ width: `${progressPercent}%` }}
                    transition={{ ease: 'linear', duration: 0.9 }}
                  />
                </div>
                <div className="flex justify-between items-center text-[10px] text-slate-500 font-mono">
                  <span>Processing digital pass</span>
                  <span className="text-amber-400 font-bold">{secondsLeft}s</span>
                </div>
              </div>

              <div className="text-[11px] text-slate-400 bg-white/[0.02] border border-white/5 rounded-xl p-2.5 w-full text-center">
                Generating official digital pass with verified QR code.
              </div>
            </div>
          ) : (
            /* ── STATE B: INITIAL SELECTION / CONFIRMATION ── */
            <>
              {/* Header */}
              <div className="flex flex-col items-center text-center gap-1.5 pt-1">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-400/20 text-amber-300 text-[11px] font-semibold">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  <span>Instant Digital Pass</span>
                </div>
                <h3 className="text-xl font-bold tracking-tight text-white mt-1">
                  {parsedAmount === 0 ? 'Official Free Admission Pass' : 'Confirm Entry Pass'}
                </h3>
                <p className="text-xs text-slate-400 max-w-xs">
                  {parsedAmount === 0 
                    ? 'Direct digital admission pass for public heritage sights.'
                    : 'Get your official entry pass instantly on your device.'}
                </p>
              </div>

              {/* Booking Summary Box */}
              <div className="p-4 rounded-2xl bg-[#0E121A] border border-white/5 flex flex-col gap-2.5 text-xs">
                <div className="flex items-center justify-between border-b border-white/5 pb-2">
                  <span className="text-slate-400">Visitor</span>
                  <span className="font-semibold text-white">
                    {bookingDetails?.touristName || 'Verified Visitor'}
                  </span>
                </div>
                <div className="flex items-center justify-between border-b border-white/5 pb-2">
                  <span className="text-slate-400">Pass / Circuit</span>
                  <span className="font-semibold text-emerald-400 truncate max-w-[200px]">
                    {bookingDetails?.circuitName || 'Monument Entry Pass'}
                  </span>
                </div>
                <div className="flex items-center justify-between pt-0.5">
                  <span className="text-sm font-bold text-white">Entry Fare</span>
                  <span className="text-lg font-extrabold text-amber-400 font-mono">
                    {parsedAmount === 0 ? 'Free Entry (₹0)' : `₹${parsedAmount}.00`}
                  </span>
                </div>
              </div>

              {/* Actions depending on free vs paid */}
              <div className="flex flex-col gap-2.5 pt-1">
                {parsedAmount === 0 ? (
                  <button
                    type="button"
                    onClick={handleFreePassIssuance}
                    disabled={paymentFinished}
                    className="w-full py-3 rounded-xl bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-md cursor-pointer disabled:opacity-50 font-sans-clean active:scale-[0.98]"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Issue Free Digital Pass (₹0)</span>
                  </button>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={handleStartSimulatedPayment}
                      disabled={paymentFinished || isProcessing}
                      className="w-full py-3 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-md cursor-pointer disabled:opacity-50 font-sans-clean active:scale-[0.98]"
                    >
                      <CreditCard className="w-4 h-4" />
                      <span>Pay ₹{parsedAmount} & Get Pass</span>
                    </button>

                    <button
                      type="button"
                      onClick={handlePayAtCounter}
                      disabled={paymentFinished || isProcessing}
                      className="w-full py-2.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-slate-300 border border-white/10 font-medium text-xs flex items-center justify-center gap-2 transition-all cursor-pointer font-sans-clean"
                    >
                      <Zap className="w-3.5 h-3.5 text-amber-400" />
                      <span>Reserve Pass • Pay at Counter</span>
                    </button>
                  </>
                )}

                <button
                  onClick={onClose}
                  disabled={paymentFinished}
                  className="py-1 text-slate-400 hover:text-white text-xs font-medium transition-colors cursor-pointer text-center"
                >
                  Cancel
                </button>
              </div>
            </>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
