import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, 
  MapPin, 
  ChevronRight, 
  Plus, 
  Check, 
  X, 
  ExternalLink, 
  Utensils, 
  AlertTriangle, 
  Navigation, 
  Landmark, 
  Trees, 
  Castle, 
  Palette, 
  Ticket, 
  Compass, 
  RotateCcw,
  Star,
  Accessibility
} from 'lucide-react';
import { MASTER_ATLAS_DATA } from '../utils/masterAtlasData';
import { getAuthenticPlacePhoto, getOfflineImageFallback } from '../utils/authenticPlacePhotos';
import LiveWeatherBadge from './LiveWeatherBadge';
import { ALL_59_DISTRICTS } from '../utils/offlineRouteEngine';

// Pre-index coordinates for weather fallback across all 59 districts
const DISTRICT_COORDS = {};
if (ALL_59_DISTRICTS) {
  [...(ALL_59_DISTRICTS['Andhra Pradesh'] || []), ...(ALL_59_DISTRICTS['Telangana'] || [])].forEach((d) => {
    DISTRICT_COORDS[d.name.toLowerCase()] = { lat: d.lat, lng: d.lng };
    if (d.hq) DISTRICT_COORDS[d.hq.toLowerCase()] = { lat: d.lat, lng: d.lng };
  });
}

// High-level State Toggles
const STATES = [
  { id: 'all', label: 'All 59 Districts' },
  { id: 'AP', label: 'Andhra Pradesh (26)' },
  { id: 'TG', label: 'Telangana (33)' },
];

// Cultural Travel Zones for both States
const ZONES = [
  { id: 'all', label: 'All Zones', state: 'all' },
  { id: 'ap_uttarandhra', label: 'Uttarandhra (AP)', state: 'AP' },
  { id: 'ap_godavari', label: 'Godavari Delta (AP)', state: 'AP' },
  { id: 'ap_central', label: 'Central Coastal (AP)', state: 'AP' },
  { id: 'ap_rayalaseema', label: 'Rayalaseema (AP)', state: 'AP' },
  { id: 'tg_north', label: 'Northern Telangana (TG)', state: 'TG' },
  { id: 'tg_metro', label: 'Hyderabad Metro (TG)', state: 'TG' },
  { id: 'tg_south', label: 'Southern Telangana (TG)', state: 'TG' },
];

// Diverse Traveler Persona & Interest Filters (Pro-Grade Two-Tone Split Pills)
const TRAVELER_THEMES = [
  { 
    id: 'all', 
    label: 'All Sights', 
    Icon: Compass,
    image: '/images/aptourism/kailasagiri_hill.jpg',
    count: 646
  },
  { 
    id: 'spiritual', 
    label: 'Spiritual & Temples', 
    category: 'Heritage & Spiritual', 
    Icon: Landmark,
    image: '/images/aptourism/sri_venkateshwara_swamy_temple.jpg',
    count: 214
  },
  { 
    id: 'nature', 
    label: 'Nature & Waterfalls', 
    category: 'Nature & Wildlife,Waterfalls & Gorges', 
    Icon: Trees,
    image: '/images/aptourism/borra_caves.jpg',
    count: 142
  },
  { 
    id: 'forts', 
    label: 'Forts & Heritage', 
    category: 'Historical Forts & Monuments', 
    Icon: Castle,
    image: '/images/telangana/hyderabad.jpg',
    count: 98
  },
  { 
    id: 'crafts', 
    label: 'Culture & GI Crafts', 
    category: 'Artisans & Culture', 
    Icon: Palette,
    image: '/images/telangana/warangal.jpg',
    count: 64
  },
  { 
    id: 'free', 
    label: 'Free Public Sights', 
    freeOnly: true, 
    Icon: Ticket,
    image: '/images/aptourism/bhavani_islands.jpg',
    count: 185
  },
];

export default function BentoDistrictExplorer({ 
  onSelectPlaceForTrip, 
  selectedPlaces = [] 
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeState, setActiveState] = useState('all');
  const [activeZone, setActiveZone] = useState('all');
  const [activeTheme, setActiveTheme] = useState('all');
  const [activeDistrictModal, setActiveDistrictModal] = useState(null);
  const [modalFilterMode, setModalFilterMode] = useState('all'); // 'all' or 'matching'

  // Escape key listener for accessible modal dismissal
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setActiveDistrictModal(null);
      }
    };
    if (activeDistrictModal) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeDistrictModal]);

  const handleStateChange = (stateId) => {
    setActiveState(stateId);
    setActiveZone('all');
  };

  const visibleZones = useMemo(() => {
    if (activeState === 'all') return ZONES;
    return ZONES.filter(z => z.state === 'all' || z.state === activeState);
  }, [activeState]);

  // Parse and extract valid 59 districts with spots
  const allDistricts = useMemo(() => {
    const ap = (MASTER_ATLAS_DATA.andhraPradesh || []).filter(
      (d) => d.spots && d.spots.length > 0 && !d.name.includes('SOVEREIGN TOURISM ATLAS')
    );
    const tg = (MASTER_ATLAS_DATA.telangana || []).filter(
      (d) => d.spots && d.spots.length > 0 && !d.name.includes('SOVEREIGN TOURISM ATLAS')
    );
    return [...ap, ...tg];
  }, []);

  // Robust Compound Filtering without early returns
  const filteredDistricts = useMemo(() => {
    return allDistricts.filter((dist) => {
      const q = searchQuery.toLowerCase().trim();
      const isAP = dist.state === 'Andhra Pradesh';
      const name = dist.name.toLowerCase();
      const hq = (dist.hq || '').toLowerCase();

      // 1. Search Query Filter
      if (q) {
        const matchesName = name.includes(q) || hq.includes(q);
        const matchesSpot = dist.spots.some((s) => 
          s.name?.toLowerCase().includes(q) ||
          s.category?.toLowerCase().includes(q) ||
          s.description?.toLowerCase().includes(q) ||
          (s.culinarySpecialty && s.culinarySpecialty.toLowerCase().includes(q))
        );
        if (!matchesName && !matchesSpot) return false;
      }

      // 2. State Filter
      if (activeState === 'AP' && !isAP) return false;
      if (activeState === 'TG' && isAP) return false;

      // 3. Cultural Zone Filter
      if (activeZone !== 'all') {
        let inZone = false;
        if (activeZone === 'ap_uttarandhra') {
          inZone = isAP && (name.includes('visakhapatnam') || name.includes('asr') || name.includes('alluri') || name.includes('anakapalli') || name.includes('vizianagaram') || name.includes('srikakulam') || name.includes('parvathipuram'));
        } else if (activeZone === 'ap_godavari') {
          inZone = isAP && (name.includes('kakinada') || name.includes('konaseema') || name.includes('east godavari') || name.includes('west godavari') || name.includes('eluru'));
        } else if (activeZone === 'ap_central') {
          inZone = isAP && (name.includes('ntr') || name.includes('krishna') || name.includes('guntur') || name.includes('bapatla') || name.includes('palnadu') || name.includes('prakasam') || name.includes('nellore'));
        } else if (activeZone === 'ap_rayalaseema') {
          inZone = isAP && (name.includes('kurnool') || name.includes('nandyal') || name.includes('anantapur') || name.includes('sathya sai') || name.includes('kadapa') || name.includes('annamayya') || name.includes('chittoor') || name.includes('tirupati'));
        } else if (activeZone === 'tg_metro') {
          inZone = !isAP && (name.includes('hyderabad') || name.includes('medchal') || name.includes('ranga reddy'));
        } else if (activeZone === 'tg_north') {
          inZone = !isAP && (name.includes('adilabad') || name.includes('nizamabad') || name.includes('karimnagar') || name.includes('warangal') || name.includes('khammam') || name.includes('mancherial') || name.includes('nirmal') || name.includes('komaram') || name.includes('jagti') || name.includes('peddapalli') || name.includes('sircilla') || name.includes('kamareddy'));
        } else if (activeZone === 'tg_south') {
          inZone = !isAP && (name.includes('mahbubnagar') || name.includes('nalgonda') || name.includes('suryapet') || name.includes('yadadri') || name.includes('nagarkurnool') || name.includes('wanaparthy') || name.includes('gadwal') || name.includes('narayanpet') || name.includes('vikarabad') || name.includes('medak') || name.includes('sangareddy') || name.includes('siddipet') || name.includes('jangaon') || name.includes('mahbubabad') || name.includes('bhadradri') || name.includes('bhupalpally') || name.includes('mulugu'));
        }
        if (!inZone) return false;
      }

      // 4. Traveler Theme Filter
      if (activeTheme !== 'all') {
        const themeDef = TRAVELER_THEMES.find(t => t.id === activeTheme);
        if (themeDef) {
          const hasMatchingSpot = dist.spots.some(s => {
            if (themeDef.freeOnly) {
              const feeStr = (s.fees || s.feesDescription || '').toLowerCase();
              return feeStr.includes('free') || s.individualPrice === 0;
            }
            if (themeDef.category) {
              const cats = themeDef.category.split(',').map(c => c.trim().toLowerCase());
              return cats.some(c => s.category?.toLowerCase().includes(c));
            }
            return true;
          });
          if (!hasMatchingSpot) return false;
        }
      }

      return true;
    });
  }, [allDistricts, searchQuery, activeState, activeZone, activeTheme]);

  const isPlaceSelected = (placeName) => {
    return selectedPlaces.some((p) => p.name.toLowerCase() === placeName.toLowerCase());
  };

  const handleResetFilters = () => {
    setSearchQuery('');
    setActiveState('all');
    setActiveZone('all');
    setActiveTheme('all');
  };

  return (
    <section className="relative w-full py-24 px-4 md:px-12 bg-[#06080D] text-slate-200">
      <div className="max-w-7xl mx-auto flex flex-col gap-10">
        
        {/* Header & Spatial Telemetry Bar */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-white/10 pb-8">
          <div className="flex flex-col gap-3">
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-amber-500/10 border border-amber-400/20 w-max">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
              <span className="text-[10px] uppercase tracking-[0.2em] font-semibold text-amber-300 font-sans-clean">
                Verified Regional Directory • Andhra Pradesh & Telangana
              </span>
            </div>
            <h2 className="text-3xl md:text-5xl font-bold tracking-tight text-white font-sans-clean">
              59 Districts • 646 Destinations
            </h2>
            <p className="text-sm md:text-base text-slate-400 max-w-2xl leading-relaxed font-sans-clean">
              Discover authentic sights, local delicacies, and transparent entry fees across Andhra Pradesh and Telangana.
            </p>
          </div>

          {/* Search Box */}
          <div className="relative w-full md:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              name="searchQuery"
              aria-label="Search district, spot, or temple"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search district, spot, temple..."
              autoComplete="off"
              spellCheck={false}
              className="w-full h-11 pl-11 pr-4 rounded-full bg-white/[0.04] border border-white/10 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-amber-400/50 transition-colors"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                aria-label="Clear search query"
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Triple-Tier Interactive Filter System: State Toggle + Cultural Zones + Traveler Themes */}
        <div className="flex flex-col gap-3.5">
          {/* Tier 1: State Selection Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none" role="tablist" aria-label="Filter by State">
            {STATES.map((s) => {
              const isSelected = activeState === s.id;
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => handleStateChange(s.id)}
                  aria-pressed={isSelected}
                  role="tab"
                  className={`px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-colors duration-200 font-sans-clean cursor-pointer ${
                    isSelected
                      ? 'bg-amber-400 text-slate-950 font-bold'
                      : 'bg-white/[0.04] text-slate-300 border border-white/10 hover:border-white/20 hover:text-white'
                  }`}
                >
                  {s.label}
                </button>
              );
            })}
          </div>

          {/* Tier 2: Geographic Cultural Zones */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none" role="tablist" aria-label="Filter by Cultural Zone">
            {visibleZones.map((zone) => {
              const isSelected = activeZone === zone.id;
              return (
                <button
                  key={zone.id}
                  type="button"
                  onClick={() => setActiveZone(zone.id)}
                  aria-pressed={isSelected}
                  role="tab"
                  className={`px-3 py-1 rounded-full text-[11px] font-medium whitespace-nowrap transition-colors duration-150 font-sans-clean cursor-pointer ${
                    isSelected
                      ? 'bg-amber-500/15 text-amber-300 border border-amber-400/30'
                      : 'bg-white/[0.02] text-slate-400 border border-white/5 hover:border-white/15 hover:text-slate-200'
                  }`}
                >
                  {zone.label}
                </button>
              );
            })}
          </div>

          {/* Tier 3: Traveler Interest & Themes */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none" role="tablist" aria-label="Filter by Category">
            {TRAVELER_THEMES.map((theme) => {
              const isSelected = activeTheme === theme.id;
              const ThemeIcon = theme.Icon;
              return (
                <button
                  key={theme.id}
                  type="button"
                  role="tab"
                  aria-selected={isSelected}
                  onClick={() => setActiveTheme(theme.id)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer ${
                    isSelected
                      ? 'bg-amber-500/15 text-amber-300 border border-amber-400/30 shadow-sm'
                      : 'bg-white/[0.03] text-slate-400 hover:text-white hover:bg-white/[0.08] border border-white/5'
                  }`}
                >
                  <ThemeIcon className="w-3.5 h-3.5" />
                  <span>{theme.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Results Telemetry Bar */}
        <div className="flex items-center justify-between text-xs text-slate-400 font-sans-clean">
          <span>
            Showing <strong className="text-white font-telemetry">{filteredDistricts.length}</strong> of 59 Verified Districts
          </span>
          <span className="hidden sm:inline text-slate-500">
            Click any district to view places to visit, ticket fees, and travel tips
          </span>
        </div>

        {/* Zero Results Diagnostic Recovery */}
        {filteredDistricts.length === 0 ? (
          <div className="w-full py-16 px-6 rounded-3xl bg-white/[0.02] border border-white/10 flex flex-col items-center text-center gap-4 my-6">
            <div className="w-14 h-14 rounded-full bg-amber-500/10 border border-amber-400/20 flex items-center justify-center text-amber-400">
              <Compass className="w-7 h-7" />
            </div>
            <h3 className="text-xl font-bold text-white font-sans-clean">
              No Districts Match Your Active Filters
            </h3>
            <p className="text-xs text-slate-400 max-w-md leading-relaxed font-sans-clean">
              We couldn't find any destinations matching your current combination. Try searching for popular hubs like Araku, Charminar, or Srisailam, or clear your filters.
            </p>
            <button
              type="button"
              onClick={handleResetFilters}
              className="mt-2 px-6 py-2.5 rounded-full bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-2 hover:bg-amber-300 transition-colors font-sans-clean shadow-lg cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset All Filters</span>
            </button>
          </div>
        ) : (
          /* Asymmetrical Authentic Bento Box Grid */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredDistricts.map((district, idx) => {
              const firstSpot = district.spots[0] || {};
              const photoUrl = getAuthenticPlacePhoto(firstSpot.name, firstSpot.imageUrl);
              const fallbackBanner = getOfflineImageFallback(firstSpot.name, firstSpot.category, district.name);
              const isFirstSelected = isPlaceSelected(firstSpot.name);
              const isFlagship = (idx % 5 === 0 && filteredDistricts.length > 4);

              return (
                <motion.div
                  key={district.name}
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.15 }}
                  transition={{ duration: 0.5, delay: (idx % 3) * 0.08 }}
                  onClick={() => setActiveDistrictModal(district)}
                  className={`doppelrand group cursor-pointer ${isFlagship ? 'md:col-span-2 lg:col-span-2' : ''}`}
                >
                  <div className="doppelrand-inner overflow-hidden flex flex-col h-full justify-between">
                    
                    {/* Visual Banner Header */}
                    <div className={`relative ${isFlagship ? 'h-56' : 'h-48'} w-full overflow-hidden bg-slate-900`}>
                      <img
                        src={photoUrl || fallbackBanner}
                        alt={district.name}
                        onError={(e) => {
                          e.currentTarget.onerror = null;
                          e.currentTarget.src = fallbackBanner;
                        }}
                        className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                        loading="lazy"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-[#0B0F17] via-[#0B0F17]/40 to-transparent" />

                      {/* State & Spot Count Badge */}
                      <div className="absolute top-3 left-3 right-3 flex items-center justify-between">
                        <span className="px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-md border border-white/10 text-[10px] font-bold text-amber-300 font-telemetry">
                          {district.state === 'Andhra Pradesh' ? 'AP' : 'TG'} • HQ: {district.hq}
                        </span>
                        <div className="flex items-center gap-1.5">
                          {isFlagship && (
                            <span className="px-2.5 py-1 rounded-full bg-amber-500/20 backdrop-blur-md border border-amber-400/30 text-[10px] font-bold text-amber-300 font-telemetry">
                              Flagship Hub
                            </span>
                          )}
                          <span className="px-2.5 py-1 rounded-full bg-white/[0.08] backdrop-blur-md border border-white/10 text-[10px] font-bold text-white font-telemetry">
                            {district.spots.length} Sights
                          </span>
                        </div>
                      </div>

                      {/* Landmark Name on Banner */}
                      <div className="absolute bottom-3 left-3 right-3 flex items-end justify-between gap-2">
                        <div className="min-w-0">
                          <span className="text-[10px] text-amber-300 font-sans-clean font-semibold block">
                            Key Attraction
                          </span>
                          <h4 className="text-base font-bold text-white truncate drop-shadow-md">
                            {firstSpot.name || 'Famous Attraction'}
                          </h4>
                        </div>
                        {firstSpot.individualPrice !== undefined && (
                          <span className="px-2 py-0.5 rounded-md bg-black/70 backdrop-blur-md border border-white/10 text-[10px] font-semibold text-emerald-400 font-telemetry flex-shrink-0">
                            {firstSpot.individualPrice === 0 ? 'Free Entry' : `₹${firstSpot.individualPrice}`}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Body Content */}
                    <div className="p-5 flex flex-col gap-3.5 flex-1 justify-between">
                      <div>
                        <div className="flex items-start justify-between gap-2">
                          <h3 className="text-xl font-bold text-white group-hover:text-amber-300 transition-colors">
                            {district.name.replace(' District', '')}
                          </h3>
                          {/* 1-Click Quick Add Top Spot Button */}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onSelectPlaceForTrip(firstSpot, district.name);
                            }}
                            className={`px-2.5 py-1 rounded-full text-[10px] font-bold flex items-center gap-1 transition-colors flex-shrink-0 font-sans-clean cursor-pointer ${
                              isFirstSelected
                                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/40'
                                : 'bg-white/[0.05] text-slate-300 hover:bg-amber-400 hover:text-slate-950 border border-white/10'
                            }`}
                            title={isFirstSelected ? 'Already in tour plan' : `Add ${firstSpot.name} to plan`}
                          >
                            {isFirstSelected ? <Check className="w-3 h-3 text-emerald-400" /> : <Plus className="w-3 h-3" />}
                            <span>{isFirstSelected ? 'In Plan' : 'Quick Add'}</span>
                          </button>
                        </div>
                        <p className="text-xs text-slate-400 line-clamp-2 mt-1 leading-relaxed">
                          {firstSpot.description || 'Famous temples, waterfalls, hill views, and historic monuments.'}
                        </p>
                      </div>

                      {/* Flagship Top Highlights Preview */}
                      {isFlagship && district.spots.length > 1 && (
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-[10px] text-slate-500 font-sans-clean font-medium">Top Sights:</span>
                          {district.spots.slice(0, 3).map((s) => (
                            <span
                              key={s.name}
                              className="text-[10px] px-2 py-0.5 rounded-md bg-white/[0.03] text-slate-300 border border-white/5 font-sans-clean truncate max-w-[140px]"
                            >
                              {s.name}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Highlights Row */}
                      <div className="pt-3 border-t border-white/10 flex items-center justify-between text-xs text-slate-400 font-telemetry">
                        <div className="flex items-center gap-1.5 truncate max-w-[160px]">
                          <MapPin className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
                          <span className="truncate">{firstSpot.mandal || district.hq}</span>
                        </div>
                        <div className="flex items-center gap-1 text-amber-400 font-semibold group-hover:translate-x-1 transition-transform">
                          <span>Explore All {district.spots.length} Places</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </div>
                      </div>

                    </div>

                  </div>
                </motion.div>
              );
            })}
          </div>
        )}

      </div>

      {/* District Dossier Inspection Modal with Responsive Mobile Bottom-Sheet */}
      <AnimatePresence>
        {activeDistrictModal && (
          <div 
            className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-0 md:p-6 bg-black/80 backdrop-blur-xl"
            onClick={() => setActiveDistrictModal(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 30 }}
              transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-4xl max-h-[92vh] md:max-h-[88vh] bg-[#0B0F17] border border-white/10 rounded-t-[2rem] md:rounded-[2rem] shadow-2xl flex flex-col overflow-hidden"
            >
              {/* Mobile Swipe Grab Handle */}
              <div className="w-12 h-1.5 rounded-full bg-white/20 mx-auto mt-2.5 mb-1 md:hidden flex-shrink-0" />
              
              {/* Modal Header */}
              <div className="p-5 md:p-6 border-b border-white/10 flex items-center justify-between bg-white/[0.02] flex-shrink-0">
                <div className="flex flex-col">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-400/25 font-telemetry font-bold">
                      {activeDistrictModal.state}
                    </span>
                    <span className="text-xs text-slate-400 font-telemetry">
                      HQ: {activeDistrictModal.hq} • {activeDistrictModal.spots.length} Verified Destinations
                    </span>
                  </div>
                  <h3 className="text-xl md:text-2xl font-bold text-white mt-1">
                    {activeDistrictModal.name}
                  </h3>
                </div>

                <div className="flex items-center gap-3">
                  {/* In-Modal Filter Mode Toggle if activeTheme or search query is set */}
                  {(activeTheme !== 'all' || searchQuery) && (
                    <div className="hidden sm:flex items-center gap-1 p-0.5 rounded-lg bg-white/[0.04] border border-white/10 text-[10px] font-sans-clean">
                      <button
                        type="button"
                        onClick={() => setModalFilterMode('all')}
                        className={`px-2 py-1 rounded-md transition-colors cursor-pointer ${
                          modalFilterMode === 'all' ? 'bg-amber-400 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        All ({activeDistrictModal.spots.length})
                      </button>
                      <button
                        type="button"
                        onClick={() => setModalFilterMode('matching')}
                        className={`px-2 py-1 rounded-md transition-colors cursor-pointer ${
                          modalFilterMode === 'matching' ? 'bg-amber-400 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        Filtered
                      </button>
                    </div>
                  )}

                  <button
                    onClick={() => setActiveDistrictModal(null)}
                    aria-label="Close District Guide"
                    className="w-9 h-9 rounded-full bg-white/[0.05] hover:bg-white/[0.1] border border-white/10 flex items-center justify-center text-slate-300 transition-colors cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Modal Body: List of 15-Point Spots with Schema Normalization */}
              <div className="p-5 md:p-6 overflow-y-auto space-y-4 scrollbar-none flex-1">
                {activeDistrictModal.spots
                  .filter((spot) => {
                    if (modalFilterMode !== 'matching') return true;
                    if (searchQuery) {
                      const q = searchQuery.toLowerCase().trim();
                      return (
                        spot.name?.toLowerCase().includes(q) ||
                        spot.category?.toLowerCase().includes(q) ||
                        spot.description?.toLowerCase().includes(q)
                      );
                    }
                    if (activeTheme !== 'all') {
                      const themeDef = TRAVELER_THEMES.find(t => t.id === activeTheme);
                      if (themeDef?.freeOnly) {
                        const feeStr = (spot.fees || spot.feesDescription || '').toLowerCase();
                        return feeStr.includes('free') || spot.individualPrice === 0;
                      }
                      if (themeDef?.category) {
                        const cats = themeDef.category.split(',').map(c => c.trim().toLowerCase());
                        return cats.some(c => spot.category?.toLowerCase().includes(c));
                      }
                    }
                    return true;
                  })
                  .map((spot) => {
                    const photo = getAuthenticPlacePhoto(spot.name, spot.imageUrl);
                    const fallback = getOfflineImageFallback(spot.name, spot.category, activeDistrictModal.name);
                    const selected = isPlaceSelected(spot.name);
                    const coords = DISTRICT_COORDS[activeDistrictModal.name.toLowerCase()] || DISTRICT_COORDS[activeDistrictModal.hq?.toLowerCase()] || { lat: 17.385, lng: 78.486 };
                    const spotLat = spot.latitude || coords.lat;
                    const spotLng = spot.longitude || coords.lng;

                    // Normalized 15-Point Schema Accessors (Zero Lost Warnings)
                    const scamAlert = spot.scams_and_fakes || spot.scamsAndFakes;
                    const authenticFood = spot.culinarySpecialty || spot.culinary_specialty;
                    const authenticCraft = spot.authentic_purchases || spot.authenticPurchases;
                    const rulesHazards = spot.rules_and_hazards || spot.rulesAndHazards;
                    const cellCoverage = spot.cellularCoverage || spot.cellular_coverage;

                    return (
                      <div
                        key={spot.name}
                        className="p-4 md:p-5 rounded-2xl bg-white/[0.02] border border-white/5 hover:border-white/15 transition-colors flex flex-col gap-4"
                      >
                        <div className="flex flex-col md:flex-row gap-4">
                          {/* Thumbnail */}
                          <div className="w-full md:w-52 h-40 rounded-xl overflow-hidden bg-slate-900 flex-shrink-0 relative">
                            <img
                              src={photo || fallback}
                              alt={spot.name}
                              onError={(e) => {
                                e.currentTarget.onerror = null;
                                e.currentTarget.src = fallback;
                              }}
                              className="w-full h-full object-cover"
                              loading="lazy"
                            />
                            {spot.averageRating && (
                              <div className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-black/70 backdrop-blur-md text-[10px] font-bold text-amber-300 font-telemetry flex items-center gap-1">
                                <Star className="w-2.5 h-2.5 fill-amber-300 text-amber-300" aria-hidden="true" />
                                <span>{spot.averageRating} ({spot.reviewCount?.toLocaleString()})</span>
                              </div>
                            )}
                            <div className="absolute bottom-2 left-2 right-2">
                              <LiveWeatherBadge latitude={spotLat} longitude={spotLng} compact={true} />
                            </div>
                          </div>

                          {/* Info & Telemetry */}
                          <div className="flex flex-col justify-between flex-1 gap-2.5">
                            <div>
                              <div className="flex items-center justify-between gap-2 flex-wrap">
                                <h4 className="text-base font-bold text-white">
                                  {spot.name}
                                </h4>
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/[0.05] text-amber-300 font-telemetry">
                                    {spot.category || 'Heritage'}
                                  </span>
                                  {spot.physicalDifficulty === 'EASY' && (
                                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-400/20 font-telemetry flex items-center gap-1">
                                      <Accessibility className="w-3 h-3" aria-hidden="true" />
                                      <span>Gentle Walking</span>
                                    </span>
                                  )}
                                </div>
                              </div>
                              <p className="text-xs text-slate-400 line-clamp-2 mt-1 leading-relaxed">
                                {spot.description}
                              </p>
                            </div>

                            {/* Ground Reality Badges */}
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-white/5 text-[10px] text-slate-300 font-telemetry">
                              <div>
                                <span className="text-slate-500 block">Timings</span>
                                <span className="truncate block font-medium">{spot.timings || 'Daytime Access'}</span>
                              </div>
                              <div>
                                <span className="text-slate-500 block">Ticket / Entry Fee</span>
                                <span className="text-emerald-400 block font-semibold truncate">{spot.feesDescription || 'Free Access'}</span>
                              </div>
                              <div>
                                <span className="text-slate-500 block">Elevation</span>
                                <span>{spot.elevation || 'Normal Ground'}</span>
                              </div>
                              <div>
                                <span className="text-slate-500 block">Mobile Coverage</span>
                                <span className="text-emerald-400 block truncate">{cellCoverage ? 'Verified' : 'Active 4G'}</span>
                              </div>
                            </div>

                            {/* Authentic Culinary & Craft Highlights */}
                            {(authenticFood || authenticCraft) && (
                              <div className="p-2.5 rounded-xl bg-amber-500/5 border border-amber-500/15 flex items-start gap-2 text-[11px] text-amber-200/90 leading-tight">
                                <Utensils className="w-3.5 h-3.5 text-amber-400 flex-shrink-0 mt-0.5" />
                                <div>
                                  <span className="font-semibold text-amber-300">Authentic Food & GI Purchases: </span>
                                  <span>{authenticFood || authenticCraft}</span>
                                </div>
                              </div>
                            )}

                            {/* Honest Scam Alert & Traveler Tips */}
                            {(scamAlert || rulesHazards) && (
                              <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/10 flex items-start gap-2 text-[11px] text-slate-300 leading-tight">
                                <AlertTriangle className="w-3.5 h-3.5 text-amber-400 flex-shrink-0 mt-0.5" />
                                <div>
                                  <span className="font-semibold text-amber-300">Ground Reality Advisory: </span>
                                  <span>{scamAlert || rulesHazards}</span>
                                </div>
                              </div>
                            )}

                            {/* Action Bar */}
                            <div className="flex items-center justify-between gap-3 pt-2 flex-wrap">
                              {spot.googleMapsUri ? (
                                <a
                                  href={spot.googleMapsUri}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1.5 text-[11px] text-amber-400 hover:text-amber-300 transition-colors font-medium"
                                >
                                  <Navigation className="w-3.5 h-3.5" />
                                  <span>Open in Google Maps</span>
                                  <ExternalLink className="w-3 h-3" />
                                </a>
                              ) : <div />}

                              <button
                                type="button"
                                onClick={() => onSelectPlaceForTrip(spot, activeDistrictModal.name)}
                                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 font-sans-clean cursor-pointer active:scale-[0.98] ${
                                  selected
                                    ? 'bg-emerald-500/20 border border-emerald-400/40 text-emerald-300'
                                    : 'bg-amber-400 text-slate-950 hover:bg-amber-300'
                                }`}
                              >
                                {selected ? (
                                  <>
                                    <Check className="w-3.5 h-3.5" />
                                    <span>In Tour Plan</span>
                                  </>
                                ) : (
                                  <>
                                    <Plus className="w-3.5 h-3.5" />
                                    <span>Add to My Tour Plan</span>
                                  </>
                                )}
                              </button>
                            </div>

                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>

              {/* Modal Footer with Honest Attribution */}
              <div className="p-4 border-t border-white/10 bg-white/[0.02] flex items-center justify-between text-xs text-slate-400 font-sans-clean flex-shrink-0">
                <span>Verified Regional District Travel Guide • Ground Timings & Rates</span>
                <button
                  type="button"
                  onClick={() => setActiveDistrictModal(null)}
                  className="px-4 py-1.5 rounded-lg bg-white/[0.05] hover:bg-white/[0.1] text-white transition-colors"
                >
                  Close Guide
                </button>
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </section>
  );
}
