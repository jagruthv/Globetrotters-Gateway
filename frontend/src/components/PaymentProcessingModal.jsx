import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldCheck, X, CheckCircle2, Zap, CreditCard, AlertCircle } from 'lucide-react';
import confetti from 'canvas-confetti';
import { generateCryptographicPassToken } from '../utils/cryptoPassService';
import { launchRazorpayCheckout } from '../utils/razorpayClient';

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
  const [paymentFinished, setPaymentFinished] = useState(false);
  const [isPayingWithRazorpay, setIsPayingWithRazorpay] = useState(false);
  const [paymentNotice, setPaymentNotice] = useState(null);

  const rawVal = bookingDetails?.totalAmount !== undefined ? bookingDetails.totalAmount : bookingDetails?.price;
  let parsedAmount = 40;
  if (rawVal !== undefined && rawVal !== null) {
    if (rawVal === 0 || rawVal === '0' || rawVal === '₹0' || String(rawVal).toLowerCase().includes('free')) {
      parsedAmount = 0;
    } else {
      const parsed = parseFloat(String(rawVal).replace(/[^0-9.]/g, ''));
      parsedAmount = Number.isFinite(parsed) ? parsed : 40;
    }
  }

  const completeBooking = useCallback(async (paymentMethod = 'PAID_ONLINE', customRefNumber = null) => {
    const randomCode = Math.random().toString(36).substring(2, 7).toUpperCase();
    const destinations = bookingDetails?.destinations || ['Cultural Heritage Gate'];
    const circuitName = bookingDetails?.circuitName || 'Official Monument Pass';
    const touristName = bookingDetails?.touristName || 'Verified Visitor';
    const numTourists = bookingDetails?.touristCount || 1;
    const refNumber = customRefNumber || `GT-${new Date().getFullYear()}-${randomCode}`;
    const today = new Date().toISOString().split('T')[0];

    // Generate real cryptographic HMAC-SHA256 signed pass token
    let signedToken = '';
    try {
      signedToken = await generateCryptographicPassToken(refNumber, 1, 1);
    } catch {
      signedToken = refNumber;
    }

    const isCounterPay = paymentMethod === 'PAY_AT_COUNTER';
    const feeLabel = parsedAmount === 0 
      ? 'Free Public Entry (₹0.00)' 
      : isCounterPay 
        ? `₹${parsedAmount}.00 (Pay at Gate)` 
        : `₹${parsedAmount}.00 (Paid Online)`;

    const passPayload = {
      reference: refNumber,
      token: signedToken,
      circuitName: circuitName,
      touristName: touristName,
      touristCount: numTourists,
      gateFeeTotal: feeLabel,
      validFrom: today,
      validUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      placesAllowed: destinations,
      status: isCounterPay ? 'PENDING_GATE_PAYMENT' : 'ACTIVE_AUTHENTICATED'
    };

    try {
      const stored = localStorage.getItem('globetrotter_passes');
      const list = stored ? JSON.parse(stored) : [];
      const updated = [passPayload, ...(Array.isArray(list) ? list.filter(p => p && p.reference !== passPayload.reference) : [])];
      localStorage.setItem('globetrotter_passes', JSON.stringify(updated));
    } catch (e) {
      console.warn('Failed to persist pass:', e);
    }

    setPaymentFinished(true);
    playBookingSuccessSound();
    try {
      confetti({ particleCount: 75, spread: 65, origin: { y: 0.6 } });
    } catch {
      // Fallback
    }

    if (onPaymentSuccess) {
      onPaymentSuccess(passPayload);
    }
  }, [bookingDetails, onPaymentSuccess, parsedAmount]);

  const [prevIsOpen, setPrevIsOpen] = useState(isOpen);
  if (isOpen !== prevIsOpen) {
    setPrevIsOpen(isOpen);
    if (isOpen) {
      setPaymentFinished(false);
      setIsPayingWithRazorpay(false);
      setPaymentNotice(null);
    }
  }

  const handlePayAtCounter = () => {
    completeBooking('PAY_AT_COUNTER');
  };

  const handleFreePassIssuance = () => {
    completeBooking('FREE_PASS');
  };

  const handleRazorpayPayment = async () => {
    setPaymentNotice(null);
    setIsPayingWithRazorpay(true);
    const randomCode = Math.random().toString(36).substring(2, 7).toUpperCase();
    const refNumber = `GT-${new Date().getFullYear()}-${randomCode}`;

    await launchRazorpayCheckout({
      bookingReference: refNumber,
      circuitTitle: bookingDetails?.circuitName || 'Official Corridor Pass',
      amount: parsedAmount,
      customerName: bookingDetails?.touristName || 'Verified Visitor',
      customerEmail: bookingDetails?.touristEmail || '',
      customerPhone: bookingDetails?.touristPhone || '',
      onSuccess: () => {
        setIsPayingWithRazorpay(false);
        completeBooking('PAID_ONLINE', refNumber);
      },
      onError: (err) => {
        setIsPayingWithRazorpay(false);
        setPaymentNotice(err?.message || 'Online payment could not be completed. You can reserve and pay at the gate counter instead.');
      },
      onDismiss: () => {
        setIsPayingWithRazorpay(false);
      }
    });
  };

  if (!isOpen) return null;

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
            disabled={paymentFinished}
            className="absolute top-5 right-5 w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center text-slate-400 hover:text-white transition-colors cursor-pointer disabled:opacity-30"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Header */}
          <div className="flex flex-col items-center text-center gap-1.5 pt-1">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-400/20 text-emerald-400 text-[11px] font-semibold">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>Official Tourism Checkout • Zero Convenience Fees</span>
            </div>
            <h3 className="text-xl font-bold tracking-tight text-white mt-1">
              {parsedAmount === 0 ? 'Official Free Admission Pass' : 'Confirm Your Entry Pass'}
            </h3>
            <p className="text-xs text-slate-400 max-w-xs">
              {parsedAmount === 0 
                ? 'Direct digital QR admission for public state heritage sights.'
                : 'Choose secure online payment or pay at the monument turnstile counter.'}
            </p>
          </div>

          {/* Payment Notice Banner */}
          {paymentNotice && (
            <div className="flex items-start gap-2.5 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs animate-in fade-in">
              <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div className="flex-1 text-[11px] leading-relaxed">
                {paymentNotice}
              </div>
              <button
                type="button"
                onClick={() => setPaymentNotice(null)}
                className="text-amber-400 hover:text-white shrink-0 cursor-pointer"
                title="Dismiss notice"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

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
              <span className="text-sm font-bold text-white">Official Fare</span>
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
                <span>Issue Free Digital Gate Pass (₹0)</span>
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={handleRazorpayPayment}
                  disabled={paymentFinished || isPayingWithRazorpay}
                  className="w-full py-3 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-md cursor-pointer disabled:opacity-50 font-sans-clean active:scale-[0.98]"
                >
                  <CreditCard className="w-4 h-4" />
                  <span>{isPayingWithRazorpay ? 'Opening Razorpay Gateway...' : `Pay ₹${parsedAmount} Online (UPI / Cards)`}</span>
                </button>

                <button
                  type="button"
                  onClick={handlePayAtCounter}
                  disabled={paymentFinished || isPayingWithRazorpay}
                  className="w-full py-2.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-slate-300 border border-white/10 font-medium text-xs flex items-center justify-center gap-2 transition-all cursor-pointer font-sans-clean"
                >
                  <Zap className="w-3.5 h-3.5 text-amber-400" />
                  <span>Reserve Pass • Pay at Monument Counter</span>
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
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
