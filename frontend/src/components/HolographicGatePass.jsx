import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  CheckCircle, 
  Share2, 
  Download, 
  Calendar, 
  Clock, 
  Ticket, 
  MapPin, 
  User, 
  ArrowUpRight,
  Compass,
  ArrowRight,
  Sun,
  X,
  History,
  FileText,
  Printer,
  AlertCircle,
  XCircle,
  AlertTriangle,
  Smartphone
} from 'lucide-react';
import QRCode from 'qrcode';
import { formatPassDate, formatPassDateShort, getPassDateStatus } from '../utils/cryptoPassService';
import { getGateAcceptanceInfo } from '../utils/travelGroundRealities';
import { downloadPassImage } from '../utils/passImageExporter';

export default function HolographicGatePass({ 
  passData = null,
  onExplorePackages,
  onPlanTrip
}) {
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState('');
  const [sunlightScanMode, setSunlightScanMode] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [selectedReceiptPass, setSelectedReceiptPass] = useState(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Re-read storage whenever an agent scans and marks a monument visited
  useEffect(() => {
    const handleVisitedUpdate = () => {
      setRefreshTrigger(prev => prev + 1);
    };
    window.addEventListener('pass-visited-updated', handleVisitedUpdate);
    return () => window.removeEventListener('pass-visited-updated', handleVisitedUpdate);
  }, []);

  const allPasses = React.useMemo(() => {
    void refreshTrigger;
    const list = [];
    if (passData && passData.reference !== 'GT-PASS-DEMO' && !passData.token?.includes('e3b0c442')) {
      list.push(passData);
    }
    try {
      const stored = localStorage.getItem('globetrotter_passes');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          const clean = parsed.filter(p => 
            p && p.reference !== 'GT-PASS-DEMO' && !p.token?.includes('e3b0c442')
          );
          clean.forEach(p => {
            if (!list.some(existing => existing.reference === p.reference)) {
              list.push(p);
            }
          });
        }
      }
    } catch {
      // ignore
    }

    // Support scanned ticket links on external/conductor devices
    if (typeof window !== 'undefined') {
      const hash = window.location.hash;
      const match = hash.match(/(?:pass|ref|t)=([A-Za-z0-9\-_]+)/i);
      const urlRef = match ? match[1] : null;
      if (urlRef && !list.some(p => p.reference?.toLowerCase() === urlRef.toLowerCase())) {
        list.unshift({
          reference: urlRef.toUpperCase(),
          token: urlRef.toUpperCase(),
          circuitName: 'Verified Corridor Gate Pass',
          touristName: 'Verified Ticket Holder',
          touristCount: 1,
          gateFeeTotal: '₹40.00 (Verified)',
          validFrom: 'Today',
          validUntil: '7 Days Access',
          placesAllowed: ['All Authorized Gate Checkpoints'],
          status: 'ACTIVE_AUTHENTICATED'
        });
      }
    }

    return list;
  }, [passData, refreshTrigger]);

  const [selectedPassIndex, setSelectedPassIndex] = useState(() => {
    if (typeof window === 'undefined') return 0;
    const hash = window.location.hash;
    const match = hash.match(/(?:pass|ref|t)=([A-Za-z0-9\-_]+)/i);
    const targetRef = match ? match[1] : null;
    if (targetRef) {
      try {
        const stored = localStorage.getItem('globetrotter_passes');
        const list = stored ? JSON.parse(stored) : [];
        const idx = list.findIndex(p => p?.reference?.toLowerCase() === targetRef.toLowerCase());
        if (idx !== -1) return idx;
      } catch {
        // ignore
      }
    }
    return 0;
  });

  // Synchronize with external browser hash navigation (#pass=APTG-XXXXX or #/verify?t=APTG-XXXXX)
  useEffect(() => {
    const handleHash = () => {
      const hash = window.location.hash;
      const match = hash.match(/(?:pass|ref|t)=([A-Za-z0-9\-_]+)/i);
      const targetRef = match ? match[1] : null;
      if (targetRef && allPasses.length > 0) {
        const idx = allPasses.findIndex(p => p.reference?.toLowerCase() === targetRef.toLowerCase());
        if (idx !== -1) setSelectedPassIndex(idx);
      }
    };
    window.addEventListener('hashchange', handleHash);
    return () => window.removeEventListener('hashchange', handleHash);
  }, [allPasses]);

  // When a new pass is issued or passed via props, focus on the newest pass (index 0)
  const prevPassRef = React.useRef(passData?.reference);
  useEffect(() => {
    if (passData?.reference && passData.reference !== prevPassRef.current) {
      prevPassRef.current = passData.reference;
      setSelectedPassIndex(0);
    }
  }, [passData?.reference]);

  const activePass = allPasses[selectedPassIndex] || allPasses[0] || null;
  const dateStatus = getPassDateStatus(activePass?.validFrom, activePass?.validUntil);

  const visitedPlaces = activePass?.visitedPlaces || [];
  const isAnyVisited = visitedPlaces.length > 0 || Boolean(activePass?.isBorraCavesVisited);

  const isSpotVisited = (spotName) => {
    if (!spotName) return false;
    const s = spotName.toLowerCase();
    if (s.includes('borra') && activePass?.isBorraCavesVisited) return true;
    return visitedPlaces.some((v) => {
      if (!v) return false;
      const vName = (v.name || '').toLowerCase();
      return vName.includes(s) || s.includes(vName);
    });
  };

  // Real Dynamic QR Code Generator (Encodes cryptographic signed ticket token)
  useEffect(() => {
    if (activePass?.reference || activePass?.token) {
      const tokenPayload = activePass.token || activePass.reference;
      const qrPayload = typeof window !== 'undefined'
        ? `${window.location.origin}/#/verify?t=${encodeURIComponent(tokenPayload)}`
        : tokenPayload;

      QRCode.toDataURL(qrPayload, {
        width: 480,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      })
      .then((url) => setQrCodeDataUrl(url))
      .catch((err) => {
        if (import.meta.env.DEV) console.warn('QR Generator Notice:', err);
      });
    }
  }, [activePass?.reference, activePass?.token]);

  const handleShareWhatsApp = () => {
    if (!activePass) return;
    const shareUrl = `${window.location.origin}/#pass=${encodeURIComponent(activePass.reference)}`;
    const shareText = encodeURIComponent(
      `*Official Entry Pass - Globetrotter Gateway*\n\nTour: ${activePass.circuitName}\nTraveler: ${activePass.touristName}\nBooking ID: ${activePass.reference}\n\nDigital QR pass verification across Andhra Pradesh and Telangana.\nOpen your pass: ${shareUrl}`
    );
    window.open(`https://api.whatsapp.com/send?text=${shareText}`, '_blank');
  };

  // ── Render Tax Invoice Modal ────────────────────────────────────────────────
  const renderReceiptModal = () => {
    if (!selectedReceiptPass) return null;
    const feeStr = String(selectedReceiptPass.gateFeeTotal || '');
    const isFree = feeStr.toLowerCase().includes('free') || feeStr.includes('0.00') || feeStr === '₹0' || feeStr === '0';
    const parsedNumber = parseFloat(feeStr.replace(/[^0-9.]/g, ''));
    const rawPrice = isFree ? 0 : (Number.isFinite(parsedNumber) ? parsedNumber : 0);
    const baseAmount = (rawPrice / 1.18).toFixed(2);
    const gstTotal = (rawPrice - parseFloat(baseAmount)).toFixed(2);
    const cgst = (parseFloat(gstTotal) / 2).toFixed(2);
    const sgst = (parseFloat(gstTotal) / 2).toFixed(2);
    const invoiceNum = `INV-2026-${(selectedReceiptPass.reference || 'GT000').slice(-6)}`;
    const issueDate = selectedReceiptPass.validFrom || new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

    return (
      <AnimatePresence>
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md"
          onClick={() => setSelectedReceiptPass(null)}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-lg bg-[#0F141E] border border-white/15 rounded-3xl p-6 sm:p-7 shadow-2xl text-slate-200 font-sans-clean flex flex-col gap-5 max-h-[90vh] overflow-y-auto"
          >
            {/* Receipt Header */}
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-300">
                  <FileText className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">GST Tax Invoice & Receipt</h3>
                  <p className="text-[11px] text-slate-400">Tourism Corridor Fast-Track Gate Pass</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedReceiptPass(null)}
                className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Receipt Content */}
            <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 flex flex-col gap-3 font-mono text-xs">
              <div className="flex items-center justify-between border-b border-white/5 pb-2">
                <span className="text-slate-400">Invoice Number:</span>
                <span className="font-bold text-white">{invoiceNum}</span>
              </div>
              <div className="flex items-center justify-between border-b border-white/5 pb-2">
                <span className="text-slate-400">Issue Date:</span>
                <span className="text-white">{issueDate}</span>
              </div>
              <div className="flex items-center justify-between border-b border-white/5 pb-2">
                <span className="text-slate-400">Tourist / Pass Holder:</span>
                <span className="text-amber-300 font-bold">{selectedReceiptPass.touristName || 'Registered Traveler'}</span>
              </div>
              <div className="flex items-center justify-between border-b border-white/5 pb-2">
                <span className="text-slate-400">Pass Reference:</span>
                <span className="text-emerald-400 font-bold">{selectedReceiptPass.reference}</span>
              </div>
              <div className="flex items-center justify-between border-b border-white/5 pb-2">
                <span className="text-slate-400">Package / Circuit:</span>
                <span className="text-white text-right font-sans-clean">{selectedReceiptPass.circuitName || 'Corridor Entry Pass'}</span>
              </div>
              <div className="flex items-center justify-between border-b border-white/5 pb-2">
                <span className="text-slate-400">GSTIN Registration:</span>
                <span className="text-slate-300">37AAAAA0000A1Z5</span>
              </div>
            </div>

            {/* Price Breakdown Table */}
            <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 flex flex-col gap-2 font-mono text-xs">
              <div className="flex justify-between text-slate-400 pb-1 border-b border-white/5">
                <span>Description</span>
                <span>Amount (INR)</span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span className="font-sans-clean">Monument Entry & Heritage Maintenance</span>
                <span>₹{baseAmount}</span>
              </div>
              <div className="flex justify-between text-slate-400 text-[11px]">
                <span>CGST (9%)</span>
                <span>₹{cgst}</span>
              </div>
              <div className="flex justify-between text-slate-400 text-[11px]">
                <span>SGST (9%)</span>
                <span>₹{sgst}</span>
              </div>
              <div className="flex justify-between text-white font-bold text-sm pt-2 border-t border-white/10">
                <span className="font-sans-clean">Total Paid:</span>
                <span className="text-emerald-400">₹{rawPrice.toFixed(2)}</span>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-1 font-sans-clean">
              <button
                type="button"
                onClick={() => {
                  document.title = `Tax-Invoice-${invoiceNum}`;
                  window.print();
                }}
                className="flex-1 py-2.5 px-4 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-md"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print Official Receipt</span>
              </button>
              <button
                type="button"
                onClick={() => setSelectedReceiptPass(null)}
                className="py-2.5 px-4 rounded-xl bg-white/10 hover:bg-white/20 text-white font-semibold text-xs transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </motion.div>
        </div>
      </AnimatePresence>
    );
  };

  // ── Render Booking History & Wallet Modal ──────────────────────────────────
  const renderHistoryModal = () => (
    <AnimatePresence>
      {showHistoryModal && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
          onClick={() => setShowHistoryModal(false)}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-2xl bg-[#0B0F17] border border-white/10 rounded-3xl p-6 sm:p-7 shadow-2xl text-white font-sans-clean flex flex-col gap-5 max-h-[85vh] overflow-hidden"
          >
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-400/20 border border-amber-400/30 flex items-center justify-center text-amber-300">
                  <History className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">My Pass Wallet & Booking History</h3>
                  <p className="text-xs text-slate-400">Verified offline tickets across Andhra Pradesh & Telangana</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowHistoryModal(false)}
                className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="overflow-y-auto space-y-3 pr-1 scrollbar-none flex-1">
              {allPasses.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-8">No booking history available yet.</p>
              ) : (
                allPasses.map((pass, idx) => {
                  const isSelected = selectedPassIndex === idx;
                  return (
                    <div
                      key={pass.reference || idx}
                      className={`p-4 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                        isSelected
                          ? 'bg-amber-400/10 border-amber-400/40 text-white'
                          : 'bg-white/[0.02] border-white/5 hover:border-white/15'
                      }`}
                    >
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-white">
                            {pass.circuitName || pass.destination || 'Corridor Gate Pass'}
                          </span>
                          <span className="px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-[10px] font-mono text-amber-300">
                            {pass.reference}
                          </span>
                        </div>
                        <div className="text-xs text-slate-400 flex flex-wrap items-center gap-2 font-mono">
                          <span>Admit: {pass.touristName}</span>
                          <span>•</span>
                          <span>Valid: {pass.validFrom} to {pass.validUntil}</span>
                          <span>•</span>
                          <span className="text-emerald-400 font-semibold">{pass.gateFeeTotal}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedPassIndex(idx);
                            setShowHistoryModal(false);
                          }}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer font-sans-clean ${
                            isSelected
                              ? 'bg-amber-400 text-slate-950 shadow-md'
                              : 'bg-white/10 text-white hover:bg-white/20'
                          }`}
                        >
                          {isSelected ? 'Viewing Pass' : 'View Pass'}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedReceiptPass(pass);
                          }}
                          className="p-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 transition-colors cursor-pointer"
                          title="View GST Tax Invoice"
                        >
                          <FileText className="w-3.5 h-3.5 text-emerald-400" />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedPassIndex(idx);
                            setShowHistoryModal(false);
                            setTimeout(() => {
                              document.title = `Globetrotter-Gate-Pass-${pass.reference}`;
                              window.print();
                            }, 200);
                          }}
                          className="p-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 transition-colors cursor-pointer"
                          title="Download PDF"
                        >
                          <Download className="w-3.5 h-3.5 text-amber-400" />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className="pt-3 border-t border-white/5 flex items-center justify-between text-xs text-slate-400 font-sans-clean">
              <span>Total Bookings: {allPasses.length}</span>
              <button
                type="button"
                onClick={() => setShowHistoryModal(false)}
                className="px-4 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
              >
                Close History
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );

  // EMPTY STATE: User hasn't bought any pass yet
  if (!activePass) {
    return (
      <section className="relative w-full py-20 px-4 md:px-12 bg-[#080A0F] text-slate-200">
        <div className="max-w-2xl mx-auto flex flex-col items-center text-center gap-6 p-8 sm:p-12 rounded-[2rem] bg-[#0E121A] border border-white/10 shadow-2xl">
          <div className="w-16 h-16 rounded-2xl bg-amber-500/15 border border-amber-400/30 flex items-center justify-center text-amber-400">
            <Ticket className="w-8 h-8" />
          </div>

          <div className="flex flex-col gap-2">
            <span className="text-[11px] text-amber-400 font-sans-clean font-semibold">
              Entry passes & digital tickets
            </span>
            <h3 className="text-2xl sm:text-3xl font-bold text-white font-sans-clean">
              No Active Pass Yet
            </h3>
            <p className="text-xs sm:text-sm text-slate-400 max-w-md mx-auto leading-relaxed font-sans-clean">
              You haven't booked an entry pass yet. Pick a curated tour package or plan your custom trip to generate your official gate pass with a scannable QR code.
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            {allPasses.length > 0 && (
              <button
                onClick={() => setShowHistoryModal(true)}
                className="px-6 py-3 rounded-full bg-amber-400/20 hover:bg-amber-400/30 border border-amber-400/50 text-amber-300 font-bold text-xs flex items-center gap-2 cursor-pointer font-sans-clean active:scale-[0.98] transition-all"
                title="View your stored passes, past bookings, and tax receipts"
              >
                <History className="w-4 h-4 text-amber-300" />
                <span>View Stored Passes & Receipts ({allPasses.length})</span>
              </button>
            )}

            {onExplorePackages && (
              <button
                onClick={onExplorePackages}
                className="px-6 py-3 rounded-full bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs flex items-center gap-2 shadow-md cursor-pointer font-sans-clean active:scale-[0.98] transition-all"
              >
                <Compass className="w-4 h-4 text-slate-950" />
                <span>Explore Tour Packages</span>
              </button>
            )}

            {onPlanTrip && (
              <button
                onClick={onPlanTrip}
                className="px-6 py-3 rounded-full bg-white/[0.05] hover:bg-white/[0.08] border border-white/10 text-white font-semibold text-xs flex items-center gap-2 transition-colors cursor-pointer font-sans-clean active:scale-[0.98]"
              >
                <span>Plan Custom Trip with AI</span>
                <ArrowRight className="w-3.5 h-3.5 text-amber-400" />
              </button>
            )}
          </div>
        </div>
        {renderHistoryModal()}
        {renderReceiptModal()}
      </section>
    );
  }

  // ACTIVE TICKET VIEW: Renders full movie-ticket style pass with real QR
  return (
    <section className="relative w-full py-20 px-4 md:px-12 bg-[#080A0F] text-slate-200">
      <div className="max-w-4xl mx-auto flex flex-col items-center gap-8">
        
        {/* Pass Header */}
        <div className="print:hidden flex flex-col items-center text-center gap-2.5">
          {allPasses.length > 1 && (
            <button
              type="button"
              onClick={() => setShowHistoryModal(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/[0.05] hover:bg-white/[0.1] border border-white/10 text-xs text-slate-300 hover:text-white transition-colors cursor-pointer font-sans-clean mb-1"
              title="View all your active and past gate passes"
            >
              <History className="w-3.5 h-3.5 text-amber-400" />
              <span>Pass History ({allPasses.length})</span>
            </button>
          )}
          <h2 className="text-2xl sm:text-4xl font-bold tracking-tight text-white font-sans-clean">
            Digital Entry Pass
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 max-w-md leading-relaxed font-sans-clean">
            Show this QR code at the monument gate for direct entry.
          </p>
        </div>

        {/* Multi-Pass Switcher (When traveler holds multiple passes) */}
        {allPasses.length > 1 && (
          <div className="print:hidden flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none w-full max-w-2xl px-2">
            <span className="text-xs text-slate-400 font-sans-clean shrink-0">Passes ({allPasses.length}):</span>
            {allPasses.map((p, idx) => (
              <button
                key={p.reference || idx}
                onClick={() => setSelectedPassIndex(idx)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-sans-clean shrink-0 transition-all cursor-pointer ${
                  selectedPassIndex === idx
                    ? 'bg-amber-400 text-slate-950 font-bold shadow-md'
                    : 'bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10'
                }`}
              >
                {p.circuitName || p.destination || p.reference}
              </button>
            ))}
          </div>
        )}

        {/* Conductor / Scanner Verification Alert */}
        {typeof window !== 'undefined' && window.location.hash.toLowerCase().includes('verify') && (
          dateStatus.isFuture ? (
            <div className="print:hidden w-full max-w-2xl px-5 py-3.5 rounded-2xl bg-amber-500/15 border border-amber-400/40 flex items-center justify-between gap-3 text-amber-300 shadow-lg">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-amber-400/20 border border-amber-400/30 flex items-center justify-center text-amber-400 shrink-0">
                  <Clock className="w-5 h-5" />
                </div>
                <div className="flex flex-col">
                  <span className="text-xs font-bold text-white font-sans-clean">Admission Not Active Yet</span>
                  <span className="text-[10px] text-amber-300/90 font-mono">
                    Pass is scheduled for {formatPassDate(dateStatus.validFrom)}. Early admission before scheduled visit date is strictly prohibited.
                  </span>
                </div>
              </div>
              <span className="px-2.5 py-1 rounded-full bg-amber-400/20 text-amber-300 text-[10px] font-mono font-bold uppercase tracking-wider">
                Scheduled
              </span>
            </div>
          ) : dateStatus.isExpired ? (
            <div className="print:hidden w-full max-w-2xl px-5 py-3.5 rounded-2xl bg-rose-500/15 border border-rose-400/40 flex items-center justify-between gap-3 text-rose-300 shadow-lg">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-rose-400/20 border border-rose-400/30 flex items-center justify-center text-rose-400 shrink-0">
                  <XCircle className="w-5 h-5" />
                </div>
                <div className="flex flex-col">
                  <span className="text-xs font-bold text-white font-sans-clean">Entry Denied • Pass Expired</span>
                  <span className="text-[10px] text-rose-300/90 font-mono">
                    Pass expired on {formatPassDate(dateStatus.validUntil)}. Please purchase a new pass for today.
                  </span>
                </div>
              </div>
              <span className="px-2.5 py-1 rounded-full bg-rose-400/20 text-rose-300 text-[10px] font-mono font-bold uppercase tracking-wider">
                Expired
              </span>
            </div>
          ) : (
            <div className="print:hidden w-full max-w-2xl px-5 py-3.5 rounded-2xl bg-emerald-500/15 border border-emerald-400/40 flex items-center justify-between gap-3 text-emerald-300 shadow-lg">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-emerald-400/20 border border-emerald-400/30 flex items-center justify-center text-emerald-400 shrink-0">
                  <CheckCircle className="w-5 h-5" />
                </div>
                <div className="flex flex-col">
                  <span className="text-xs font-bold text-white font-sans-clean">Gate Admission Cleared</span>
                  <span className="text-[10px] text-emerald-300/80 font-mono">
                    Valid for Entry Today ({formatPassDateShort(dateStatus.todayIso)}) • Fast-Track Gate Access
                  </span>
                </div>
              </div>
              <span className="px-2.5 py-1 rounded-full bg-emerald-400/20 text-emerald-400 text-[10px] font-mono font-bold uppercase tracking-wider">
                Admitted
              </span>
            </div>
          )
        )}

        {/* Zero-Signal Hill Blackout Advisory */}
        <div className="print:hidden w-full max-w-2xl p-3.5 rounded-2xl bg-sky-500/10 border border-sky-400/20 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-300 font-sans-clean shadow-md">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-sky-500/20 border border-sky-400/30 flex items-center justify-center text-sky-400 shrink-0">
              <Smartphone className="w-4 h-4" />
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-white">Zero-Signal Hill Blackout Advisory</span>
              <span className="text-[11px] text-slate-400">Mobile signal drops to 0 bars in Eastern Ghats, Araku, and Srisailam. Save pass now.</span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => downloadPassImage(activePass, qrCodeDataUrl)}
            className="px-3.5 py-1.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer shrink-0 shadow-sm"
          >
            <Download className="w-3.5 h-3.5 text-slate-950" />
            <span>Save to Photos (PNG)</span>
          </button>
        </div>

        {/* THE MOVIE TICKET CONTAINER */}
        <motion.div
          id="printable-gate-ticket"
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="printable-ticket-card relative w-full max-w-2xl bg-[#0E121A] border border-white/10 rounded-3xl shadow-2xl overflow-hidden text-slate-100"
        >
          {/* Print-Only Official Apex Tourism Header */}
          <div className="hidden print:block p-5 border-b-2 border-slate-900 text-center">
            <div className="text-[11px] font-bold tracking-[0.2em] uppercase text-slate-900 font-mono">
              Andhra Pradesh & Telangana Cultural Heritage Corridors
            </div>
            <div className="text-xl font-black tracking-tight text-slate-950 uppercase mt-0.5">
              Globetrotter Gateway • Digital Travel Voucher & Route Pass
            </div>
            <div className="text-[10px] text-slate-600 font-mono mt-1">
              Verified Self-Drive Itinerary • Offline Gate Voucher
            </div>
          </div>

          {/* Top Cinema Header Bar */}
          <div className="print:hidden px-6 py-4 bg-gradient-to-r from-amber-950/40 via-stone-900/60 to-stone-950 border-b border-white/10 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-amber-400/20 border border-amber-400/30 flex items-center justify-center text-amber-300">
                <Ticket className="w-4 h-4" />
              </div>
              <div className="flex flex-col">
                <span className="text-[11px] font-bold text-white tracking-wider font-mono">
                  GLOBETROTTER TRAVEL COMPANION PASS
                </span>
                <span className="text-[9px] text-amber-300/80 tracking-widest font-mono">
                  VERIFIED AP & TG ROUTE PASS
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {dateStatus.isFuture ? (
                <>
                  <span className="w-2 h-2 rounded-full bg-amber-400" />
                  <span className="text-[11px] font-bold text-amber-300 font-mono">
                    UPCOMING • {formatPassDateShort(dateStatus.validFrom)}
                  </span>
                </>
              ) : dateStatus.isExpired ? (
                <>
                  <span className="w-2 h-2 rounded-full bg-rose-400" />
                  <span className="text-[11px] font-bold text-rose-300 font-mono">
                    EXPIRED ({formatPassDateShort(dateStatus.validUntil)})
                  </span>
                </>
              ) : (
                <>
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-[11px] font-bold text-emerald-400 font-mono">
                    CONFIRMED & ACTIVE TODAY
                  </span>
                </>
              )}
            </div>
          </div>

          {/* Main Ticket Body Grid */}
          <div className="p-6 sm:p-8 flex flex-col gap-6 relative">

            {/* Left & Right Circular Ticket Punch Notches */}
            <div className="hidden sm:block print:hidden absolute -left-4 top-[58%] -translate-y-1/2 w-8 h-8 rounded-full bg-[#080A0F] border-r border-white/15 pointer-events-none" />
            <div className="hidden sm:block print:hidden absolute -right-4 top-[58%] -translate-y-1/2 w-8 h-8 rounded-full bg-[#080A0F] border-l border-white/15 pointer-events-none" />

            {/* Hero Circuit Title & Badges */}
            <div className="flex flex-col gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-white/[0.05] text-slate-200 border border-white/10 font-semibold font-mono uppercase">
                  Digital Travel Companion
                </span>
                <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30 font-semibold font-mono">
                  Order ID: {activePass.reference}
                </span>
              </div>
              <h3 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight font-sans-clean">
                {activePass.circuitName}
              </h3>
            </div>

            {/* Gate Acceptance Reality Notice */}
            <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/25 flex items-start gap-2.5 text-xs text-amber-200/90 font-sans-clean">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div className="flex flex-col gap-1">
                <span className="font-bold text-amber-300">Gate Entry Reality Guide:</span>
                <span className="text-[11px] text-slate-300 leading-relaxed">
                  • <strong>ASI Heritage Monuments</strong> (Golconda, Charminar, Warangal Fort): Guards strictly scan official Central Govt ASI barcode tickets (₹25 at counter / asi.payumoney.com).<br/>
                  • <strong>Natural Landscapes & Temples</strong> (Gandikota Canyon, Ramappa Temple): Free public admission — no ticket or pass required.<br/>
                  • <strong>State Tourism Counters</strong> (Borra Caves): State ticket issued at gate counter (Cash/UPI accepted).
                </span>
              </div>
            </div>

            {/* Movie-Ticket 4-Column Metadata Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 rounded-2xl bg-black/40 border border-white/5 font-sans-clean">
              {/* Traveler */}
              <div className="flex flex-col">
                <span className="text-[10px] uppercase font-mono text-slate-400 flex items-center gap-1">
                  <User className="w-3 h-3 text-amber-400" /> Admit
                </span>
                <span className="text-xs font-bold text-white mt-1 truncate">
                  {activePass.touristName}
                </span>
                <span className="text-[10px] text-slate-500">1 Adult (Primary)</span>
              </div>

              {/* Date */}
              <div className="flex flex-col">
                <span className="text-[10px] uppercase font-mono text-slate-400 flex items-center gap-1">
                  <Calendar className="w-3 h-3 text-emerald-400" /> Visit Date
                </span>
                <span className="text-xs font-bold text-white mt-1">
                  {formatPassDate(dateStatus.validFrom)}
                </span>
                <span className="text-[10px] font-mono mt-0.5">
                  {dateStatus.isFuture && (
                    <span className="text-amber-300 font-semibold">
                      Starts in {dateStatus.daysUntilActive} {dateStatus.daysUntilActive === 1 ? 'day' : 'days'}
                    </span>
                  )}
                  {dateStatus.isActive && (
                    <span className="text-emerald-400 font-semibold">
                      Valid Today (06:00 - 18:00)
                    </span>
                  )}
                  {dateStatus.isExpired && (
                    <span className="text-rose-400 font-semibold">
                      Validity Ended
                    </span>
                  )}
                </span>
              </div>

              {/* Gate / Screen */}
              <div className="flex flex-col">
                <span className="text-[10px] uppercase font-mono text-slate-400 flex items-center gap-1">
                  <MapPin className="w-3 h-3 text-amber-400" /> Checkpoint
                </span>
                <span className="text-xs font-bold text-amber-300 mt-1">
                  Gate 01 • Entry
                </span>
                <span className="text-[10px] text-slate-500">Corridor Pass</span>
              </div>

              {/* Rate */}
              <div className="flex flex-col">
                <span className="text-[10px] uppercase font-mono text-slate-400 flex items-center gap-1">
                  <Clock className="w-3 h-3 text-emerald-400" /> Fare / Fee
                </span>
                <span className="text-xs font-bold text-emerald-400 mt-1">
                  {activePass.gateFeeTotal}
                </span>
                <span className="text-[10px] text-slate-500">All Taxes Included</span>
              </div>
            </div>

            {/* Included Attractions List */}
            {activePass.placesAllowed && activePass.placesAllowed.length > 0 && (
              <div className="flex flex-col gap-1.5 font-sans-clean">
                <span className="text-[11px] font-semibold text-slate-400 font-sans-clean">
                  Attractions covered under this pass
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {activePass.placesAllowed.map((p) => {
                    const isRedeemed = isSpotVisited(p);
                    const gateInfo = getGateAcceptanceInfo(p);
                    return (
                      <span
                        key={p}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-sans-clean flex items-center gap-1.5 transition-colors ${
                          isRedeemed
                            ? 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-300'
                            : 'bg-white/[0.04] border border-white/10 text-slate-300'
                        }`}
                      >
                        {isRedeemed ? (
                          <>
                            <CheckCircle className="w-3 h-3 text-emerald-400 shrink-0" />
                            <span className="line-through opacity-85">{p}</span>
                            <span className="text-[9px] uppercase font-mono px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold">
                              Visited
                            </span>
                          </>
                        ) : (
                          <>
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                            <span>{p}</span>
                            <span className={`text-[9px] font-mono px-1.5 py-0.2 rounded border ${gateInfo.badgeClass}`}>
                              {gateInfo.isFree ? 'Free' : (gateInfo.type === 'ASI_CENTRAL_GOVT' ? 'ASI Counter' : 'Counter')}
                            </span>
                          </>
                        )}
                      </span>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Dynamic Visited Monuments Notification */}
            {visitedPlaces.length > 0 && (
              <div className="flex flex-col gap-2">
                {visitedPlaces.map((v, idx) => (
                  <div key={v.placeId || v.name || idx} className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-between gap-3 text-xs font-sans-clean">
                    <div className="flex items-center gap-2.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                      <div className="flex flex-col">
                        <span className="font-bold text-emerald-300">
                          {v.name}: Visited • Entry Used
                        </span>
                        <span className="text-[11px] text-slate-400">
                          Admitted at {v.time || '10:30 AM'} ({v.date || 'Today'}) • {v.gate || 'Entrance Gate'}
                        </span>
                      </div>
                    </div>
                    <span className="text-[10px] font-semibold font-mono px-2 py-0.5 rounded bg-rose-500/15 border border-rose-500/30 text-rose-300 shrink-0">
                      Re-entry Prohibited
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* PERFORATED TEAR-OFF LINE */}
            <div className="relative py-2">
              <div className="w-full border-b-2 border-dashed border-white/20" />
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-[#0E121A] px-3 text-[10px] font-mono text-slate-400">
                Entry stub • Scan below
              </div>
            </div>

            {/* STUB / DYNAMIC REAL QR & BARCODE SECTION */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-6 p-4 rounded-2xl bg-black/50 border border-white/5">
              {/* Real Dynamic QR Box */}
              <div className="flex items-center gap-4">
                <div className="w-32 h-32 sm:w-36 sm:h-36 bg-white p-2 rounded-2xl flex items-center justify-center shrink-0 shadow-xl overflow-hidden border border-white/20">
                  {qrCodeDataUrl ? (
                    <img 
                      src={qrCodeDataUrl} 
                      alt="Scannable Pass QR Code" 
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    <div className="w-full h-full bg-slate-200 rounded-lg" />
                  )}
                </div>
                <div className="flex flex-col gap-1.5">
                  <span className="text-xs font-bold text-white font-sans-clean">
                    Entry QR Code
                  </span>
                  {isAnyVisited ? (
                    <div className="mt-0.5 p-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-200 text-[10px] font-sans-clean flex items-center gap-1.5 max-w-xs">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0 text-amber-400" />
                      <span>Single-use ticket. Visited attractions cannot be re-entered.</span>
                    </div>
                  ) : (
                    <p className="text-[11px] text-slate-400 leading-relaxed font-sans-clean max-w-xs">
                      Show this QR code at the monument entrance gate for fast-track entry.
                    </p>
                  )}
                  <span className="text-[10px] text-amber-300 font-mono font-semibold tracking-wider">
                    Ticket Code: {activePass.reference}
                  </span>

                  <button
                    type="button"
                    onClick={() => setSunlightScanMode(true)}
                    className="print:hidden mt-1 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 text-[11px] font-bold transition-all shadow-md cursor-pointer active:scale-95 w-fit"
                    title="Open high-contrast full-screen QR code for outdoor gate scanning"
                  >
                    <Sun className="w-3.5 h-3.5 fill-current" />
                    <span>Outdoor Scan Mode</span>
                  </button>
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
                <span className="text-[9px] text-slate-400 font-mono tracking-wider">
                  {activePass.reference}
                </span>
              </div>
            </div>

            {/* Clean Action Controls */}
            <div className="print:hidden pt-2 border-t border-white/10 flex flex-wrap items-center justify-between gap-2.5">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleShareWhatsApp}
                  className="px-3.5 py-2 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/40 text-emerald-300 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer font-sans-clean"
                  title="Share your digital pass with family or friends"
                >
                  <Share2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Share Pass</span>
                  <ArrowUpRight className="w-3 h-3 text-emerald-400" />
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedReceiptPass(activePass)}
                  className="px-3 py-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer font-sans-clean"
                  title="View itemized GST tax invoice and receipt"
                >
                  <FileText className="w-3.5 h-3.5 text-amber-400" />
                  <span>Tax Invoice</span>
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => downloadPassImage(activePass, qrCodeDataUrl)}
                  className="px-3.5 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs transition-colors flex items-center gap-1.5 cursor-pointer font-sans-clean shadow-sm active:scale-95"
                  title="Save pass as PNG photo into gallery for offline ghat travel"
                >
                  <Download className="w-3.5 h-3.5 text-slate-950" />
                  <span>Save to Photos (PNG)</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    document.title = `Globetrotter-Gate-Pass-${activePass.reference}`;
                    window.print();
                  }}
                  className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white font-semibold text-xs transition-colors flex items-center gap-1.5 cursor-pointer font-sans-clean"
                  title="Download or print entry pass voucher"
                >
                  <Printer className="w-3.5 h-3.5 text-amber-400" />
                  <span>Save PDF</span>
                </button>
              </div>
            </div>

            {/* Print-Only Gate Scanner Instruction Footnote */}
            <div className="hidden print:flex flex-col items-center justify-between gap-1 pt-4 border-t-2 border-slate-900 text-[10px] text-slate-800 font-mono text-center">
              <span className="font-bold">Present this printed voucher or digital QR at the monument entrance scanner for admission.</span>
              <span>Pass Order: {activePass.reference} • Non-Transferable • State Tourism Helpline: 1363 (24/7 Toll-Free)</span>
            </div>

          </div>
        </motion.div>

        {/* Offline Tourist Safety & Emergency Helplines Strip */}
        <div className="print:hidden w-full max-w-2xl p-3.5 rounded-2xl bg-[#0B0F17] border border-white/10 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-300 font-sans-clean">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
            <span className="font-semibold text-white">Saved Offline:</span>
            <span className="text-slate-400">Works without internet at monument gates.</span>
          </div>
          <div className="flex items-center gap-2.5 font-mono text-[11px] text-slate-400">
            <span className="text-emerald-300">112 (Police)</span>
            <span>•</span>
            <span className="text-amber-300">108 (Ambulance)</span>
            <span>•</span>
            <span className="text-teal-300">1363 (Tourism)</span>
          </div>
        </div>

      </div>

      {/* Outdoor High-Contrast Sunlight Scan Mode Modal */}
      {sunlightScanMode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-white/95 backdrop-blur-md text-slate-950 font-sans-clean select-none">
          <div className="relative w-full max-w-sm flex flex-col items-center text-center gap-4 p-6 bg-white border-4 border-slate-950 rounded-3xl shadow-2xl">
            <button
              onClick={() => setSunlightScanMode(false)}
              className="absolute top-4 right-4 p-2 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-800 transition-colors cursor-pointer"
              aria-label="Close Sunlight Scan Mode"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex flex-col items-center gap-1 pt-2">
              <span className="px-3 py-1 rounded-full bg-slate-950 text-white text-[11px] font-mono font-bold tracking-wider uppercase">
                Official Gate Entry Scan
              </span>
              <h3 className="text-xl font-black text-slate-950 mt-1">
                {activePass.circuitName}
              </h3>
              <p className="text-xs text-slate-600 font-medium">
                Hold phone toward gate officer scanner or camera
              </p>
            </div>

            {/* Giant Ultra-Crisp High-Contrast QR Code */}
            <div className="w-64 h-64 bg-white p-3 border-4 border-slate-950 rounded-2xl flex items-center justify-center shadow-lg">
              {qrCodeDataUrl && (
                <img
                  src={qrCodeDataUrl}
                  alt="High-Contrast Gate Entry QR Code"
                  className="w-full h-full object-contain"
                />
              )}
            </div>

            <div className="flex flex-col items-center gap-1 w-full bg-slate-100 p-3 rounded-2xl border border-slate-300 font-mono">
              <span className="text-[11px] text-slate-500 font-bold uppercase">Pass Reference</span>
              <span className="text-lg font-black text-slate-950 tracking-wider">
                {activePass.reference}
              </span>
              <span className="text-xs text-slate-700 font-sans-clean font-semibold">
                Admit: {activePass.touristName} (1 Adult)
              </span>
            </div>

            <button
              onClick={() => setSunlightScanMode(false)}
              className="w-full py-3 rounded-2xl bg-slate-950 text-white font-bold text-xs hover:bg-slate-800 transition-colors cursor-pointer shadow-md"
            >
              Return to Standard Pass
            </button>
          </div>
        </div>
      )}

      {renderHistoryModal()}
      {renderReceiptModal()}
    </section>
  );
}
