import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  Printer, 
  Navigation, 
  ShieldCheck, 
  AlertTriangle,
  Utensils,
  Clock,
  MessageSquare
} from 'lucide-react';
import {
  getGateAcceptanceInfo,
  getLastMileTrapWarning,
  getCheckpostCurfewInfo,
  getSeasonalityInfo,
  getTempleDressCodeInfo,
  LOCAL_TELUGU_PHRASEBOOK
} from '../utils/travelGroundRealities';

export default function PocketDossierModal({ isOpen, onClose, planResult, selectedPlaces = [] }) {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!planResult) return null;

  const days = planResult.days || planResult.itinerary || [];
  const totalKm = planResult.totalRoadKm || 120;
  const packagePrice = typeof planResult.packagePrice === 'number'
    ? planResult.packagePrice
    : (parseFloat(planResult.packagePrice) || 0);

  const handlePrint = () => {
    window.print();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-md print:p-0 print:bg-white print:static"
          role="dialog"
          aria-modal="true"
          aria-labelledby="pocket-trip-guide-title"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 15 }}
            transition={{ duration: 0.2 }}
            className="relative w-full max-w-4xl max-h-[92vh] overflow-y-auto rounded-[2rem] bg-[#0A0D14] border border-white/10 shadow-2xl flex flex-col text-slate-200 print:max-h-none print:h-auto print:border-none print:shadow-none print:bg-white print:text-black print:rounded-none"
          >
            {/* Top Toolbar (Hidden during print) */}
            <div className="flex items-center justify-between p-5 border-b border-white/10 bg-white/[0.02] sticky top-0 backdrop-blur-xl z-20 print:hidden">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-amber-400/20 border border-amber-400/30 flex items-center justify-center text-amber-300">
                  <Printer className="w-4 h-4" />
                </div>
                <div>
                  <h3 id="pocket-trip-guide-title" className="text-sm sm:text-base font-bold text-white font-sans-clean">
                    Pocket Trip Guide
                  </h3>
                  <span className="text-[11px] text-slate-400 font-sans-clean">
                    Print or save as 1-page PDF for your road trip
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handlePrint}
                  className="px-4 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shadow-md font-sans-clean"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print / Save PDF</span>
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center text-slate-400 hover:text-white transition-colors cursor-pointer"
                  aria-label="Close guide"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Printable Content Container */}
            <div className="p-6 sm:p-8 space-y-6 font-sans-clean print:p-2 print:space-y-4">
              
              {/* Header Box */}
              <div className="border-b border-white/10 pb-6 print:border-b-2 print:border-black print:pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] uppercase font-bold tracking-widest text-amber-400 print:text-amber-700">
                      Official Tourist Itinerary & Travel Guide
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 font-semibold print:border-emerald-700 print:text-emerald-800">
                      Verified AP & TG Tourism
                    </span>
                  </div>
                  <h2 className="text-2xl sm:text-3xl font-extrabold text-white mt-1 print:text-black">
                    Globetrotter Pocket Tour Guide
                  </h2>
                  <p className="text-xs text-slate-400 mt-1 max-w-2xl print:text-gray-700">
                    {planResult.summary || 'Custom day-by-day travel itinerary with verified gate timings, meal halts, and emergency hospital distances.'}
                  </p>
                </div>

                <div className="flex sm:flex-col items-center sm:items-end justify-between border-t sm:border-t-0 border-white/10 pt-3 sm:pt-0 text-right">
                  <div className="text-xs font-mono text-slate-300 print:text-gray-800">
                    Duration: <strong>{days.length} Days</strong>
                  </div>
                  <div className="text-xs font-mono text-slate-300 print:text-gray-800">
                    Scenic Route: <strong>{totalKm} km</strong>
                  </div>
                  <div className="text-xs font-mono text-emerald-400 font-bold print:text-emerald-700">
                    Pass Package: {packagePrice === 0 ? 'Free Entry (₹0)' : `₹${packagePrice}`}
                  </div>
                </div>
              </div>

              {/* Day-by-Day Table */}
              <div className="space-y-6 print:space-y-4">
                {days.map((dayPlan, dIdx) => {
                  const dayStops = dayPlan.stops || dayPlan.legs || [];
                  const dayNum = dayPlan.dayNumber || dayPlan.day || (dIdx + 1);

                  return (
                    <div 
                      key={dayNum}
                      className="rounded-2xl border border-white/10 overflow-hidden bg-white/[0.02] print:border print:border-black print:rounded-none print:bg-white"
                    >
                      {/* Day Header Strip */}
                      <div className="px-4 py-2.5 bg-white/[0.05] border-b border-white/10 flex items-center justify-between text-xs font-bold text-white print:bg-gray-100 print:text-black print:border-b print:border-black">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-amber-400 print:text-black">Day {dayNum}:</span>
                          <span>{dayPlan.title || dayPlan.theme || 'Exploration & Heritage'}</span>
                        </div>
                        <div className="text-[11px] font-mono text-slate-400 print:text-gray-700">
                          {dayPlan.estimatedDistance || `${dayPlan.dayKm || 80} km`} • {dayPlan.estimatedDuration || '3.5 hrs'}
                        </div>
                      </div>

                      {/* Stops Table */}
                      <div className="divide-y divide-white/5 print:divide-y print:divide-gray-300">
                        {dayStops.map((stop, sIdx) => {
                          const stopName = stop.name || stop.spotName || 'Landmark';
                          const matchedPlace = selectedPlaces.find(p => p.name?.toLowerCase() === stopName?.toLowerCase());
                          const isMeal = Boolean(stop.isMealHalt);
                          const foodHighlight = stop.foodTip || matchedPlace?.culinarySpecialty || matchedPlace?.foodSpecialty;
                          const fee = (stop.individualPrice != null && stop.individualPrice > 0)
                            ? `₹${stop.individualPrice}`
                            : (stop.feesDescription || stop.fees || matchedPlace?.feesDescription || matchedPlace?.fees || 'Free');

                          const lastMileTrap = getLastMileTrapWarning(stopName, stop.district);
                          const curfewInfo = getCheckpostCurfewInfo(stopName, stop.district);
                          const seasonInfo = getSeasonalityInfo(stopName, stop.category);
                          const dressCodeInfo = getTempleDressCodeInfo(stopName, stop.category);
                          const gateInfo = getGateAcceptanceInfo(stopName, stop.feesDescription, stop.individualPrice);

                          return (
                            <div 
                              key={`${stopName}-${sIdx}`}
                              className="p-3.5 flex flex-col sm:flex-row sm:items-start justify-between gap-3 text-xs"
                            >
                              <div className="flex items-start gap-3 min-w-0 flex-1">
                                <span className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-[10px] shrink-0 font-mono print:border print:border-black ${
                                  isMeal 
                                    ? 'bg-amber-500/20 text-amber-300 print:bg-transparent print:text-black' 
                                    : 'bg-white/10 text-white print:bg-transparent print:text-black'
                                }`}>
                                  {isMeal ? '🍽️' : (sIdx + 1)}
                                </span>

                                <div className="flex flex-col min-w-0 flex-1">
                                  <div className="flex items-center gap-2">
                                    <span className="font-bold text-white text-sm truncate print:text-black">
                                      {stopName}
                                    </span>
                                    {isMeal && (
                                      <span className="text-[10px] px-2 py-0.2 rounded-full bg-amber-500/20 text-amber-300 font-semibold print:text-black">
                                        Meal Break
                                      </span>
                                    )}
                                  </div>

                                  <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-400 mt-0.5 print:text-gray-700">
                                    <span>{stop.district || 'Regional'}</span>
                                    <span>•</span>
                                    <span>Stay: {stop.dwellMinutes ? `${stop.dwellMinutes} mins` : '1.5 hrs'}</span>
                                    {stop.emergencyMedicalDistance && (
                                      <>
                                        <span>•</span>
                                        <span className="text-emerald-400 print:text-gray-800">Hospital: {stop.emergencyMedicalDistance}</span>
                                      </>
                                    )}
                                  </div>

                                  {foodHighlight && (
                                    <div className="text-[11px] text-amber-300/90 mt-1 flex items-center gap-1.5 print:text-gray-800">
                                      <Utensils className="w-3 h-3 text-amber-400 print:hidden" />
                                      <span>Local Specialty: {foodHighlight}</span>
                                    </div>
                                  )}

                                  {/* Ground Reality Warnings */}
                                  {lastMileTrap && (
                                    <div className="mt-1.5 p-2 rounded-lg bg-rose-500/10 border border-rose-500/25 text-rose-200 text-[11px] flex items-start gap-1.5 print:border print:border-black print:text-black">
                                      <AlertTriangle className="w-3.5 h-3.5 text-rose-400 shrink-0 mt-0.5 print:hidden" />
                                      <div>
                                        <strong className="text-rose-300 print:text-black">{lastMileTrap.title}: </strong>
                                        <span>{lastMileTrap.description}</span>
                                      </div>
                                    </div>
                                  )}

                                  {curfewInfo && (
                                    <div className="mt-1 p-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-200 text-[10px] flex items-start gap-1 print:border print:border-black print:text-black">
                                      <Clock className="w-3 h-3 text-amber-400 shrink-0 mt-0.5 print:hidden" />
                                      <span><strong>Forest Gate Curfew ({curfewInfo.lockTime}):</strong> {curfewInfo.warning}</span>
                                    </div>
                                  )}

                                  {seasonInfo && (
                                    <div className="mt-1 text-[10px] text-sky-300/90 font-mono print:text-black">
                                      💧 {seasonInfo.bestMonths} • {seasonInfo.summerAlert}
                                    </div>
                                  )}

                                  {dressCodeInfo && (
                                    <div className="mt-1 text-[10px] text-amber-300/90 font-mono print:text-black">
                                      🛕 {dressCodeInfo.title}: {dressCodeInfo.dressCode}
                                    </div>
                                  )}
                                </div>
                              </div>

                              <div className="flex items-center justify-between sm:justify-end gap-4 pl-9 sm:pl-0 shrink-0">
                                <div className="text-right">
                                  <div className="font-mono text-amber-300 font-semibold print:text-black">
                                    {stop.arrivalTime || '09:30 AM'}
                                  </div>
                                  <div className="text-[10px] text-emerald-400 font-bold print:text-black">
                                    {fee}
                                  </div>
                                  <span className="text-[9px] block text-slate-400 print:text-black font-sans-clean">
                                    {gateInfo.isFree ? 'Free Public Entry' : (gateInfo.type === 'ASI_CENTRAL_GOVT' ? 'ASI Ticket Req.' : 'Counter Ticket')}
                                  </span>
                                </div>

                                <a
                                  href={matchedPlace?.googleMapsUri || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(stopName + ' ' + (stop.district || ''))}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 print:hidden"
                                  title="Open in Google Maps"
                                >
                                  <Navigation className="w-3.5 h-3.5 text-amber-400" />
                                </a>
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* Curfew alert if any */}
                      {dayPlan.curfewAdvisory && (
                        <div className="p-3 bg-amber-500/10 border-t border-amber-500/20 text-[11px] text-amber-200 flex items-start gap-2 print:text-black print:bg-gray-100">
                          <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5 print:hidden" />
                          <span>Advisory: {dayPlan.curfewAdvisory}</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Emergency Numbers Strip (Essential on print) */}
              <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 print:border print:border-black print:bg-white print:rounded-none">
                <div className="flex items-center gap-2 mb-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-400 print:text-black" />
                  <span className="text-xs font-bold uppercase tracking-wider text-white print:text-black">
                    Emergency Toll-Free Contacts (24×7 AP & TG)
                  </span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs font-mono print:text-black">
                  <div className="p-2 rounded-lg bg-white/[0.02] border border-white/5 print:border print:border-gray-300">
                    <strong className="block text-white print:text-black">112</strong>
                    <span className="text-[10px] text-slate-400 print:text-gray-700">Unified Police/Fire</span>
                  </div>
                  <div className="p-2 rounded-lg bg-white/[0.02] border border-white/5 print:border print:border-gray-300">
                    <strong className="block text-emerald-400 print:text-black">108</strong>
                    <span className="text-[10px] text-slate-400 print:text-gray-700">Free Ambulance</span>
                  </div>
                  <div className="p-2 rounded-lg bg-white/[0.02] border border-white/5 print:border print:border-gray-300">
                    <strong className="block text-amber-400 print:text-black">1363</strong>
                    <span className="text-[10px] text-slate-400 print:text-gray-700">Tourist Infoline</span>
                  </div>
                  <div className="p-2 rounded-lg bg-white/[0.02] border border-white/5 print:border print:border-gray-300">
                    <strong className="block text-rose-400 print:text-black">1091</strong>
                    <span className="text-[10px] text-slate-400 print:text-gray-700">Women Helpline</span>
                  </div>
                  <div className="p-2 rounded-lg bg-white/[0.02] border border-white/5 print:border print:border-gray-300">
                    <strong className="block text-amber-400 print:text-black">1033</strong>
                    <span className="text-[10px] text-slate-400 print:text-gray-700">Highway Help</span>
                  </div>
                </div>
              </div>

              {/* Local Telugu Driver & Checkpost Phrases */}
              <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 print:border print:border-black print:bg-white print:rounded-none">
                <div className="flex items-center gap-2 mb-2">
                  <MessageSquare className="w-4 h-4 text-amber-400 print:text-black" />
                  <span className="text-xs font-bold uppercase tracking-wider text-white print:text-black">
                    Helpful Telugu Phrases for Drivers & Forest Checkposts
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-sans-clean print:text-black">
                  {LOCAL_TELUGU_PHRASEBOOK.map((phrase) => (
                    <div key={phrase.english} className="p-2 rounded-lg bg-white/[0.02] border border-white/5 print:border print:border-gray-300">
                      <span className="text-[11px] text-slate-400 block print:text-gray-700">{phrase.english}</span>
                      <div className="flex items-center justify-between gap-1 mt-0.5">
                        <strong className="text-amber-300 print:text-black text-xs">{phrase.transliteration}</strong>
                        <span className="text-xs text-slate-300 font-serif print:text-black">{phrase.telugu}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Print Footer Note */}
              <div className="text-[10px] text-slate-500 flex items-center justify-between pt-2 border-t border-white/5 print:text-gray-600 print:border-gray-300">
                <span>Globetrotter Travel Guide • Valid for travel across Andhra Pradesh & Telangana</span>
                <span>Carry valid Photo ID with your pass at monument checkpoints.</span>
              </div>

            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
