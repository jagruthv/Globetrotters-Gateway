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
  Headphones,
  AlertTriangle,
  FileText,
  Sparkles
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
    audioTourPrice: 39,
    rating: 'APTDC Geo-Heritage Caverns',
    advisory: 'CAVERN NOTICE: Interior pathway is damp limestone; wear non-slip shoes. Gate ticket is ₹40 per visitor.',
    foodTip: 'Famous Araku Bamboo Chicken cooked inside green bamboo shoots over wood embers (₹200 - ₹250), hot Araku Arabica coffee at mountain ridge stalls.',
    tagline: 'Deep limestone caves descending 80 meters into the scenic Eastern Ghats mountains.',
    policyNotice: 'Ticketed Attraction: Official APTDC entry ticket is ₹40 / Person. Digital entry pass gives direct access through the gate scanner.'
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
    audioTourPrice: 29,
    rating: 'Penna River Sandstone Gorge',
    advisory: 'CANYON CAUTION: Natural gorge viewpoints have sheer 300ft drops with no railings. Maintain safe distance from cliff edges.',
    foodTip: 'Authentic Rayalaseema Karam Dosa (₹40 - ₹60) and hot Ragi Mudda with Natukodi Pulusu served at local village homestays and dhabas.',
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
    audioTourPrice: 29,
    rating: 'UNESCO World Heritage • 1213 AD',
    advisory: 'TEMPLE COURTESY: Traditional attire recommended for the sanctum. Footwear deposit stall available at the outer gate.',
    foodTip: 'Telangana Sarva Pindi and hot Jowar Rotis with spicy country chutney available at local family stalls outside the temple gateway.',
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
    entryType: 'Free Public Monument',
    groundRate: 0,
    rateBadge: 'Free Entry (No Ticket Required)',
    authority: 'Telangana Tourism & ASI Heritage',
    highlights: '1591 AD Qutb Shahi Minarets, Laad Bazaar Lac Bangles, Nimrah Irani Chai',
    bestHours: '05:00 PM – 10:30 PM (Evening Illumination)',
    audioTourPrice: 29,
    rating: 'ASI Protected Monument',
    advisory: 'STREET ADVISORY: Purchase pearls and bangles from certified jewelers inside the bazaar to ensure authentic hallmarks.',
    foodTip: 'Iconic Irani Chai with hot Osmania biscuits at Nimrah Cafe right beside Charminar (₹20). Handcrafted pure lac bangles in Laad Bazaar (₹250 - ₹1,500).',
    tagline: '16th-century Qutb Shahi monument of four minarets framing the vibrant bazaars of Old Hyderabad.',
    policyNotice: 'Free Public Access: Open pedestrian heritage piazza. No entry ticket, gate pass, or booking is required to visit Charminar or Laad Bazaar.'
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
    audioTourPrice: 39,
    rating: 'ASI National Citadel',
    advisory: 'GATE NOTICE: Official ₹25 entry ticket required at the gate. Sound & light evening show requires a separate ₹60 counter ticket.',
    foodTip: 'Traditional Hyderabadi mutton biryani and spiced charcoal corn available at historic eateries near the outer citadel gate.',
    tagline: 'Diamond-capital medieval citadel featuring world-famous acoustic engineering where a hand clap echoes at the hilltop summit.',
    policyNotice: 'Ticketed Monument: Exact ASI gate rate is ₹25 / Person. Book online to get your QR gate pass and skip ticket counter lines.'
  }
];

export default function FluidLiquidDropHero({ 
  onExploreDistricts, 
  onLaunchTripPlanner, 
  onDirectBookPass,
  onPlanCustomTrip
}) {
  const [activeIdx, setActiveIdx] = useState(0);
  const [travelDate, setTravelDate] = useState('Tomorrow');
  const [travelersCount, setTravelersCount] = useState(2);
  const [addAudioTour, setAddAudioTour] = useState(false);
  
  // Modals for authentic government tourism flow
  const [guideModalOpen, setGuideModalOpen] = useState(false);
  const [checkoutModalOpen, setCheckoutModalOpen] = useState(false);

  const activeDest = HERO_DESTINATIONS[activeIdx];

  // Auto-advance showcase every 14 seconds if user is active & tab visible
  useEffect(() => {
    const timer = setInterval(() => {
      if (typeof document !== 'undefined' && document.hidden) return;
      setActiveIdx((prev) => (prev + 1) % HERO_DESTINATIONS.length);
      setAddAudioTour(false); // Reset add-on when switching
    }, 14000);
    return () => clearInterval(timer);
  }, []);

  const handleSelectDestination = (idx) => {
    setActiveIdx(idx);
    setAddAudioTour(false);
  };

  // Pricing calculations
  const baseTicketTotal = activeDest.isTicketed ? activeDest.groundRate * travelersCount : 0;
  const audioTourTotal = addAudioTour ? activeDest.audioTourPrice : 0;
  // Official digital convenience fee: ₹0 for free places, ₹15 for ticketed government reservations
  const platformFee = activeDest.isTicketed ? 15 : 0;
  const totalPayable = baseTicketTotal + audioTourTotal + platformFee;

  // Primary Action Button Handler
  const handlePrimaryAction = () => {
    if (activeDest.isTicketed || addAudioTour) {
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
          audioGuide: audioTourTotal,
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
            Verified local routes, entry guidelines, and tickets for 59 districts and 646 places across both states.
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
                        {d.name} ({d.isTicketed ? `₹${d.groundRate}` : 'Free'})
                      </option>
                    ))}
                  </select>
                </div>

                {/* 2. Date Selector - 3 cols */}
                <div className="sm:col-span-3 flex flex-col px-3 py-1.5 rounded-lg bg-white/[0.03] border border-white/5 hover:border-white/15 transition-colors">
                  <label htmlFor="hero-date-select" className="text-[10px] text-slate-400 font-medium flex items-center gap-1 font-sans-clean">
                    <Calendar className="w-3 h-3 text-emerald-400 flex-shrink-0" />
                    <span>Date of Visit</span>
                  </label>
                  <select
                    id="hero-date-select"
                    aria-label="Select date of visit"
                    value={travelDate}
                    onChange={(e) => setTravelDate(e.target.value)}
                    className="bg-transparent text-white text-xs font-semibold focus:outline-none cursor-pointer mt-0.5"
                  >
                    <option value="Today" className="bg-[#0B0F17] text-white">Today</option>
                    <option value="Tomorrow" className="bg-[#0B0F17] text-white">Tomorrow</option>
                    <option value="This Weekend" className="bg-[#0B0F17] text-white">This Weekend</option>
                    <option value="Next Week" className="bg-[#0B0F17] text-white">Next Week</option>
                  </select>
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
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${
                      activeDest.isTicketed ? 'bg-amber-500/15 text-amber-300' : 'bg-emerald-500/15 text-emerald-300'
                    }`}>
                      {activeDest.isTicketed ? <Ticket className="w-2.5 h-2.5" /> : <ShieldCheck className="w-2.5 h-2.5" />}
                    </div>
                    <span className={`text-[10px] sm:text-[11px] font-bold ${activeDest.isTicketed ? 'text-amber-300' : 'text-emerald-300'}`}>
                      {activeDest.isTicketed ? `Official Ticket: ₹${activeDest.groundRate}/person` : 'Free Public Monument'}
                    </span>
                  </div>

                  <label className="inline-flex items-center gap-1 cursor-pointer px-2 py-0.5 rounded-md bg-white/[0.03] hover:bg-white/[0.06] border border-white/5 transition-colors">
                    <input
                      type="checkbox"
                      checked={addAudioTour}
                      onChange={(e) => setAddAudioTour(e.target.checked)}
                      className="w-3 h-3 rounded text-amber-400 bg-slate-900 border-white/20 focus:ring-0 cursor-pointer"
                    />
                    <Headphones className="w-2.5 h-2.5 text-amber-400" />
                    <span className="text-[10px] text-slate-300">Audio Walk (+₹{activeDest.audioTourPrice})</span>
                  </label>
                </div>

                {/* Total & Action Button */}
                <div className="flex items-center justify-between sm:justify-end gap-2.5">
                  <div className="flex items-baseline gap-1 text-xs">
                    <span className="text-slate-400 text-[10px]">Total:</span>
                    <span className="font-extrabold text-xs sm:text-sm text-white">
                      {totalPayable === 0 ? 'Free (₹0)' : `₹${totalPayable}`}
                    </span>
                  </div>

                  {!activeDest.isTicketed && !addAudioTour ? (
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
                        {activeDest.isTicketed ? `Book e-Ticket • ₹${totalPayable}` : `Get Guide + Audio • ₹${totalPayable}`}
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
              className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-300 hover:text-emerald-300 transition-colors cursor-pointer"
            >
              <Sparkles className="w-3 h-3 text-emerald-400" />
              <span>Plan Custom Trip</span>
              <ChevronRight className="w-2.5 h-2.5" />
            </button>
          </div>

        </div>

        {/* Right Column: Natural Destination Card */}
        <div className="lg:col-span-5 flex flex-col items-center lg:items-end w-full">
          <div className="w-full max-w-md xl:max-w-lg rounded-xl bg-[#0B0F17] border border-white/10 p-3 sm:p-4 flex flex-col gap-2.5">
            {/* Destination Spotlight Image */}
            <div className="relative h-44 sm:h-48 rounded-lg overflow-hidden bg-slate-900 group">
              <img
                src={activeDest.image}
                alt={activeDest.name}
                className="w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
              
              <div className="absolute bottom-2.5 left-3 right-3 flex items-end justify-between gap-2">
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-white font-sans-clean leading-snug">
                    {activeDest.name}
                  </h3>
                  <span className="text-xs text-amber-200/90 flex items-center gap-1 mt-0.5">
                    <MapPin className="w-3 h-3 text-amber-400 flex-shrink-0" />
                    <span>{activeDest.district}, {activeDest.state}</span>
                  </span>
                </div>
                <span className="px-2 py-0.5 rounded bg-black/60 border border-white/20 text-xs font-semibold text-white">
                  {activeDest.isTicketed ? `₹${activeDest.groundRate}` : 'Free Entry'}
                </span>
              </div>
            </div>

            {/* Timings and Guidelines */}
            <div className="grid grid-cols-2 gap-2 text-xs font-sans-clean">
              <div className="p-2.5 rounded-lg bg-white/[0.02] border border-white/5 flex flex-col">
                <span className="text-[10px] text-slate-400 uppercase tracking-wide">Visiting Hours</span>
                <span className="text-slate-200 font-medium text-xs mt-0.5">{activeDest.bestHours}</span>
              </div>
              <div className="p-2.5 rounded-lg bg-white/[0.02] border border-white/5 flex flex-col">
                <span className="text-[10px] text-slate-400 uppercase tracking-wide">Authority</span>
                <span className="text-slate-200 font-medium text-xs mt-0.5 truncate">{activeDest.authority}</span>
              </div>
            </div>

            {/* Advisory */}
            <div className="p-2.5 rounded-lg bg-white/[0.02] border border-white/5 flex items-start gap-2 text-xs text-slate-300">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-400 flex-shrink-0 mt-0.5" />
              <span className="text-[11px] leading-relaxed">{activeDest.advisory}</span>
            </div>

            {/* Navigation controls */}
            <div className="pt-1.5 border-t border-white/10 flex items-center justify-between text-xs">
              <span className="text-[11px] text-slate-400">
                {activeIdx + 1} of {HERO_DESTINATIONS.length}
              </span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => handleSelectDestination((activeIdx - 1 + HERO_DESTINATIONS.length) % HERO_DESTINATIONS.length)}
                  aria-label="Previous destination"
                  className="p-1 rounded bg-white/[0.04] hover:bg-white/[0.1] text-slate-300 transition-colors cursor-pointer"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => handleSelectDestination((activeIdx + 1) % HERO_DESTINATIONS.length)}
                  aria-label="Next destination"
                  className="p-1 rounded bg-white/[0.04] hover:bg-white/[0.1] text-slate-300 transition-colors cursor-pointer"
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

              {/* Optional Audio Walk Upsell Card */}
              <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-500/10 to-emerald-500/10 border border-amber-400/20 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-amber-400/20 flex items-center justify-center text-amber-300 flex-shrink-0">
                    <Headphones className="w-5 h-5" />
                  </div>
                  <div className="flex flex-col text-xs">
                    <span className="font-bold text-white">Curated Heritage Audio Guide</span>
                    <span className="text-[11px] text-slate-400">
                      Narrated historical storytelling, architectural viewpoints & artisan guides.
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setGuideModalOpen(false);
                    setAddAudioTour(true);
                    setCheckoutModalOpen(true);
                  }}
                  className="px-4 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs flex-shrink-0 shadow-md cursor-pointer transition-colors"
                >
                  Unlock • ₹{activeDest.audioTourPrice}
                </button>
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

                {/* 2. Optional Audio Guide Add-On */}
                {addAudioTour && (
                  <div className="flex items-center justify-between py-2 border-b border-white/5">
                    <div className="flex flex-col">
                      <span className="text-slate-200 font-semibold">Curated Heritage Audio Guide</span>
                      <span className="text-[10px] text-slate-400">
                        Official narrated storytelling & offline audio guide
                      </span>
                    </div>
                    <span className="font-bold text-sm text-amber-300">
                      ₹{audioTourTotal}.00
                    </span>
                  </div>
                )}

                {/* 3. Platform & E-Pass Service Fee */}
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
