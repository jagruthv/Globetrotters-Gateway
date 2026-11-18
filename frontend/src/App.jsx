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
import TravelAssistantDrawer from './components/TravelAssistantDrawer';
import AssistantFloatingTrigger from './components/AssistantFloatingTrigger';
import CookieConsentBanner from './components/CookieConsentBanner';
import SettingsModal from './components/SettingsModal';
import SmsGatewayToast from './components/SmsGatewayToast';
import AuthModal from './components/AuthModal';
import PaymentProcessingModal from './components/PaymentProcessingModal';
import ErrorBoundary from './components/ErrorBoundary';
import { authService } from './services/api';
import { Heart, ArrowRight, ShieldCheck } from 'lucide-react';

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
  if (raw.startsWith('pass=') || raw.startsWith('ref=')) return 'passes';
  return HASH_MAP[raw] || 'home';
};

export default function App() {
  const [activeTab, setActiveTabState] = useState(getInitialTab);
  const [selectedPlaces, setSelectedPlaces] = useState(() => {
    if (typeof window === 'undefined') return [];
    try {
      const saved = localStorage.getItem('globetrotter_staged_places');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [voiceModalOpen, setVoiceModalOpen] = useState(false);
  const [settingsModalOpen, setSettingsModalOpen] = useState(false);
  const [agentVerificationOpen, setAgentVerificationOpen] = useState(false);
  const [isAgentPortalActive, setIsAgentPortalActive] = useState(() => {
    if (typeof window === 'undefined') return false;
    const raw = window.location.hash.replace('#/', '').replace('#', '').trim().toLowerCase();
    if (raw !== 'agent' && raw !== 'scanner') return false;
    try {
      const user = JSON.parse(localStorage.getItem('globetrotter_user') || '{}');
      return Boolean(user && (user.role === 'ROLE_ADMIN' || user.role === 'ROLE_STAFF' || user.role === 'ROLE_AGENT'));
    } catch {
      return false;
    }
  });

  // Ticket Checkout & Test Payment Gateway States
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authModalReason, setAuthModalReason] = useState('');
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [activeBookingForPayment, setActiveBookingForPayment] = useState(null);
  const [pendingBooking, setPendingBooking] = useState(null);
  const [assistantOpen, setAssistantOpen] = useState(false);

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
    try {
      const user = JSON.parse(localStorage.getItem('globetrotter_user') || '{}');
      const isOfficer = Boolean(user && (user.role === 'ROLE_ADMIN' || user.role === 'ROLE_STAFF' || user.role === 'ROLE_AGENT'));
      if (isOfficer) {
        setIsAgentPortalActive(true);
        window.history.pushState(null, '', '#/agent');
      } else {
        setAgentVerificationOpen(true);
      }
    } catch {
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
        try {
          const user = JSON.parse(localStorage.getItem('globetrotter_user') || '{}');
          const isOfficer = Boolean(user && (user.role === 'ROLE_ADMIN' || user.role === 'ROLE_STAFF' || user.role === 'ROLE_AGENT'));
          if (isOfficer) {
            setIsAgentPortalActive(true);
          } else {
            setIsAgentPortalActive(false);
            setAgentVerificationOpen(true);
          }
        } catch {
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

  // Global ⌘K / Ctrl+K keyboard shortcut to toggle Travel Assistant from anywhere
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setAssistantOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Save selected trip places to localStorage so refreshing or switching tabs never loses state
  useEffect(() => {
    try {
      localStorage.setItem('globetrotter_staged_places', JSON.stringify(selectedPlaces));
    } catch (e) {
      console.warn('Could not cache staged trip places:', e);
    }
  }, [selectedPlaces]);

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

  // Central Checkout & Payment Flow
  const handleInitiateBooking = (bookingData) => {
    let user = null;
    try {
      user = authService.getCurrentUser();
    } catch {
      user = null;
    }

    if (!user) {
      setPendingBooking(bookingData);
      setAuthModalReason('Please sign in or continue as Guest to issue your entry pass.');
      setAuthModalOpen(true);
      return;
    }

    setActiveBookingForPayment({
      ...bookingData,
      touristName: user.fullName || user.email || 'Guest Traveler',
      touristEmail: user.email || '',
      touristPhone: user.phoneNumber || ''
    });
    setPaymentModalOpen(true);
  };

  const handleAuthSuccess = (userData) => {
    setAuthModalOpen(false);
    if (pendingBooking) {
      const booking = pendingBooking;
      setPendingBooking(null);
      setActiveBookingForPayment({
        ...booking,
        touristName: userData?.fullName || userData?.email || 'Guest Traveler',
        touristEmail: userData?.email || '',
        touristPhone: userData?.phoneNumber || ''
      });
      setPaymentModalOpen(true);
    }
  };

  const handlePaymentSuccess = (newPass) => {
    setPaymentModalOpen(false);
    setActiveBookingForPayment(null);
    setIssuedPassData(newPass);
    setActiveTab('passes');
  };

  // Direct 1-click Fast-Pass booking from Hero
  const handleDirectBookPass = (passInfo) => {
    let finalAmount = 40;
    if (passInfo.price != null) {
      const priceStr = String(passInfo.price).toLowerCase();
      if (priceStr.includes('free') || priceStr === '0' || priceStr === '₹0') {
        finalAmount = 0;
      } else {
        const parsed = parseFloat(priceStr.replace(/[^0-9.]/g, ''));
        finalAmount = Number.isFinite(parsed) ? parsed : 40;
      }
    }
    handleInitiateBooking({
      circuitName: `${passInfo.destination} Official Gate Pass`,
      destinations: [passInfo.destination],
      totalAmount: finalAmount
    });
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
    handleInitiateBooking({
      circuitName: circuit.title || 'Curated Heritage Circuit Pass',
      destinations: circuit.places?.map(p => p.name) || [circuit.standout],
      totalAmount: circuit.passPrice || 480
    });
  };

  const handleBookCustomPlan = (customPlan) => {
    const allStops = (customPlan.days || []).flatMap(d => (d.stops || []).map(s => s.name || s.placeName || s));
    handleInitiateBooking({
      circuitName: customPlan.title || 'Personalized Heritage Circuit Pass',
      destinations: allStops.length > 0 ? allStops : selectedPlaces.map(p => p.name),
      totalAmount: customPlan.packagePrice || 320
    });
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
    <div className="relative min-h-[100dvh] bg-[#080A0F] text-slate-100 font-sans-clean overflow-x-hidden selection:bg-amber-500/20 pb-20 md:pb-0">
      
      {/* Floating Island Glass Navigation Dock (Desktop) */}
      <FloatingIslandNav
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        selectedPlacesCount={selectedPlaces.length}
        onOpenSettings={() => setSettingsModalOpen(true)}
        onOpenAssistant={() => setAssistantOpen(true)}
      />

      {/* Main Tab Views with Framer Motion Spring Transition */}
      <main className="relative z-10">
        <ErrorBoundary fallbackTitle="Tourism View Interruption">
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
              <section className="relative py-20 px-4 md:px-12 overflow-hidden border-t border-white/5 text-center">
                <div className="absolute inset-0 bg-gradient-to-b from-[#080A0F] via-amber-500/[0.02] to-[#080A0F] pointer-events-none" />
                <div className="relative z-10 max-w-3xl mx-auto flex flex-col items-center gap-5">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.04] border border-white/10 text-amber-300 text-xs font-sans-clean font-medium">
                    Unified tourism corridors • AP & TG
                  </div>
                  <h3 className="text-2xl sm:text-3xl font-extrabold text-white font-sans-clean">
                    Start Your Heritage Journey Across 59 Districts
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-400 max-w-xl mx-auto leading-relaxed font-sans-clean">
                    Discover historical temples, lush hill stations, and natural underground caves. Pick a curated tour package or build your personalized day-by-day plan with our AI concierge.
                  </p>
                  <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                    <button
                      onClick={() => setActiveTab('explore')}
                      className="px-5 py-2.5 rounded-full bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs flex items-center gap-2 transition-all shadow-md cursor-pointer font-sans-clean"
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
                onAddPlace={handleSelectPlaceForTrip}
                onRemovePlace={handleRemovePlace}
                onClearPlaces={handleClearPlaces}
                onExploreMore={() => setActiveTab('explore')}
                onProceedToPasses={() => setActiveTab('passes')}
                onInitiateBooking={handleInitiateBooking}
                onBookCustomPlan={handleBookCustomPlan}
                onOpenAssistant={() => setAssistantOpen(true)}
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
              <div className="max-w-md mx-auto text-center p-8 bg-[#0D121F] rounded-3xl border border-white/10 flex flex-col items-center gap-4 shadow-xl">
                <div className="w-12 h-12 rounded-full bg-amber-400/10 border border-amber-400/20 flex items-center justify-center text-amber-400">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold text-white">Monument Gate Staff Portal</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Authorized checkpoint scanning terminal for offline turnstile verification at Borra Caves, Ramappa, Golconda, and Belum Caves.
                </p>
                <button
                  onClick={handleOpenAgentPortal}
                  className="px-6 py-2.5 rounded-full bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs cursor-pointer shadow-md transition-all active:scale-95"
                >
                  Launch Gate Scanner Terminal
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
        </ErrorBoundary>
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

      {/* Mandatory Checkout Authentication Modal */}
      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        onAuthSuccess={handleAuthSuccess}
        reason={authModalReason}
      />

      {/* 5-Second Interactive Test Payment Gateway Modal */}
      <PaymentProcessingModal
        isOpen={paymentModalOpen}
        onClose={() => setPaymentModalOpen(false)}
        bookingDetails={activeBookingForPayment}
        onPaymentSuccess={handlePaymentSuccess}
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
              <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-300 font-sans-clean font-semibold">
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
                className="hover:text-amber-300 text-slate-400 transition-colors underline-offset-4 hover:underline cursor-pointer"
              >
                Agent Portal
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-400">
            <span>Crafted with</span>
            <Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-500" />
            <span>for Global Travelers</span>
          </div>

        </div>
      </footer>

      {/* Real-Time SMS Alert Toast */}
      <SmsGatewayToast />

      {/* Persistent Global AI Travel Assistant Trigger & Drawer */}
      <AssistantFloatingTrigger
        isOpen={assistantOpen}
        onToggle={() => setAssistantOpen((prev) => !prev)}
      />

      <TravelAssistantDrawer
        isOpen={assistantOpen}
        onClose={() => setAssistantOpen(false)}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onInitiateBooking={handleInitiateBooking}
        selectedPlaces={selectedPlaces}
        setSelectedPlaces={setSelectedPlaces}
      />

      {/* DPDP Act 2023 & GDPR Granular Cookie Consent Banner */}
      <CookieConsentBanner />

    </div>
  );
}
