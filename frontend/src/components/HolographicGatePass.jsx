import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Sparkles, 
  CheckCircle, 
  Share2, 
  Printer, 
  Headphones, 
  Calendar, 
  Clock, 
  Ticket, 
  MapPin, 
  User, 
  ArrowUpRight,
  Compass,
  ArrowRight
} from 'lucide-react';
import confetti from 'canvas-confetti';
import QRCode from 'qrcode';

export default function HolographicGatePass({ 
  passData = null,
  onOpenAudioGuide,
  onExplorePackages,
  onPlanTrip
}) {
  const [isCopied, setIsCopied] = useState(false);
  const [shareToast, setShareToast] = useState(null);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState('');

  // Retrieve booked pass from prop or localStorage
  const activePass = (() => {
    if (passData && passData.reference !== 'BMS-GT-89421' && !passData.token?.includes('e3b0c442')) {
      return passData;
    }
    try {
      const stored = localStorage.getItem('globetrotter_passes');
      if (stored) {
        const list = JSON.parse(stored);
        if (Array.isArray(list) && list.length > 0) {
          // Strictly reject any old unbooked dummy pass!
          const clean = list.filter(p => 
            p && 
            p.reference !== 'BMS-GT-89421' && 
            !p.token?.includes('e3b0c442')
          );
          if (clean.length !== list.length) {
            localStorage.setItem('globetrotter_passes', JSON.stringify(clean));
          }
          if (clean.length > 0) {
            return clean[0];
          }
        }
      }
      return null;
    } catch {
      return null;
    }
  })();

  // Real Dynamic QR Code Generator (Encodes clean ticket verification URL or ticket reference)
  useEffect(() => {
    if (activePass?.reference || activePass?.token) {
      const origin = typeof window !== 'undefined' ? window.location.origin : 'https://globetrotter-gateway.pages.dev';
      const qrPayload = activePass.reference 
        ? `${origin}/#/verify?t=${activePass.reference}`
        : activePass.token;

      QRCode.toDataURL(qrPayload, {
        width: 320,
        margin: 1,
        color: {
          dark: '#06080D',
          light: '#FFFFFF'
        }
      })
      .then((url) => setQrCodeDataUrl(url))
      .catch((err) => console.error('QR Generator Error:', err));
    }
  }, [activePass?.reference, activePass?.token]);

  const handleCopyShareLink = () => {
    if (!activePass) return;
    const shareUrl = window.location.origin;
    const shareText = `🎫 My Official Entry Pass for ${activePass.circuitName}!\nBooking ID: ${activePass.reference}\nBook queue-free tickets at: ${shareUrl}`;
    
    if (navigator.clipboard) {
      navigator.clipboard.writeText(shareText);
      setIsCopied(true);
      setShareToast('Ticket details & share link copied to clipboard!');
      setTimeout(() => {
        setIsCopied(false);
        setShareToast(null);
      }, 3000);
    }
  };

  const handleShareWhatsApp = () => {
    if (!activePass) return;
    const shareUrl = window.location.origin;
    const shareText = encodeURIComponent(
      `🎫 *I just booked my All-Access Entry Ticket on Globetrotter Gateway!*\n\n🏛️ *Tour:* ${activePass.circuitName}\n👤 *Traveler:* ${activePass.touristName}\n🎟️ *Booking ID:* ${activePass.reference}\n\n⚡ Skip all ticketing queues with digital QR passes across Andhra Pradesh & Telangana!\n👉 Book yours here: ${shareUrl}`
    );
    window.open(`https://api.whatsapp.com/send?text=${shareText}`, '_blank');
  };

  const handleCelebrate = () => {
    confetti({
      particleCount: 90,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#00F2FE', '#05D59E', '#F59E0B']
    });
  };

  // EMPTY STATE: User hasn't bought any pass yet
  if (!activePass) {
    return (
      <section className="relative w-full py-20 px-4 md:px-12 bg-[#06080D] text-slate-200">
        <div className="max-w-2xl mx-auto flex flex-col items-center text-center gap-6 p-8 sm:p-12 rounded-3xl bg-[#0D121F] border border-white/10 shadow-2xl">
          <div className="w-16 h-16 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
            <Ticket className="w-8 h-8" />
          </div>

          <div className="flex flex-col gap-2">
            <span className="text-[11px] font-mono text-cyan-400 uppercase tracking-widest font-semibold">
              Entry Passes & Digital Tickets
            </span>
            <h3 className="text-2xl sm:text-3xl font-bold text-white font-sans-clean">
              No Active Pass Yet
            </h3>
            <p className="text-xs sm:text-sm text-slate-400 max-w-md mx-auto leading-relaxed font-sans-clean">
              You haven't booked an entry pass yet. Pick a curated tour package or plan your custom trip to generate your official gate pass with a scannable QR code.
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            {onExplorePackages && (
              <button
                onClick={onExplorePackages}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-400 to-emerald-400 text-slate-950 font-bold text-xs flex items-center gap-2 hover:opacity-95 transition-opacity shadow-md cursor-pointer font-sans-clean"
              >
                <Compass className="w-4 h-4 text-slate-950" />
                <span>Explore Tour Packages</span>
              </button>
            )}

            {onPlanTrip && (
              <button
                onClick={onPlanTrip}
                className="px-5 py-2.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.08] border border-white/10 text-white font-semibold text-xs flex items-center gap-2 transition-colors cursor-pointer font-sans-clean"
              >
                <span>Plan Custom Trip with AI</span>
                <ArrowRight className="w-3.5 h-3.5 text-cyan-400" />
              </button>
            )}
          </div>
        </div>
      </section>
    );
  }

  // ACTIVE TICKET VIEW: Renders full movie-ticket style pass with real QR
  return (
    <section className="relative w-full py-20 px-4 md:px-12 bg-[#06080D] text-slate-200">
      <div className="max-w-4xl mx-auto flex flex-col items-center gap-8">
        
        {/* Pass Header */}
        <div className="flex flex-col items-center text-center gap-3">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20">
            <Ticket className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-[10px] uppercase tracking-[0.2em] font-semibold text-emerald-300 font-sans-clean">
              Instant Digital Entry Ticket • BookMyShow Style
            </span>
          </div>
          <h2 className="text-3xl md:text-5xl font-bold tracking-tight text-white font-sans-clean">
            Curated Monument Entry Pass
          </h2>
          <p className="text-xs md:text-sm text-slate-400 max-w-lg leading-relaxed font-sans-clean">
            Clean, digital cinema-style entry pass with fast-track QR scanner code. Present at the turnstile gate for queue-free access.
          </p>
        </div>

        {shareToast && (
          <div className="px-4 py-2 rounded-xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2 font-sans-clean animate-in fade-in">
            <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{shareToast}</span>
          </div>
        )}

        {/* THE MOVIE TICKET CONTAINER */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="relative w-full max-w-2xl bg-[#0D121F] border border-white/10 rounded-3xl shadow-2xl overflow-hidden text-slate-100"
        >
          {/* Top Cinema Header Bar */}
          <div className="px-6 py-4 bg-gradient-to-r from-blue-900/40 via-cyan-900/30 to-emerald-900/40 border-b border-white/10 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-cyan-400/20 border border-cyan-400/40 flex items-center justify-center text-cyan-300">
                <Ticket className="w-4 h-4" />
              </div>
              <div className="flex flex-col">
                <span className="text-[11px] font-bold text-white tracking-wider font-mono">
                  GLOBETROTTER CINEMA & MONUMENT PASS
                </span>
                <span className="text-[9px] text-cyan-300 tracking-widest font-mono">
                  OFFICIAL AP & TG GATE TICKET
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-[11px] font-bold text-emerald-400 font-mono">
                CONFIRMED & ACTIVE
              </span>
            </div>
          </div>

          {/* Main Ticket Body Grid */}
          <div className="p-6 sm:p-8 flex flex-col gap-6 relative">

            {/* Left & Right Circular Ticket Punch Notches */}
            <div className="hidden sm:block absolute -left-4 top-[58%] -translate-y-1/2 w-8 h-8 rounded-full bg-[#06080D] border-r border-white/15 pointer-events-none" />
            <div className="hidden sm:block absolute -right-4 top-[58%] -translate-y-1/2 w-8 h-8 rounded-full bg-[#06080D] border-l border-white/15 pointer-events-none" />

            {/* Hero Circuit Title & Badges */}
            <div className="flex flex-col gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 font-semibold font-mono uppercase">
                  Fast-Track Gate Access
                </span>
                <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 font-semibold font-mono">
                  Order ID: {activePass.reference}
                </span>
              </div>
              <h3 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight font-sans-clean">
                {activePass.circuitName}
              </h3>
            </div>

            {/* Movie-Ticket 4-Column Metadata Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 rounded-2xl bg-black/40 border border-white/5 font-sans-clean">
              {/* Traveler */}
              <div className="flex flex-col">
                <span className="text-[10px] uppercase font-mono text-slate-400 flex items-center gap-1">
                  <User className="w-3 h-3 text-cyan-400" /> Admit
                </span>
                <span className="text-xs font-bold text-white mt-1 truncate">
                  {activePass.touristName}
                </span>
                <span className="text-[10px] text-slate-500">1 Adult (Primary)</span>
              </div>

              {/* Date */}
              <div className="flex flex-col">
                <span className="text-[10px] uppercase font-mono text-slate-400 flex items-center gap-1">
                  <Calendar className="w-3 h-3 text-emerald-400" /> Show Date
                </span>
                <span className="text-xs font-bold text-white mt-1">
                  {activePass.validFrom}
                </span>
                <span className="text-[10px] text-slate-500">Valid to {activePass.validUntil}</span>
              </div>

              {/* Gate / Screen */}
              <div className="flex flex-col">
                <span className="text-[10px] uppercase font-mono text-slate-400 flex items-center gap-1">
                  <MapPin className="w-3 h-3 text-amber-400" /> Gate Checkpoint
                </span>
                <span className="text-xs font-bold text-cyan-300 mt-1">
                  Gate 01 • Fast-Track
                </span>
                <span className="text-[10px] text-slate-500">Auto-Turnstile</span>
              </div>

              {/* Rate */}
              <div className="flex flex-col">
                <span className="text-[10px] uppercase font-mono text-slate-400 flex items-center gap-1">
                  <Clock className="w-3 h-3 text-purple-400" /> Official Fare
                </span>
                <span className="text-xs font-bold text-emerald-400 mt-1">
                  {activePass.gateFeeTotal}
                </span>
                <span className="text-[10px] text-slate-500">0% Convenience Fee</span>
              </div>
            </div>

            {/* Included Attractions List */}
            {activePass.placesAllowed && activePass.placesAllowed.length > 0 && (
              <div className="flex flex-col gap-1.5 font-sans-clean">
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider font-mono">
                  Attractions Covered Under This Pass
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {activePass.placesAllowed.map((p) => (
                    <span
                      key={p}
                      className="px-2.5 py-1 rounded-lg bg-white/[0.04] border border-white/10 text-[11px] text-slate-300 font-sans-clean flex items-center gap-1.5"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                      <span>{p}</span>
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* PERFORATED TEAR-OFF LINE */}
            <div className="relative py-2">
              <div className="w-full border-b-2 border-dashed border-white/20" />
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-[#0D121F] px-3 text-[10px] font-mono text-slate-500 uppercase tracking-widest">
                Entry Stub • Scan Below
              </div>
            </div>

            {/* STUB / DYNAMIC REAL QR & BARCODE SECTION */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-6 p-4 rounded-2xl bg-black/50 border border-white/5">
              {/* Real Dynamic QR Box */}
              <div className="flex items-center gap-4">
                <div className="w-24 h-24 bg-white p-1 rounded-xl flex items-center justify-center shrink-0 shadow-lg overflow-hidden">
                  {qrCodeDataUrl ? (
                    <img 
                      src={qrCodeDataUrl} 
                      alt="Scannable Pass QR Code" 
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    <div className="w-full h-full bg-slate-200 animate-pulse rounded-lg" />
                  )}
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-xs font-bold text-white font-sans-clean">
                    Real Scannable Turnstile QR
                  </span>
                  <p className="text-[11px] text-slate-400 leading-relaxed font-sans-clean max-w-xs">
                    Works 100% offline. Scan with any phone camera or turnstile reader to verify.
                  </p>
                  <span className="text-[10px] text-cyan-300 font-mono font-semibold tracking-wider">
                    Ticket Code: {activePass.reference}
                  </span>
                </div>
              </div>

              {/* Realistic Movie Barcode Graphic */}
              <div className="flex flex-col items-center gap-1.5 shrink-0">
                <div className="flex items-center gap-0.5 h-10 px-2 py-1 bg-white/5 rounded-lg border border-white/10">
                  {[2, 4, 1, 3, 2, 5, 1, 4, 2, 3, 1, 5, 2, 4, 1, 3, 2, 4, 1, 5, 3, 2, 4, 1, 3, 2].map((w, idx) => (
                    <div 
                      key={`bar-${idx}`} 
                      className="bg-white/80 h-full rounded-xs" 
                      style={{ width: `${w}px` }} 
                    />
                  ))}
                </div>
                <span className="text-[9px] text-slate-400 font-mono tracking-widest uppercase">
                  {activePass.reference}
                </span>
              </div>
            </div>

            {/* Monument Audio Tour Bar Unlocked on Ticket */}
            <div className="p-3.5 rounded-2xl bg-gradient-to-r from-cyan-950/40 via-emerald-950/20 to-slate-900/40 border border-cyan-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-cyan-400/20 border border-cyan-400/40 flex items-center justify-center text-cyan-300 shrink-0">
                  <Headphones className="w-4 h-4 text-cyan-300" />
                </div>
                <div className="flex flex-col">
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] px-2 py-0.2 rounded-full bg-emerald-500/20 text-emerald-300 font-semibold uppercase tracking-wider font-mono">
                      Unlocked with Ticket
                    </span>
                    <span className="text-[10px] text-slate-400">English • తెలుగు • हिन्दी</span>
                  </div>
                  <h4 className="text-xs font-bold text-white font-sans-clean mt-0.5">
                    Audio Guide Player Included
                  </h4>
                </div>
              </div>

              <button
                onClick={onOpenAudioGuide}
                className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-cyan-400 to-emerald-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5 hover:opacity-95 transition-opacity shadow-sm cursor-pointer shrink-0 font-sans-clean"
              >
                <Headphones className="w-3.5 h-3.5 text-slate-950" />
                <span>Play Audio Guide</span>
              </button>
            </div>

            {/* Social Sharing & Promotion Actions Bar */}
            <div className="pt-2 border-t border-white/10 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                {/* WhatsApp Share Button (Viral Promotion Loop) */}
                <button
                  onClick={handleShareWhatsApp}
                  className="px-3.5 py-2 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/40 text-emerald-300 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer font-sans-clean"
                  title="Share your ticket with family or friends on WhatsApp"
                >
                  <Share2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Share on WhatsApp</span>
                  <ArrowUpRight className="w-3 h-3 text-emerald-400" />
                </button>

                {/* Copy Link */}
                <button
                  onClick={handleCopyShareLink}
                  className="px-3 py-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer font-sans-clean"
                >
                  {isCopied ? <CheckCircle className="w-3.5 h-3.5 text-emerald-400" /> : <Share2 className="w-3.5 h-3.5" />}
                  <span>{isCopied ? 'Copied!' : 'Copy Ticket Info'}</span>
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleCelebrate}
                  className="px-3.5 py-2 rounded-xl bg-cyan-400 text-slate-950 font-bold text-xs hover:bg-cyan-300 transition-colors flex items-center gap-1.5 shadow-md cursor-pointer font-sans-clean"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Official Stamp</span>
                </button>

                <button
                  onClick={() => window.print()}
                  className="px-3.5 py-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-slate-200 text-xs font-medium transition-colors flex items-center gap-1.5 cursor-pointer font-sans-clean"
                  title="Print or Save as PDF"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print Ticket</span>
                </button>
              </div>
            </div>

          </div>
        </motion.div>

        {/* Tourist Trust Proof Points */}
        <div className="flex flex-wrap items-center justify-center gap-6 text-xs text-slate-400 font-sans-clean text-center">
          <span className="flex items-center gap-1.5">
            <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
            Direct QR Entry at All Gates
          </span>
          <span>•</span>
          <span className="flex items-center gap-1.5">
            <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
            100% Offline Scannable
          </span>
          <span>•</span>
          <span className="flex items-center gap-1.5">
            <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
            Zero Markup Official Fare
          </span>
        </div>

      </div>
    </section>
  );
}
