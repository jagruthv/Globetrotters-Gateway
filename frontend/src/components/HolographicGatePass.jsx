import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  ShieldCheck, 
  QrCode, 
  Sparkles, 
  CheckCircle, 
  Share2
} from 'lucide-react';
import confetti from 'canvas-confetti';

export default function HolographicGatePass({ 
  passData = null, 
  onNavigateToScanner 
}) {
  const [isCopied, setIsCopied] = useState(false);

  // Retrieve current logged in user if available
  const savedUser = (() => {
    try {
      const stored = localStorage.getItem('globetrotter_user');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  })();

  // Default demo pass if no custom booking exists
  const activePass = passData || {
    reference: 'GT-2026-APTG-89421',
    token: 'GT_PASS:89421-AP-TG:e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    touristName: savedUser?.fullName || 'Verified Visitor',
    circuitName: 'Grand Godavari & Eastern Ghats Arc',
    validFrom: '2026-10-08',
    validUntil: '2026-10-14',
    status: 'ACTIVE_AUTHENTICATED',
    placesAllowed: [
      'Araku Tribal Museum',
      'Borra Caves',
      'Coringa Mangrove Sanctuary',
      'Bhavani Island',
      'Amaravati Buddhist Mahastupa'
    ],
    gateFeeTotal: '₹340 (All-Access Pre-Paid)'
  };

  const handleCopyToken = () => {
    navigator.clipboard.writeText(activePass.token);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handleCelebrate = () => {
    confetti({
      particleCount: 80,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#00F2FE', '#05D59E', '#F59E0B']
    });
  };

  return (
    <section className="relative w-full py-24 px-4 md:px-12 bg-[#06080D] text-slate-200">
      <div className="max-w-4xl mx-auto flex flex-col items-center gap-10">
        
        {/* Pass Header */}
        <div className="flex flex-col items-center text-center gap-3">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-[10px] uppercase tracking-[0.2em] font-semibold text-emerald-300 font-sans-clean">
              Unified Regional Gate Pass • AP & TG
            </span>
          </div>
          <h2 className="text-3xl md:text-5xl font-bold tracking-tight text-white font-sans-clean">
            Verified Digital Entry Pass
          </h2>
          <p className="text-sm md:text-base text-slate-400 max-w-xl leading-relaxed">
            Direct, queue-free access to temple sanctums, wildlife reserves, and state museums. Works anywhere, even with zero internet.
          </p>
        </div>

        {/* The Holographic Pass Card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, type: 'spring' }}
          className="w-full max-w-2xl doppelrand"
        >
          <div className="doppelrand-inner p-8 relative overflow-hidden flex flex-col gap-6">
            
            {/* Iridescent Foil Watermark Layer */}
            <div className="absolute inset-0 holo-foil opacity-25 pointer-events-none" />

            {/* Pass Top Bar */}
            <div className="relative z-10 flex items-center justify-between border-b border-white/10 pb-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-cyan-400/20 border border-cyan-400/40 flex items-center justify-center text-cyan-300">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div className="flex flex-col">
                  <span className="text-xs font-bold text-white tracking-wider font-display">
                    GLOBETROTTER GATEWAY
                  </span>
                  <span className="text-[10px] text-cyan-300 font-sans-clean font-semibold tracking-widest">
                    OFFICIAL TOURIST PASS
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                <span className="text-xs font-bold text-emerald-400 font-sans-clean">
                  {activePass.status === 'ACTIVE_AUTHENTICATED' ? 'VALID & ACTIVE' : activePass.status}
                </span>
              </div>
            </div>

            {/* Pass Body Grid */}
            <div className="relative z-10 grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
              
              {/* Left Column: Traveler & Circuit Dossier (7 Cols) */}
              <div className="md:col-span-7 flex flex-col gap-4">
                <div>
                  <span className="text-[11px] text-slate-400 font-sans-clean block font-medium">
                    Authorized Traveler
                  </span>
                  <h3 className="text-xl font-bold text-white font-sans-clean">
                    {activePass.touristName}
                  </h3>
                </div>

                <div>
                  <span className="text-[11px] text-slate-400 font-sans-clean block font-medium">
                    Tour Package
                  </span>
                  <span className="text-sm font-semibold text-cyan-300 font-sans-clean">
                    {activePass.circuitName}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2.5 pt-2 text-xs font-sans-clean">
                  <div>
                    <span className="text-slate-400 block text-[10px]">Validity Window</span>
                    <span className="text-slate-200 text-[11px] font-medium">{activePass.validFrom} to {activePass.validUntil}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Reference Code</span>
                    <span className="text-amber-400 font-semibold text-[11px] font-mono">
                      {activePass.reference}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Official Rate</span>
                    <span className="text-emerald-400 font-bold text-[11px]">{activePass.gateFeeTotal || 'Free (₹0)'}</span>
                  </div>
                </div>

                {/* Covered Attractions List */}
                <div className="pt-2">
                  <span className="text-[11px] text-slate-400 font-sans-clean block mb-1 font-medium">
                    Included Attractions
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {activePass.placesAllowed.map((p) => (
                      <span
                        key={p}
                        className="px-2.5 py-0.5 rounded-full bg-white/[0.04] border border-white/10 text-[10px] text-slate-300 font-sans-clean"
                      >
                        {p}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Right Column: Dynamic QR Box (5 Cols) */}
              <div className="md:col-span-5 flex flex-col items-center justify-center p-5 rounded-2xl bg-[#06080D]/90 border border-white/10 shadow-inner">
                {/* Simulated SVG QR Matrix */}
                <div className="w-36 h-36 bg-white p-2 rounded-xl flex items-center justify-center shadow-lg">
                  <QrCode className="w-32 h-32 text-slate-950" />
                </div>
                <span className="text-[10px] text-slate-400 font-sans-clean mt-3 font-medium">
                  Scan at Entry Gate
                </span>
                <span className="text-[9px] text-cyan-400/80 font-mono truncate max-w-[180px] mt-0.5">
                  {activePass.token}
                </span>
              </div>

            </div>

            {/* Pass Actions Bar */}
            <div className="relative z-10 pt-4 border-t border-white/10 flex flex-wrap items-center justify-between gap-3 text-xs font-sans-clean">
              <button
                onClick={handleCopyToken}
                className="px-4 py-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 transition-colors flex items-center gap-1.5 font-medium"
              >
                {isCopied ? <CheckCircle className="w-3.5 h-3.5 text-emerald-400" /> : <Share2 className="w-3.5 h-3.5" />}
                <span>{isCopied ? 'Pass Code Copied!' : 'Copy Pass Code'}</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleCelebrate}
                  className="px-4 py-2 rounded-xl bg-cyan-400 text-slate-950 font-bold hover:bg-cyan-300 transition-colors flex items-center gap-1.5 shadow-md font-sans-clean"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Official Stamp</span>
                </button>
                <button
                  onClick={onNavigateToScanner}
                  className="px-4 py-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-slate-200 transition-colors font-sans-clean"
                >
                  Test Gate Scanner
                </button>
              </div>
            </div>

          </div>
        </motion.div>

        {/* Tourist Security Assurance */}
        <div className="flex flex-wrap items-center justify-center gap-6 text-xs text-slate-400 font-sans-clean text-center">
          <span className="flex items-center gap-1.5">
            <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
            Direct QR Entry at Gate
          </span>
          <span>•</span>
          <span className="flex items-center gap-1.5">
            <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
            100% Offline Reliable Entry
          </span>
          <span>•</span>
          <span className="flex items-center gap-1.5">
            <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
            Zero Markup Official Ticket
          </span>
        </div>

      </div>
    </section>
  );
}
