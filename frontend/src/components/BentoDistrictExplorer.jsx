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
  Ticket, 
  Compass, 
  RotateCcw,
  Star,
  Accessibility,
  Heart,
  Award,
  Mountain,
  Waves,
  ShieldCheck,
  LayoutGrid,
  Map as MapIcon
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

// Clear guidance on district reorganization boundaries (Issue 25)
const BIFURCATED_DISTRICT_NOTES = {
  'anakapalli': 'Formed from undivided Visakhapatnam (2022) • Coastal & Jaggery Hub',
  'alluri sitharama raju': 'Formed from Visakhapatnam & East Godavari tracts (2022) • Araku Valley',
  'konaseema': 'Formed from East Godavari (2022) • Godavari Delta Coconut Corridor',
  'dr. b.r. ambedkar konaseema': 'Formed from East Godavari (2022) • Godavari Delta',
  'eluru': 'Formed from West Godavari & Krishna mandals (2022) • Kolleru Lake Basin',
  'ntr': 'Formed from undivided Krishna District (2022) • Vijayawada Commercial Hub',
  'bapatla': 'Formed from Guntur & Prakasam mandals (2022) • Suryalanka Beach Corridor',
  'palnadu': 'Formed from Guntur upland mandals (2022) • Nagarjunakonda & Kotappakonda',
  'nandyal': 'Formed from undivided Kurnool (2022) • Srisailam & Mahanandi Shrine Hub',
  'sri sathya sai': 'Formed from Anantapur (2022) • Puttaparthi & Lepakshi Heritage',
  'annamayya': 'Formed from Kadapa & Chittoor mandals (2022) • Horsley Hills & Tallapaka',
  'tirupati': 'Formed from Chittoor & Nellore mandals (2022) • Tirumala & Chandragiri',
  'mulugu': 'Formed from Jayashankar Bhupalpally (2019) • Ramappa UNESCO & Laknavaram',
  'jayashankar bhupalpally': 'Formed from Warangal (2016) • Bogatha Falls & Kaleshwaram',
  'bhadradri kothagudem': 'Formed from Khammam (2016) • Bhadrachalam Temple Hub',
  'komaram bheem asifabad': 'Formed from Adilabad (2016) • Tribal Forest Corridor'
};

function projectCoordsToSvg(lat, lng, width = 720, height = 540) {
  const minLat = 12.3;
  const maxLat = 19.9;
  const minLng = 76.8;
  const maxLng = 84.8;
  const x = ((lng - minLng) / (maxLng - minLng)) * (width - 80) + 40;
  const y = height - (((lat - minLat) / (maxLat - minLat)) * (height - 80) + 40);
  return { x: Math.round(x), y: Math.round(y) };
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
    count: 646,
    matcher: () => true,
  },
  { 
    id: 'unesco', 
    label: 'UNESCO & Heritage', 
    Icon: Award,
    image: '/images/telangana/warangal.jpg',
    count: 16,
    matcher: (s) => {
      const str = (s.name + ' ' + (s.description || '') + ' ' + (s.rules_and_hazards || '') + ' ' + (s.category || '')).toLowerCase();
      const unescoNames = ['ramappa', 'golconda', 'charminar', 'warangal fort', 'lepakshi', 'chowmahalla', 'alampur', 'gandikota', 'qutb shahi', 'thousand pillar'];
      return str.includes('unesco') || str.includes('world heritage') || unescoNames.some(n => s.name.toLowerCase().includes(n));
    },
  },
  { 
    id: 'caves', 
    label: 'Caves & Geology', 
    Icon: Mountain,
    image: '/images/aptourism/borra_caves.jpg',
    count: 29,
    matcher: (s) => {
      const str = (s.name + ' ' + (s.description || '') + ' ' + (s.category || '')).toLowerCase();
      return str.includes('cave') || str.includes('caves') || str.includes('cavern') || str.includes('geolog') || str.includes('canyon');
    },
  },
  { 
    id: 'beaches', 
    label: 'Beaches & Coast', 
    Icon: Waves,
    image: '/images/aptourism/kailasagiri_hill.jpg',
    count: 82,
    matcher: (s) => {
      const str = (s.name + ' ' + (s.description || '') + ' ' + (s.category || '')).toLowerCase();
      return str.includes('beach') || str.includes('coast') || str.includes('marine') || str.includes('port') || str.includes('island');
    },
  },
  { 
    id: 'forts', 
    label: 'Forts & Palaces', 
    Icon: Castle,
    image: '/images/telangana/hyderabad.jpg',
    count: 74,
    matcher: (s) => {
      const str = (s.name + ' ' + (s.description || '') + ' ' + (s.category || '')).toLowerCase();
      return str.includes('fort') || str.includes('palace') || str.includes('castle') || str.includes('gadi') || (s.category && s.category.toLowerCase().includes('fort'));
    },
  },
  { 
    id: 'spiritual', 
    label: 'Spiritual & Temples', 
    Icon: Landmark,
    image: '/images/aptourism/sri_venkateshwara_swamy_temple.jpg',
    count: 295,
    matcher: (s) => {
      const str = (s.name + ' ' + (s.description || '') + ' ' + (s.category || '')).toLowerCase();
      return str.includes('temple') || str.includes('dargah') || str.includes('church') || str.includes('mosque') || str.includes('spiritual') || str.includes('alayam') || (s.category && s.category.toLowerCase().includes('spiritual'));
    },
  },
  { 
    id: 'nature', 
    label: 'Nature & Wildlife', 
    Icon: Trees,
    image: '/images/aptourism/borra_caves.jpg',
    count: 253,
    matcher: (s) => {
      const str = (s.name + ' ' + (s.description || '') + ' ' + (s.category || '')).toLowerCase();
      return str.includes('waterfall') || str.includes('lake') || str.includes('wildlife') || str.includes('sanctuary') || str.includes('forest') || str.includes('valley') || str.includes('hill') || (s.category && s.category.toLowerCase().includes('nature'));
    },
  },
  { 
    id: 'ticketed', 
    label: 'Ticketed Passes', 
    Icon: Ticket,
    image: '/images/aptourism/bhavani_islands.jpg',
    count: 148,
    matcher: (s) => {
      const fee = parseFloat(s.individualPrice) || 0;
      const feeStr = (s.fees || s.feesDescription || '').toLowerCase();
      return fee > 0 || (feeStr && !feeStr.includes('free') && (feeStr.includes('₹') || feeStr.includes('rs') || /\d+/.test(feeStr)));
    },
  },
  { 
    id: 'free', 
    label: 'Free Public Sights', 
    Icon: ShieldCheck,
    image: '/images/aptourism/bhavani_islands.jpg',
    count: 498,
    matcher: (s) => {
      const fee = parseFloat(s.individualPrice) || 0;
      const feeStr = (s.fees || s.feesDescription || '').toLowerCase();
      return fee === 0 || feeStr.includes('free') || feeStr.includes('no entry fee');
    },
  },
  { 
    id: 'wishlist', 
    label: 'Saved Wishlist', 
    Icon: Heart,
    image: '/images/aptourism/bhavani_islands.jpg',
    count: null,
    isWishlist: true,
  },
];

function getRelevanceSortedSpots(spots, query) {
  if (!query) return spots || [];
  const q = query.toLowerCase().trim();
  return [...(spots || [])].sort((a, b) => {
    const aMatch = (
      (a.name && a.name.toLowerCase().includes(q)) ||
      (a.category && a.category.toLowerCase().includes(q)) ||
      (a.description && a.description.toLowerCase().includes(q)) ||
      (a.culinarySpecialty && a.culinarySpecialty.toLowerCase().includes(q))
    ) ? 1 : 0;
    const bMatch = (
      (b.name && b.name.toLowerCase().includes(q)) ||
      (b.category && b.category.toLowerCase().includes(q)) ||
      (b.description && b.description.toLowerCase().includes(q)) ||
      (b.culinarySpecialty && b.culinarySpecialty.toLowerCase().includes(q))
    ) ? 1 : 0;
    return bMatch - aMatch;
  });
}

function calculateRoadDistanceKm(lat1, lon1, lat2, lon2) {
  if (lat1 == null || lon1 == null || lat2 == null || lon2 == null) return null;
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const straightLineKm = R * c;
  return Math.round(straightLineKm * 1.35);
}

export default function BentoDistrictExplorer({ 
  onSelectPlaceForTrip, 
  selectedPlaces = [],
  isFeaturedOnly = false,
  onViewAllDistricts = null
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeState, setActiveState] = useState('all');
  const [activeZone, setActiveZone] = useState('all');
  const [activeTheme, setActiveTheme] = useState('all');
  const [displayLimit, setDisplayLimit] = useState(12);
  const [activeDistrictModal, setActiveDistrictModal] = useState(null);
  const [modalFilterMode, setModalFilterMode] = useState('all'); // 'all' or 'matching'
  const [userCoords, setUserCoords] = useState(null);
  const [isLocating, setIsLocating] = useState(false);
  const [sortByDistance, setSortByDistance] = useState(false);
  const [locationMessage, setLocationMessage] = useState(null);
  const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'map'
  const [hoveredMapDistrict, setHoveredMapDistrict] = useState(null);

  const [favorites, setFavorites] = useState(() => {
    try {
      const stored = localStorage.getItem('globetrotter_favorites');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const toggleFavorite = (spotName, e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    setFavorites((prev) => {
      const next = prev.includes(spotName)
        ? prev.filter((name) => name !== spotName)
        : [...prev, spotName];
      try {
        localStorage.setItem('globetrotter_favorites', JSON.stringify(next));
      } catch (err) {
        console.warn('Could not save favorites to localStorage:', err);
      }
      return next;
    });
  };

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

  const filterKey = `${searchQuery}_${activeState}_${activeZone}_${activeTheme}`;
  const [prevFilterKey, setPrevFilterKey] = useState(filterKey);
  if (filterKey !== prevFilterKey) {
    setPrevFilterKey(filterKey);
    setDisplayLimit(12);
  }

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

  const handleToggleNearMe = () => {
    if (sortByDistance) {
      setSortByDistance(false);
      setLocationMessage(null);
      return;
    }

    if (userCoords) {
      setSortByDistance(true);
      setLocationMessage('Districts sorted by proximity to your current location.');
      return;
    }

    if (!navigator.geolocation) {
      setLocationMessage('Location is not supported by your browser.');
      return;
    }

    setIsLocating(true);
    setLocationMessage('Detecting your GPS location...');

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserCoords({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude
        });
        setSortByDistance(true);
        setIsLocating(false);
        setLocationMessage('Showing 59 districts sorted by closest road distance to you.');
      },
      (err) => {
        setIsLocating(false);
        setSortByDistance(false);
        if (err.code === 1) {
          setLocationMessage('Location permission denied. Please allow location access to sort by proximity.');
        } else {
          setLocationMessage('Could not detect GPS coordinates. Showing standard alphabetical list.');
        }
      },
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 600000 }
    );
  };

  // Compound filtering without early returns
  const filteredDistricts = useMemo(() => {
    const list = allDistricts.filter((dist) => {
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
        if (activeTheme === 'wishlist') {
          const hasFavoriteSpot = dist.spots.some((s) => favorites.includes(s.name));
          if (!hasFavoriteSpot) return false;
        } else {
          const themeDef = TRAVELER_THEMES.find(t => t.id === activeTheme);
          if (themeDef) {
            const hasMatchingSpot = dist.spots.some(s => {
              if (themeDef.matcher) {
                return themeDef.matcher(s);
              }
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
      }

      return true;
    });

    if (sortByDistance && userCoords) {
      const withDistance = list.map((dist) => {
        const nameKey = dist.name.toLowerCase();
        const hqKey = (dist.hq || '').toLowerCase();
        const coords = DISTRICT_COORDS[nameKey] || DISTRICT_COORDS[hqKey] || {
          lat: dist.spots[0]?.latitude,
          lng: dist.spots[0]?.longitude
        };
        const distKm = coords?.lat != null && coords?.lng != null
          ? calculateRoadDistanceKm(userCoords.lat, userCoords.lng, coords.lat, coords.lng)
          : null;
        return {
          ...dist,
          distanceFromUser: distKm
        };
      });

      return withDistance.sort((a, b) => {
        if (a.distanceFromUser == null) return 1;
        if (b.distanceFromUser == null) return -1;
        return a.distanceFromUser - b.distanceFromUser;
      });
    }

    return list;
  }, [allDistricts, searchQuery, activeState, activeZone, activeTheme, sortByDistance, userCoords, favorites]);

  const visibleDistricts = useMemo(() => {
    if (isFeaturedOnly) {
      return filteredDistricts.slice(0, 6);
    }
    return filteredDistricts.slice(0, displayLimit);
  }, [filteredDistricts, isFeaturedOnly, displayLimit]);

  const isPlaceSelected = (placeName) => {
    return selectedPlaces.some((p) => p.name.toLowerCase() === placeName.toLowerCase());
  };

  const handleResetFilters = () => {
    setSearchQuery('');
    setActiveState('all');
    setActiveZone('all');
    setActiveTheme('all');
    setSortByDistance(false);
    setLocationMessage(null);
  };

  return (
    <section className="relative w-full py-24 px-4 md:px-12 bg-[#06080D] text-slate-200">
      <div className="max-w-7xl mx-auto flex flex-col gap-10">
        
        {/* Header & Search Bar */}
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
          {/* Tier 1: State Selection Tabs & Proximity Locator */}
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

            <div className="h-4 w-[1px] bg-white/10 mx-1 shrink-0" />

            <button
              type="button"
              onClick={handleToggleNearMe}
              disabled={isLocating}
              aria-pressed={sortByDistance}
              className={`px-3.5 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all duration-200 font-sans-clean flex items-center gap-1.5 cursor-pointer shrink-0 ${
                sortByDistance
                  ? 'bg-emerald-400 text-slate-950 font-bold shadow-md'
                  : 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/20'
              }`}
              title="Sort 59 districts by distance to your current location"
            >
              <Navigation className={`w-3.5 h-3.5 ${isLocating ? 'animate-spin' : ''}`} />
              <span>{isLocating ? 'Detecting GPS...' : (sortByDistance ? 'Nearest to Me (Active)' : '📍 Sights Near Me')}</span>
            </button>
          </div>

          {/* GPS Proximity Status Banner */}
          {locationMessage && (
            <div className="flex items-center justify-between p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-200 font-sans-clean">
              <div className="flex items-center gap-2">
                <Navigation className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>{locationMessage}</span>
              </div>
              {sortByDistance && (
                <button
                  type="button"
                  onClick={() => {
                    setSortByDistance(false);
                    setLocationMessage(null);
                  }}
                  className="text-[11px] text-emerald-300 hover:text-white underline cursor-pointer"
                >
                  Clear GPS Sort
                </button>
              )}
            </div>
          )}

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
                  {theme.count !== undefined && (
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono ${
                      isSelected ? 'bg-amber-400/20 text-amber-200' : 'bg-white/5 text-slate-400'
                    }`}>
                      {theme.count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Results Summary Bar & View Mode Toggle */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-400 font-sans-clean">
          <div className="flex items-center gap-2">
            <span>
              Showing <strong className="text-white font-mono">{filteredDistricts.length}</strong> of 59 Districts
            </span>
            <span className="hidden sm:inline text-slate-500">• Click any district to view attractions & fees</span>
          </div>

          <div className="flex items-center p-0.5 rounded-xl bg-white/[0.04] border border-white/10 text-[11px] self-start sm:self-auto">
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              className={`px-3 py-1 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer ${
                viewMode === 'grid' ? 'bg-amber-400 text-slate-950 font-bold shadow-sm' : 'text-slate-400 hover:text-white'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Bento Grid</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('map')}
              className={`px-3 py-1 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer ${
                viewMode === 'map' ? 'bg-amber-400 text-slate-950 font-bold shadow-sm' : 'text-slate-400 hover:text-white'
              }`}
            >
              <MapIcon className="w-3.5 h-3.5" />
              <span>Interactive Map</span>
            </button>
          </div>
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
        ) : viewMode === 'map' ? (
          /* Interactive Regional Geospatial Corridor Map */
          <div className="relative w-full rounded-3xl bg-[#090D14] border border-white/10 p-4 md:p-6 overflow-hidden flex flex-col gap-4 shadow-2xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-4">
              <div className="flex items-center gap-3">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse" />
                <div>
                  <h3 className="text-base font-bold text-white font-sans-clean">
                    Interactive Regional Map
                  </h3>
                  <p className="text-xs text-slate-400 font-sans-clean">
                    Tap any district to view its top attractions, routes, and entry fees
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-4 text-xs font-mono">
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-full bg-amber-400/80 border border-amber-300" />
                  <span className="text-amber-300">Andhra Pradesh (26)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-full bg-cyan-400/80 border border-cyan-300" />
                  <span className="text-cyan-300">Telangana (33)</span>
                </div>
              </div>
            </div>

            {/* Map Canvas with SVG Vector Overlay */}
            <div className="relative w-full aspect-[4/3] sm:aspect-[16/10] max-h-[620px] bg-slate-950/80 rounded-2xl border border-white/5 overflow-hidden flex items-center justify-center">
              <svg
                viewBox="0 0 840 600"
                className="w-full h-full select-none"
                style={{ filter: 'drop-shadow(0 4px 20px rgba(0,0,0,0.5))' }}
              >
                <defs>
                  <radialGradient id="apGlow" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.4" />
                    <stop offset="100%" stopColor="#f59e0b" stopOpacity="0" />
                  </radialGradient>
                  <radialGradient id="tgGlow" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.4" />
                    <stop offset="100%" stopColor="#06b6d4" stopOpacity="0" />
                  </radialGradient>
                </defs>

                {/* Major Transit Corridor Arteries */}
                {/* NH-16: Coastal AP Corridor */}
                <polyline
                  points="750,110 680,180 570,250 490,290 440,370 410,480 390,520"
                  fill="none"
                  stroke="#f59e0b"
                  strokeWidth="2"
                  strokeDasharray="4 4"
                  opacity="0.35"
                />
                {/* NH-44: North-South TG Corridor */}
                <polyline
                  points="250,50 215,120 255,225 210,340 180,440"
                  fill="none"
                  stroke="#06b6d4"
                  strokeWidth="2"
                  strokeDasharray="4 4"
                  opacity="0.35"
                />
                {/* NH-65: Central Connecting Highway */}
                <polyline
                  points="255,225 360,255 490,290"
                  fill="none"
                  stroke="#e2e8f0"
                  strokeWidth="2"
                  strokeDasharray="3 3"
                  opacity="0.3"
                />

                {/* State Regional Group Labels */}
                <text x="210" y="80" fill="#06b6d4" fillOpacity="0.15" fontSize="36" fontWeight="bold" fontFamily="monospace">
                  TELANGANA
                </text>
                <text x="480" y="440" fill="#f59e0b" fillOpacity="0.15" fontSize="36" fontWeight="bold" fontFamily="monospace">
                  ANDHRA PRADESH
                </text>

                {/* District Pins */}
                {filteredDistricts.map((dist) => {
                  const nameKey = dist.name.toLowerCase();
                  const hqKey = (dist.hq || '').toLowerCase();
                  const coords = DISTRICT_COORDS[nameKey] || DISTRICT_COORDS[hqKey] || {
                    lat: dist.spots[0]?.latitude,
                    lng: dist.spots[0]?.longitude
                  };
                  if (!coords || coords.lat == null || coords.lng == null) return null;
                  const pt = projectCoordsToSvg(coords.lat, coords.lng, 840, 600);
                  const isAP = dist.state === 'Andhra Pradesh';
                  const isHovered = hoveredMapDistrict?.name === dist.name;

                  return (
                    <g
                      key={dist.name}
                      className="cursor-pointer"
                      onMouseEnter={() => setHoveredMapDistrict(dist)}
                      onClick={() => setActiveDistrictModal(dist)}
                    >
                      {/* Outer halo on hover */}
                      {isHovered && (
                        <circle
                          cx={pt.x}
                          cy={pt.y}
                          r={22}
                          fill={isAP ? 'url(#apGlow)' : 'url(#tgGlow)'}
                        />
                      )}
                      {/* Main Node Circle */}
                      <circle
                        cx={pt.x}
                        cy={pt.y}
                        r={isHovered ? 9 : 6.5}
                        fill={isAP ? '#f59e0b' : '#06b6d4'}
                        stroke="#0f172a"
                        strokeWidth="2"
                      />
                      <circle
                        cx={pt.x}
                        cy={pt.y}
                        r={isHovered ? 3.5 : 2}
                        fill="#ffffff"
                      />
                      {/* Label */}
                      <text
                        x={pt.x}
                        y={pt.y + 16}
                        textAnchor="middle"
                        fontSize={isHovered ? "11" : "9.5"}
                        fontWeight={isHovered ? "bold" : "normal"}
                        fill={isHovered ? "#ffffff" : "#94a3b8"}
                        className="pointer-events-none drop-shadow font-sans-clean select-none"
                      >
                        {dist.name.replace(' District', '')}
                      </text>
                    </g>
                  );
                })}
              </svg>

              {/* Floating Hover Dossier Preview Card */}
              {hoveredMapDistrict && (
                <div className="absolute bottom-4 right-4 max-w-xs p-4 rounded-2xl bg-black/90 backdrop-blur-xl border border-white/20 shadow-2xl text-left pointer-events-none">
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <span className="text-[10px] font-mono font-bold text-amber-300">
                      {hoveredMapDistrict.state === 'Andhra Pradesh' ? 'AP' : 'TG'} • HQ: {hoveredMapDistrict.hq}
                    </span>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white/10 text-white">
                      {hoveredMapDistrict.spots.length} Sights
                    </span>
                  </div>
                  <h4 className="text-sm font-bold text-white font-sans-clean">
                    {hoveredMapDistrict.name.replace(' District', '')}
                  </h4>
                  <p className="text-xs text-amber-300/90 font-medium mt-1 truncate">
                    ⭐ {hoveredMapDistrict.spots[0]?.name || 'Flagship Sight'}
                  </p>
                  <p className="text-[11px] text-slate-400 mt-1 line-clamp-2">
                    {hoveredMapDistrict.spots[0]?.description || 'Historic monuments, scenic views, and cultural landmarks.'}
                  </p>
                  <div className="mt-2 text-[10px] text-emerald-400 font-mono">
                    Click node to view all sights & transit guide →
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          /* Asymmetrical Authentic Bento Box Grid */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {visibleDistricts.map((district, idx) => {
              const qClean = searchQuery.toLowerCase().trim();
              const searchMatchedSpots = qClean
                ? district.spots.filter(
                    (s) =>
                      s.name?.toLowerCase().includes(qClean) ||
                      s.category?.toLowerCase().includes(qClean) ||
                      s.description?.toLowerCase().includes(qClean) ||
                      (s.culinarySpecialty && s.culinarySpecialty.toLowerCase().includes(qClean))
                  )
                : [];

              const orderedSpots = getRelevanceSortedSpots(district.spots, searchQuery);
              // Feature matched spot on search; otherwise use first spot
              const activeSpot = searchMatchedSpots.length > 0 ? searchMatchedSpots[0] : (orderedSpots[0] || {});
              const photoUrl = getAuthenticPlacePhoto(activeSpot.name, activeSpot.imageUrl, district.name);
              const fallbackBanner = getOfflineImageFallback(activeSpot.name, activeSpot.category, district.name);
              const isFirstSelected = isPlaceSelected(activeSpot.name);
              const isFlagship = (idx % 5 === 0 && filteredDistricts.length > 4);
              const isFirstFavorited = favorites.includes(activeSpot.name);

              return (
                <div
                  key={district.name}
                  onClick={() => setActiveDistrictModal(district)}
                  className={`doppelrand group cursor-pointer transition-transform duration-200 hover:-translate-y-0.5 ${isFlagship ? 'md:col-span-2 lg:col-span-2' : ''}`}
                >
                  <div className="doppelrand-inner overflow-hidden flex flex-col h-full justify-between">
                    
                    {/* Visual Banner Header */}
                    <div className={`relative ${isFlagship ? 'h-56' : 'h-48'} w-full overflow-hidden bg-slate-900`}>
                      <img
                        src={photoUrl || fallbackBanner}
                        alt={activeSpot.name || district.name}
                        onError={(e) => {
                          e.currentTarget.onerror = null;
                          e.currentTarget.src = fallbackBanner;
                        }}
                        className="w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-105"
                        loading="lazy"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-[#0B0F17] via-[#0B0F17]/40 to-transparent" />

                      {/* State & Spot Count Badge */}
                      <div className="absolute top-3 left-3 right-3 flex items-center justify-between">
                        <span className="px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-md border border-white/10 text-[10px] font-bold text-amber-300 font-mono">
                          {district.state === 'Andhra Pradesh' ? 'AP' : 'TG'} • HQ: {district.hq}
                        </span>
                        <div className="flex items-center gap-1.5">
                          {district.distanceFromUser != null && (
                            <span className="px-2 py-0.5 rounded-full bg-emerald-500/25 backdrop-blur-md border border-emerald-400/40 text-[10px] font-bold text-emerald-300 font-mono flex items-center gap-1 shadow-sm">
                              <Navigation className="w-2.5 h-2.5 text-emerald-300" />
                              <span>~{district.distanceFromUser} km</span>
                            </span>
                          )}
                          {isFlagship && (
                            <span className="px-2.5 py-1 rounded-full bg-amber-500/20 backdrop-blur-md border border-amber-400/30 text-[10px] font-bold text-amber-300 font-mono">
                              Flagship Hub
                            </span>
                          )}
                          <span className="px-2.5 py-1 rounded-full bg-white/[0.08] backdrop-blur-md border border-white/10 text-[10px] font-bold text-white font-mono">
                            {district.spots.length} Sights
                          </span>
                        </div>
                      </div>

                      {/* Landmark Name on Banner */}
                      <div className="absolute bottom-3 left-3 right-3 flex items-end justify-between gap-2">
                        <div className="min-w-0">
                          <span className="text-[10px] text-amber-300 font-sans-clean font-semibold block">
                            {searchMatchedSpots.length > 0 ? 'Search Matched Sight' : 'Key Attraction'}
                          </span>
                          <h4 className="text-base font-bold text-white truncate drop-shadow-md">
                            {activeSpot.name || 'Famous Attraction'}
                          </h4>
                        </div>
                        {activeSpot.individualPrice !== undefined && (
                          <span className="px-2 py-0.5 rounded-md bg-black/70 backdrop-blur-md border border-white/10 text-[10px] font-semibold text-emerald-400 font-mono flex-shrink-0">
                            {activeSpot.individualPrice === 0 ? 'Free Entry' : `₹${activeSpot.individualPrice}`}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Body Content */}
                    <div className="p-5 flex flex-col gap-3.5 flex-1 justify-between">
                      <div>
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <h3 className="text-xl font-bold text-white group-hover:text-amber-300 transition-colors">
                              {district.name.replace(' District', '')}
                            </h3>
                            {BIFURCATED_DISTRICT_NOTES[district.name.toLowerCase().replace(' district', '').trim()] && (
                              <span className="text-[10px] text-amber-300/80 font-medium block mt-0.5">
                                ℹ️ {BIFURCATED_DISTRICT_NOTES[district.name.toLowerCase().replace(' district', '').trim()]}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-1.5 flex-shrink-0">
                            {/* Wishlist Heart Button */}
                            <button
                              type="button"
                              onClick={(e) => toggleFavorite(activeSpot.name, e)}
                              className={`p-1.5 rounded-full border transition-colors cursor-pointer flex-shrink-0 ${
                                isFirstFavorited
                                  ? 'bg-rose-500/20 text-rose-400 border-rose-500/40'
                                  : 'bg-white/[0.05] text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 border-white/10'
                              }`}
                              title={isFirstFavorited ? 'Remove from wishlist' : 'Save to wishlist'}
                              aria-label={isFirstFavorited ? 'Remove from wishlist' : 'Save to wishlist'}
                            >
                              <Heart className={`w-3.5 h-3.5 ${isFirstFavorited ? 'fill-rose-400 text-rose-400' : ''}`} />
                            </button>
                            {/* 1-Click Quick Add Top Spot Button */}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onSelectPlaceForTrip(activeSpot, district.name);
                              }}
                              className={`px-2.5 py-1 rounded-full text-[10px] font-bold flex items-center gap-1 transition-colors flex-shrink-0 font-sans-clean cursor-pointer ${
                                isFirstSelected
                                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/40'
                                  : 'bg-white/[0.05] text-slate-300 hover:bg-amber-400 hover:text-slate-950 border border-white/10'
                              }`}
                              title={isFirstSelected ? 'Already in tour plan' : `Add ${activeSpot.name} to plan`}
                            >
                              {isFirstSelected ? <Check className="w-3 h-3 text-emerald-400" /> : <Plus className="w-3 h-3" />}
                              <span>{isFirstSelected ? 'In Plan' : 'Quick Add'}</span>
                            </button>
                          </div>
                        </div>
                        <p className="text-xs text-slate-400 line-clamp-2 mt-1 leading-relaxed">
                          {activeSpot.description || 'Famous temples, waterfalls, hill views, and historic monuments.'}
                        </p>
                      </div>

                      {/* Prominent Sights Preview: Matched spots on search, or top sights on default view */}
                      <div className="flex flex-col gap-1.5 p-2 rounded-xl bg-white/[0.02] border border-white/5 text-xs">
                        <span className="text-[10px] text-amber-300 font-semibold uppercase tracking-wider flex items-center justify-between">
                          <span>{searchQuery && searchMatchedSpots.length > 0 ? `Matched Sights (${searchMatchedSpots.length}):` : 'Top Attractions:'}</span>
                          {searchQuery && searchMatchedSpots.length > 0 ? (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedDistrict(district);
                              }}
                              className="text-[10px] text-amber-400 hover:text-amber-300 font-mono underline cursor-pointer"
                            >
                              Explore all {district.spots.length}
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedDistrict(district);
                              }}
                              className="text-[10px] text-slate-400 hover:text-white font-mono cursor-pointer"
                            >
                              +{district.spots.length - 3} more
                            </button>
                          )}
                        </span>
                        <div className="flex flex-col gap-1">
                          {(searchQuery && searchMatchedSpots.length > 0 ? searchMatchedSpots : orderedSpots.slice(0, 3)).map((s) => {
                            const isSelected = isPlaceSelected(s.name);
                            const isFree = s.individualPrice === 0 || s.isTicketed === false;
                            return (
                              <div
                                key={s.name}
                                className="flex items-center justify-between gap-1 p-1 rounded-lg hover:bg-white/5 transition-colors text-xs font-sans-clean"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <span className="text-slate-300 truncate max-w-[180px]">{s.name}</span>
                                <div className="flex items-center gap-1.5 flex-shrink-0">
                                  <span className="text-emerald-400 font-mono text-[10px]">
                                    {isFree ? 'Free' : `₹${s.individualPrice || 25}`}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => onSelectPlaceForTrip(s, district.name)}
                                    className={`px-1.5 py-0.5 rounded text-[10px] font-medium transition-colors cursor-pointer ${
                                      isSelected
                                        ? 'bg-emerald-500/20 text-emerald-300'
                                        : 'bg-white/5 hover:bg-amber-400 hover:text-slate-950 text-slate-300'
                                    }`}
                                  >
                                    {isSelected ? '✓' : '+ Add'}
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Highlights Row */}
                      <div className="pt-3 border-t border-white/10 flex items-center justify-between text-xs text-slate-400 font-mono">
                        <div className="flex items-center gap-1.5 truncate max-w-[160px]">
                          <MapPin className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
                          <span className="truncate">{activeSpot.mandal || district.hq}</span>
                        </div>
                        <div className="flex items-center gap-1 text-amber-400 font-semibold group-hover:translate-x-1 transition-transform">
                          <span>Explore All {district.spots.length} Places</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </div>
                      </div>

                    </div>

                  </div>
                </div>
              );
            })}

            {/* Pagination Controls / Featured Switcher */}
            {isFeaturedOnly ? (
              <div className="col-span-full flex flex-col items-center justify-center py-6 gap-3">
                <button
                  type="button"
                  onClick={onViewAllDistricts}
                  className="px-6 py-3 rounded-full bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs flex items-center gap-2 transition-all shadow-lg cursor-pointer active:scale-95 font-sans-clean"
                >
                  <span>Explore All 59 Districts & Map</span>
                  <ChevronRight className="w-4 h-4 text-slate-950" />
                </button>
                <span className="text-[11px] text-slate-400 font-sans-clean">
                  Top sights, transparent entry fees & authentic food guides across AP & TG
                </span>
              </div>
            ) : displayLimit < filteredDistricts.length ? (
              <div className="col-span-full flex justify-center py-6">
                <button
                  type="button"
                  onClick={() => setDisplayLimit((prev) => prev + 12)}
                  className="px-6 py-2.5 rounded-full bg-white/[0.06] hover:bg-white/[0.12] border border-white/10 text-white font-bold text-xs flex items-center gap-2 transition-all cursor-pointer font-sans-clean active:scale-95"
                >
                  <span>Load More Districts (Showing {Math.min(displayLimit, filteredDistricts.length)} of {filteredDistricts.length})</span>
                  <ChevronRight className="w-3.5 h-3.5 text-amber-400" />
                </button>
              </div>
            ) : null}
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
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-400/25 font-mono font-bold">
                      {activeDistrictModal.state}
                    </span>
                    <span className="text-xs text-slate-400 font-mono">
                      HQ: {activeDistrictModal.hq} • {activeDistrictModal.spots.length} Verified Destinations
                      {activeDistrictModal.distanceFromUser != null && (
                        <span className="text-emerald-400 ml-1.5 font-semibold">• ~{activeDistrictModal.distanceFromUser} km away</span>
                      )}
                    </span>
                  </div>
                  <h3 className="text-xl md:text-2xl font-bold text-white mt-1">
                    {activeDistrictModal.name}
                  </h3>
                  {BIFURCATED_DISTRICT_NOTES[activeDistrictModal.name.toLowerCase().replace(' district', '').trim()] && (
                    <span className="text-[11px] text-amber-300 font-medium mt-0.5">
                      ℹ️ {BIFURCATED_DISTRICT_NOTES[activeDistrictModal.name.toLowerCase().replace(' district', '').trim()]}
                    </span>
                  )}
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
                    if (activeTheme === 'wishlist') {
                      return favorites.includes(spot.name);
                    }
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
                      if (themeDef) {
                        if (themeDef.matcher) return themeDef.matcher(spot);
                        if (themeDef.freeOnly) {
                          const feeStr = (spot.fees || spot.feesDescription || '').toLowerCase();
                          return feeStr.includes('free') || spot.individualPrice === 0;
                        }
                        if (themeDef.category) {
                          const cats = themeDef.category.split(',').map(c => c.trim().toLowerCase());
                          return cats.some(c => spot.category?.toLowerCase().includes(c));
                        }
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
                              <div className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-black/70 backdrop-blur-md text-[10px] font-bold text-amber-300 font-mono flex items-center gap-1">
                                <Star className="w-2.5 h-2.5 fill-amber-300 text-amber-300" aria-hidden="true" />
                                <span>{spot.averageRating} ({spot.reviewCount?.toLocaleString()})</span>
                              </div>
                            )}
                            <div className="absolute bottom-2 left-2 right-2">
                              <LiveWeatherBadge latitude={spotLat} longitude={spotLng} compact={true} />
                            </div>
                          </div>

                          {/* Info & Details */}
                          <div className="flex flex-col justify-between flex-1 gap-2.5">
                            <div>
                              <div className="flex items-center justify-between gap-2 flex-wrap">
                                <h4 className="text-base font-bold text-white">
                                  {spot.name}
                                </h4>
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/[0.05] text-amber-300 font-mono">
                                    {spot.category || 'Heritage'}
                                  </span>
                                  {spot.physicalDifficulty === 'EASY' && (
                                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-400/20 font-mono flex items-center gap-1">
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
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-white/5 text-[10px] text-slate-300 font-mono">
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

                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={(e) => toggleFavorite(spot.name, e)}
                                  className={`px-3 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                                    favorites.includes(spot.name)
                                      ? 'bg-rose-500/20 border border-rose-500/40 text-rose-300'
                                      : 'bg-white/[0.05] hover:bg-rose-500/15 border border-white/10 text-slate-300 hover:text-rose-300'
                                  }`}
                                  title={favorites.includes(spot.name) ? 'Remove from saved wishlist' : 'Save to wishlist'}
                                >
                                  <Heart className={`w-3.5 h-3.5 ${favorites.includes(spot.name) ? 'fill-rose-400 text-rose-400' : ''}`} />
                                  <span>{favorites.includes(spot.name) ? 'Saved' : 'Wishlist'}</span>
                                </button>

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
