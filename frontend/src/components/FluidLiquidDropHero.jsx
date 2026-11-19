import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Compass, 
  MapPin, 
  Calendar, 
  Users, 
  ChevronRight,
  ChevronLeft,
  ShieldCheck,
  Ticket,
  Lock,
  X,
  Info,
  AlertTriangle,
  FileText,
  Clock,
  Utensils
} from 'lucide-react';

// Curated authentic showcase destinations with verified government status & real local photography
const HERO_DESTINATIONS = [
  {
    id: 'borra',
    name: 'Borra Caves & Araku Valley',
    district: 'Alluri Sitharama Raju',
    state: 'Andhra Pradesh',
    image: '/images/aptourism/borra_caves.jpg',
    secondaryImage: '/images/aptourism/araku.jpg',
    tag: 'NATURAL LIMESTONE CAVES',
    isTicketed: true,
    entryType: 'Official APTDC Ticketed Caverns',
    groundRate: 40,
    rateBadge: '₹40 Official APTDC Gate Ticket',
    authority: 'Andhra Pradesh Tourism (APTDC)',
    highlights: 'Million-Year Stalactite Formations, Gosthani River Gorge, Araku Coffee Stalls',
    bestHours: '10:00 AM – 04:30 PM (Cavern Floodlights)',
    rating: 'APTDC Geo-Heritage Caverns',
    advisory: 'CAVERN NOTICE: Interior pathway is damp limestone; wear non-slip shoes. Gate ticket is ₹40 per visitor.',
    foodTip: 'Araku bamboo chicken and freshly brewed valley coffee.',
    tagline: 'Deep limestone caves descending 80 meters into the scenic Eastern Ghats mountains.',
    policyNotice: 'State Tourism Site: Official APTDC entry ticket is ₹40 / Person, purchased at the entrance counter. Globetrotter provides verified route guidance, audio tours, and offline emergency support.'
  },
  {
    id: 'gandikota',
    name: 'Gandikota Grand Canyon',
    district: 'YSR Kadapa',
    state: 'Andhra Pradesh',
    image: '/images/aptourism/gandikota.jpg',
    secondaryImage: '/images/circuits/gandikota.jpg',
    tag: 'GEOLOGICAL RIVER CANYON',
    isTicketed: false,
    entryType: 'Free Public Access',
    groundRate: 0,
    rateBadge: 'Free Entry (No Ticket Required)',
    authority: 'AP Tourism & Historic Fort',
    highlights: '300ft Penna River Sandstone Gorge, Fort Ramparts, Raghunatha Temple',
    bestHours: '05:30 AM – 08:30 AM (Sunrise Viewpoint)',
    rating: 'Penna River Sandstone Gorge',
    earlyEntry: true,
    earlyEntryTime: '05:30 AM',
    advisory: 'CANYON CAUTION: Natural gorge viewpoints have sheer 300ft drops with no railings. Maintain safe distance from cliff edges.',
    foodTip: 'Rayalaseema karam dosa and hot ragi sangati.',
    tagline: 'The Grand Canyon of India carved over millions of years through rugged red quartz granite by the Penna River.',
    policyNotice: 'Free Public Access: Open natural canyon viewpoint and fort complex. No entry ticket or pass is required to visit.'
  },
  {
    id: 'ramappa',
    name: 'Ramappa UNESCO Temple',
    district: 'Mulugu',
    state: 'Telangana',
    image: '/images/telangana/ramappa_temple.jpg',
    secondaryImage: '/images/circuits/warangal.jpg',
    tag: 'UNESCO WORLD HERITAGE',
    isTicketed: false,
    entryType: 'Free Public Access',
    groundRate: 0,
    rateBadge: 'Free Entry (No Ticket Required)',
    authority: 'UNESCO & Archaeological Survey of India',
    highlights: 'Kakatiya Sandbox Foundations, Floating Brick Shikhara, Basalt Sculptures',
    bestHours: '06:00 AM – 11:30 AM (Morning Darshan & Architecture)',
    rating: 'UNESCO World Heritage • 1213 AD',
    earlyEntry: true,
    earlyEntryTime: '06:00 AM',
    advisory: 'TEMPLE COURTESY: Traditional attire recommended for the sanctum. Footwear deposit stall available at the outer gate.',
    foodTip: 'Crispy sarva pindi and jowar roti with spicy chutney.',
    tagline: '800-year-old Kakatiya engineering triumph built with floating bricks and earthquake-resistant sandbox foundations.',
    policyNotice: 'Free Public Access: Temple darshan and architectural viewing are 100% free. No ticket or pass is required.'
  },
  {
    id: 'charminar',
    name: 'Charminar & Laad Bazaar',
    district: 'Hyderabad',
    state: 'Telangana',
    image: '/images/circuits/charminar_hyderabad_sovereign.jpg?v=20261119_charminar_verified',
    secondaryImage: '/images/telangana/charminar_hyderabad_sovereign.jpg?v=20261119_charminar_verified',
    tag: 'DECCAN IMPERIAL HERITAGE',
    isTicketed: false,
    entryType: 'Public Piazza (Balcony: ASI Ticket)',
    groundRate: 0,
    rateBadge: 'Free Piazza (Balcony: ₹25 ASI Ticket)',
    authority: 'Telangana Tourism & ASI Heritage',
    highlights: '1591 AD Qutb Shahi Minarets, Laad Bazaar Lac Bangles, Nimrah Irani Chai',
    bestHours: '05:00 PM – 10:30 PM (Evening Illumination)',
    rating: 'ASI Protected Monument',
    advisory: 'STREET ADVISORY: Purchase pearls and bangles from certified jewelers inside the bazaar to ensure authentic hallmarks.',
    foodTip: 'Irani chai with Osmania biscuits at Nimrah Cafe.',
    tagline: '16th-century Qutb Shahi monument of four minarets framing the vibrant bazaars of Old Hyderabad.',
    policyNotice: 'Piazza Viewing is Free. Ascending to the upper gallery requires an official ASI ticket (₹25 at gate counter or asi.payumoney.com).'
  },
  {
    id: 'golconda',
    name: 'Golconda Fort & Acoustic Gates',
    district: 'Hyderabad',
    state: 'Telangana',
    image: '/images/telangana/golconda_fort_sovereign.jpg?v=20261119b',
    secondaryImage: '/images/circuits/golconda_fort_sovereign.jpg?v=20261119b',
    tag: 'MEDIEVAL CITADEL & ACOUSTICS',
    isTicketed: true,
    entryType: 'Official ASI Ticketed Monument',
    groundRate: 25,
    rateBadge: '₹25 Official ASI Gate Ticket',
    authority: 'Archaeological Survey of India (ASI)',
    highlights: 'Fateh Darwaza Acoustic Clapping Arch, Royal Domes, Sound & Light Show',
    bestHours: '09:00 AM – 05:30 PM (Daily Gate Timings)',
    rating: 'ASI National Citadel',
    advisory: 'GATE NOTICE: Official ₹25 entry ticket required at the gate. Sound & light evening show requires a separate ₹60 counter ticket.',
    foodTip: 'Hyderabadi dum biryani near the outer fort gates.',
    tagline: 'Diamond-capital medieval citadel featuring world-famous acoustic engineering where a hand clap echoes at the hilltop summit.',
    policyNotice: 'Ticketed Monument: Exact ASI gate rate is ₹25 / Person. Book online to get your QR gate pass and skip ticket counter lines.'
  }
];

const getInitialBookingDates = () => {
  const now = new Date();
  const today = now.toISOString().split('T')[0];
  const tomorrow = new Date(now.getTime() + 86400000).toISOString().split('T')[0];
  return { today, tomorrow };
};

const { today: DEFAULT_TODAY_ISO, tomorrow: DEFAULT_TOMORROW_ISO } = getInitialBookingDates();

export default function FluidLiquidDropHero({ 
  onExploreDistricts, 
  onLaunchTripPlanner, 
  onDirectBookPass,
  onPlanCustomTrip
}) {
  const [activeIdx, setActiveIdx] = useState(0);
  
  // Date Management aligned to Jakob's Law (industry standard calendar picker)
  const todayIso = DEFAULT_TODAY_ISO;
  const tomorrowIso = DEFAULT_TOMORROW_ISO;
  const [travelDate, setTravelDate] = useState(DEFAULT_TOMORROW_ISO);
  const [travelersCount, setTravelersCount] = useState(2);

  const getDateLabel = (isoDate) => {
    if (!isoDate) return '';
    if (isoDate === todayIso) return 'Today';
    if (isoDate === tomorrowIso) return 'Tomorrow';
    try {
      const d = new Date(isoDate + 'T00:00:00');
      const diffDays = Math.round((d - new Date(todayIso + 'T00:00:00')) / 86400000);
      if (diffDays === 7) return 'In 1 Week';
      if (diffDays > 0 && diffDays < 7) return `In ${diffDays} Days`;
      return d.toLocaleDateString('en-IN', { weekday: 'short', month: 'short', day: 'numeric' });
    } catch {
      return '';
    }
  };
  
  // Modals for authentic government tourism flow
  const [guideModalOpen, setGuideModalOpen] = useState(false);
  const [checkoutModalOpen, setCheckoutModalOpen] = useState(false);

  const activeDest = HERO_DESTINATIONS[activeIdx];

  // Auto-advance showcase every 14 seconds if user is active & tab visible
  useEffect(() => {
    const timer = setInterval(() => {
      if (typeof document !== 'undefined' && document.hidden) return;
      setActiveIdx((prev) => (prev + 1) % HERO_DESTINATIONS.length);
    }, 14000);
    return () => clearInterval(timer);
  }, []);

  const handleSelectDestination = (idx) => {
    setActiveIdx(idx);
  };

  // Pricing calculations
  const baseTicketTotal = activeDest.isTicketed ? activeDest.groundRate * travelersCount : 0;
  // Official digital convenience fee: ₹0 for free places, ₹15 for ticketed government reservations
  const platformFee = activeDest.isTicketed ? 15 : 0;
  const totalPayable = baseTicketTotal + platformFee;

  // Primary Action Button Handler
  const handlePrimaryAction = () => {
    if (activeDest.isTicketed) {
      setCheckoutModalOpen(true);
    } else {
      setGuideModalOpen(true);
    }
  };

  // Final confirmation of pass or guide
  const handleConfirmOrder = () => {
    setCheckoutModalOpen(false);
    if (onDirectBookPass) {
      onDirectBookPass({
        destination: activeDest.name,
        district: activeDest.district,
        state: activeDest.state,
        date: travelDate,
        travelers: travelersCount,
        price: totalPayable === 0 ? 'Free Visitor Pass (₹0)' : `₹${totalPayable}`,
        breakdown: {
          groundRate: baseTicketTotal,
          platformFee,
          total: totalPayable
        }
      });
    } else {
      onLaunchTripPlanner();
    }
  };

  return (
    <div className="relative min-h-[100dvh] lg:h-[100dvh] lg:max-h-[820px] w-full overflow-hidden bg-[#080A0F] flex flex-col justify-center pt-16 sm:pt-16 lg:pt-16 pb-3 sm:pb-4 px-4 md:px-8 lg:px-10 select-none">
      
      {/* Cinematic Ambient Destination Photography Background - High Vibrance, Bright & Vivid */}
      <div className="absolute inset-0 z-0">
        <AnimatePresence mode="wait">
          <motion.img
            key={activeDest.id}
            src={activeDest.image}
            alt={activeDest.name}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
            className="w-full h-full object-cover object-center"
          />
        </AnimatePresence>

        {/* Lightweight Feathered Scrim: Protects Left Text Without Darkening The Photograph */}
        <div className="absolute inset-0 bg-gradient-to-r from-[#080A0F]/85 via-[#080A0F]/30 via-45% to-transparent pointer-events-none" />

        {/* Delicate Bottom Blend */}
        <div className="absolute bottom-0 inset-x-0 h-20 bg-gradient-to-t from-[#080A0F] to-transparent pointer-events-none" />

        {/* Soft Top Clearance Under Island Nav */}
        <div className="absolute top-0 inset-x-0 h-16 bg-gradient-to-b from-[#080A0F]/50 to-transparent pointer-events-none" />

        {/* Golden-Hour Warmth Light Accent (High-performance gradient, zero GPU blur thrashing) */}
        <div className="absolute top-1/4 right-1/4 w-[400px] h-[400px] bg-[radial-gradient(circle_at_center,rgba(245,158,11,0.06)_0,transparent_70%)] pointer-events-none" />
      </div>

      {/* Main Content Grid: Balanced Typography + Viewport-Disciplined Tourism Dock */}
      <div className="relative z-10 max-w-7xl mx-auto w-full grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-6 items-center my-auto">
        
        {/* Left Column: Official Authority, Headline & Travel Dock */}
        <div className="lg:col-span-7 flex flex-col gap-2 sm:gap-2.5">
          
          {/* Headline */}
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-white leading-tight font-sans-clean max-w-xl">
            Travel Andhra Pradesh & Telangana.
          </h1>

          {/* Value Proposition */}
          <p className="text-sm text-slate-300 leading-relaxed max-w-lg font-sans-clean">
            Find places, timings, and entry passes across all 59 districts.
          </p>

          {/* Quick Booking Console */}
          <div className="w-full max-w-2xl rounded-xl bg-[#0B0F17] border border-white/10 p-3 sm:p-4 flex flex-col gap-3 mt-1">
            {/* Row 1: Destination (6 cols / 50%), Date (3 cols / 25%), Travelers (3 cols / 25%) */}
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 pb-3 border-b border-white/10">
                
                {/* 1. Destination Selector - 6 cols so destination name never truncates */}
                <div className="sm:col-span-6 flex flex-col px-3 py-1.5 rounded-lg bg-white/[0.03] border border-white/5 hover:border-white/15 transition-colors">
                  <label htmlFor="hero-dest-select" className="text-[10px] text-slate-400 font-medium flex items-center gap-1 font-sans-clean">
                    <MapPin className="w-3 h-3 text-amber-400 flex-shrink-0" />
                    <span>Destination</span>
                  </label>
                  <select
                    id="hero-dest-select"
                    aria-label="Select destination"
                    value={activeDest.id}
                    onChange={(e) => {
                      const foundIdx = HERO_DESTINATIONS.findIndex(d => d.id === e.target.value);
                      if (foundIdx !== -1) handleSelectDestination(foundIdx);
                    }}
                    className="bg-transparent text-white text-xs font-semibold focus:outline-none cursor-pointer mt-0.5"
                  >
                    {HERO_DESTINATIONS.map((d) => (
                      <option key={d.id} value={d.id} className="bg-[#0B0F17] text-white">
                        {d.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* 2. Date Selector - 3 cols with standard native calendar (Jakob's Law) */}
                <div className="sm:col-span-3 flex flex-col px-3 py-1.5 rounded-lg bg-white/[0.03] border border-white/5 hover:border-white/15 transition-colors relative">
                  <label htmlFor="hero-date-select" className="text-[10px] text-slate-400 font-medium flex items-center justify-between font-sans-clean">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-amber-400/80 flex-shrink-0" />
                      <span>Date of Visit</span>
                    </span>
                    {getDateLabel(travelDate) && (
                      <span className="text-[9px] text-amber-300 font-semibold truncate">
                        {getDateLabel(travelDate)}
                      </span>
                    )}
                  </label>
                  <input
                    id="hero-date-select"
                    type="date"
                    min={todayIso}
                    value={travelDate}
                    onChange={(e) => setTravelDate(e.target.value)}
                    aria-label="Select date of visit"
                    className="bg-transparent text-white text-xs font-semibold focus:outline-none cursor-pointer mt-0.5 [color-scheme:dark] w-full"
                  />
                </div>

                {/* 3. Guests Selector - 3 cols */}
                <div className="sm:col-span-3 flex flex-col px-3 py-1.5 rounded-lg bg-white/[0.03] border border-white/5 hover:border-white/15 transition-colors">
                  <label htmlFor="hero-guests-select" className="text-[10px] text-slate-400 font-medium flex items-center gap-1 font-sans-clean">
                    <Users className="w-3 h-3 text-amber-400 flex-shrink-0" />
                    <span>Travelers</span>
                  </label>
                  <select
                    id="hero-guests-select"
                    aria-label="Select number of travelers"
                    value={travelersCount}
                    onChange={(e) => setTravelersCount(Number(e.target.value))}
                    className="bg-transparent text-white text-xs font-semibold focus:outline-none cursor-pointer mt-0.5"
                  >
                    <option value={1} className="bg-[#0B0F17] text-white">1 Solo Traveler</option>
                    <option value={2} className="bg-[#0B0F17] text-white">2 Guests</option>
                    <option value={3} className="bg-[#0B0F17] text-white">3 Guests</option>
                    <option value={4} className="bg-[#0B0F17] text-white">Family of 4</option>
                    <option value={6} className="bg-[#0B0F17] text-white">Group of 6</option>
                  </select>
                </div>

              </div>

              {/* Row 2: Status, Audio Add-on, Total & Unified CTA */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pt-0.5">
                
                {/* Verification Status & Audio Add-On */}
                <div className="flex items-center gap-2 flex-wrap">
                  <div className="flex items-center gap-1.5">
                    <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 bg-amber-500/10 text-amber-300 border border-amber-400/20">
                      {activeDest.isTicketed ? <Ticket className="w-2.5 h-2.5" /> : <ShieldCheck className="w-2.5 h-2.5" />}
                    </div>
                    <span className="text-[10px] sm:text-[11px] font-semibold text-amber-300">
                      {activeDest.isTicketed ? `Official Ticket: ₹${activeDest.groundRate}/person` : 'Free Public Monument'}
                    </span>
                    {activeDest.earlyEntry && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/15 border border-amber-400/30 text-amber-300 font-bold uppercase tracking-wider">
                        Early Entry ({activeDest.earlyEntryTime || '05:30 AM'})
                      </span>
                    )}
                  </div>
                </div>

                {/* Total & Action Button */}
                <div className="flex items-center justify-between sm:justify-end gap-2.5">
                  <div className="flex items-baseline gap-1 text-xs">
                    <span className="text-slate-400 text-[10px]">Total:</span>
                    <span className="font-extrabold text-xs sm:text-sm text-white">
                      {totalPayable === 0 ? 'Free (₹0)' : `₹${totalPayable}`}
                    </span>
                  </div>

                  {!activeDest.isTicketed ? (
                    <button
                      onClick={() => setGuideModalOpen(true)}
                      className="px-3.5 py-1.5 rounded-lg bg-white/[0.08] hover:bg-white/[0.14] border border-white/15 text-white font-semibold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <FileText className="w-3.5 h-3.5 text-amber-400" />
                      <span>Free Guide & Map</span>
                      <ChevronRight className="w-3 h-3" />
                    </button>
                  ) : (
                    <button
                      onClick={handlePrimaryAction}
                      className="px-4 py-1.5 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition-all active:scale-[0.98] cursor-pointer"
                    >
                      <span>
                        Book e-Ticket • ₹{totalPayable}
                      </span>
                      <ChevronRight className="w-3.5 h-3.5 text-slate-950" />
                    </button>
                  )}
                </div>

              </div>

          </div>

          {/* Secondary Action Anchors */}
          <div className="flex items-center gap-3 text-xs pt-0.5">
            <button
              onClick={onExploreDistricts}
              className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-300 hover:text-amber-300 transition-colors cursor-pointer"
            >
              <Compass className="w-3 h-3 text-amber-400" />
              <span>Browse 59 Districts</span>
            </button>
            <span className="text-white/20">•</span>
            <button
              onClick={() => {
                if (onPlanCustomTrip) {
                  onPlanCustomTrip('Help me plan a personalized tour across Andhra Pradesh and Telangana');
                } else if (onLaunchTripPlanner) {
                  onLaunchTripPlanner();
                }
              }}
              className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-300 hover:text-amber-300 transition-colors cursor-pointer"
            >
              <Calendar className="w-3 h-3 text-amber-400" />
              <span>Plan Custom Trip</span>
              <ChevronRight className="w-2.5 h-2.5" />
            </button>
          </div>

        </div>

        {/* Right Column: Destination Spotlight Plaque */}
        <div className="lg:col-span-5 flex flex-col items-center lg:items-end w-full">
          <div className="w-full max-w-md xl:max-w-lg rounded-2xl bg-[#0B0F17]/75 backdrop-blur-md border border-white/10 p-4 sm:p-5 flex flex-col gap-3">
            {/* Header: Destination Title & Entry Badge */}
            <div className="flex items-start justify-between gap-3 pb-3 border-b border-white/10">
              <div>
                <h3 className="text-lg sm:text-xl font-bold text-white font-sans-clean leading-snug">
                  {activeDest.name}
                </h3>
                <span className="text-xs text-slate-400 flex items-center gap-1.5 mt-1 font-sans-clean">
                  <MapPin className="w-3 h-3 text-amber-400/80 flex-shrink-0" />
                  <span>{activeDest.district}, {activeDest.state}</span>
                </span>
              </div>
              <span className="px-2.5 py-1 rounded-full bg-white/[0.05] border border-white/10 text-xs font-semibold text-amber-300 whitespace-nowrap">
                {activeDest.isTicketed ? `₹${activeDest.groundRate} Entry` : 'Free Entry'}
              </span>
            </div>

            {/* Visiting Hours & Early Entry */}
            <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-white/[0.02] border border-white/5 text-xs font-sans-clean">
              <div className="flex items-center gap-2 min-w-0">
                <Clock className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                <span className="text-xs text-slate-300 truncate">{activeDest.bestHours}</span>
              </div>
              {activeDest.earlyEntry && (
                <span className="text-[9px] px-2 py-0.5 rounded-full bg-amber-400/10 text-amber-300 font-bold uppercase tracking-wider flex-shrink-0 ml-2 border border-amber-400/20">
                  Early Entry
                </span>
              )}
            </div>

            {/* Authentic Local Delicacy Highlight */}
            {activeDest.foodTip && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-amber-500/[0.03] border border-amber-500/10 text-xs font-sans-clean">
                <Utensils className="w-3.5 h-3.5 text-amber-400/80 flex-shrink-0" />
                <p className="text-[11px] text-slate-300 truncate">
                  <span className="text-amber-300 font-medium">Food: </span>
                  {activeDest.foodTip}
                </p>
              </div>
            )}

            {/* Navigation controls with slide dots */}
            <div className="pt-2 border-t border-white/10 flex items-center justify-between text-xs">
              <div className="flex items-center gap-1.5">
                {HERO_DESTINATIONS.map((dest, i) => (
                  <button
                    key={dest.id}
                    type="button"
                    onClick={() => handleSelectDestination(i)}
                    aria-label={`View ${dest.name}`}
                    className={`h-1.5 rounded-full transition-all duration-300 cursor-pointer ${
                      i === activeIdx ? 'w-6 bg-amber-400' : 'w-1.5 bg-white/20 hover:bg-white/40'
                    }`}
                  />
                ))}
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => handleSelectDestination((activeIdx - 1 + HERO_DESTINATIONS.length) % HERO_DESTINATIONS.length)}
                  aria-label="Previous destination"
                  className="p-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 hover:text-white transition-colors cursor-pointer"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => handleSelectDestination((activeIdx + 1) % HERO_DESTINATIONS.length)}
                  aria-label="Next destination"
                  className="p-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 hover:text-white transition-colors cursor-pointer"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* MODAL 1: Free Official Visitor Guide & Heritage Map */}
      <AnimatePresence>
        {guideModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/85 backdrop-blur-xl">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-2xl max-h-[85vh] bg-[#0E121A] border border-white/10 rounded-3xl p-6 sm:p-8 flex flex-col gap-5 shadow-2xl overflow-y-auto"
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center text-emerald-300">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white font-sans-clean">
                      Official Visitor Guide: {activeDest.name}
                    </h3>
                    <span className="text-xs text-emerald-400 font-sans-clean">
                      Verified by {activeDest.authority}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => setGuideModalOpen(false)}
                  aria-label="Close destination guide"
                  className="w-8 h-8 rounded-full bg-white/[0.05] hover:bg-white/[0.1] border border-white/10 flex items-center justify-center text-slate-300 transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Official Policy Statement */}
              <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-400/25 flex flex-col gap-1 text-xs text-emerald-200">
                <span className="font-semibold text-xs text-emerald-300 font-sans-clean">Official entry policy</span>
                <p className="leading-relaxed">
                  {activeDest.policyNotice}
                </p>
              </div>

              {/* Hero Photo & Key Facts */}
              <div className="relative h-44 rounded-2xl overflow-hidden bg-slate-900">
                <img
                  src={activeDest.image}
                  alt={activeDest.name}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#0B0F17] via-transparent to-transparent" />
                <div className="absolute bottom-3 left-4 right-4 flex items-center justify-between">
                  <span className="text-sm font-bold text-white drop-shadow">
                    {activeDest.district}, {activeDest.state}
                  </span>
                  <span className="text-xs text-amber-300 font-bold">
                    {activeDest.bestHours}
                  </span>
                </div>
              </div>

              {/* Authentic Advice & Shopping */}
              <div className="flex flex-col gap-3 text-xs">
                <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/5 flex flex-col gap-1">
                  <span className="text-slate-400 font-semibold uppercase text-[10px]">Authentic Food & Shopping Guide</span>
                  <span className="text-slate-200 leading-relaxed">{activeDest.foodTip}</span>
                </div>

                <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-400/20 flex flex-col gap-1">
                  <span className="text-amber-300 font-semibold uppercase text-[10px] flex items-center gap-1.5">
                    <AlertTriangle className="w-3 h-3" />
                    <span>Official Anti-Scam Traveler Advisory</span>
                  </span>
                  <span className="text-amber-200/90 leading-relaxed">{activeDest.advisory}</span>
                </div>
              </div>

              {/* Close Button */}
              <div className="flex justify-end pt-2">
                <button
                  onClick={() => setGuideModalOpen(false)}
                  className="px-6 py-2.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] text-white text-xs font-semibold cursor-pointer"
                >
                  Close Visitor Guide
                </button>
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL 2: Official Government e-Ticketing Gateway Checkout */}
      <AnimatePresence>
        {checkoutModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/85 backdrop-blur-xl">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-lg bg-[#0E121A] border border-white/10 rounded-3xl p-6 sm:p-8 flex flex-col gap-6 shadow-2xl overflow-hidden"
            >
              {/* Header */}
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-amber-400/20 border border-amber-400/30 flex items-center justify-center text-amber-300">
                    <Ticket className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white font-sans-clean">
                      Smart e-Services Checkout • Zero Markup Gateway
                    </h3>
                    <span className="text-xs text-amber-300/90 font-sans-clean">
                      {activeDest.authority} Authorized Reservation
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => setCheckoutModalOpen(false)}
                  aria-label="Close checkout modal"
                  className="w-8 h-8 rounded-full bg-white/[0.05] hover:bg-white/[0.1] border border-white/10 flex items-center justify-center text-slate-300 transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Destination Details */}
              <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 flex items-center gap-4">
                <img
                  src={activeDest.image}
                  alt={activeDest.name}
                  className="w-16 h-16 rounded-xl object-cover"
                />
                <div className="flex flex-col">
                  <span className="text-sm font-bold text-white font-sans-clean">
                    {activeDest.name}
                  </span>
                  <span className="text-xs text-amber-300">
                    {activeDest.district}, {activeDest.state}
                  </span>
                  <span className="text-[11px] text-slate-400 mt-1">
                    Date: {travelDate} • {travelersCount} {travelersCount === 1 ? 'Guest' : 'Guests'}
                  </span>
                </div>
              </div>

              {/* Transparent Itemized Fare Breakdown */}
              <div className="flex flex-col gap-3 font-sans-clean text-xs">
                
                {/* 1. Base Monument Entry Rate */}
                <div className="flex items-center justify-between py-2 border-b border-white/5">
                  <div className="flex flex-col">
                    <span className="text-slate-200 font-semibold">Government Monument Gate Ticket</span>
                    <span className="text-[10px] text-slate-400">
                      {activeDest.isTicketed 
                        ? `Official rate (${activeDest.authority}): ₹${activeDest.groundRate} × ${travelersCount}`
                        : 'Free Public Monument • No ticket charged'}
                    </span>
                  </div>
                  <span className={`font-bold text-sm ${!activeDest.isTicketed ? 'text-emerald-400' : 'text-white'}`}>
                    {activeDest.isTicketed ? `₹${baseTicketTotal}.00` : '₹0.00'}
                  </span>
                </div>

                {/* 2. Platform & E-Pass Service Fee */}
                {platformFee > 0 && (
                  <div className="flex items-center justify-between py-2 border-b border-white/5">
                    <div className="flex flex-col">
                      <span className="text-slate-200 font-semibold">Digital E-Pass Service Fee</span>
                      <span className="text-[10px] text-slate-400">
                        Digital QR pass issuance & offline gate verification
                      </span>
                    </div>
                    <span className="font-bold text-sm text-slate-300">
                      ₹{platformFee}.00
                    </span>
                  </div>
                )}

                {/* Total */}
                <div className="flex items-center justify-between pt-2">
                  <span className="text-base font-bold text-white">Total Amount</span>
                  <span className="text-xl font-bold text-emerald-400 tabular-nums">
                    ₹{totalPayable}.00
                  </span>
                </div>

              </div>

              {/* Government Guarantee Notice */}
              <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-400/20 flex items-start gap-2.5 text-xs text-amber-200 font-sans-clean">
                <Info className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                <span className="leading-relaxed text-[11px]">
                  <strong>Official Rate Parity Guarantee:</strong> You are paying the exact rate approved by state tourism departments. Your QR entry pass will be issued instantly for direct gate entry.
                </span>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setCheckoutModalOpen(false)}
                  className="flex-1 py-3 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-slate-300 text-xs font-semibold transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmOrder}
                  className="flex-1 py-3 rounded-xl bg-amber-400 text-slate-950 text-xs font-bold transition-colors hover:bg-amber-300 flex items-center justify-center gap-2 shadow-sm cursor-pointer"
                >
                  <Lock className="w-3.5 h-3.5" />
                  <span>Confirm & Get Entry Pass</span>
                </button>
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
