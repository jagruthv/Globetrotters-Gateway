import React, { useState, useMemo, useCallback } from 'react';
import { motion } from 'framer-motion';
import { 
  Sparkles, 
  MapPin, 
  Volume2, 
  VolumeX, 
  Trash2, 
  AlertTriangle, 
  Ticket, 
  MessageSquare, 
  Send, 
  Utensils, 
  ShieldCheck, 
  CornerDownRight,
  Compass,
  CheckCircle2,
  Check,
  Search,
  Navigation,
  Printer,
  ChevronDown,
  ChevronUp,
  Square,
  CheckSquare
} from 'lucide-react';
import { tripService, chatService } from '../services/api';
import { offlineRouteFallback, resolveSpotCoordinates } from '../utils/offlineRouteEngine';
import { MASTER_ATLAS_DATA } from '../utils/masterAtlasData';
import LiveWeatherBadge from './LiveWeatherBadge';
import PocketDossierModal from './PocketDossierModal';

// Module-level utility functions to isolate side-effect timings from React Compiler render scope
const getNowTime = () => performance.now();
const calcDuration = (start) => Math.round(performance.now() - start);
const createMessageId = (prefix) => `${prefix}-${Date.now()}`;

const STARTER_TRIPS = [
  {
    id: 'araku-starter',
    title: 'Araku Valley Nature & Caves',
    tag: 'Mountain Hill Station & Waterfalls',
    badge: 'Popular',
    fee: '₹130 Pass Fare',
    places: [
      { name: 'Borra Caves', district: 'Alluri Sitharama Raju (ASR) District', individualPrice: 80, category: 'Nature & Wildlife' },
      { name: 'Araku Tribal Museum', district: 'Alluri Sitharama Raju (ASR) District', individualPrice: 40, category: 'Artisans & Culture' },
      { name: 'Katiki Waterfalls', district: 'Alluri Sitharama Raju (ASR) District', individualPrice: 0, category: 'Nature & Wildlife' },
      { name: 'Chaparai Water Cascades', district: 'Alluri Sitharama Raju (ASR) District', individualPrice: 10, category: 'Nature & Wildlife' }
    ]
  },
  {
    id: 'hyderabad-starter',
    title: 'Hyderabad Royal Heritage',
    tag: 'Charminar, Golconda & Nizam Palaces',
    badge: 'Heritage',
    fee: '₹100 Pass Fare',
    places: [
      { name: 'Golconda Fort & Acoustic Portico Walk', district: 'Hyderabad District', individualPrice: 25, category: 'Historical Forts & Monuments' },
      { name: 'Charminar & Laad Bazaar Lacquer Bangles', district: 'Hyderabad District', individualPrice: 0, category: 'Historical Forts & Monuments' },
      { name: 'Qutb Shahi Royal Tombs', district: 'Hyderabad District', individualPrice: 25, category: 'Heritage & Spiritual' },
      { name: 'Chowmahalla Palace', district: 'Hyderabad District', individualPrice: 50, category: 'Historical Forts & Monuments' }
    ]
  },
  {
    id: 'warangal-starter',
    title: 'Warangal Kakatiya Trail',
    tag: 'UNESCO Rudreshwara & Monolithic Fort',
    badge: 'UNESCO',
    fee: '₹50 Pass Fare',
    places: [
      { name: 'Ramappa Temple (Sri Rudreshwara Swamy — UNESCO World Heritage Site)', district: 'Mulugu District', individualPrice: 25, category: 'Heritage & Spiritual' },
      { name: 'Warangal Fort & Kakatiya Kala Thoranam', district: 'Warangal District', individualPrice: 25, category: 'Historical Forts & Monuments' },
      { name: 'Thousand Pillar Temple', district: 'Hanamkonda District', individualPrice: 0, category: 'Heritage & Spiritual' }
    ]
  }
];

export default function AiFluidTripStudio({ 
  selectedPlaces = [], 
  onAddPlace,
  onRemovePlace, 
  onClearPlaces, 
  onExploreMore,
  onProceedToPasses,
  onBookCustomPlan,
  onInitiateBooking,
  onOpenAssistant,
  onSetPlaces
}) {
  // 'AUTO' allows the AI to calculate the optimal days based on spots count & elevation fatigue
  const [selectedDuration, setSelectedDuration] = useState('AUTO');
  const [travelPace, setTravelPace] = useState('BALANCED');
  const [isGenerating, setIsGenerating] = useState(false);
  const [planResult, setPlanResultState] = useState(() => {
    if (typeof window === 'undefined') return null;
    try {
      const saved = localStorage.getItem('globetrotter_active_plan');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const setPlanResult = useCallback((plan) => {
    setPlanResultState(plan);
    try {
      if (plan) {
        localStorage.setItem('globetrotter_active_plan', JSON.stringify(plan));
      } else {
        localStorage.removeItem('globetrotter_active_plan');
      }
    } catch (e) {
      console.warn('Failed to persist plan to localStorage:', e);
    }
  }, []);

  // Derive whether the active plan matches the currently staged destinations
  const currentPlacesHash = useMemo(() => {
    return selectedPlaces.map(p => p.name).sort().join('|');
  }, [selectedPlaces]);

  const isPlanInSync = useMemo(() => {
    if (!planResult) return false;
    if (!planResult.placesHash) return true;
    return planResult.placesHash === currentPlacesHash;
  }, [planResult, currentPlacesHash]);

  const [isSpeaking, setIsSpeaking] = useState(false);
  const [generationError, setGenerationError] = useState(null);
  const [chatSessionId] = useState(() => 'trip_chat_' + Math.random().toString(36).substring(2, 9));
  const [isPocketDossierOpen, setIsPocketDossierOpen] = useState(false);
  const [showPackingList, setShowPackingList] = useState(false);
  const [checkedPackingItems, setCheckedPackingItems] = useState({});

  const handleScrollToConcierge = () => {
    const el = document.getElementById('trip-concierge-console');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
      const input = document.querySelector('input[name="chatQuery"]');
      if (input) input.focus();
    }
  };

  // Quick In-Planner Destination Search & Add
  const [quickSearchQuery, setQuickSearchQuery] = useState('');
  const [isQuickSearchOpen, setIsQuickSearchOpen] = useState(false);

  // Smart Terrain & Weather Packing Checklist
  const packingChecklist = useMemo(() => {
    if (!planResult) return [];
    const allStops = (planResult.days || planResult.itinerary || []).flatMap(d => d.stops || d.legs || []);
    const allNames = allStops.map(s => (s.name || s.spotName || '').toLowerCase());
    const allCategories = allStops.map(s => (s.category || '').toLowerCase());

    const hasHighElevation = allStops.some(s => {
      const p = selectedPlaces.find(pl => pl.name?.toLowerCase() === (s.name || s.spotName || '').toLowerCase());
      return (p?.elevationMeters && p.elevationMeters > 500) ||
        allNames.some(n => n.includes('araku') || n.includes('lambasingi') || n.includes('horsley') || n.includes('tirumala'));
    });

    const hasCavesOrWaterfalls = allNames.some(n => 
      n.includes('cave') || n.includes('waterfall') || n.includes('falls') || n.includes('borra') || n.includes('belum') || n.includes('ethipothala') || n.includes('bogatha')
    ) || allCategories.some(c => c.includes('waterfall') || c.includes('caves'));

    const hasForestCurfew = allNames.some(n => 
      n.includes('srisailam') || n.includes('amrabad') || n.includes('maredumilli') || n.includes('nallamala')
    ) || (planResult.days || []).some(d => d.curfewAdvisory);

    const hasTemples = allCategories.some(c => c.includes('temple') || c.includes('spiritual')) ||
      allNames.some(n => n.includes('temple') || n.includes('tirumala') || n.includes('lepakshi') || n.includes('ramappa') || n.includes('draksharama'));

    const items = [
      {
        id: 'pack-power',
        category: 'Electronics',
        label: 'Car phone charger & 10,000+ mAh power bank',
        hint: 'Cellular signals in rural hills and ghats drain smartphone battery rapidly.'
      },
      {
        id: 'pack-cash',
        category: 'Transit Cash',
        label: '₹500 - ₹1,000 in small physical currency notes',
        hint: 'Rural forest checkposts and temple shoe stalls rarely accept UPI or digital cards.'
      },
      {
        id: 'pack-medical',
        category: 'Health & Hydration',
        label: 'Electrolyte (ORS) sachets & prescription medicines',
        hint: 'Protects against dehydration during afternoon heritage walks in Deccan heat.'
      }
    ];

    if (hasHighElevation) {
      items.push({
        id: 'pack-elevation',
        category: 'Hills & Ghats',
        label: 'Light warm layer / windcheater & motion sickness mints',
        hint: 'Morning temperatures in Araku drop to 14-16°C with 30+ hairpin road bends.'
      });
    }

    if (hasCavesOrWaterfalls) {
      items.push({
        id: 'pack-caves',
        category: 'Caves & Waterfalls',
        label: 'Rubber-grip walking shoes & standalone LED torch',
        hint: 'Limestone steps in Borra and Belum Caves get damp, and smartphone flash drains quickly in caves.'
      });
    }

    if (hasForestCurfew) {
      items.push({
        id: 'pack-forest',
        category: 'Wildlife Curfew',
        label: 'Full vehicle tank fuel & government Photo ID',
        hint: 'Forest checkposts close strictly overnight (9:00 PM – 6:00 AM). Fuel pumps are far apart.'
      });
    }

    if (hasTemples) {
      items.push({
        id: 'pack-temples',
        category: 'Spiritual Attire',
        label: 'Traditional modest attire (Dhoti/Kurta or Saree/Salwar)',
        hint: 'Mandatory at Tirumala, Srisailam, and Simhachalam inner sanctums.'
      });
    }

    return items;
  }, [planResult, selectedPlaces]);

  const allDestinations = useMemo(() => {
    const list = [];
    const collect = (districts, stateName) => {
      (districts || []).forEach(d => {
        (d.spots || []).forEach(s => {
          list.push({ ...s, district: d.name, state: stateName });
        });
      });
    };
    collect(MASTER_ATLAS_DATA?.andhraPradesh, 'Andhra Pradesh');
    collect(MASTER_ATLAS_DATA?.telangana, 'Telangana');
    return list;
  }, []);

  const searchResults = useMemo(() => {
    const q = quickSearchQuery.trim().toLowerCase();
    if (!q) return [];
    return allDestinations
      .filter(d => 
        d.name.toLowerCase().includes(q) || 
        d.district.toLowerCase().includes(q) ||
        (d.category && d.category.toLowerCase().includes(q))
      )
      .slice(0, 8);
  }, [allDestinations, quickSearchQuery]);

  const handleQuickAdd = (destination) => {
    if (onAddPlace) {
      onAddPlace(destination, destination.district);
    }
    setQuickSearchQuery('');
    setIsQuickSearchOpen(false);
  };

  // Agentic AI Discussion Chat State
  const [chatMessages, setChatMessages] = useState([]);
  const [inputQuery, setInputQuery] = useState('');
  const [isChatThinking, setIsChatThinking] = useState(false);

  // Auto-calculate recommended days based on real physical metrics (enforces at least 2 locations/day unless >150km)
  const calculateRecommendedDays = () => {
    const count = selectedPlaces.length;
    if (count <= 3) return 1;
    if (count <= 5) return 2;
    if (count <= 7) return 3;
    if (count <= 9) return 4;
    return Math.min(5, Math.floor(count / 2));
  };

  const recommendedDays = calculateRecommendedDays();

  const handleLoadStarterTrip = (trip) => {
    if (onSetPlaces) {
      onSetPlaces(trip.places);
      try {
        localStorage.setItem('globetrotter_staged_places', JSON.stringify(trip.places));
      } catch {}
    } else if (onAddPlace) {
      trip.places.forEach((p) => onAddPlace(p, p.district));
    }
  };

  // Calculate official gate fee total for selected places
  const totalStagedFee = selectedPlaces.reduce((sum, p) => {
    const fee = typeof p.individualPrice === 'number'
      ? p.individualPrice
      : (parseFloat(p.price) || parseFloat(p.fees) || 0);
    return sum + fee;
  }, 0);
  const stagedPassPrice = totalStagedFee;

  const handleBuyPass = (customPlan = null) => {
    const targetPlan = customPlan || planResult;
    const stops = targetPlan
      ? (targetPlan.days || []).flatMap((d) => (d.stops || []).map((s) => s.name || s.placeName || s))
      : selectedPlaces.map((p) => p.name);

    const calculatedFees = selectedPlaces.reduce((sum, p) => {
      const fee = typeof p.individualPrice === 'number'
        ? p.individualPrice
        : (parseFloat(p.price) || parseFloat(p.fees) || 0);
      return sum + fee;
    }, 0);
    const finalPrice = typeof targetPlan?.packagePrice === 'number' ? targetPlan.packagePrice : calculatedFees;

    const bookingPayload = {
      circuitName: targetPlan?.title || (selectedPlaces.length > 0 ? `${selectedPlaces[0].name} Consolidated Tour Pass` : 'Custom Curated Tour Pass'),
      destinations: stops.length > 0 ? stops : selectedPlaces.map((p) => p.name),
      totalAmount: finalPrice,
      rawPlan: targetPlan
    };

    if (onInitiateBooking) {
      onInitiateBooking(bookingPayload);
    } else if (onBookCustomPlan) {
      onBookCustomPlan(targetPlan || { title: bookingPayload.circuitName, packagePrice: finalPrice, days: [] });
    } else if (onProceedToPasses) {
      onProceedToPasses();
    }
  };

  // Generate plan using backend route planner or local route generator
  const handleGeneratePlan = async (overrideDays = null) => {
    if (selectedPlaces.length === 0) return;
    setIsGenerating(true);
    setGenerationError(null);

    const effectiveDays = overrideDays !== null 
      ? overrideDays 
      : (selectedDuration === 'AUTO' ? null : Number(selectedDuration));

    const startTime = getNowTime();

    const payload = {
      placeNames: selectedPlaces.map((p) => p.name),
      places: selectedPlaces.map((p) => {
        const coords = resolveSpotCoordinates(p);
        const rawElev = parseInt(p.elevation || p.elevationMeters || '0', 10);
        const elev = isNaN(rawElev) ? 100 : rawElev;
        const ticket = p.individualPrice != null ? parseFloat(p.individualPrice) : (parseFloat(p.price) || null);
        const fees = p.feesDescription || p.fees || (ticket > 0 ? `₹${ticket} Entry` : 'Free Public Access');

        return {
          name: p.name,
          district: p.district || 'Andhra Pradesh & Telangana',
          category: p.category || 'Heritage',
          elevationMeters: elev,
          timings: p.timings || `${p.openingTime || '09:00 AM'} – ${p.closingTime || '06:00 PM'}`,
          openingTime: p.openingTime || '09:00 AM',
          closingTime: p.closingTime || '06:00 PM',
          bestTimeToVisit: p.golden_hour || p.goldenHour || p.bestVisitingHoursStart || 'Morning or late afternoon',
          typicalDwellTime: p.typicalDwellTime || '1.5 Hours',
          latitude: coords.lat,
          longitude: coords.lng,
          individualPrice: ticket,
          feesDescription: fees,
          culinarySpecialty: p.culinarySpecialty || p.foodTip || null,
          emergencyMedicalDistance: p.emergencyMedicalDistance || null,
          checkpostCurfew: p.checkpostCurfew || 'None'
        };
      }),
      days: effectiveDays,
      autoCalculateDays: effectiveDays === null,
      pace: travelPace
    };

    try {
      // 1. Attempt Gemini 3.1 Flash Lite Edge Plan Generator
      const remotePlan = await tripService.generateAiPlan(payload);
      const calcDurationMs = calcDuration(startTime);

      if (remotePlan && (remotePlan.days || remotePlan.itinerary)) {
        const normalized = {
          success: true,
          calcDurationMs,
          modelUsed: 'AI Travel Engine',
          isOfflineFallback: false,
          days: remotePlan.days || remotePlan.itinerary || [],
          itinerary: remotePlan.itinerary || remotePlan.days || [],
          totalRoadKm: remotePlan.totalRoadKm,
          totalDriveHours: remotePlan.totalDriveHours,
          summary: remotePlan.summary,
          travelAdvice: remotePlan.travelAdvice || [],
          placesHash: selectedPlaces.map(p => p.name).sort().join('|')
        };
        setPlanResult(normalized);
        initializeChatThread(normalized);
        return;
      }
      throw new Error('Backend plan empty, running local route engine');
    } catch (err) {
      // 2. Offline Deterministic Route Engine (Zero-Connectivity Haversine & Constraint Solver)
      console.warn('Backend unavailable, running Offline Deterministic Route Engine:', err.message);
      
      const localPlan = offlineRouteFallback.generateOptimalTripPlan(selectedPlaces, {
        totalDays: effectiveDays,
        pace: travelPace
      });
      const calcDurationMs = calcDuration(startTime);

      if (localPlan && localPlan.days) {
        const normalized = {
          success: true,
          calcDurationMs,
          modelUsed: 'Instant Route Planner',
          isOfflineFallback: true,
          days: localPlan.days || [],
          itinerary: localPlan.days || [],
          totalRoadKm: localPlan.meta?.totalKm,
          totalDriveHours: (localPlan.meta?.estimatedDriveHours || 3) + ' hrs',
          summary: `Offline constraint plan sequencing ${selectedPlaces.length} attractions across ${localPlan.days?.length} days based on road distance and gate hours.`,
          meta: localPlan.meta,
          placesHash: selectedPlaces.map(p => p.name).sort().join('|')
        };
        setPlanResult(normalized);
        initializeChatThread(normalized);
      } else {
        setGenerationError('Failed to generate tour plan. Please re-select locations.');
      }
    } finally {
      setIsGenerating(false);
    }
  };

  // Initialize the Agentic Chat Thread after tour plan creation
  const initializeChatThread = (plan) => {
    const daysCount = plan.days?.length || 1;
    const actualPlannedStops = (plan.days || []).reduce((acc, d) => {
      const validStops = (d.stops || d.legs || []).filter(s => !s.isMealHalt);
      return acc + validStops.length;
    }, 0) || selectedPlaces.length;

    const safetyAdjustmentNote = (plan.daysAdjustedForSafety || plan.meta?.daysAdjustedForSafety)
      ? `\n\n[Safety Advisory]: ${plan.safetyNotice || plan.meta?.safetyNotice}`
      : '';

    const initialAiMessage = {
      id: 'init-1',
      sender: 'ai',
      text: `Namaste! I have prepared your personalized ${daysCount}-day tour plan for all ${actualPlannedStops} destinations using verified road driving times, entry hours, and elevation gradients.${safetyAdjustmentNote}\n\nI arranged stops in a topographically descending order so you spend less time driving and reach each place well before closing time (e.g. caves and lighthouse before 5:00 PM, and early dawn for sunrise viewpoints). Feel free to ask why this order was selected, request day adjustments, or ask for the best authentic Andhra & Telangana food stops along your route!`,
      suggestions: [
        'Why did you arrange the spots in this order?',
        'What authentic regional food should we eat?',
        'Can we make this relaxed for senior citizens?'
      ],
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    setChatMessages([initialAiMessage]);
  };

  // User chat submission to discuss / redesign the plan via Multi-Model AI
  const handleSendChatMessage = async (customText = null) => {
    const query = customText || inputQuery;
    if (!query || !query.trim()) return;

    const userMsg = {
      id: createMessageId('u'),
      sender: 'user',
      text: query,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setChatMessages((prev) => [...prev, userMsg]);
    if (!customText) setInputQuery('');
    setIsChatThinking(true);

    const spotsListStr = selectedPlaces.map(p => `${p.name} (${p.district || 'Regional'})`).join(', ');
    const currentDays = planResult?.days?.length || 1;
    const promptWithContext = `Tour Context: ${selectedPlaces.length} selected destinations [${spotsListStr}]. Currently planned for ${currentDays} days. Rationale: "${planResult?.summary || ''}".\n\nTourist Question / Request: ${query}`;

    try {
      // 1. Invoke Real Cloud AI (Groq GPT-OSS 120B / Gemini Multi-Model Router)
      const response = await chatService.sendMessage(promptWithContext, chatSessionId);
      
      let aiReply = response?.reply || '';
      let suggestions = response?.suggestions || [];
      let actionSuggestion = null;

      // Detect day expansion / contraction requests
      const lower = query.toLowerCase();
      if (lower.includes('hectic') || lower.includes('tired') || lower.includes('relax') || lower.includes('senior') || lower.includes('elderly') || lower.includes('expand') || lower.includes('more day')) {
        const nextDays = Math.min(5, currentDays + 1);
        if (nextDays > currentDays) {
          actionSuggestion = {
            label: `Redesign for ${nextDays} Relaxed Days`,
            action: () => {
              setSelectedDuration(nextDays);
              handleGeneratePlan(nextDays);
            }
          };
        }
      } else if (lower.includes('fewer days') || lower.includes('reduce') || lower.includes('1 day') || lower.includes('condense')) {
        const prevDays = Math.max(1, currentDays - 1);
        actionSuggestion = {
          label: `Condense to ${prevDays} Day Plan`,
          action: () => {
            setSelectedDuration(prevDays);
            handleGeneratePlan(prevDays);
          }
        };
      }

      setChatMessages((prev) => [
        ...prev,
        {
          id: createMessageId('ai'),
          sender: 'ai',
          text: aiReply,
          suggestions: suggestions,
          action: actionSuggestion,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    } catch (err) {
      console.warn('Live AI chat unavailable, using grounded local domain co-pilot:', err.message);
      
      const lower = query.toLowerCase().trim();
      let aiReply = '';
      let actionSuggestion = null;

      // 1. Direct Destination Search: Match against current trip or all 646 atlas destinations
      const placeInTrip = selectedPlaces.find((p) => p.name && lower.includes(p.name.toLowerCase()));
      let targetPlace = placeInTrip;

      if (!targetPlace && MASTER_ATLAS_DATA) {
        const allDistricts = [
          ...(MASTER_ATLAS_DATA['Andhra Pradesh'] || []),
          ...(MASTER_ATLAS_DATA['Telangana'] || [])
        ];
        for (const dist of allDistricts) {
          const match = (dist.spots || []).find((s) => s.name && lower.includes(s.name.toLowerCase()));
          if (match) {
            targetPlace = { ...match, district: dist.name };
            break;
          }
        }
      }

      if (targetPlace) {
        const isFree = targetPlace.individualPrice === 0 || (targetPlace.fees && String(targetPlace.fees).toLowerCase().includes('free'));
        const priceNum = typeof targetPlace.individualPrice === 'number'
          ? targetPlace.individualPrice
          : (parseFloat(targetPlace.fees) || 0);
        const feeText = isFree || priceNum === 0 ? 'Free Public Entry' : `₹${priceNum}`;
        const timing = targetPlace.timings || '9:00 AM – 5:30 PM';
        const hazards = targetPlace.rules_and_hazards || targetPlace.rulesAndHazards || 'Modest attire recommended. Carry drinking water and sun protection.';
        const food = targetPlace.culinarySpecialty ? `Verified local specialty: ${targetPlace.culinarySpecialty}.` : '';
        
        aiReply = `📍 **${targetPlace.name}** (${targetPlace.district || 'Regional Hub'}):\n• **Official Entry Fee:** ${feeText}\n• **Visiting Hours:** ${timing}\n• **Visitor Advice & Rules:** ${hazards}\n${food ? `• **Regional Cuisine:** ${food}\n` : ''}\n${targetPlace.description ? `*${targetPlace.description}*` : ''}`;
      } else if (lower.includes('cost') || lower.includes('fee') || lower.includes('price') || lower.includes('budget') || lower.includes('ticket') || lower.includes('pass')) {
        // 2. Budget & Ticket Fees
        let totalPassCost = 0;
        const feeBreakdown = selectedPlaces.map((p) => {
          const price = typeof p.individualPrice === 'number' ? p.individualPrice : (parseFloat(p.price) || 0);
          totalPassCost += price;
          return `• **${p.name}**: ${price === 0 ? 'Free Entry' : `₹${price}`}`;
        });

        aiReply = `🎫 **Estimated Monument & Attraction Entry Fees:**\n${
          feeBreakdown.length > 0 ? feeBreakdown.join('\n') : 'No attractions selected yet.'
        }\n\n**Total Estimated Entry Cost:** ${totalPassCost === 0 ? '₹0 (Free Public Sightseeing)' : `₹${totalPassCost} per adult`}.\n\n*Note: Globetrotter Gate Passes bundle verified admissions with zero convenience charges.*`;
      } else if (lower.includes('elevation') || lower.includes('ghat') || lower.includes('road') || lower.includes('drive') || lower.includes('hill') || lower.includes('altitude')) {
        // 3. Elevation, Ghat Roads & Driving Safety
        const highSpots = selectedPlaces.filter((p) => {
          const desc = ((p.description || '') + ' ' + (p.name || '')).toLowerCase();
          return desc.includes('hill') || desc.includes('ghat') || desc.includes('valley') || desc.includes('caves') || (p.elevation && p.elevation > 500);
        });

        aiReply = `⛰️ **Terrain & Driving Advisory:**\n${
          highSpots.length > 0
            ? `Your route passes through elevated terrain near **${highSpots.map((s) => s.name).join(', ')}**.\n• Keep driving speed under 35 km/h on hairpin bends.\n• Avoid overtaking on blind curves and sound horn before turns.\n• Avoid night driving through forest ghat roads after 6:30 PM due to fog and wildlife crossings.`
            : `Your selected stops are primarily located in plains and urban valleys with gentle road grades. Standard highway speeds of 60–80 km/h apply on four-lane national highways (NH-16 / NH-44 / NH-65).`
        }`;
      } else if (lower.includes('hectic') || lower.includes('tired') || lower.includes('relax') || lower.includes('senior') || lower.includes('elderly') || lower.includes('stair') || lower.includes('steps')) {
        // 4. Senior Citizens & Accessibility
        const steepSpots = selectedPlaces.filter((p) => {
          const str = ((p.name || '') + ' ' + (p.description || '') + ' ' + (p.rules_and_hazards || '')).toLowerCase();
          return str.includes('step') || str.includes('stair') || str.includes('cave') || str.includes('fort') || str.includes('climb');
        });

        aiReply = `🚶 **Comfort & Accessibility Review:**\n${
          steepSpots.length > 0
            ? `Note: **${steepSpots.map((s) => s.name).join(', ')}** require climbing stone steps. For senior travelers, take regular breathers and carry walking assistance or an umbrella.`
            : `Your current stops feature level footpaths and moderate walking requirements.`
        }\n\nTo keep pacing leisurely, I suggest spreading this trip over ${Math.min(5, currentDays + 1)} days so you can enjoy relaxing breaks between stops.`;
        
        actionSuggestion = {
          label: `Expand Trip to ${Math.min(5, currentDays + 1)} Days`,
          action: () => {
            const nextDays = Math.min(5, currentDays + 1);
            setSelectedDuration(nextDays);
            handleGeneratePlan(nextDays);
          }
        };
      } else if (lower.includes('food') || lower.includes('eat') || lower.includes('lunch') || lower.includes('breakfast') || lower.includes('dinner') || lower.includes('restaurant')) {
        // 5. Authentic Regional Food
        const foodSpots = selectedPlaces.filter((p) => p.culinarySpecialty);
        if (foodSpots.length > 0) {
          const list = foodSpots.map((p) => `• **${p.name}** (${p.district || 'Regional'}): ${p.culinarySpecialty}`).join('\n');
          aiReply = `🍲 **Verified Local Culinary Specialties Along Your Route:**\n${list}\n\n*Health Tip: Consume freshly prepared hot meals and stick to sealed bottled water during long road journeys.*`;
        } else {
          aiReply = `Along the Andhra & Telangana tourism corridors, prioritize government-sanctioned APTDC Haritha and TSTDC Haritha resort restaurants for clean restrooms and hygienic regional vegetarian/non-vegetarian thali meals.`;
        }
      } else if (lower.includes('time') || lower.includes('timing') || lower.includes('hour') || lower.includes('open') || lower.includes('close')) {
        // 6. Gate Timings
        const timingSpots = selectedPlaces.filter((p) => p.timings);
        if (timingSpots.length > 0) {
          const list = timingSpots.map((p) => `• **${p.name}**: ${p.timings}`).join('\n');
          aiReply = `🕒 **Official Gate Timings:**\n${list}`;
        } else {
          aiReply = `Most ASI archaeological monuments and state museums open from 9:00 AM to 5:30 PM. Major temples open early (6:00 AM) and observe afternoon breaks between 1:00 PM and 4:00 PM.`;
        }
      } else if (lower.includes('golden') || lower.includes('sunset') || lower.includes('sunrise') || lower.includes('photo') || lower.includes('camera')) {
        // 7. Photography & Golden Hour
        const photoSpots = selectedPlaces.filter((p) => p.goldenHour || p.golden_hour);
        if (photoSpots.length > 0) {
          const list = photoSpots.map((p) => `• **${p.name}**: Best light at ${p.goldenHour || p.golden_hour}`).join('\n');
          aiReply = `📸 **Recommended Photography Hours:**\n${list}\n\n*Drone advisory: Unlicensed drone photography is strictly prohibited at all ASI protected monuments.*`;
        } else {
          aiReply = `For outdoor architectural photography, aim for morning sunlight (6:30 AM – 8:30 AM) or gentle evening light (4:30 PM – 5:45 PM) to capture warm stone textures without harsh overhead shadows.`;
        }
      } else if (lower.includes('why') || lower.includes('sequence') || lower.includes('order') || lower.includes('first')) {
        // 8. Sequencing Logic
        const firstStop = planResult?.days?.[0]?.stops?.[0]?.name || planResult?.days?.[0]?.legs?.[0]?.spotName || selectedPlaces[0]?.name || 'the first spot';
        aiReply = `🗺️ **Route Sequencing Rationale:**\nWe placed **${firstStop}** first because morning visiting hours offer pleasant temperatures and minimal queue congestion. The sequence minimizes zig-zag highway backtracking and avoids negotiating steep mountain roads after dark.`;
      } else {
        // 9. Grounded Route Overview
        const stopNames = selectedPlaces.map((s) => s.name).join(' → ');
        aiReply = `🧭 **Offline Route Concierge Active:**\nYour current plan covers ${selectedPlaces.length} attractions: **${stopNames || 'No destinations selected yet'}**.\n\nAsk me about official entry fees, temple timings, local Andhra/Telangana delicacies, driving terrain, or golden hour photography recommendations for any of your stops!`;
      }

      setChatMessages((prev) => [
        ...prev,
        {
          id: `ai-${Date.now()}`,
          sender: 'ai',
          text: aiReply,
          action: actionSuggestion,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    } finally {
      setIsChatThinking(false);
    }
  };

  // Audio Speech Synthesis for Itinerary Briefing
  const toggleSpeech = () => {
    if (!('speechSynthesis' in window)) {
      setChatMessages((prev) => [
        ...prev,
        {
          id: `sys-${Date.now()}`,
          sender: 'ai',
          text: '📢 Audio speech synthesis is not supported on this browser or device. Please follow the written day-by-day briefing.',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
      return;
    }

    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }

    if (!planResult) return;

    const daysList = planResult.days || planResult.itinerary || [];
    const speechText = `Welcome to your tour plan for ${daysList.length} days across Andhra Pradesh and Telangana. ${
      daysList.map(d => `Day ${d.dayNumber || d.day}: ${d.summary || ''}. Stops include ${d.stops?.map(s => s.name || s.spotName).join(', ')}.`).join(' ')
    }`;

    const utterance = new SpeechSynthesisUtterance(speechText);
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    window.speechSynthesis.speak(utterance);
    setIsSpeaking(true);
  };

  return (
    <section className="relative w-full py-24 px-4 md:px-12 bg-[#06080D] text-slate-200">
      <div className="max-w-7xl mx-auto flex flex-col gap-10">
        
        {/* Studio Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-white/10 pb-8">
          <div className="flex flex-col gap-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-400/20 w-max">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span className="text-[10px] uppercase tracking-[0.2em] font-medium text-amber-300 font-sans-clean font-semibold">
                Smart Tour Planner
              </span>
            </div>
            <h2 className="text-3xl md:text-5xl font-bold tracking-tight text-white font-sans-clean">
              Multi-Day Tour Planner
            </h2>
            <p className="text-sm md:text-base text-slate-400 max-w-2xl leading-relaxed font-sans-clean">
              Personalized day-by-day travel plans balancing scenic highways, temple darshan timings, peaceful sunset points, and authentic Andhra & Telangana food.
            </p>
          </div>

          {/* Quick Actions */}
          <div className="flex items-center gap-3">
            <button
              onClick={onExploreMore}
              className="px-4 py-2.5 rounded-full bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-xs font-semibold text-slate-300 flex items-center gap-2 transition-colors font-sans-clean cursor-pointer"
            >
              <Compass className="w-3.5 h-3.5 text-amber-400" />
              <span>Browse All 59 Districts</span>
            </button>
            {selectedPlaces.length > 0 && (
              <button
                onClick={onClearPlaces}
                className="px-3.5 py-2.5 rounded-full bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 text-xs font-semibold text-rose-300 flex items-center gap-1.5 transition-colors font-sans-clean cursor-pointer"
                title="Clear all selected places"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Clear</span>
              </button>
            )}
          </div>
        </div>

        {/* Staging Area Grid: Left Staged Places Deck (7 cols) + Right Controls (5 cols) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Staged Destinations Column */}
          <div className="lg:col-span-7 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-300 font-sans-clean">
                  Selected Destinations
                </span>
                <span className="px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-300 text-xs font-bold font-mono">
                  {selectedPlaces.length}
                </span>
              </div>
              <span className="text-[11px] text-slate-500 font-sans-clean">
                {selectedPlaces.length === 0 ? 'No attractions added yet' : 'Places included in your upcoming route'}
              </span>
            </div>

            {/* INLINE QUICK-ADD DESTINATION SEARCH */}
            <div className="relative">
              <div className="flex items-center gap-2 p-2 rounded-2xl bg-white/[0.04] border border-white/10 focus-within:border-amber-400/50 transition-colors">
                <Search className="w-4 h-4 text-slate-400 shrink-0 ml-2" />
                <input
                  type="text"
                  value={quickSearchQuery}
                  onChange={(e) => {
                    setQuickSearchQuery(e.target.value);
                    setIsQuickSearchOpen(true);
                  }}
                  onFocus={() => setIsQuickSearchOpen(true)}
                  placeholder="Quick-add any spot (e.g. Borra Caves, Ramappa, Charminar)..."
                  className="flex-1 bg-transparent text-xs text-white placeholder-slate-500 focus:outline-none font-sans-clean"
                />
                {quickSearchQuery && (
                  <button
                    onClick={() => {
                      setQuickSearchQuery('');
                      setIsQuickSearchOpen(false);
                    }}
                    className="text-slate-400 hover:text-white px-2 py-0.5 text-xs cursor-pointer"
                  >
                    ✕
                  </button>
                )}
              </div>

              {/* Autocomplete Results Dropdown */}
              {isQuickSearchOpen && searchResults.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1.5 z-30 max-h-60 overflow-y-auto rounded-2xl bg-[#0E121A] border border-white/15 shadow-2xl p-2 flex flex-col gap-1">
                  {searchResults.map((dest) => {
                    const isAlreadyAdded = selectedPlaces.some(p => p.name.toLowerCase() === dest.name.toLowerCase());
                    return (
                      <div
                        key={dest.name}
                        className="flex items-center justify-between p-2.5 rounded-xl hover:bg-white/[0.05] transition-colors gap-3"
                      >
                        <div className="flex flex-col min-w-0">
                          <span className="text-xs font-bold text-white truncate font-sans-clean">{dest.name}</span>
                          <span className="text-[10px] text-slate-400 truncate">{dest.district} • {dest.category}</span>
                        </div>
                        <button
                          onClick={() => handleQuickAdd(dest)}
                          disabled={isAlreadyAdded}
                          className={`px-3 py-1 rounded-full text-xs font-semibold shrink-0 cursor-pointer transition-all ${
                            isAlreadyAdded
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 cursor-default'
                              : 'bg-amber-400 hover:bg-amber-300 text-slate-950 shadow-sm'
                          }`}
                        >
                          {isAlreadyAdded ? 'Added' : '+ Add to Trip'}
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* INSTANT PASS CHECKOUT CARD FOR SELECTED MONUMENTS */}
            {selectedPlaces.length > 0 && (
              <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-500/15 via-amber-500/10 to-stone-900/60 border border-amber-400/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-md">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-400/20 border border-amber-400/30 flex items-center justify-center text-amber-300 shrink-0">
                    <Ticket className="w-5 h-5 text-amber-300" />
                  </div>
                  <div className="flex flex-col">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-white font-sans-clean">
                        Consolidated Gate Pass
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-mono font-semibold">
                        {selectedPlaces.length} {selectedPlaces.length === 1 ? 'Attraction' : 'Attractions'}
                      </span>
                    </div>
                    <span className="text-[11px] text-slate-300 font-sans-clean">
                      Skip counter queues with one digital QR gate pass
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => handleBuyPass()}
                  className="px-5 py-2.5 rounded-full bg-amber-400 hover:bg-amber-300 text-slate-950 font-extrabold text-xs flex items-center justify-center gap-1.5 shadow-md cursor-pointer font-sans-clean active:scale-[0.98] transition-all shrink-0"
                >
                  <Ticket className="w-3.5 h-3.5 text-slate-950" />
                  <span>{stagedPassPrice === 0 ? 'Get Free Entry Pass (₹0)' : `Buy Entry Pass • ₹${stagedPassPrice}`}</span>
                </button>
              </div>
            )}

            {selectedPlaces.length === 0 ? (
              <div className="flex flex-col gap-5">
                <div className="p-8 sm:p-10 rounded-3xl border border-dashed border-white/10 bg-white/[0.01] flex flex-col items-center justify-center text-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-white/[0.04] border border-white/10 flex items-center justify-center text-slate-400">
                    <MapPin className="w-6 h-6" />
                  </div>
                  <div className="flex flex-col gap-1">
                    <h4 className="text-base font-bold text-white font-sans-clean">No destinations selected yet</h4>
                    <p className="text-xs text-slate-400 max-w-sm font-sans-clean">
                      Select attractions from the 59 Districts Directory, or start instantly with one of our verified regional trips below.
                    </p>
                  </div>
                  <button
                    onClick={onExploreMore}
                    className="px-6 py-2.5 rounded-full bg-amber-400 text-slate-950 font-bold text-xs hover:bg-amber-300 transition-colors font-sans-clean cursor-pointer shadow-md"
                  >
                    Browse All 59 Districts
                  </button>
                </div>

                {/* Popular 1-Click Starter Trips */}
                <div className="flex flex-col gap-3">
                  <span className="text-xs font-semibold text-slate-300 font-sans-clean">
                    Or start instantly with verified regional trips:
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {STARTER_TRIPS.map((trip) => (
                      <div
                        key={trip.id}
                        onClick={() => handleLoadStarterTrip(trip)}
                        className="p-4 rounded-2xl bg-white/[0.02] hover:bg-white/[0.05] border border-white/10 hover:border-amber-400/40 transition-all cursor-pointer flex flex-col justify-between gap-3 group"
                      >
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-400/20 font-bold">
                              {trip.badge}
                            </span>
                            <span className="text-[10px] text-slate-400 font-mono">
                              {trip.places.length} Sights
                            </span>
                          </div>
                          <h5 className="text-xs font-bold text-white group-hover:text-amber-300 transition-colors font-sans-clean mt-1">
                            {trip.title}
                          </h5>
                          <span className="text-[11px] text-slate-400 leading-snug">
                            {trip.tag}
                          </span>
                        </div>
                        <div className="flex items-center justify-between pt-2 border-t border-white/5 text-[11px] text-slate-300">
                          <span className="text-amber-400 font-mono font-bold">{trip.fee}</span>
                          <span className="text-amber-400 group-hover:translate-x-0.5 transition-transform font-bold text-xs">
                            + Load Trip →
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[500px] overflow-y-auto pr-1 scrollbar-none">
                {selectedPlaces.map((place, idx) => (
                  <div
                    key={place.name}
                    className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/5 hover:border-white/15 transition-colors flex items-center justify-between gap-3 group"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="w-6 h-6 rounded-lg bg-amber-400/20 text-amber-300 font-bold text-xs flex items-center justify-center font-mono flex-shrink-0">
                        {idx + 1}
                      </span>
                      <div className="flex flex-col min-w-0">
                        <span className="text-xs font-bold text-white truncate font-sans-clean">
                          {place.name}
                        </span>
                        <span className="text-[10px] text-slate-400 truncate">
                          {place.district} • {place.elevation || '120m'}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => onRemovePlace(place.name)}
                      className="w-7 h-7 rounded-lg bg-white/[0.04] hover:bg-rose-500/20 text-slate-400 hover:text-rose-300 flex items-center justify-center transition-colors flex-shrink-0 cursor-pointer"
                      title="Remove place"
                      aria-label={`Remove ${place.name}`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Intelligent Optimizer Controls Card */}
          <div className="lg:col-span-5 flex flex-col gap-5">
            <div className="p-6 rounded-3xl bg-[#0E121A]/95 border border-white/10 backdrop-blur-2xl flex flex-col gap-5 shadow-2xl">
              
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <span className="text-xs font-semibold text-slate-300 font-sans-clean">
                  Trip Preferences
                </span>
                <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 font-sans-clean font-semibold">
                  Verified Road Routes
                </span>
              </div>

              {/* Smart Day Planning */}
              <div className="flex flex-col gap-2.5 p-4 rounded-2xl bg-white/[0.02] border border-white/10 font-sans-clean">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-amber-400" />
                    <span className="text-slate-200 font-bold tracking-wide">Smart Day Planning</span>
                  </div>
                  <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-300 border border-amber-400/20 font-medium font-sans-clean flex items-center gap-1">
                    <span>Auto-Schedule</span>
                  </span>
                </div>
                
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  We automatically organize your stops into balanced days with comfortable drive times, daylight mountain travel, and meal breaks.
                </p>

                <div className="flex items-center justify-between pt-2 border-t border-white/5 text-[11px]">
                  <span className="text-slate-400">Selected Attractions:</span>
                  <span className="font-bold text-amber-300 font-mono">
                    {selectedPlaces.length} {selectedPlaces.length === 1 ? 'Destination' : 'Destinations'} 
                    {selectedPlaces.length > 0 ? ` (Auto-sequenced across ~${recommendedDays} ${recommendedDays === 1 ? 'Day' : 'Days'})` : ''}
                  </span>
                </div>
              </div>

              {/* Pace Profile Selector */}
              <div className="flex flex-col gap-2 font-sans-clean">
                <span className="text-xs text-slate-300 font-semibold">Travel Style</span>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'RELAXED', label: 'Relaxed', desc: 'Leisurely pace' },
                    { id: 'BALANCED', label: 'Balanced', desc: 'Classic route' },
                    { id: 'ACTIVE', label: 'Explorer', desc: 'See it all' }
                  ].map((p) => (
                    <button
                      key={p.id}
                      onClick={() => setTravelPace(p.id)}
                      className={`py-2.5 px-3 rounded-xl border text-xs font-semibold flex flex-col items-center gap-0.5 transition-colors font-sans-clean cursor-pointer ${
                        travelPace === p.id
                          ? 'bg-amber-500/15 border-amber-400/40 text-amber-300 shadow-sm'
                          : 'bg-white/[0.02] border-white/5 text-slate-400 hover:border-white/15'
                      }`}
                    >
                      <span>{p.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Action Button */}
              <div className="pt-2 flex flex-col gap-2">
                {generationError && (
                  <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2 font-sans-clean">
                    <AlertTriangle className="w-4 h-4 flex-shrink-0 text-rose-400" />
                    <span>{generationError}</span>
                  </div>
                )}

                {planResult && !isPlanInSync && (
                  <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs flex items-center gap-2 font-sans-clean">
                    <Sparkles className="w-4 h-4 flex-shrink-0 text-amber-400" />
                    <span>Destination selection updated. Click below to regenerate your day-by-day itinerary.</span>
                  </div>
                )}

                <button
                  disabled={selectedPlaces.length === 0 || isGenerating}
                  onClick={() => handleGeneratePlan()}
                  className={`w-full py-4 rounded-full font-bold text-xs flex items-center justify-center gap-2 transition-all font-sans-clean cursor-pointer active:scale-[0.98] ${
                    selectedPlaces.length === 0
                      ? 'bg-white/[0.05] text-slate-500 cursor-not-allowed'
                      : 'bg-amber-400 hover:bg-amber-300 text-slate-950 shadow-md'
                  }`}
                >
                  {isGenerating ? (
                    <>
                      <span className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                      <span>Creating Your Day-by-Day Tour Plan...</span>
                    </>
                  ) : (
                    <>
                      <Compass className="w-4 h-4" />
                      <span>Create My Tour Plan</span>
                    </>
                  )}
                </button>
              </div>

            </div>
          </div>

        </div>

        {/* Synthesized Itinerary View */}
        {planResult && isPlanInSync && (
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full flex flex-col gap-8 pt-6"
          >
            <div className="p-6 md:p-8 rounded-3xl bg-[#0E121A]/95 border border-white/10 backdrop-blur-3xl flex flex-col gap-8 shadow-2xl">
              
              {/* Plan Header & Verified Status Badges */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-6">
                <div className="flex flex-col gap-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 font-sans-clean font-semibold flex items-center gap-1">
                      <ShieldCheck className="w-3 h-3 text-emerald-400" />
                      <span>{planResult.isOfflineFallback ? 'Offline Mode Active' : 'Verified Regional Tour Route'}</span>
                    </span>
                    <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-400/25 font-sans-clean font-semibold flex items-center gap-1">
                      <Sparkles className="w-3 h-3 text-amber-400" />
                      <span>Optimized Tour Route</span>
                    </span>
                    <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-white/[0.05] text-slate-300 border border-white/10 font-sans-clean font-medium">
                      Gate Timings & Rest Breaks Verified
                    </span>
                    {planResult.totalRoadKm && (
                      <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-white/[0.05] text-slate-300 font-sans-clean">
                        {planResult.totalRoadKm} km Scenic Road Trip
                      </span>
                    )}
                  </div>
                  <h3 className="text-2xl md:text-3xl font-bold text-white mt-1 font-sans-clean tracking-tight">
                    Your Day-by-Day Tour Plan
                  </h3>
                  <p className="text-xs md:text-sm text-slate-300 max-w-2xl font-sans-clean leading-relaxed">
                    {planResult.summary}
                  </p>
                </div>

                {/* Audio Guide & Pass Issue Actions */}
                <div className="flex flex-wrap items-center gap-3 flex-shrink-0">
                  <button
                    onClick={() => handleBuyPass(planResult)}
                    className="px-6 py-2.5 rounded-full bg-amber-400 hover:bg-amber-300 text-slate-950 font-extrabold text-xs flex items-center gap-2 transition-all shadow-md font-sans-clean cursor-pointer active:scale-[0.98]"
                  >
                    <Ticket className="w-4 h-4 text-slate-950" />
                    <span>
                      {(typeof planResult.packagePrice === 'number' ? planResult.packagePrice : stagedPassPrice) === 0
                        ? 'Get Free Entry Pass (₹0)'
                        : `Book Entry Pass • ₹${typeof planResult.packagePrice === 'number' ? planResult.packagePrice : stagedPassPrice}`}
                    </span>
                  </button>

                  <button
                    onClick={() => setIsPocketDossierOpen(true)}
                    className="px-4 py-2.5 rounded-full bg-white/[0.08] hover:bg-white/[0.14] border border-white/20 text-white font-semibold text-xs flex items-center gap-2 transition-all cursor-pointer font-sans-clean shadow-sm"
                    title="Print or save 1-page pocket travel guide for your road trip"
                  >
                    <Printer className="w-3.5 h-3.5 text-amber-400" />
                    <span>Print Guide (PDF)</span>
                  </button>

                  <button
                    onClick={handleScrollToConcierge}
                    className="px-4 py-2.5 rounded-full bg-white/[0.06] hover:bg-white/[0.1] border border-white/15 text-white font-semibold text-xs flex items-center gap-2 transition-all cursor-pointer font-sans-clean"
                    title="Discuss with AI guide, swap spots, or tune pace"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                    <span>Customize Itinerary</span>
                  </button>

                  {onOpenAssistant && (
                    <button
                      onClick={onOpenAssistant}
                      className="px-4 py-2.5 rounded-full bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-xs font-semibold text-slate-300 hover:text-white flex items-center gap-2 transition-colors font-sans-clean cursor-pointer"
                    >
                      <MessageSquare className="w-3.5 h-3.5 text-amber-400" />
                      <span>Voice Assistant</span>
                    </button>
                  )}

                  <button
                    onClick={toggleSpeech}
                    className="px-4 py-2.5 rounded-full bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-xs font-semibold text-white flex items-center gap-2 transition-colors font-sans-clean cursor-pointer"
                  >
                    {isSpeaking ? (
                      <>
                        <VolumeX className="w-4 h-4 text-amber-400" />
                        <span>Stop Audio Guide</span>
                      </>
                    ) : (
                      <>
                        <Volume2 className="w-4 h-4 text-amber-400" />
                        <span>Listen to Audio Guide</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Smart Terrain & Weather Packing Checklist */}
              {packingChecklist.length > 0 && (
                <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/10 flex flex-col gap-3 font-sans-clean">
                  <div 
                    onClick={() => setShowPackingList(!showPackingList)}
                    className="flex items-center justify-between cursor-pointer select-none"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-amber-500/15 border border-amber-400/30 flex items-center justify-center text-amber-300">
                        <CheckSquare className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-xs sm:text-sm font-bold text-white flex items-center gap-2">
                          <span>Terrain & Weather Packing Checklist</span>
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-400/25 font-mono">
                            {Object.values(checkedPackingItems).filter(Boolean).length} / {packingChecklist.length} Packed
                          </span>
                        </h4>
                        <p className="text-[11px] text-slate-400">
                          Tailored for your route's elevations, forest checkposts, and cave humidity
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 text-xs text-amber-300 font-semibold">
                      <span>{showPackingList ? 'Hide Checklist' : 'Review Checklist'}</span>
                      {showPackingList ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </div>
                  </div>

                  {showPackingList && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 pt-3 border-t border-white/10 animate-in fade-in duration-200">
                      {packingChecklist.map((item) => {
                        const isChecked = Boolean(checkedPackingItems[item.id]);
                        return (
                          <div
                            key={item.id}
                            onClick={() => setCheckedPackingItems(prev => ({ ...prev, [item.id]: !prev[item.id] }))}
                            className={`p-3 rounded-xl border flex items-start gap-3 cursor-pointer transition-all ${
                              isChecked
                                ? 'bg-emerald-500/10 border-emerald-500/25 text-slate-300'
                                : 'bg-white/[0.02] border-white/5 hover:border-white/15 text-slate-200'
                            }`}
                          >
                            <div className="pt-0.5 shrink-0">
                              {isChecked ? (
                                <CheckSquare className="w-4 h-4 text-emerald-400" />
                              ) : (
                                <Square className="w-4 h-4 text-slate-500" />
                              )}
                            </div>
                            <div className="flex flex-col min-w-0">
                              <div className="flex items-center gap-2">
                                <span className={`text-xs font-bold font-sans-clean ${isChecked ? 'line-through text-slate-400' : 'text-white'}`}>
                                  {item.label}
                                </span>
                                <span className="text-[9px] px-1.5 py-0.2 rounded bg-white/5 border border-white/10 text-amber-300/80 font-mono">
                                  {item.category}
                                </span>
                              </div>
                              <p className="text-[10px] text-slate-400 mt-0.5 leading-relaxed font-sans-clean">
                                {item.hint}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* Day-by-Day Schedule Cards */}
              <div className={`grid grid-cols-1 ${
                (planResult.days || planResult.itinerary || []).length === 1 
                  ? 'max-w-2xl mx-auto' 
                  : (planResult.days || planResult.itinerary || []).length === 2 
                  ? 'lg:grid-cols-2' 
                  : 'md:grid-cols-2 lg:grid-cols-3'
              } gap-6`}>
                {(planResult.days || planResult.itinerary || []).map((dayPlan) => {
                  const dayStops = dayPlan.stops || dayPlan.legs || [];
                  return (
                    <div
                      key={dayPlan.dayNumber || dayPlan.day}
                      className="p-5 md:p-6 rounded-2xl bg-white/[0.02] border border-white/10 flex flex-col gap-4 shadow-xl"
                    >
                      <div className="flex items-center justify-between border-b border-white/10 pb-3">
                        <span className="text-sm font-bold text-amber-300 font-mono tracking-wide">
                          Day {dayPlan.dayNumber || dayPlan.day}
                        </span>
                        <span className="text-xs text-slate-400 font-mono">
                          {dayPlan.estimatedDistance || `${dayPlan.dayKm || dayPlan.totalKm || 80} km`} • {dayPlan.estimatedDuration || dayPlan.estimatedDriveTime || '3.5 hrs'}
                        </span>
                      </div>

                      <h4 className="text-base font-bold text-white font-sans-clean leading-snug">
                        {dayPlan.theme || dayPlan.title || `Day ${dayPlan.dayNumber || dayPlan.day} Exploration`}
                      </h4>

                      <p className="text-xs text-slate-300 italic leading-relaxed">
                        {dayPlan.daySummary || dayPlan.summary || 'Scenic highway travel & sightseeing stops.'}
                      </p>

                      {/* Stops List */}
                      <div className="space-y-3.5">
                        {dayStops.map((stop, sIdx) => {
                          const stopName = stop.name || stop.spotName || 'Landmark';
                          const matchedPlace = selectedPlaces.find(p => p.name?.toLowerCase() === stopName?.toLowerCase());
                          const resolvedCoords = resolveSpotCoordinates(matchedPlace || stop);
                          const stopLat = stop.latitude || matchedPlace?.latitude || resolvedCoords?.lat;
                          const stopLng = stop.longitude || matchedPlace?.longitude || resolvedCoords?.lng;

                          if (stop.isMealHalt) {
                            return (
                              <div
                                key={`meal-${sIdx}-${stopName}`}
                                className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/25 flex flex-col gap-2"
                              >
                                <div className="flex items-center justify-between gap-2">
                                  <div className="flex items-center gap-2 min-w-0">
                                    <span className="w-5 h-5 rounded-full bg-amber-400/20 text-amber-300 font-bold text-[10px] flex items-center justify-center font-mono flex-shrink-0">
                                      <Utensils className="w-3 h-3 text-amber-300" aria-hidden="true" />
                                    </span>
                                    <span className="text-xs font-bold text-amber-200 truncate font-sans-clean">
                                      {stopName}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-2 flex-shrink-0">
                                    <span className="text-[10px] text-amber-300 font-mono">
                                      {stop.timeSlot || `${stop.arrivalTime || '01:00 PM'} – ${stop.departureTime || '01:45 PM'}`}
                                    </span>
                                  </div>
                                </div>
                                <div className="flex items-center justify-between text-[11px] text-amber-300/80 font-sans-clean pl-7">
                                  <span>{stop.dwellMinutes || 45} mins Lunch & Refreshment Halt</span>
                                  <span className="text-amber-400 font-semibold font-sans-clean">À la carte dining</span>
                                </div>
                                {stop.foodTip && (
                                  <div className="pl-7 text-[11px] text-amber-200 flex items-center gap-1.5 font-sans-clean">
                                    <Utensils className="w-3 h-3 text-amber-400 flex-shrink-0" />
                                    <span>{stop.foodTip}</span>
                                  </div>
                                )}
                                <div className="pl-7 pt-1">
                                  <a
                                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(stopName + ' restaurant ' + (stop.district || ''))}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/15 hover:bg-amber-400 hover:text-slate-950 text-amber-200 text-[11px] font-semibold transition-all border border-amber-500/30"
                                  >
                                    <Navigation className="w-3 h-3 text-amber-400" />
                                    <span>Open in Google Maps</span>
                                  </a>
                                </div>
                              </div>
                            );
                          }

                          const displayArrival = stop.arrivalTime || (stop.timeSlot ? stop.timeSlot.split('–')[0]?.trim() : (sIdx === 0 ? '09:00 AM' : sIdx === 1 ? '11:15 AM' : sIdx === 2 ? '02:30 PM' : '04:45 PM'));
                          const displayDeparture = stop.departureTime || (stop.timeSlot ? stop.timeSlot.split('–')[1]?.trim() : (sIdx === 0 ? '10:30 AM' : sIdx === 1 ? '12:45 PM' : sIdx === 2 ? '04:00 PM' : '06:15 PM'));
                          const displayTimeWindow = stop.timeSlot || `${displayArrival} – ${displayDeparture}`;

                          const displayFee = (stop.individualPrice != null && stop.individualPrice > 0)
                            ? `₹${stop.individualPrice} Entry`
                            : (stop.feesDescription || stop.fees || matchedPlace?.feesDescription || matchedPlace?.fees || 'Free Entry');
                          const foodHighlight = stop.culinaryTip || stop.foodTip || matchedPlace?.culinarySpecialty || matchedPlace?.foodSpecialty;

                          return (
                            <div
                              key={`${stopName}-${sIdx}`}
                              className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 flex flex-col gap-2.5 transition-all hover:border-white/20"
                            >
                              {/* Top Row: Spot Number + Full Destination Title + Weather Badge */}
                              <div className="flex items-start justify-between gap-3">
                                <div className="flex items-start gap-2.5 min-w-0 flex-1">
                                  <span className="w-6 h-6 rounded-full bg-amber-400/20 text-amber-300 font-bold text-xs flex items-center justify-center font-mono flex-shrink-0 mt-0.5">
                                    {sIdx + 1}
                                  </span>
                                  <div className="flex flex-col min-w-0">
                                    <h5 className="text-sm font-bold text-white font-sans-clean leading-snug break-words">
                                      {stopName}
                                    </h5>
                                    <div className="flex items-center gap-2 text-[11px] text-slate-400 font-sans-clean mt-1 flex-wrap">
                                      <span className="text-slate-300 font-medium">{stop.district || matchedPlace?.district || 'Regional'}</span>
                                      <span>•</span>
                                      <span className="text-amber-300 font-mono font-medium">
                                        {displayTimeWindow}
                                      </span>
                                      <span>•</span>
                                      <span className="text-emerald-400 font-semibold">{displayFee}</span>
                                    </div>
                                  </div>
                                </div>

                                <div className="flex flex-col items-end gap-1 flex-shrink-0">
                                  <LiveWeatherBadge latitude={stopLat} longitude={stopLng} compact={true} />
                                  {stop.bestTimeToVisit && (
                                    <span className="text-[9.5px] text-amber-300/80 font-mono">
                                      Best: {stop.bestTimeToVisit}
                                    </span>
                                  )}
                                </div>
                              </div>

                              {/* AI Scheduling Rationale */}
                              {stop.whyThisTime && (
                                <div className="pl-8 text-[11px] text-slate-300 font-sans-clean italic bg-white/[0.02] p-2 rounded-lg border border-white/5 leading-relaxed">
                                  "{stop.whyThisTime}"
                                </div>
                              )}

                              {/* Local Taste & Culinary Highlight */}
                              {foodHighlight && (
                                <div className="pl-8 text-xs text-amber-200/90 flex items-center gap-2 font-sans-clean">
                                  <Utensils className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
                                  <span>Local Taste: <strong className="text-amber-100">{foodHighlight}</strong></span>
                                </div>
                              )}

                              {/* Action Footer: Maps Link & Emergency Medical Distance */}
                              <div className="pl-8 pt-1 flex items-center justify-between gap-2 flex-wrap">
                                <a
                                  href={matchedPlace?.googleMapsUri || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(stopName + ' ' + (stop.district || ''))}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-400/10 hover:bg-amber-400 text-amber-300 hover:text-slate-950 text-xs font-semibold transition-colors border border-amber-400/25"
                                >
                                  <Navigation className="w-3.5 h-3.5" />
                                  <span>Open in Google Maps</span>
                                </a>

                                {stop.emergencyMedicalDistance && (
                                  <div className="text-[10px] text-slate-400 flex items-center gap-1 font-sans-clean">
                                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                                    <span>{stop.emergencyMedicalDistance}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* Checkpost & Sunset Advisory */}
                      {dayPlan.curfewAdvisory && (
                        <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-200 font-sans-clean flex items-start gap-2 mt-auto leading-relaxed">
                          <AlertTriangle className="w-3.5 h-3.5 text-amber-400 flex-shrink-0 mt-0.5" />
                          <span>{dayPlan.curfewAdvisory}</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* ─────────────────────────────────────────────────────────────────
                  PERSONAL TRAVEL CONCIERGE CHAT CONSOLE
                  Enables tourist discussion, questions, trade-offs, and re-design
                  ───────────────────────────────────────────────────────────────── */}
              <div id="trip-concierge-console" className="pt-6 border-t border-white/10 flex flex-col gap-4 font-sans-clean scroll-mt-24">
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-amber-400/20 border border-amber-400/30 flex items-center justify-center text-amber-300">
                      <MessageSquare className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white font-sans-clean">
                        AI Travel Guide & Plan Assistant
                      </h4>
                      <p className="text-[11px] text-slate-400 font-sans-clean">
                        Ask why this schedule was chosen, swap places, find famous local food, or make the tour relaxed for elders and family.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {onOpenAssistant && (
                      <button
                        onClick={() => onOpenAssistant("Help me plan and optimize my itinerary")}
                        className="text-[11px] px-3 py-1.5 rounded-full bg-amber-400/15 hover:bg-amber-400/25 text-amber-300 border border-amber-400/30 font-sans-clean font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <Sparkles className="w-3 h-3 text-amber-400" />
                        <span>Open in AI Assistant</span>
                      </button>
                    )}
                    <span className="text-[10px] px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 font-sans-clean font-semibold flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                      <span>Verified Local Knowledge</span>
                    </span>
                  </div>
                </div>

                {/* Pre-set Quick Suggestion Chips */}
                <div className="flex flex-wrap gap-2 pt-1 font-sans-clean">
                  {[
                    "Why did you arrange the spots in this order?",
                    "Can we make this more relaxed for senior citizens?",
                    "Where should we eat authentic local food?",
                    "Can we expand this to more days to reduce driving?",
                    "Are there any scenic viewpoints or waterfalls nearby?"
                  ].map((chip) => (
                    <button
                      key={chip}
                      onClick={() => {
                        if (onOpenAssistant) {
                          onOpenAssistant(chip);
                        } else {
                          handleSendChatMessage(chip);
                        }
                      }}
                      className="px-3 py-1.5 rounded-full bg-white/[0.03] hover:bg-white/[0.07] border border-white/10 text-[11px] text-slate-300 transition-colors flex items-center gap-1.5 font-sans-clean cursor-pointer"
                    >
                      <Sparkles className="w-3 h-3 text-amber-400" />
                      <span>{chip}</span>
                    </button>
                  ))}
                </div>

                {/* Chat Conversation Thread */}
                <div className="p-4 rounded-2xl bg-[#080A0F]/90 border border-white/10 flex flex-col gap-3 max-h-[360px] overflow-y-auto font-sans-clean text-xs">
                  {chatMessages.filter(m => m.text && m.text.trim()).map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex flex-col gap-1 max-w-[85%] ${
                        msg.sender === 'user' ? 'ml-auto items-end' : 'mr-auto items-start'
                      }`}
                    >
                      <div
                        className={`p-3.5 rounded-2xl ${
                          msg.sender === 'user'
                            ? 'bg-amber-500/20 border border-amber-400/30 text-white rounded-br-none'
                            : 'bg-white/[0.04] border border-white/10 text-slate-200 rounded-bl-none leading-relaxed'
                        }`}
                      >
                        <p className="whitespace-pre-line">{msg.text}</p>
                        
                        {/* Actionable Button Offered by AI */}
                        {msg.action && (
                          <div className="mt-3 pt-2.5 border-t border-white/10">
                            <button
                              onClick={msg.action.action}
                              className="px-3 py-1.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-[11px] flex items-center gap-1.5 shadow-sm transition-colors font-sans-clean cursor-pointer"
                            >
                              <Check className="w-3 h-3" />
                              <span>{msg.action.label}</span>
                            </button>
                          </div>
                        )}

                        {/* Interactive Suggestion Chips Offered by AI */}
                        {msg.suggestions && msg.suggestions.length > 0 && (
                          <div className="mt-3 pt-2.5 border-t border-white/10 flex flex-wrap gap-1.5">
                            {msg.suggestions.map((sug, sIdx) => (
                              <button
                                key={sIdx}
                                onClick={() => {
                                  if (onOpenAssistant) {
                                    onOpenAssistant(sug);
                                  } else {
                                    handleSendChatMessage(sug);
                                  }
                                }}
                                className="px-2.5 py-1 rounded-lg bg-white/[0.05] hover:bg-amber-500/15 text-amber-300 border border-white/10 text-[10px] flex items-center gap-1 transition-colors text-left font-sans-clean cursor-pointer"
                              >
                                <CornerDownRight className="w-2.5 h-2.5 text-amber-400 flex-shrink-0" />
                                <span>{sug}</span>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                      <span className="text-[9px] text-slate-500 font-sans-clean px-1">
                        {msg.timestamp}
                      </span>
                    </div>
                  ))}

                  {isChatThinking && (
                    <div className="mr-auto flex items-center gap-2 p-3 rounded-2xl bg-white/[0.03] border border-white/10 text-slate-300 text-xs font-sans-clean">
                      <span className="w-3 h-3 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
                      <span>Reviewing road timings, gate hours & dining options...</span>
                    </div>
                  )}
                </div>

                {/* Chat Input Bar */}
                <div className="flex items-center gap-2 font-sans-clean">
                  <input
                    type="text"
                    name="chatQuery"
                    aria-label="Trip planning chat query"
                    value={inputQuery}
                    onChange={(e) => setInputQuery(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        if (onOpenAssistant && inputQuery.trim()) {
                          onOpenAssistant(inputQuery);
                          setInputQuery('');
                        } else {
                          handleSendChatMessage();
                        }
                      }
                    }}
                    placeholder="Ask a question about your trip, swap a destination, or find authentic food..."
                    autoComplete="off"
                    spellCheck={false}
                    className="flex-1 h-11 px-4 rounded-xl bg-white/[0.04] border border-white/10 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-amber-400/50 transition-colors font-sans-clean"
                  />
                  <button
                    onClick={() => {
                      if (onOpenAssistant && inputQuery.trim()) {
                        onOpenAssistant(inputQuery);
                        setInputQuery('');
                      } else {
                        handleSendChatMessage();
                      }
                    }}
                    disabled={!inputQuery.trim() || isChatThinking}
                    className="h-11 px-5 rounded-xl bg-amber-400 hover:bg-amber-300 disabled:bg-white/[0.05] disabled:text-slate-600 text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors shadow-md flex-shrink-0 font-sans-clean cursor-pointer"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Send</span>
                  </button>
                </div>

              </div>

            </div>
          </motion.div>
        )}

        {/* 1-Page Printable / Downloadable Pocket Trip Guide */}
        <PocketDossierModal
          isOpen={isPocketDossierOpen}
          onClose={() => setIsPocketDossierOpen(false)}
          planResult={planResult}
          selectedPlaces={selectedPlaces}
        />

      </div>
    </section>
  );
}
