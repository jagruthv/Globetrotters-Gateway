import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import FloatingIslandNav from './components/FloatingIslandNav';
import MobileAppBottomDock from './components/MobileAppBottomDock';
import FluidLiquidDropHero from './components/FluidLiquidDropHero';
import BentoDistrictExplorer from './components/BentoDistrictExplorer';
import AiFluidTripStudio from './components/AiFluidTripStudio';
import CircuitShowcase from './components/CircuitShowcase';
import HolographicGatePass from './components/HolographicGatePass';
import AgentPortalView from './components/AgentPortalView';
import AgentVerificationModal from './components/AgentVerificationModal';
import VoiceConciergeModal from './components/VoiceConciergeModal';
import WhatsAppConcierge from './components/WhatsAppConcierge';
import CookieConsentBanner from './components/CookieConsentBanner';
import SettingsModal from './components/SettingsModal';
import { Heart, ArrowRight } from 'lucide-react';

const HASH_MAP = {
  '': 'home',
  'overview': 'home',
  'districts': 'explore',
  'explore': 'explore',
  'planner': 'planner',
  'packages': 'circuits',
  'circuits': 'circuits',
  'passes': 'passes',
  'tickets': 'passes'
};

const TAB_TO_HASH = {
  home: '',
  explore: 'districts',
  planner: 'planner',
  circuits: 'packages',
  passes: 'passes'
};

const getInitialTab = () => {
  if (typeof window === 'undefined') return 'home';
  const raw = window.location.hash.replace('#/', '').replace('#', '').trim().toLowerCase();
  return HASH_MAP[raw] || 'home';
};

export default function App() {
  const [activeTab, setActiveTabState] = useState(getInitialTab);
  const [selectedPlaces, setSelectedPlaces] = useState([]);
  const [voiceModalOpen, setVoiceModalOpen] = useState(false);
  const [settingsModalOpen, setSettingsModalOpen] = useState(false);
  const [agentVerificationOpen, setAgentVerificationOpen] = useState(false);
  const [isAgentPortalActive, setIsAgentPortalActive] = useState(() => {
    if (typeof window === 'undefined') return false;
    const raw = window.location.hash.replace('#/', '').replace('#', '').trim().toLowerCase();
    return (raw === 'agent' || raw === 'scanner') && localStorage.getItem('globetrotter_is_agent') === 'true';
  });

  const [issuedPassData, setIssuedPassData] = useState(() => {
    try {
      const stored = localStorage.getItem('globetrotter_passes');
      if (stored) {
        const list = JSON.parse(stored);
        if (Array.isArray(list)) {
          // Strictly purge any obsolete demo pass!
          const clean = list.filter(p => 
            p && 
            p.reference !== 'BMS-GT-89421' && 
            !p.token?.includes('e3b0c442')
          );
          if (clean.length !== list.length) {
            localStorage.setItem('globetrotter_passes', JSON.stringify(clean));
          }
          if (clean.length > 0) return clean[0];
        }
      }
      return null;
    } catch {
      return null;
    }
  });
  const shouldReduceMotion = useReducedMotion();

  const setActiveTab = (tab) => {
    setActiveTabState(tab);
    const targetHash = TAB_TO_HASH[tab] ? `#/${TAB_TO_HASH[tab]}` : '#/';
    if (window.location.hash !== targetHash) {
      window.history.pushState(null, '', targetHash);
    }
  };

  const handleOpenAgentPortal = () => {
    const isAgent = localStorage.getItem('globetrotter_is_agent') === 'true';
    if (isAgent) {
      setIsAgentPortalActive(true);
      window.history.pushState(null, '', '#/agent');
    } else {
      setAgentVerificationOpen(true);
    }
  };

  const handleExitAgentMode = () => {
    setIsAgentPortalActive(false);
    setActiveTab('home');
    window.history.pushState(null, '', '#/');
  };

  useEffect(() => {
    const handleHashSync = () => {
      const raw = window.location.hash.replace('#/', '').replace('#', '').trim().toLowerCase();
      if (raw === 'agent' || raw === 'scanner') {
        const isAgent = localStorage.getItem('globetrotter_is_agent') === 'true';
        if (isAgent) {
          setIsAgentPortalActive(true);
        } else {
          setIsAgentPortalActive(false);
          setAgentVerificationOpen(true);
        }
      } else {
        setIsAgentPortalActive(false);
        setActiveTabState(getInitialTab());
      }
    };
    window.addEventListener('hashchange', handleHashSync);
    window.addEventListener('popstate', handleHashSync);
    return () => {
      window.removeEventListener('hashchange', handleHashSync);
      window.removeEventListener('popstate', handleHashSync);
    };
  }, []);

  // When switching tabs, reset view to top
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, [activeTab]);

  // Add / Toggle place in Trip Planner
  const handleSelectPlaceForTrip = (place, districtName) => {
    setSelectedPlaces((prev) => {
      const exists = prev.some((p) => p.name.toLowerCase() === place.name.toLowerCase());
      if (exists) {
        return prev.filter((p) => p.name.toLowerCase() !== place.name.toLowerCase());
      }
      return [...prev, { ...place, district: districtName }];
    });
  };

  const handleRemovePlace = (placeName) => {
    setSelectedPlaces((prev) => prev.filter((p) => p.name !== placeName));
  };

  const handleClearPlaces = () => {
    setSelectedPlaces([]);
  };

  // Direct 1-click Fast-Pass booking from Hero
  const handleDirectBookPass = (passInfo) => {
    const randomCode = Math.random().toString(36).substring(2, 7).toUpperCase();
    setIssuedPassData({
      reference: `GT-2026-${randomCode}`,
      token: `GT_PASS:${passInfo.district.replace(/\s+/g, '')}:${Date.now()}:ed25519_sig_${randomCode}`,
      touristName: 'Verified Visitor',
      circuitName: `${passInfo.destination} Priority Pass`,
      validFrom: new Date().toISOString().split('T')[0],
      validUntil: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
      status: 'ACTIVE_AUTHENTICATED',
      placesAllowed: [passInfo.destination],
      gateFeeTotal: passInfo.price || '₹40'
    });
    setActiveTab('passes');
  };

  // When a user chooses a circuit, populate its places into trip planner
  const handleSelectCircuit = (circuit) => {
    if (circuit?.places && Array.isArray(circuit.places)) {
      setSelectedPlaces(circuit.places);
    } else if (circuit?.standout) {
      const parsed = circuit.standout.split('&').map(s => ({
        name: s.trim(),
        district: circuit.states || 'Regional',
        category: 'Heritage'
      }));
      setSelectedPlaces(parsed);
    }
    setActiveTab('planner');
  };

  const handleBookCircuit = (circuit) => {
    const randomCode = Math.random().toString(36).substring(2, 7).toUpperCase();
    setIssuedPassData({
      reference: `GT-2026-CIR-${randomCode}`,
      token: `GT_PASS:CIRCUIT:${Date.now()}:hmac_sha256_${randomCode}`,
      touristName: 'Verified Visitor',
      circuitName: circuit.title,
      validFrom: new Date().toISOString().split('T')[0],
      validUntil: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
      status: 'ACTIVE_AUTHENTICATED',
      placesAllowed: [circuit.standout, 'All Circuit Checkpoints'],
      gateFeeTotal: `₹${circuit.passPrice} (Bundle Savings)`
    });
    setActiveTab('passes');
  };

  // DEDICATED SEPARATE FIELD AGENT INTERFACE
  if (isAgentPortalActive) {
    return (
      <AgentPortalView
        onExitAgentMode={handleExitAgentMode}
        passData={issuedPassData}
      />
    );
  }

  return (
    <div className="relative min-h-[100dvh] bg-[#06080D] text-slate-100 font-sans-clean overflow-x-hidden selection:bg-cyan-500/20 pb-20 md:pb-0">
      
      {/* Floating Island Glass Navigation Dock (Desktop) */}
      <FloatingIslandNav
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        selectedPlacesCount={selectedPlaces.length}
        onOpenSettings={() => setSettingsModalOpen(true)}
      />

      {/* Main Tab Views with Framer Motion Spring Transition */}
      <main className="relative z-10">
        <AnimatePresence mode="wait">
          {activeTab === 'home' && (
            <motion.div
              key="home"
              initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              {/* Interactive Travel Hero */}
              <FluidLiquidDropHero
                onExploreDistricts={() => setActiveTab('explore')}
                onLaunchTripPlanner={() => setActiveTab('planner')}
                onDirectBookPass={handleDirectBookPass}
              />

              {/* 59 Districts Cultural Exploration */}
              <BentoDistrictExplorer
                onSelectPlaceForTrip={handleSelectPlaceForTrip}
                selectedPlaces={selectedPlaces}
              />

              {/* Signature Heritage Circuits */}
              <CircuitShowcase
                onSelectCircuit={handleSelectCircuit}
                onBookCircuit={handleBookCircuit}
              />

              {/* Ready to Explore Corridor Callout */}
              <section className="py-16 px-4 md:px-12 bg-black/40 border-t border-white/5 text-center">
                <div className="max-w-3xl mx-auto flex flex-col items-center gap-5">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-300 text-[10px] font-mono uppercase tracking-widest">
                    Unified Tourism Corridors • AP & TG
                  </div>
                  <h3 className="text-2xl sm:text-3xl font-extrabold text-white font-sans-clean">
                    Start Your Heritage Journey Across 59 Districts
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-400 max-w-xl mx-auto leading-relaxed font-sans-clean">
                    Discover historical temples, lush hill stations, and subterranean caverns. Pick a curated tour package or build your personalized day-by-day plan with our AI concierge.
                  </p>
                  <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                    <button
                      onClick={() => setActiveTab('explore')}
                      className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-400 to-emerald-400 text-slate-950 font-bold text-xs flex items-center gap-2 hover:opacity-95 transition-opacity shadow-md cursor-pointer font-sans-clean"
                    >
                      <span>Explore 59 Districts</span>
                      <ArrowRight className="w-3.5 h-3.5 text-slate-950" />
                    </button>
                    <button
                      onClick={() => setActiveTab('planner')}
                      className="px-5 py-2.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.08] border border-white/10 text-white font-semibold text-xs flex items-center gap-2 transition-colors cursor-pointer font-sans-clean"
                    >
                      <span>Plan Custom Trip with AI</span>
                    </button>
                  </div>
                </div>
              </section>
            </motion.div>
          )}

          {activeTab === 'explore' && (
            <motion.div
              key="explore"
              initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
              className="pt-28 pb-16"
            >
              <BentoDistrictExplorer
                onSelectPlaceForTrip={handleSelectPlaceForTrip}
                selectedPlaces={selectedPlaces}
              />
            </motion.div>
          )}

          {activeTab === 'planner' && (
            <motion.div
              key="planner"
              initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
              className="pt-28 pb-16"
            >
              <AiFluidTripStudio
                selectedPlaces={selectedPlaces}
                onRemovePlace={handleRemovePlace}
                onClearPlaces={handleClearPlaces}
                onExploreMore={() => setActiveTab('explore')}
                onProceedToPasses={() => setActiveTab('passes')}
                onBookCustomPlan={(customPlan) => {
                  const randomCode = Math.random().toString(36).substring(2, 7).toUpperCase();
                  const allStops = (customPlan.days || []).flatMap(d => (d.stops || []).map(s => s.name || s.placeName || s));
                  const passRef = `APTG-${randomCode}`;
                  setIssuedPassData({
                    reference: passRef,
                    token: passRef,
                    touristName: 'Verified Visitor',
                    circuitName: customPlan.title || 'Personalized Gemini Circuit Pass',
                    validFrom: new Date().toISOString().split('T')[0],
                    validUntil: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
                    status: 'ACTIVE_AUTHENTICATED',
                    placesAllowed: allStops.length > 0 ? allStops : selectedPlaces.map(p => p.name),
                    gateFeeTotal: `₹${customPlan.packagePrice || 320} (Unified Pass)`
                  });
                  setActiveTab('passes');
                }}
              />
            </motion.div>
          )}

          {activeTab === 'circuits' && (
            <motion.div
              key="circuits"
              initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
              className="pt-28 pb-16"
            >
              <CircuitShowcase
                onSelectCircuit={handleSelectCircuit}
                onBookCircuit={handleBookCircuit}
              />
            </motion.div>
          )}

          {activeTab === 'passes' && (
            <motion.div
              key="passes"
              initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
              className="pt-28 pb-16"
            >
              <HolographicGatePass
                passData={issuedPassData}
                onOpenAudioGuide={() => setVoiceModalOpen(true)}
                onExplorePackages={() => setActiveTab('circuits')}
                onPlanTrip={() => setActiveTab('planner')}
              />
            </motion.div>
          )}

          {activeTab === 'scanner' && (
            <motion.div
              key="scanner"
              initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
              className="pt-28 pb-16"
            >
              <div className="max-w-md mx-auto text-center p-8 bg-[#0D121F] rounded-3xl border border-white/10 flex flex-col items-center gap-4">
                <h3 className="text-xl font-bold text-white">Field Agent Portal</h3>
                <p className="text-xs text-slate-400">Gate scanning and ticket verification are hosted in the dedicated Field Agent Console.</p>
                <button
                  onClick={handleOpenAgentPortal}
                  className="px-5 py-2.5 rounded-xl bg-cyan-400 text-slate-950 font-bold text-xs cursor-pointer"
                >
                  Enter Agent Portal
                </button>
              </div>
            </motion.div>
          )}

          {!['home', 'explore', 'planner', 'circuits', 'passes', 'scanner'].includes(activeTab) && (
            <motion.div
              key="not-found"
              initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              transition={{ duration: 0.35 }}
              className="pt-24 pb-16 text-center max-w-lg mx-auto"
            >
              <h2 className="text-3xl font-serif text-white mb-4">Destination Not Found</h2>
              <p className="text-slate-400 mb-8">The requested tourism corridor or route does not exist. Explore our 59 districts or heritage circuits.</p>
              <button
                onClick={() => setActiveTab('home')}
                className="px-6 py-3 bg-[#E5C158] text-[#0A0D14] font-medium rounded-full shadow-lg hover:bg-[#F3D57A] transition-all min-h-[44px] cursor-pointer"
              >
                Return to Home
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Voice Concierge Audio Companion Modal */}
      <VoiceConciergeModal
        isOpen={voiceModalOpen}
        onClose={() => setVoiceModalOpen(false)}
      />

      {/* Settings & Preferences Modal */}
      <SettingsModal
        isOpen={settingsModalOpen}
        onClose={() => setSettingsModalOpen(false)}
        onOpenAgentPortal={handleOpenAgentPortal}
      />

      {/* Field Agent Verification & Accreditation Modal */}
      <AgentVerificationModal
        isOpen={agentVerificationOpen}
        onClose={() => setAgentVerificationOpen(false)}
        onAgentApproved={() => {
          setIsAgentPortalActive(true);
          window.history.pushState(null, '', '#/agent');
        }}
      />

      {/* Native Mobile Bottom Navigation Dock (iOS / Android Feel) */}
      <MobileAppBottomDock
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        selectedPlacesCount={selectedPlaces.length}
      />

      {/* Footer */}
      <footer className="relative z-10 w-full py-16 px-4 md:px-12 border-t border-white/10 bg-[#04060A] text-slate-400">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-8">
          
          <div className="flex flex-col items-center md:items-start gap-2">
            <div className="flex items-center gap-2.5">
              <span className="font-display font-bold text-lg text-white tracking-wider">
                GLOBETROTTER GATEWAY
              </span>
              <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-cyan-500/10 text-cyan-300 font-sans-clean font-semibold">
                Official Travel Portal
              </span>
            </div>
            <p className="text-xs text-slate-400 max-w-sm text-center md:text-left font-sans-clean leading-relaxed">
              Digital travel guide and verified circuit passes for Andhra Pradesh and Telangana.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-4 text-xs font-sans-clean text-slate-400">
            <div className="flex items-center gap-4">
              <span>59 Districts</span>
              <span>•</span>
              <span>646 Destinations</span>
            </div>
            <span className="hidden sm:inline">•</span>
            <div className="flex items-center gap-4">
              <a href="/privacy.html" target="_blank" rel="noopener noreferrer" className="hover:text-amber-400 transition-colors underline-offset-4 hover:underline">
                Privacy Policy
              </a>
              <span>•</span>
              <a href="/terms.html" target="_blank" rel="noopener noreferrer" className="hover:text-amber-400 transition-colors underline-offset-4 hover:underline">
                Terms & 24-Hr Refund Policy
              </a>
              <span>•</span>
              <button
                onClick={handleOpenAgentPortal}
                className="hover:text-cyan-300 text-slate-400 transition-colors underline-offset-4 hover:underline cursor-pointer"
              >
                Agent Portal
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-400">
            <span>Crafted with</span>
            <Heart className="w-3.5 h-3.5 text-cyan-400 fill-cyan-400" />
            <span>for Global Travelers</span>
          </div>

        </div>
      </footer>

      {/* Official 24/7 WhatsApp Tourist Support Concierge */}
      <WhatsAppConcierge />

      {/* DPDP Act 2023 & GDPR Granular Cookie Consent Banner */}
      <CookieConsentBanner />

    </div>
  );
}
