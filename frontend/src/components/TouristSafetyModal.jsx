import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  ShieldCheck, 
  PhoneCall, 
  AlertTriangle, 
  HeartPulse, 
  Shield, 
  Truck, 
  Trees, 
  Info
} from 'lucide-react';

const EMERGENCY_CONTACTS = [
  {
    number: '112',
    title: 'National Emergency Response',
    subtitle: 'Unified line for Police, Fire & Medical Emergencies',
    badge: 'Immediate Response',
    badgeColor: 'bg-rose-500/20 text-rose-300 border-rose-500/30',
    icon: Shield,
    iconColor: 'text-rose-400 bg-rose-500/10 border-rose-500/20',
    description: 'Works from any mobile network even with zero recharge balance or no SIM card in emergency mode.'
  },
  {
    number: '108',
    title: 'Free Medical Ambulance Service',
    subtitle: 'Government emergency ambulance across AP & Telangana',
    badge: '24/7 Medical',
    badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
    icon: HeartPulse,
    iconColor: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
    description: 'Direct dispatch of equipped ambulances with paramedics to highway or rural locations.'
  },
  {
    number: '1363',
    title: 'Ministry of Tourism Infoline',
    subtitle: 'Official Multi-Lingual Tourist Support',
    badge: 'Tourism Desk',
    badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
    icon: PhoneCall,
    iconColor: 'text-amber-400 bg-amber-500/10 border-amber-400/20',
    description: 'Available in English, Hindi, Telugu and major languages for travel guidance, complaints, and tourist help.'
  },
  {
    number: '1091',
    title: 'Women Traveler Safety Helpline',
    subtitle: 'Dedicated police response for women & families',
    badge: 'Safe Travel',
    badgeColor: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
    icon: ShieldCheck,
    iconColor: 'text-purple-400 bg-purple-500/10 border-purple-400/20',
    description: 'Immediate assistance from Women Protection Cells and Disha / SHE Teams across both states.'
  },
  {
    number: '1033',
    title: 'National Highway Roadside Assistance',
    subtitle: 'NHAI Highway Patrol & Vehicle Towing',
    badge: 'Corridor Highway',
    badgeColor: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
    icon: Truck,
    iconColor: 'text-blue-400 bg-blue-500/10 border-blue-400/20',
    description: 'Emergency vehicle breakdown towing, fuel help, and clearance on NH-16, NH-65, NH-44, and NH-765.'
  },
  {
    number: '1930',
    title: 'Financial & Cyber Fraud Reporting',
    subtitle: 'Immediate freeze for unauthorized card or UPI debits',
    badge: 'Payment Safety',
    badgeColor: 'bg-slate-500/20 text-slate-300 border-slate-500/30',
    icon: AlertTriangle,
    iconColor: 'text-amber-400 bg-amber-500/10 border-amber-400/20',
    description: 'Report accidental double payments, fraudulent vendor QR codes, or travel scam websites.'
  }
];

const CORRIDOR_SAFETY_TIPS = [
  {
    title: 'Forest Checkpost Night Curfew (9:00 PM – 6:00 AM)',
    icon: Trees,
    text: 'Srisailam Amrabad Tiger Reserve and Nallamala ghat entry checkposts strictly close overnight. Plan to cross before 8:30 PM to avoid waiting until morning.'
  },
  {
    title: 'Underground Caves & Forest Dead Zones',
    icon: AlertTriangle,
    text: 'Borra Caves and Belum Caves have zero mobile reception inside the subterranean chambers. Set a clear meeting spot with family before going in.'
  },
  {
    title: 'Temple Attire & Mobile Deposit',
    icon: Info,
    text: 'Major spiritual shrines (Tirumala, Srisailam, Simhachalam) require modest clothing (Dhoti/Kurta or Saree/Salwar). Mobile phones must be deposited at verified token counters.'
  }
];

export default function TouristSafetyModal({ isOpen, onClose }) {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
          role="dialog"
          aria-modal="true"
          aria-labelledby="tourist-safety-title"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="relative w-full max-w-2xl max-h-[90vh] overflow-hidden rounded-[2rem] bg-[#0A0E17] border border-white/10 shadow-2xl flex flex-col text-slate-200"
          >
            {/* Modal Top Header */}
            <div className="flex items-center justify-between p-6 border-b border-white/10 bg-white/[0.02]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-400">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 id="tourist-safety-title" className="text-base sm:text-lg font-bold text-white font-sans-clean">
                    Tourist Safety & Emergency Helplines
                  </h3>
                  <p className="text-xs text-slate-400 font-sans-clean">
                    Official 24/7 Verified Contacts Across Andhra Pradesh & Telangana
                  </p>
                </div>
              </div>

              <button
                onClick={onClose}
                className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center text-slate-400 hover:text-white transition-colors cursor-pointer"
                aria-label="Close safety modal"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="overflow-y-auto p-6 space-y-6 no-scrollbar">
              
              {/* Emergency Numbers Grid */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400 font-sans-clean">
                    One-Tap Emergency Dialers
                  </span>
                  <span className="text-[11px] text-amber-400 font-sans-clean">
                    Toll-Free 24×7
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {EMERGENCY_CONTACTS.map((item) => {
                    const ItemIcon = item.icon;
                    return (
                      <div
                        key={item.number}
                        className="p-4 rounded-2xl bg-white/[0.03] border border-white/5 hover:border-white/15 transition-all flex flex-col justify-between gap-3 group"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-start gap-3">
                            <div className={`w-9 h-9 rounded-xl border flex items-center justify-center shrink-0 ${item.iconColor}`}>
                              <ItemIcon className="w-4 h-4" />
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="text-base font-extrabold text-white font-mono tracking-tight">
                                  {item.number}
                                </span>
                                <span className={`text-[10px] px-2 py-0.5 rounded-full border font-semibold font-sans-clean ${item.badgeColor}`}>
                                  {item.badge}
                                </span>
                              </div>
                              <h4 className="text-xs font-bold text-slate-200 mt-0.5 font-sans-clean">
                                {item.title}
                              </h4>
                            </div>
                          </div>
                        </div>

                        <p className="text-[11px] text-slate-400 leading-relaxed font-sans-clean">
                          {item.description}
                        </p>

                        <a
                          href={`tel:${item.number}`}
                          className="w-full py-2 px-3 rounded-xl bg-white/[0.05] hover:bg-amber-400 hover:text-slate-950 text-amber-300 text-xs font-bold transition-all flex items-center justify-center gap-2 border border-white/10 group-hover:border-amber-400/50"
                        >
                          <PhoneCall className="w-3.5 h-3.5" />
                          <span>Call {item.number} Now</span>
                        </a>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Corridor Safety Alerts */}
              <div className="space-y-3 pt-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400 font-sans-clean">
                  Key Corridor Travel Guidelines
                </span>

                <div className="space-y-2.5">
                  {CORRIDOR_SAFETY_TIPS.map((tip) => {
                    const TipIcon = tip.icon;
                    return (
                      <div
                        key={tip.title}
                        className="p-3.5 rounded-xl bg-amber-500/5 border border-amber-500/15 flex items-start gap-3"
                      >
                        <TipIcon className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                        <div>
                          <h5 className="text-xs font-bold text-amber-200 font-sans-clean">
                            {tip.title}
                          </h5>
                          <p className="text-[11px] text-slate-300 mt-0.5 leading-relaxed font-sans-clean">
                            {tip.text}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Regional Major Hospital Helpdesks */}
              <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-300 font-sans-clean">
                  <HeartPulse className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Key Referral Hospitals Near Major Circuits</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] text-slate-400 font-sans-clean">
                  <div className="p-2 rounded-lg bg-white/[0.02] border border-white/5">
                    <strong className="text-slate-200">Araku & Vizag:</strong> KGH Visakhapatnam & Area Hospital Araku
                  </div>
                  <div className="p-2 rounded-lg bg-white/[0.02] border border-white/5">
                    <strong className="text-slate-200">Tirupati & Rayalaseema:</strong> SVIMS & Ruia Hospital Tirupati
                  </div>
                  <div className="p-2 rounded-lg bg-white/[0.02] border border-white/5">
                    <strong className="text-slate-200">Hyderabad Metro:</strong> Osmania Hospital & Gandhi Hospital
                  </div>
                  <div className="p-2 rounded-lg bg-white/[0.02] border border-white/5">
                    <strong className="text-slate-200">Warangal & Ramappa:</strong> MGM Hospital Warangal
                  </div>
                </div>
              </div>

            </div>

            {/* Modal Bottom Footer */}
            <div className="p-4 border-t border-white/10 bg-white/[0.01] flex items-center justify-between">
              <span className="text-[11px] text-slate-500 font-sans-clean">
                Globetrotter Safety Sentinel • AP & TG Tourism
              </span>
              <button
                onClick={onClose}
                className="px-4 py-1.5 rounded-full bg-white/10 hover:bg-white/15 text-white text-xs font-semibold font-sans-clean transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
