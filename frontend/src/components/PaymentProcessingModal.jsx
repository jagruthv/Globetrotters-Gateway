import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldCheck, X, CheckCircle2, Zap } from 'lucide-react';
import confetti from 'canvas-confetti';
import { generateCryptographicPassToken } from '../utils/cryptoPassService';

const STATUS_MESSAGES = {
  5: 'Connecting to state tourism payment gateway...',
  4: 'Simulating instant UPI payment authorization...',
  3: 'Payment verified • Creating digital entry pass...',
  2: 'Registering pass with corridor gate authority...',
  1: 'Generating official offline QR entry code...',
  0: 'Pass Verified! Issuing your digital ticket...'
};

export default function PaymentProcessingModal({
  isOpen,
  onClose,
  bookingDetails,
  onPaymentSuccess
}) {
  const [secondsRemaining, setSecondsRemaining] = useState(5);
  const [paymentFinished, setPaymentFinished] = useState(false);

  const completeBooking = useCallback(async () => {
    const randomCode = Math.random().toString(36).substring(2, 7).toUpperCase();
    const destinations = bookingDetails?.destinations || ['Cultural Heritage Gate'];
    const circuitName = bookingDetails?.circuitName || 'Official Monument Pass';
    const touristName = bookingDetails?.touristName || 'Verified Visitor';
    const numTourists = bookingDetails?.touristCount || 1;
    const amount = bookingDetails?.totalAmount || bookingDetails?.price || 40;
    const refNumber = `GT-${new Date().getFullYear()}-${randomCode}`;
    const today = new Date().toISOString().split('T')[0];

    // Generate real cryptographic HMAC-SHA256 signed pass token
    let signedToken = '';
    try {
      signedToken = await generateCryptographicPassToken(refNumber, 1, 1);
    } catch {
      signedToken = refNumber;
    }

    const passPayload = {
      reference: refNumber,
      token: signedToken,
      circuitName: circuitName,
      touristName: touristName,
      touristCount: numTourists,
      gateFeeTotal: typeof amount === 'number' ? `₹${amount}` : amount,
      validFrom: today,
      validUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      placesAllowed: destinations,
      status: 'ACTIVE_AUTHENTICATED'
    };

    if (onPaymentSuccess) {
      onPaymentSuccess(passPayload);
    }
  }, [bookingDetails, onPaymentSuccess]);

  const [prevIsOpen, setPrevIsOpen] = useState(isOpen);
  if (isOpen !== prevIsOpen) {
    setPrevIsOpen(isOpen);
    if (isOpen) {
      setSecondsRemaining(5);
      setPaymentFinished(false);
    }
  }

  useEffect(() => {
    if (!isOpen || paymentFinished) return;

    if (secondsRemaining <= 0) {
      const timer = setTimeout(() => {
        setPaymentFinished(true);
        try {
          confetti({
            particleCount: 70,
            spread: 60,
            origin: { y: 0.6 }
          });
        } catch {
          // Fallback
        }
        completeBooking();
      }, 50);

      return () => clearTimeout(timer);
    }

    const interval = setTimeout(() => {
      setSecondsRemaining((prev) => prev - 1);
    }, 1000);

    return () => clearTimeout(interval);
  }, [isOpen, secondsRemaining, paymentFinished, completeBooking]);

  const handleInstantSkip = () => {
    setSecondsRemaining(0);
  };

  if (!isOpen) return null;

  const currentMsg = STATUS_MESSAGES[secondsRemaining] || STATUS_MESSAGES[0];
  const progressPercent = ((5 - secondsRemaining) / 5) * 100;
  const strokeDashoffset = 283 - (283 * progressPercent) / 100;

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
              <span>Official Tourism Gateway • Instant Issuance</span>
            </div>
            <h3 className="text-xl font-bold tracking-tight text-white mt-1">
              Processing Entry Pass
            </h3>
            <p className="text-xs text-slate-400 max-w-xs">
              Simulating fast-track digital gate verification and pass generation.
            </p>
          </div>

          {/* Countdown & Status Ring */}
          <div className="flex flex-col items-center justify-center py-1">
            <div className="relative w-32 h-32 flex items-center justify-center">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                <circle
                  cx="50"
                  cy="50"
                  r="45"
                  fill="none"
                  stroke="rgba(255, 255, 255, 0.08)"
                  strokeWidth="6"
                />
                <circle
                  cx="50"
                  cy="50"
                  r="45"
                  fill="none"
                  stroke="#10B981"
                  strokeWidth="6"
                  strokeDasharray="283"
                  strokeDashoffset={strokeDashoffset}
                  strokeLinecap="round"
                  className="transition-all duration-700 ease-linear"
                />
              </svg>

              <div className="absolute inset-0 flex flex-col items-center justify-center">
                {paymentFinished ? (
                  <CheckCircle2 className="w-10 h-10 text-emerald-400 transition-transform duration-300" />
                ) : (
                  <>
                    <span className="text-3xl font-bold text-white font-mono leading-none">
                      {secondsRemaining}s
                    </span>
                    <span className="text-[11px] text-slate-400 font-sans-clean mt-1">
                      Verifying
                    </span>
                  </>
                )}
              </div>
            </div>

            <div className="mt-3 text-center">
              <span className="inline-flex items-center gap-2 text-xs font-medium text-slate-300 font-sans-clean">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                <span>{currentMsg}</span>
              </span>
            </div>
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
              <span className="text-slate-400">Pass Details</span>
              <span className="font-semibold text-emerald-400 truncate max-w-[200px]">
                {bookingDetails?.circuitName || 'Monument Entry Pass'}
              </span>
            </div>
            <div className="flex items-center justify-between pt-0.5">
              <span className="text-sm font-bold text-white">Total Amount</span>
              <span className="text-base font-extrabold text-amber-400 font-mono">
                {typeof bookingDetails?.totalAmount === 'number'
                  ? `₹${bookingDetails.totalAmount}`
                  : (bookingDetails?.totalAmount || '₹40')}
              </span>
            </div>
          </div>

          {/* Quick Actions Footer */}
          <div className="flex items-center justify-between gap-3 pt-1">
            <button
              onClick={onClose}
              disabled={paymentFinished}
              className="px-4 py-2 rounded-full bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white text-xs font-semibold transition-colors cursor-pointer disabled:opacity-30"
            >
              Cancel
            </button>

            <button
              onClick={handleInstantSkip}
              disabled={paymentFinished}
              className="px-5 py-2.5 rounded-full bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition-all shadow-md cursor-pointer disabled:opacity-50"
            >
              <Zap className="w-3.5 h-3.5 fill-current" />
              <span>Instant Pass</span>
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
