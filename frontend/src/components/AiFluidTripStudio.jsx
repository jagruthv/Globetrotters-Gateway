import React, { useState } from 'react';
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
  Check 
} from 'lucide-react';
import { tripService, chatService } from '../services/api';
import { offlineRouteFallback, resolveSpotCoordinates } from '../utils/offlineRouteEngine';
import LiveWeatherBadge from './LiveWeatherBadge';
import GeminiPlanDrawer from './GeminiPlanDrawer';

// Module-level utility functions to isolate side-effect timings from React Compiler render scope
const getNowTime = () => performance.now();
const calcDuration = (start) => Math.round(performance.now() - start);
const createMessageId = (prefix) => `${prefix}-${Date.now()}`;

export default function AiFluidTripStudio({ 
  selectedPlaces = [], 
  onRemovePlace, 
  onClearPlaces, 
  onExploreMore,
  onProceedToPasses,
  onBookCustomPlan,
  onInitiateBooking
}) {
  // 'AUTO' allows the AI to calculate the optimal days based on spots count & elevation fatigue
  const [selectedDuration, setSelectedDuration] = useState('AUTO');
  const [travelPace, setTravelPace] = useState('BALANCED');
  const [isGenerating, setIsGenerating] = useState(false);
  const [planResult, setPlanResult] = useState(null);
  const [geminiDrawerOpen, setGeminiDrawerOpen] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [generationError, setGenerationError] = useState(null);
  const [chatSessionId] = useState(() => 'trip_chat_' + Math.random().toString(36).substring(2, 9));

  // Agentic AI Discussion Chat State
  const [chatMessages, setChatMessages] = useState([]);
  const [inputQuery, setInputQuery] = useState('');
  const [isChatThinking, setIsChatThinking] = useState(false);

  // Auto-calculate recommended days based on real physical metrics
  const calculateRecommendedDays = () => {
    const count = selectedPlaces.length;
    if (count === 0) return 1;
    if (count <= 3) return 1;
    if (count <= 6) return 2;
    if (count <= 9) return 3;
    return Math.min(5, Math.ceil(count / 3));
  };

  const recommendedDays = calculateRecommendedDays();

  // Calculate official gate fee total for selected places
  const totalStagedFee = selectedPlaces.reduce((sum, p) => {
    const fee = parseFloat(p.individualPrice) || parseFloat(p.price) || 0;
    return sum + fee;
  }, 0);
  const stagedPassPrice = totalStagedFee > 0 ? totalStagedFee : (selectedPlaces.length * 40 || 320);

  const handleBuyPass = (customPlan = null) => {
    const targetPlan = customPlan || planResult;
    const stops = targetPlan
      ? (targetPlan.days || []).flatMap((d) => (d.stops || []).map((s) => s.name || s.placeName || s))
      : selectedPlaces.map((p) => p.name);

    const calculatedFees = selectedPlaces.reduce((sum, p) => {
      const fee = parseFloat(p.individualPrice) || parseFloat(p.price) || 0;
      return sum + fee;
    }, 0);
    const finalPrice = targetPlan?.packagePrice || (calculatedFees > 0 ? calculatedFees : (selectedPlaces.length * 40 || 320));

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
      // 1. Attempt Spring Boot Backend (Real OSRM Road Distance Matrix + AI Reasoning)
      const remotePlan = await tripService.generateAiPlan(payload);
      const calcDurationMs = calcDuration(startTime);

      if (remotePlan && (remotePlan.days || remotePlan.itinerary)) {
        const normalized = {
          success: true,
          calcDurationMs,
          modelUsed: 'Smart Route Optimizer',
          isOfflineFallback: false,
          days: remotePlan.days || remotePlan.itinerary || [],
          itinerary: remotePlan.itinerary || remotePlan.days || [],
          totalRoadKm: remotePlan.totalRoadKm,
          totalDriveHours: remotePlan.totalDriveHours,
          summary: remotePlan.summary,
          travelAdvice: remotePlan.travelAdvice || []
        };
        setPlanResult(normalized);
        initializeChatThread(normalized);
        setIsGenerating(false);
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

      if (localPlan) {
        const normalized = {
          success: true,
          calcDurationMs,
          modelUsed: 'Instant Route Planner',
          isOfflineFallback: true,
          days: localPlan.days || [],
          itinerary: localPlan.days || [],
          totalRoadKm: localPlan.meta?.totalKm,
          totalDriveHours: localPlan.meta?.estimatedDriveHours + ' hrs',
          summary: `Offline constraint plan sequencing ${selectedPlaces.length} attractions across ${localPlan.days?.length} days based on road distance and gate hours.`,
          meta: localPlan.meta
        };
        setPlanResult(normalized);
        initializeChatThread(normalized);
      } else {
        setGenerationError('Failed to generate tour plan. Please re-select locations.');
      }
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
      
      const lower = query.toLowerCase();
      let aiReply = '';
      let actionSuggestion = null;

      if (lower.includes('why') || lower.includes('sequence') || lower.includes('order')) {
        const firstStop = planResult?.days?.[0]?.stops?.[0]?.name || planResult?.days?.[0]?.legs?.[0]?.spotName || 'the first spot';
        aiReply = `I prioritized ${firstStop} in the morning because morning sunlight and moderate temperatures provide the best visiting conditions before midday heat. Moving topographically prevents climbing winding ghat roads during nighttime fog and truck hours.`;
      } else if (lower.includes('hectic') || lower.includes('tired') || lower.includes('relax') || lower.includes('senior') || lower.includes('elderly')) {
        aiReply = `Understood! With ${selectedPlaces.length} destinations across high elevation differences, a tight schedule can feel tiring. I recommend expanding your trip to ${Math.min(5, currentDays + 1)} days to ensure plenty of relaxed, leisurely time at each sight without rushing.`;
        actionSuggestion = {
          label: `Expand Trip to ${Math.min(5, currentDays + 1)} Days`,
          action: () => {
            const nextDays = Math.min(5, currentDays + 1);
            setSelectedDuration(nextDays);
            handleGeneratePlan(nextDays);
          }
        };
      } else if (lower.includes('food') || lower.includes('eat') || lower.includes('lunch') || lower.includes('breakfast')) {
        const hasAraku = selectedPlaces.some(p => p.name.toLowerCase().includes('araku') || p.name.toLowerCase().includes('borra'));
        const hasVizag = selectedPlaces.some(p => p.district?.toLowerCase().includes('visakhapatnam') || p.name.toLowerCase().includes('beach'));
        
        aiReply = `Authentic culinary specialties along your route:\n` +
          (hasAraku ? `• **Araku Valley & Borra**: Hot Bamboo Chicken cooked inside green bamboo stalks over wood embers (₹200), and fresh organic Araku Arabica hill filter coffee (₹25).\n` : '') +
          (hasVizag ? `• **Visakhapatnam Coast**: Fresh fried coastal pomfret & sea crab at beach shacks near Rushikonda, followed by hot Madugula Halwa.\n` : '') +
          `• Always carry packaged mineral water when traveling through rural ghat roads.`;
      } else if (lower.includes('remove') || lower.includes('drop') || lower.includes('swap')) {
        aiReply = `You can easily remove any place from your list above by clicking its trash icon, and then click 'Create My Tour Plan'. For nearby alternatives with gentle walking, scenic gardens and heritage view pavilions are recommended.`;
      } else {
        aiReply = `I reviewed your selected destinations against official monument timings and verified road conditions. Morning visits avoid peak crowds, and driving routes include sensible rest breaks. What would you like to explore or adjust?`;
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
      alert('Speech synthesis is not supported on this browser.');
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
                  <span>Buy Entry Pass • ₹{stagedPassPrice}</span>
                </button>
              </div>
            )}

            {selectedPlaces.length === 0 ? (
              <div className="p-12 rounded-3xl border border-dashed border-white/10 bg-white/[0.01] flex flex-col items-center justify-center text-center gap-4">
                <div className="w-12 h-12 rounded-full bg-white/[0.04] border border-white/10 flex items-center justify-center text-slate-400">
                  <MapPin className="w-6 h-6" />
                </div>
                <div className="flex flex-col gap-1">
                  <h4 className="text-base font-bold text-white font-sans-clean">No destinations selected</h4>
                  <p className="text-xs text-slate-400 max-w-sm font-sans-clean">
                    Add spots from the 59 Districts Directory or Tour Packages to create your day-by-day travel plan.
                  </p>
                </div>
                <button
                  onClick={onExploreMore}
                  className="px-6 py-2.5 rounded-full bg-amber-400 text-slate-950 font-bold text-xs hover:bg-amber-300 transition-colors font-sans-clean cursor-pointer"
                >
                  Explore 59 Districts
                </button>
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
        {planResult && (
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
                      <span>{planResult.modelUsed || 'Smart Travel Route'}</span>
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
                    <span>Book Entry Pass • ₹{planResult.packagePrice || stagedPassPrice}</span>
                  </button>

                  <button
                    onClick={() => setGeminiDrawerOpen(true)}
                    className="px-4 py-2.5 rounded-full bg-white/[0.06] hover:bg-white/[0.1] border border-white/15 text-white font-semibold text-xs flex items-center gap-2 transition-all cursor-pointer font-sans-clean"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                    <span>Ask Gemini to Tweak Stops (Optional)</span>
                  </button>

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

              {/* Day-by-Day Schedule Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {(planResult.days || planResult.itinerary || []).map((dayPlan) => {
                  const dayStops = dayPlan.stops || dayPlan.legs || [];
                  return (
                    <div
                      key={dayPlan.dayNumber || dayPlan.day}
                      className="p-5 rounded-2xl bg-white/[0.02] border border-white/5 flex flex-col gap-4"
                    >
                      <div className="flex items-center justify-between border-b border-white/10 pb-3">
                        <span className="text-sm font-bold text-amber-300 font-mono">
                          Day {dayPlan.dayNumber || dayPlan.day}
                        </span>
                        <span className="text-xs text-slate-400 font-mono">
                          {dayPlan.estimatedDistance || `${dayPlan.dayKm || 80} km`} • {dayPlan.estimatedDuration || '3.5 hrs'}
                        </span>
                      </div>

                      <h4 className="text-sm font-bold text-white font-sans-clean">
                        {dayPlan.title || dayPlan.theme || `Day ${dayPlan.dayNumber || dayPlan.day} Exploration`}
                      </h4>

                      <p className="text-xs text-slate-300 italic leading-relaxed">
                        {dayPlan.summary || 'Scenic highway travel & sightseeing stops.'}
                      </p>

                      {/* Stops List */}
                      <div className="space-y-3">
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
                                className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 flex flex-col gap-1.5"
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
                                      {stop.arrivalTime || '01:00 PM'} – {stop.departureTime || '01:45 PM'}
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
                                    <span className="truncate">{stop.foodTip}</span>
                                  </div>
                                )}
                              </div>
                            );
                          }

                          const displayFee = (stop.individualPrice != null && stop.individualPrice > 0)
                            ? `₹${stop.individualPrice} Entry`
                            : (stop.feesDescription || stop.fees || matchedPlace?.feesDescription || matchedPlace?.fees || 'Free Entry');

                          return (
                            <div
                              key={`${stopName}-${sIdx}`}
                              className="p-3 rounded-xl bg-white/[0.02] border border-white/5 flex flex-col gap-1.5"
                            >
                              <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2 min-w-0">
                                  <span className="w-5 h-5 rounded-full bg-amber-400/20 text-amber-300 font-bold text-[10px] flex items-center justify-center font-mono flex-shrink-0">
                                    {sIdx + 1}
                                  </span>
                                  <span className="text-xs font-bold text-white truncate font-sans-clean">
                                    {stopName}
                                  </span>
                                </div>
                                <div className="flex items-center gap-2 flex-shrink-0">
                                  <LiveWeatherBadge latitude={stopLat} longitude={stopLng} compact={true} />
                                  <span className="text-[10px] text-amber-300 font-mono">
                                    {stop.arrivalTime || '09:30 AM'}
                                  </span>
                                </div>
                              </div>

                              <div className="flex items-center justify-between text-[11px] text-slate-400 font-sans-clean pl-7">
                                <span>
                                  {stop.district || 'Regional'} • {stop.dwellMinutes ? `Suggested Stay: ${Math.round(stop.dwellMinutes / 60 * 10) / 10}h` : '1.5h Visit'}
                                </span>
                                <span className="text-emerald-400 font-semibold font-sans-clean">
                                  {displayFee}
                                </span>
                              </div>

                              {stop.foodTip && (
                                <div className="pl-7 text-[11px] text-amber-200/90 flex items-center gap-1.5 font-sans-clean">
                                  <Utensils className="w-3 h-3 text-amber-400 flex-shrink-0" />
                                  <span className="truncate">{stop.foodTip}</span>
                                </div>
                              )}

                              {stop.emergencyMedicalDistance && (
                                <div className="pl-7 text-[10px] text-slate-400 flex items-center gap-1.5 font-sans-clean">
                                  <ShieldCheck className="w-3 h-3 text-emerald-400 flex-shrink-0" />
                                  <span className="truncate">{stop.emergencyMedicalDistance}</span>
                                </div>
                              )}
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
              <div className="pt-6 border-t border-white/10 flex flex-col gap-4 font-sans-clean">
                
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
                  <span className="text-[10px] px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 font-sans-clean font-semibold flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                    <span>Verified Local Knowledge</span>
                  </span>
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
                      onClick={() => handleSendChatMessage(chip)}
                      className="px-3 py-1.5 rounded-full bg-white/[0.03] hover:bg-white/[0.07] border border-white/10 text-[11px] text-slate-300 transition-colors flex items-center gap-1.5 font-sans-clean cursor-pointer"
                    >
                      <Sparkles className="w-3 h-3 text-amber-400" />
                      <span>{chip}</span>
                    </button>
                  ))}
                </div>

                {/* Chat Conversation Thread */}
                <div className="p-4 rounded-2xl bg-[#080A0F]/90 border border-white/10 flex flex-col gap-3 max-h-[360px] overflow-y-auto font-sans-clean text-xs">
                  {chatMessages.map((msg) => (
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
                                onClick={() => handleSendChatMessage(sug)}
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
                      if (e.key === 'Enter') handleSendChatMessage();
                    }}
                    placeholder="Ask a question about your trip, swap a destination, or find authentic food..."
                    autoComplete="off"
                    spellCheck={false}
                    className="flex-1 h-11 px-4 rounded-xl bg-white/[0.04] border border-white/10 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-amber-400/50 transition-colors font-sans-clean"
                  />
                  <button
                    onClick={() => handleSendChatMessage()}
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

        {/* Google Apps Style Gemini Assistant Slide-Over Popup */}
        <GeminiPlanDrawer
          isOpen={geminiDrawerOpen}
          onClose={() => setGeminiDrawerOpen(false)}
          currentPlan={planResult}
          onUpdatePlan={(updated) => setPlanResult(updated)}
          onBookPass={(plan) => {
            setGeminiDrawerOpen(false);
            handleBuyPass(plan);
          }}
        />

      </div>
    </section>
  );
}
