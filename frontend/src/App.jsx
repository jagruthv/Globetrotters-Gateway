import React, { useState, useEffect, lazy, Suspense } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import FloatingIslandNav from './components/FloatingIslandNav';
import MobileAppBottomDock from './components/MobileAppBottomDock';
import FluidLiquidDropHero from './components/FluidLiquidDropHero';
import AssistantFloatingTrigger from './components/AssistantFloatingTrigger';
import ErrorBoundary from './components/ErrorBoundary';

// Code-split heavy interactive views & modals for instant initial paint & zero memory thrashing
const BentoDistrictExplorer = lazy(() => import('./components/BentoDistrictExplorer'));
const AiFluidTripStudio = lazy(() => import('./components/AiFluidTripStudio'));
const CircuitShowcase = lazy(() => import('./components/CircuitShowcase'));
const HolographicGatePass = lazy(() => import('./components/HolographicGatePass'));
const AgentPortalView = lazy(() => import('./components/AgentPortalView'));
const AuthModal = lazy(() => import('./components/AuthModal'));
const TouristSafetyModal = lazy(() => import('./components/TouristSafetyModal'));
const PaymentProcessingModal = lazy(() => import('./components/PaymentProcessingModal'));
const AgentVerificationModal = lazy(() => import('./components/AgentVerificationModal'));
const VoiceConciergeModal = lazy(() => import('./components/VoiceConciergeModal'));
const TravelAssistantDrawer = lazy(() => import('./components/TravelAssistantDrawer'));
const CookieConsentBanner = lazy(() => import('./components/CookieConsentBanner'));
const SettingsModal = lazy(() => import('./components/SettingsModal'));

const LazyFallback = () => (
  <div className="w-full py-20 flex flex-col items-center justify-center gap-3 text-slate-400 font-sans-clean">
    <div className="w-6 h-6 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
    <span className="text-xs">Loading experience...</span>
  </div>
);
import { authService, bookingService } from './services/api';
import { Heart, ArrowRight, ShieldCheck, Sparkles } from 'lucide-react';

const HASH_MAP = {
  '': 'home',
  'overview': 'home',
  'districts': 'explore',
  'explore': 'explore',
  'planner': 'planner',
  'packages': 'circuits',
  'circuits': 'circuits',
  'passes': 'passes',
  'tickets': 'passes',
  'verify': 'passes'
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
  if (raw.startsWith('pass=') || raw.startsWith('ref=') || raw.startsWith('verify')) return 'passes';
  const base = raw.split('?')[0];
  if (base.startsWith('district/') || base.startsWith('spot/')) return 'explore';
  if (base.startsWith('circuit/') || base.startsWith('package/')) return 'circuits';
  return HASH_MAP[base] || HASH_MAP[raw] || 'home';
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
  const [safetyModalOpen, setSafetyModalOpen] = useState(false);
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
  const [assistantInitialQuery, setAssistantInitialQuery] = useState('');
  const [scannerAuthError, setScannerAuthError] = useState(null);

  const handleOpenAssistant = (query = '') => {
    setAssistantInitialQuery(typeof query === 'string' ? query : '');
    setAssistantOpen(true);
  };

  const [issuedPassData, setIssuedPassData] = useState(() => {
    try {
      const stored = localStorage.getItem('globetrotter_passes');
      if (stored) {
        const list = JSON.parse(stored);
        if (Array.isArray(list)) {
          // Strictly purge any obsolete demo pass!
          const clean = list.filter(p => 
            p && 
            p.reference !== 'GT-PASS-DEMO' && 
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

  const updateMetaTitle = (tab) => {
    if (typeof document === 'undefined') return;
    const titles = {
      home: 'Globetrotter Gateway • Official Smart Tourism Portal for Andhra Pradesh & Telangana',
      explore: '59 Districts Cultural Atlas • Globetrotter Gateway',
      planner: 'AI Trip Planner Studio • Globetrotter Gateway',
      circuits: 'Signature Heritage Circuits • Globetrotter Gateway',
      passes: 'Digital QR Entry Passes & Verification • Globetrotter Gateway'
    };
    if (titles[tab]) document.title = titles[tab];
  };

  const setActiveTab = (tab) => {
    setActiveTabState(tab);
    updateMetaTitle(tab);
    const targetHash = TAB_TO_HASH[tab] ? `#/${TAB_TO_HASH[tab]}` : '#/';
    if (window.location.hash !== targetHash) {
      window.history.pushState(null, '', targetHash);
    }
  };

  useEffect(() => {
    updateMetaTitle(activeTab);
  }, [activeTab]);

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
            setAgentVerificationOpen(false);
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
    window.addEventListener('agent-status-changed', handleHashSync);
    window.addEventListener('auth-change', handleHashSync);
    return () => {
      window.removeEventListener('hashchange', handleHashSync);
      window.removeEventListener('popstate', handleHashSync);
      window.removeEventListener('agent-status-changed', handleHashSync);
      window.removeEventListener('auth-change', handleHashSync);
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

  // Listen for global auth modal request
  useEffect(() => {
    const handleOpenAuth = (e) => {
      setAuthModalReason(e?.detail?.reason || 'Sign in to save your passes across devices.');
      setAuthModalOpen(true);
    };
    window.addEventListener('open-auth-modal', handleOpenAuth);
    return () => window.removeEventListener('open-auth-modal', handleOpenAuth);
  }, []);

  // Listen for global audio guide modal request
  useEffect(() => {
    const handleOpenAudioGuide = () => {
      setVoiceModalOpen(true);
    };
    window.addEventListener('open-audio-guide', handleOpenAudioGuide);
    return () => window.removeEventListener('open-audio-guide', handleOpenAudioGuide);
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
      setPendingBooking({
        ...bookingData,
        date: bookingData?.date || 'Today'
      });
      setAuthModalReason('Please sign in or continue as Guest to issue your entry pass.');
      setAuthModalOpen(true);
      return;
    }

    setActiveBookingForPayment({
      ...bookingData,
      date: bookingData?.date || 'Today',
      touristName: user.fullName || user.email || 'Guest Traveler',
      touristEmail: user.email || '',
      touristPhone: user.phoneNumber || ''
    });
    setPaymentModalOpen(true);
  };

  // Multi-Device Cloud Sync: fetch verified passes from backend and merge into local offline cache
  const syncCloudPasses = React.useCallback(async () => {
    try {
      const user = authService.getCurrentUser();
      if (!user || user.isGuest) return;
      const cloudPasses = await bookingService.getMyPasses();
      if (Array.isArray(cloudPasses) && cloudPasses.length > 0) {
        const stored = localStorage.getItem('globetrotter_passes');
        const localList = stored ? JSON.parse(stored) : [];
        const existingRefs = new Set(localList.map((p) => p?.reference?.toLowerCase()));
        const newFromCloud = cloudPasses.filter((cp) => !existingRefs.has(cp?.reference?.toLowerCase()));
        if (newFromCloud.length > 0) {
          const merged = [...newFromCloud, ...localList];
          localStorage.setItem('globetrotter_passes', JSON.stringify(merged));
        }
      }
    } catch {
      // Offline fallback: keep local passes intact
    }
  }, []);

  // Sync passes on mount
  useEffect(() => {
    syncCloudPasses();
  }, [syncCloudPasses]);

  const handleAuthSuccess = (userData) => {
    setAuthModalOpen(false);
    syncCloudPasses();
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
    try {
      const stored = localStorage.getItem('globetrotter_passes');
      const list = stored ? JSON.parse(stored) : [];
      const updated = [newPass, ...(Array.isArray(list) ? list.filter(p => p && p.reference !== newPass.reference) : [])];
      localStorage.setItem('globetrotter_passes', JSON.stringify(updated));
    } catch (e) {
      console.warn('Failed to persist pass to localStorage:', e);
    }
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
      totalAmount: finalAmount,
      date: passInfo.date || 'Today',
      touristCount: passInfo.travelers || 1,
      durationDays: passInfo.durationDays || 1
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

  const handleBookCircuit = (circuit, chosenDate = null) => {
    const durMatch = (circuit?.duration || '').match(/(\d+)\s*Day/i);
    const parsedDays = durMatch ? parseInt(durMatch[1], 10) : 2;
    const destinations = (Array.isArray(circuit.places) && circuit.places.length > 0)
      ? circuit.places.map(p => p.name || p.spotName || p)
      : (circuit.standout ? circuit.standout.split('&').map(s => s.trim()) : [circuit.title]);
    handleInitiateBooking({
      circuitName: circuit.title || 'Curated Heritage Circuit Pass',
      destinations: destinations,
      totalAmount: circuit.passPrice || 480,
      durationDays: parsedDays,
      date: chosenDate || 'Today'
    });
  };

  const handleBookCustomPlan = (customPlan, chosenDate = null) => {
    const allStops = (customPlan.days || []).flatMap(d => (d.stops || []).map(s => s.name || s.placeName || s));
    const tripDays = (customPlan.days || []).length || 1;
    handleInitiateBooking({
      circuitName: customPlan.title || 'Personalized Heritage Circuit Pass',
      destinations: allStops.length > 0 ? allStops : selectedPlaces.map(p => p.name),
      totalAmount: customPlan.packagePrice || 0,
      durationDays: tripDays,
      date: chosenDate || customPlan.startDate || 'Today'
    });
  };

  // DEDICATED SEPARATE FIELD AGENT INTERFACE
  if (isAgentPortalActive) {
    return (
      <Suspense fallback={<LazyFallback />}>
        <AgentPortalView
          onExitAgentMode={handleExitAgentMode}
          passData={issuedPassData}
        />
      </Suspense>
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
        onOpenAssistant={handleOpenAssistant}
        onOpenSafetyModal={() => setSafetyModalOpen(true)}
      />

      {/* Main Tab Views with Framer Motion Spring Transition */}
      <main className="relative z-10">
        <ErrorBoundary fallbackTitle="Unable to Display Section">
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
                onPlanCustomTrip={(prompt) => handleOpenAssistant(prompt || 'Help me plan a personalized tour across Andhra Pradesh and Telangana')}
                onDirectBookPass={handleDirectBookPass}
              />

              {/* 59 Districts Cultural Exploration (Featured 6 Hubs on Home with Instant Switch to Full Explore) */}
              <Suspense fallback={<LazyFallback />}>
                <BentoDistrictExplorer
                  onSelectPlaceForTrip={handleSelectPlaceForTrip}
                  selectedPlaces={selectedPlaces}
                  isFeaturedOnly={true}
                  onViewAllDistricts={() => setActiveTab('explore')}
                  onProceedToPlan={() => setActiveTab('planner')}
                />
              </Suspense>

              {/* Signature Heritage Circuits */}
              <Suspense fallback={<LazyFallback />}>
                <CircuitShowcase
                  onSelectCircuit={handleSelectCircuit}
                  onBookCircuit={handleBookCircuit}
                />
              </Suspense>

              {/* Ready to Explore Corridor Callout */}
              <section className="relative py-16 px-4 md:px-12 border-t border-white/5 text-center">
                <div className="relative z-10 max-w-2xl mx-auto flex flex-col items-center gap-4">
                  <h3 className="text-xl sm:text-2xl font-bold text-white font-sans-clean">
                    Ready to explore?
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-400 max-w-md mx-auto leading-relaxed font-sans-clean">
                    Search 59 districts with verified timings and direct gate passes.
                  </p>
                  <div className="flex flex-wrap items-center justify-center gap-3 pt-1">
                    <button
                      onClick={() => setActiveTab('explore')}
                      className="px-4 py-2 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs flex items-center gap-2 transition-colors cursor-pointer font-sans-clean"
                    >
                      <span>Browse Atlas</span>
                      <ArrowRight className="w-3.5 h-3.5 text-slate-950" />
                    </button>
                    <button
                      onClick={() => handleOpenAssistant('Help me plan a personalized tour across Andhra Pradesh and Telangana')}
                      className="px-4 py-2 rounded-lg bg-white/[0.05] hover:bg-white/[0.08] border border-white/10 text-white font-medium text-xs flex items-center gap-2 transition-colors cursor-pointer font-sans-clean"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                      <span>Plan Custom Trip</span>
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
              <Suspense fallback={<LazyFallback />}>
                <BentoDistrictExplorer
                  onSelectPlaceForTrip={handleSelectPlaceForTrip}
                  selectedPlaces={selectedPlaces}
                  onProceedToPlan={() => setActiveTab('planner')}
                />
              </Suspense>
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
              <Suspense fallback={<LazyFallback />}>
                <AiFluidTripStudio
                  selectedPlaces={selectedPlaces}
                  onAddPlace={handleSelectPlaceForTrip}
                  onRemovePlace={handleRemovePlace}
                  onClearPlaces={handleClearPlaces}
                  onExploreMore={() => setActiveTab('explore')}
                  onProceedToPasses={() => setActiveTab('passes')}
                  onInitiateBooking={handleInitiateBooking}
                  onBookCustomPlan={handleBookCustomPlan}
                  onOpenAssistant={handleOpenAssistant}
                  onSetPlaces={setSelectedPlaces}
                />
              </Suspense>
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
              <Suspense fallback={<LazyFallback />}>
                <CircuitShowcase
                  onSelectCircuit={handleSelectCircuit}
                  onBookCircuit={handleBookCircuit}
                />
              </Suspense>
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
              <Suspense fallback={<LazyFallback />}>
                <HolographicGatePass
                passData={issuedPassData}
                onExplorePackages={() => setActiveTab('circuits')}
                onPlanTrip={() => handleOpenAssistant('Help me plan a personalized tour across Andhra Pradesh and Telangana')}
                />
              </Suspense>
            </motion.div>
          )}

          {activeTab === 'scanner' && (
            <motion.div
              key="scanner"
              initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
              className="pt-28 pb-16 px-4"
            >
              <div className="max-w-md mx-auto p-6 sm:p-8 bg-[#0D121F] rounded-3xl border border-white/10 flex flex-col gap-5 shadow-2xl">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-amber-400/15 border border-amber-400/30 flex items-center justify-center text-amber-400 shrink-0">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white font-sans-clean">Monument Gate Scanner</h3>
                    <p className="text-xs text-slate-400">Authorized gate staff login</p>
                  </div>
                </div>

                {scannerAuthError && (
                  <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center justify-between font-sans-clean">
                    <span>{scannerAuthError}</span>
                    <button type="button" onClick={() => setScannerAuthError(null)} className="text-rose-400 hover:text-white cursor-pointer ml-2">✕</button>
                  </div>
                )}

                <form
                  onSubmit={async (e) => {
                    e.preventDefault();
                    setScannerAuthError(null);
                    const email = e.target.officerEmail.value.trim();
                    const pass = e.target.officerPassword.value.trim();
                    if (!email || !pass) return;
                    try {
                      const data = await authService.login(email, pass);
                      const role = data?.role || '';
                      if (role === 'ROLE_ADMIN' || role === 'ROLE_STAFF' || role === 'ROLE_AGENT') {
                        setIsAgentPortalActive(true);
                      } else {
                        setScannerAuthError('Access Denied: This account is not authorized as a gate officer.');
                      }
                    } catch (err) {
                      setScannerAuthError(err?.message || 'Login failed. Please check credentials.');
                    }
                  }}
                  className="flex flex-col gap-3.5 font-sans-clean"
                >
                  <div className="flex flex-col gap-1">
                    <label className="text-xs text-slate-300 font-medium">Officer Email</label>
                    <input
                      name="officerEmail"
                      type="email"
                      required
                      placeholder="staff@globetrotter.com"
                      className="px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-xs placeholder-slate-500 focus:outline-none focus:border-amber-400 font-sans-clean"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-xs text-slate-300 font-medium">Security Passkey</label>
                    <input
                      name="officerPassword"
                      type="password"
                      required
                      placeholder="••••••••"
                      className="px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-xs placeholder-slate-500 focus:outline-none focus:border-amber-400 font-sans-clean"
                    />
                  </div>
                  <button
                    type="submit"
                    className="w-full py-3 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 shadow-md cursor-pointer transition-all active:scale-[0.98] mt-1 font-sans-clean"
                  >
                    <ShieldCheck className="w-4 h-4" />
                    <span>Authorize & Launch Scanner Feed</span>
                  </button>
                </form>
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

      <Suspense fallback={null}>
        {/* Voice Concierge Audio Companion Modal */}
        {voiceModalOpen && (
          <VoiceConciergeModal
            isOpen={voiceModalOpen}
            onClose={() => setVoiceModalOpen(false)}
          />
        )}

        {/* Settings & Preferences Modal */}
        {settingsModalOpen && (
          <SettingsModal
            isOpen={settingsModalOpen}
            onClose={() => setSettingsModalOpen(false)}
            onOpenAgentPortal={handleOpenAgentPortal}
            onOpenAuth={() => {
              setSettingsModalOpen(false);
              setAuthModalReason('Sign in to save your passes across devices.');
              setAuthModalOpen(true);
            }}
          />
        )}

        {/* 24/7 Verified Tourist Safety & Emergency Helplines Modal */}
        {safetyModalOpen && (
          <TouristSafetyModal
            isOpen={safetyModalOpen}
            onClose={() => setSafetyModalOpen(false)}
          />
        )}

        {/* Field Agent Verification & Accreditation Modal */}
        {agentVerificationOpen && (
          <AgentVerificationModal
            isOpen={agentVerificationOpen}
            onClose={() => {
              setAgentVerificationOpen(false);
              if (activeTab === 'scanner') setActiveTab('home');
            }}
            onAgentApproved={() => {
              setIsAgentPortalActive(true);
              setAgentVerificationOpen(false);
              window.history.pushState(null, '', '#/agent');
            }}
          />
        )}

        {/* Mandatory Checkout Authentication Modal */}
        {authModalOpen && (
          <AuthModal
            isOpen={authModalOpen}
            onClose={() => setAuthModalOpen(false)}
            onAuthSuccess={handleAuthSuccess}
            reason={authModalReason}
          />
        )}

        {/* 5-Second Interactive Test Payment Gateway Modal */}
        {paymentModalOpen && (
          <PaymentProcessingModal
            isOpen={paymentModalOpen}
            onClose={() => setPaymentModalOpen(false)}
            bookingDetails={activeBookingForPayment}
            onPaymentSuccess={handlePaymentSuccess}
          />
        )}

        {/* Persistent Global AI Travel Assistant Drawer */}
        {assistantOpen && (
          <TravelAssistantDrawer
            isOpen={assistantOpen}
            onClose={() => setAssistantOpen(false)}
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            onInitiateBooking={handleInitiateBooking}
            selectedPlaces={selectedPlaces}
            setSelectedPlaces={setSelectedPlaces}
            initialQuery={assistantInitialQuery}
            onClearInitialQuery={() => setAssistantInitialQuery('')}
          />
        )}

        {/* DPDP Act 2023 & GDPR Granular Cookie Consent Banner */}
        <CookieConsentBanner />
      </Suspense>

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

        {/* 24/7 Official Support & Tourist Helplines Strip */}
        <div className="max-w-7xl mx-auto pt-6 mt-6 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-400 font-sans-clean">
          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3">
            <span className="text-white font-semibold flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>24/7 Official Helplines:</span>
            </span>
            <a href="tel:1363" className="hover:text-amber-300 font-mono text-slate-200 transition-colors">
              1363 (Tourist Desk)
            </a>
            <span>•</span>
            <a href="tel:112" className="hover:text-rose-300 font-mono text-slate-200 transition-colors">
              112 (Emergency)
            </a>
            <span>•</span>
            <a href="tel:108" className="hover:text-emerald-300 font-mono text-slate-200 transition-colors">
              108 (Ambulance)
            </a>
            <span>•</span>
            <a href="tel:1033" className="hover:text-amber-300 font-mono text-slate-200 transition-colors">
              1033 (NHAI Highway Help)
            </a>
          </div>

          <button
            onClick={() => setSafetyModalOpen(true)}
            className="text-amber-400 hover:text-amber-300 transition-colors underline cursor-pointer text-xs"
          >
            Emergency Directory & Hospital Contacts →
          </button>
        </div>
      </footer>

      {/* Persistent Global AI Travel Assistant Trigger */}
      <AssistantFloatingTrigger
        isOpen={assistantOpen}
        onToggle={() => setAssistantOpen((prev) => !prev)}
      />

    </div>
  );
}
