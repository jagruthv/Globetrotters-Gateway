import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, CheckCircle2, Zap, CreditCard, Sparkles, Loader2, FlaskConical, Calendar, AlertTriangle } from 'lucide-react';
import confetti from 'canvas-confetti';
import { generateCryptographicPassToken, formatPassDate } from '../utils/cryptoPassService';
import { CHECKPOINTS } from '../utils/checkpointData';

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

const MODULE_NOW = new Date();
const MODULE_TODAY_ISO = MODULE_NOW.toISOString().split('T')[0];
const MODULE_TOMORROW_ISO = new Date(MODULE_NOW.getTime() + 86400000).toISOString().split('T')[0];

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

  const [selectedVisitDate, setSelectedVisitDate] = useState(() => {
    if (bookingDetails?.date && String(bookingDetails.date).match(/^\d{4}-\d{2}-\d{2}$/)) {
      return String(bookingDetails.date);
    }
    if (bookingDetails?.date === 'Tomorrow') {
      return MODULE_TOMORROW_ISO;
    }
    return MODULE_TODAY_ISO;
  });

  const [prevBookingDate, setPrevBookingDate] = useState(bookingDetails?.date);
  if (bookingDetails?.date !== prevBookingDate) {
    setPrevBookingDate(bookingDetails?.date);
    if (bookingDetails?.date && String(bookingDetails.date).match(/^\d{4}-\d{2}-\d{2}$/)) {
      setSelectedVisitDate(String(bookingDetails.date));
    } else if (bookingDetails?.date === 'Tomorrow') {
      setSelectedVisitDate(MODULE_TOMORROW_ISO);
    } else {
      setSelectedVisitDate(MODULE_TODAY_ISO);
    }
  }

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
    
    // Confirmed visit date selected by user
    const startDate = (selectedVisitDate && String(selectedVisitDate).match(/^\d{4}-\d{2}-\d{2}$/))
      ? selectedVisitDate
      : MODULE_TODAY_ISO;

    const durationDays = Math.max(1, parseInt(bookingDetails?.durationDays || bookingDetails?.days || 1, 10));
    const startMs = new Date(startDate + 'T00:00:00').getTime();
    const endMs = startMs + (durationDays - 1) * 24 * 60 * 60 * 1000;
    const validUntil = new Date(endMs).toISOString().split('T')[0];

    // Determine accurate checkpoint ID for the pass
    let targetPlaceId = Number(bookingDetails?.circuitId || bookingDetails?.placeId || 0);
    if (!targetPlaceId) {
      const isMulti = (Array.isArray(destinations) && destinations.length > 1) ||
        (circuitName && (
          circuitName.toLowerCase().includes('consolidated') ||
          circuitName.toLowerCase().includes('circuit') ||
          circuitName.toLowerCase().includes('corridor') ||
          circuitName.toLowerCase().includes('tour pass') ||
          circuitName.toLowerCase().includes('arc') ||
          circuitName.toLowerCase().includes('trail')
        ));
      if (isMulti) {
        targetPlaceId = 0; // multi-destination circuit: 0 denotes universal circuit pass valid at all included stops
      } else {
        const destText = [
          circuitName,
          ...(Array.isArray(destinations) ? destinations : [])
        ].join(' ').toLowerCase();
        const matchedCp = CHECKPOINTS.find(cp => 
          destText.includes(cp.keyword) || destText.includes(cp.name.toLowerCase())
        );
        targetPlaceId = matchedCp ? matchedCp.id : 1;
      }
    }

    let signedToken = refNumber;
    try {
      signedToken = await generateCryptographicPassToken(
        refNumber, 
        targetPlaceId, 
        numTourists, 
        startDate, 
        validUntil
      );
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
      qrPayload: signedToken,
      passId: refNumber,
      circuitId: targetPlaceId,
      circuitName: circuitName,
      touristName: touristName,
      touristCount: numTourists,
      gateFeeTotal: feeLabel,
      validFrom: startDate,
      validUntil: validUntil,
      durationDays: durationDays,
      validityLabel: durationDays === 1 ? `Valid on ${startDate}` : `Valid for ${durationDays} Days (${startDate} to ${validUntil})`,
      placesAllowed: destinations,
      destinations: destinations,
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
  }, [bookingDetails, onPaymentSuccess, parsedAmount, selectedVisitDate]);

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
              <div className="flex flex-col items-center text-center gap-1 pt-1">
                <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-500/10 border border-amber-400/20 text-amber-300 text-[10px] font-semibold">
                  <Sparkles className="w-3 h-3 text-amber-400" />
                  <span>Entry Pass</span>
                </div>
                <h3 className="text-lg font-bold tracking-tight text-white mt-0.5">
                  {parsedAmount === 0 ? 'Free Entry Pass' : 'Confirm Pass'}
                </h3>
                <p className="text-xs text-slate-400">
                  {parsedAmount === 0 ? 'Select your visit date to issue your pass.' : 'Choose your visit date to complete booking.'}
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
                  <span className="text-slate-400">Pass</span>
                  <span className="font-semibold text-emerald-400 truncate max-w-[200px]">
                    {bookingDetails?.circuitName || 'Monument Pass'}
                  </span>
                </div>

                {/* Interactive Date of Visit Selector */}
                <div className="flex flex-col gap-2 border-b border-white/5 pb-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Date of Visit</span>
                    <span className="text-amber-400 font-bold font-mono text-[11px] flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-amber-400" />
                      <span>{formatPassDate(selectedVisitDate)}</span>
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-1.5 pt-0.5">
                    <button
                      type="button"
                      onClick={() => setSelectedVisitDate(MODULE_TODAY_ISO)}
                      className={`py-1 px-2 rounded-lg text-xs transition-colors cursor-pointer text-center ${
                        selectedVisitDate === MODULE_TODAY_ISO
                          ? 'bg-amber-400 text-slate-950 font-bold shadow-sm'
                          : 'bg-white/5 hover:bg-white/10 text-slate-300'
                      }`}
                    >
                      Today
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedVisitDate(MODULE_TOMORROW_ISO)}
                      className={`py-1 px-2 rounded-lg text-xs transition-colors cursor-pointer text-center ${
                        selectedVisitDate === MODULE_TOMORROW_ISO
                          ? 'bg-amber-400 text-slate-950 font-bold shadow-sm'
                          : 'bg-white/5 hover:bg-white/10 text-slate-300'
                      }`}
                    >
                      Tomorrow
                    </button>
                    <input
                      type="date"
                      min={MODULE_TODAY_ISO}
                      value={selectedVisitDate}
                      onChange={(e) => {
                        if (e.target.value) setSelectedVisitDate(e.target.value);
                      }}
                      aria-label="Select custom date"
                      className="py-1 px-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white text-[11px] font-mono border border-white/10 focus:outline-none focus:border-amber-400 cursor-pointer text-center"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between pt-0.5">
                  <span className="text-sm font-bold text-white">Entry Fare</span>
                  <span className="text-lg font-extrabold text-amber-400 font-mono">
                    {parsedAmount === 0 ? 'Free Entry (₹0)' : `₹${parsedAmount}.00`}
                  </span>
                </div>
              </div>

              {/* Ground Reality Notice */}
              <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/10 flex items-start gap-2 text-[11px] text-slate-400 leading-relaxed font-sans-clean">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                <span>
                  <strong>Ground Notice:</strong> Self-drive route pass. ASI heritage sites (Charminar, Golconda, Warangal Fort) require official ASI barcode tickets at the gate counter (₹25). Canyons and temples are free admission.
                </span>
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
                    <span>Get Free Pass</span>
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
                      <span>Pay at Gate</span>
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
