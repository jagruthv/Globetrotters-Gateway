import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import FloatingIslandNav from './components/FloatingIslandNav';
import MobileAppBottomDock from './components/MobileAppBottomDock';
import FluidLiquidDropHero from './components/FluidLiquidDropHero';
import BentoDistrictExplorer from './components/BentoDistrictExplorer';
import AiFluidTripStudio from './components/AiFluidTripStudio';
import CircuitShowcase from './components/CircuitShowcase';
import HolographicGatePass from './components/HolographicGatePass';
import GateScannerView from './components/GateScannerView';
import VoiceConciergeModal from './components/VoiceConciergeModal';
import WhatsAppConcierge from './components/WhatsAppConcierge';
import CookieConsentBanner from './components/CookieConsentBanner';
import SettingsModal from './components/SettingsModal';
import { Heart } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState('home');
  const [selectedPlaces, setSelectedPlaces] = useState([]);
  const [voiceModalOpen, setVoiceModalOpen] = useState(false);
  const [settingsModalOpen, setSettingsModalOpen] = useState(false);
  const [isStaffMode, setIsStaffMode] = useState(false);
  const [issuedPassData, setIssuedPassData] = useState(null);
  const shouldReduceMotion = useReducedMotion();

  const handleToggleStaffMode = (enable) => {
    setIsStaffMode(enable);
    if (enable) {
      setActiveTab('scanner');
    } else {
      setActiveTab('home');
    }
  };

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

  return (
    <div className="relative min-h-[100dvh] bg-[#06080D] text-slate-100 font-sans-clean overflow-x-hidden selection:bg-cyan-500/20 pb-20 md:pb-0">
      
      {/* Floating Island Glass Navigation Dock (Desktop) */}
      <FloatingIslandNav
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        selectedPlacesCount={selectedPlaces.length}
        onOpenSettings={() => setSettingsModalOpen(true)}
        isStaffMode={isStaffMode}
        onExitStaffMode={() => handleToggleStaffMode(false)}
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

              {/* Digital Entry Pass */}
              <HolographicGatePass
                passData={issuedPassData}
                onOpenAudioGuide={() => setVoiceModalOpen(true)}
              />
            </motion.div>
          )}

          {activeTab === 'explore' && (
            <motion.div
              key="explore"
              initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
              className="pt-16"
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
              className="pt-16"
            >
              <AiFluidTripStudio
                selectedPlaces={selectedPlaces}
                onRemovePlace={handleRemovePlace}
                onClearPlaces={handleClearPlaces}
                onExploreMore={() => setActiveTab('explore')}
                onProceedToPasses={() => setActiveTab('passes')}
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
              className="pt-16"
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
              className="pt-16"
            >
              <HolographicGatePass
                passData={issuedPassData}
                onOpenAudioGuide={() => setVoiceModalOpen(true)}
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
              className="pt-16"
            >
              <GateScannerView 
                passData={issuedPassData} 
                onExitStaffMode={() => handleToggleStaffMode(false)}
              />
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
        isStaffMode={isStaffMode}
        onToggleStaffMode={handleToggleStaffMode}
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
