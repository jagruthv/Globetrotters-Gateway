import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Sparkles, 
  X, 
  Send, 
  Mic, 
  MicOff, 
  Ticket, 
  MapPin, 
  ArrowRight, 
  CheckCircle2, 
  QrCode, 
  AlertTriangle, 
  Plus, 
  PhoneCall,
  Loader2,
  Trash2,
  ShieldCheck
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { MASTER_ATLAS_DATA } from '../utils/masterAtlasData';

const TAB_NAMES = {
  home: 'Corridor Overview',
  explore: '59 Districts Atlas',
  planner: 'Day-by-Day Trip Studio',
  circuits: 'Curated Heritage Circuits',
  passes: 'Paperless Pass Wallet',
  scanner: 'Gate Scanner'
};

const PROMPT_SUGGESTIONS = [
  { label: 'Book a gate pass', text: 'Book an official gate pass for Golconda Fort for 2 visitors' },
  { label: 'Plan 2-day Araku trip', text: 'Plan a 2-day scenic nature trip to Araku Valley with waterfalls and coffee plantations' },
  { label: 'Show my passes', text: 'Show all my active booked passes and tickets' },
  { label: 'Find top temples', text: 'Find top heritage temples in Warangal' },
  { label: 'Open gate scanner', text: 'Take me to the monument gate scanner' },
  { label: 'Local scam warnings', text: 'What scams or fake purchases should I avoid in Ponduru Khadi?' }
];

let msgCounter = 0;
const getMsgId = (prefix) => `${prefix}-${++msgCounter}`;

export default function TravelAssistantDrawer({
  isOpen,
  onClose,
  activeTab,
  setActiveTab,
  onInitiateBooking,
  selectedPlaces = [],
  setSelectedPlaces,
  currentPlan
}) {
  const [messages, setMessages] = useState(() => {
    let touristName = 'Explorer';
    try {
      const stored = localStorage.getItem('globetrotter_user');
      if (stored) {
        const u = JSON.parse(stored);
        touristName = u.fullName || (u.email ? u.email.split('@')[0] : 'Explorer');
      }
    } catch {
      touristName = 'Explorer';
    }

    return [
      {
        id: 'initial-assistant-welcome',
        sender: 'assistant',
        text: `Namaste, ${touristName}! I am your Travel Assistant. I can book gate passes, build custom multi-day itineraries, find destinations across all 59 districts, or navigate the platform directly from this chat.\n\nWhat would you like to explore or book today?`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    ];
  });

  const [inputQuery, setInputQuery] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [activeModelName, setActiveModelName] = useState('Regional Guide');
  const chatBottomRef = useRef(null);
  const inputRef = useRef(null);
  const recognitionRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [isOpen]);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isThinking]);

  // Voice speech-to-text recognition setup
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      const rec = new SpeechRecognition();
      rec.continuous = false;
      rec.interimResults = false;
      rec.lang = 'en-IN';

      rec.onresult = (e) => {
        const transcript = e.results[0][0].transcript;
        if (transcript) {
          setInputQuery(transcript);
        }
        setIsListening(false);
      };

      rec.onerror = () => setIsListening(false);
      rec.onend = () => setIsListening(false);

      recognitionRef.current = rec;
    }
  }, []);

  const toggleVoiceListening = () => {
    if (!recognitionRef.current) {
      setMessages((prev) => [
        ...prev,
        {
          id: `sys-${Date.now()}`,
          sender: 'assistant',
          text: '🎙️ Voice dictation requires microphone support in Chrome, Edge, or Safari. You can type your travel query in the chat box below!',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
      return;
    }
    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      try {
        recognitionRef.current.start();
        setIsListening(true);
      } catch {
        setIsListening(false);
      }
    }
  };

  // Helper: flatten all atlas places
  const getAllAtlasPlaces = useCallback(() => {
    const list = [];
    const ap = MASTER_ATLAS_DATA?.andhraPradesh || [];
    const tg = MASTER_ATLAS_DATA?.telangana || [];
    [...ap, ...tg].forEach((d) => {
      (d.spots || []).forEach((s) => {
        list.push({ ...s, district: d.name, state: d.state });
      });
    });
    return list;
  }, []);

  // Corridor Travel Action Engine
  const executeCorridorAction = useCallback((text) => {
    const lower = text.toLowerCase().trim();
    const allPlaces = getAllAtlasPlaces();

    // ── Tool 1: Book Pass ──
    if (lower.includes('book') || lower.includes('buy pass') || lower.includes('reserve ticket')) {
      const matchedPlace = allPlaces.find((p) => lower.includes(p.name.toLowerCase())) ||
        allPlaces.find((p) => lower.includes(p.mandal?.toLowerCase() || '---')) || {
          name: 'Curated Heritage Priority Pass',
          district: 'Regional Tourism Circuit',
          individualPrice: 40
        };

      const touristCountMatch = lower.match(/(\d+)\s*(people|person|tourist|ticket|pass|visitor)/i);
      const touristCount = touristCountMatch ? parseInt(touristCountMatch[1], 10) : 1;
      const unitPrice = (matchedPlace.individualPrice !== undefined && matchedPlace.individualPrice !== null)
        ? Number(matchedPlace.individualPrice)
        : (matchedPlace.isTicketed === false ? 0 : 25);
      const totalAmount = unitPrice * touristCount;

      if (onInitiateBooking) {
        onInitiateBooking({
          circuitName: `${matchedPlace.name} Entry Pass`,
          destinations: [matchedPlace.name],
          totalAmount: totalAmount
        });
      }

      return {
        type: 'initiated_booking',
        place: matchedPlace,
        touristCount,
        totalAmount
      };
    }

    // ── Tool 2: Navigate Tabs ──
    if (lower.includes('take me to') || lower.includes('go to') || lower.includes('open') || lower.includes('switch to')) {
      if (lower.includes('scanner') || lower.includes('gate') || lower.includes('turnstile')) {
        if (setActiveTab) setActiveTab('scanner');
        return { type: 'navigated', target: 'scanner', label: 'Gate Scanner' };
      }
      if (lower.includes('pass') || lower.includes('ticket') || lower.includes('wallet')) {
        if (setActiveTab) setActiveTab('passes');
        return { type: 'navigated', target: 'passes', label: 'Paperless Pass Wallet' };
      }
      if (lower.includes('district') || lower.includes('atlas') || lower.includes('59') || lower.includes('explore')) {
        if (setActiveTab) setActiveTab('explore');
        return { type: 'navigated', target: 'explore', label: '59 Districts Atlas' };
      }
      if (lower.includes('plan') || lower.includes('itinerary') || lower.includes('studio')) {
        if (setActiveTab) setActiveTab('planner');
        return { type: 'navigated', target: 'planner', label: 'Day-by-Day Trip Studio' };
      }
      if (lower.includes('circuit') || lower.includes('package') || lower.includes('curated')) {
        if (setActiveTab) setActiveTab('circuits');
        return { type: 'navigated', target: 'circuits', label: 'Curated Heritage Circuits' };
      }
      if (lower.includes('home') || lower.includes('overview')) {
        if (setActiveTab) setActiveTab('home');
        return { type: 'navigated', target: 'home', label: 'Corridor Overview' };
      }
    }

    // ── Tool 3: Show Active Passes ──
    if (lower.includes('show my pass') || lower.includes('my tickets') || lower.includes('my bookings') || lower.includes('active pass')) {
      try {
        const stored = localStorage.getItem('globetrotter_passes');
        const list = stored ? JSON.parse(stored) : [];
        return { type: 'passes_list', passes: list };
      } catch {
        return { type: 'passes_list', passes: [] };
      }
    }

    // ── Tool 4: Emergency / Safety & Scams ──
    if (lower.includes('scam') || lower.includes('fake') || lower.includes('emergency') || lower.includes('helpline') || lower.includes('police')) {
      const targetPlace = allPlaces.find((p) => lower.includes(p.name.toLowerCase()));
      return {
        type: 'safety_advisory',
        place: targetPlace || null,
        scamNotice: targetPlace?.scams_and_fakes || 'Always purchase passes and local crafts exclusively at official government counters with hologram stamps.'
      };
    }

    // ── Tool 5: Build Itinerary / Plan Trip ──
    if (lower.includes('plan') || lower.includes('itinerary') || lower.includes('2-day') || lower.includes('3-day') || lower.includes('trip')) {
      const matchedDistrict = (MASTER_ATLAS_DATA?.andhraPradesh || []).concat(MASTER_ATLAS_DATA?.telangana || [])
        .find((d) => lower.includes(d.name.toLowerCase()) || lower.includes(d.hq?.toLowerCase() || '---')) || {
          name: 'Visakhapatnam & Araku Valley',
          spots: allPlaces.slice(0, 5)
        };

      const spots = matchedDistrict.spots || allPlaces.slice(0, 4);
      const day1Stops = spots.slice(0, 2);
      const day2Stops = spots.slice(2, 4);

      const planPayload = {
        title: `2-Day ${matchedDistrict.name} Curated Circuit`,
        district: matchedDistrict.name,
        packagePrice: 320,
        days: [
          {
            dayNumber: 1,
            title: 'Heritage & Morning Panorama',
            stops: day1Stops.map((s, idx) => ({
              time: idx === 0 ? '09:00 AM' : '02:30 PM',
              name: s.name,
              category: s.category || 'Sightseeing',
              fee: s.fees || (s.individualPrice === 0 ? 'Free Entry' : (s.individualPrice ? `₹${s.individualPrice}` : 'Free Entry'))
            }))
          },
          {
            dayNumber: 2,
            title: 'Cultural Craft & Sunset Vistas',
            stops: day2Stops.map((s, idx) => ({
              time: idx === 0 ? '10:00 AM' : '04:30 PM',
              name: s.name,
              category: s.category || 'Scenic Views',
              fee: s.fees || (s.individualPrice === 0 ? 'Free Entry' : (s.individualPrice ? `₹${s.individualPrice}` : 'Free Entry'))
            }))
          }
        ]
      };

      return {
        type: 'itinerary_plan',
        plan: planPayload
      };
    }

    // ── Tool 6: Search Atlas Destinations ──
    const searchMatches = allPlaces.filter((p) => {
      const q = lower.replace(/find|show|search|best|top|places|sights|in|around/g, '').trim();
      if (!q || q.length < 3) return false;
      return p.name.toLowerCase().includes(q) ||
        p.category?.toLowerCase().includes(q) ||
        p.district?.toLowerCase().includes(q) ||
        p.description?.toLowerCase().includes(q);
    }).slice(0, 3);

    if (searchMatches.length > 0) {
      return {
        type: 'places_search',
        places: searchMatches
      };
    }

    return null;
  }, [getAllAtlasPlaces, onInitiateBooking, setActiveTab]);

  // Send message through Edge AI Worker with MCP fallback
  const handleSendMessage = async (customPrompt = null) => {
    const textToSend = (customPrompt || inputQuery).trim();
    if (!textToSend || isThinking) return;

    const userMessage = {
      id: getMsgId('user'),
      sender: 'user',
      text: textToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputQuery('');
    setIsThinking(true);

    const actionResult = executeCorridorAction(textToSend);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: textToSend,
          currentContext: {
            activeScreen: activeTab,
            selectedPlacesCount: selectedPlaces.length,
            currentPlanTitle: currentPlan?.title || null
          },
          systemInstruction: "You are the official verified AI Travel Assistant for Andhra Pradesh (26 districts) and Telangana (33 districts). You help tourists explore destinations, book gate passes, plan multi-day itineraries, and navigate without queues or tourist scams. Speak clearly, politely, and factually like an expert state tourism guide. Keep responses to 2-3 engaging sentences."
        })
      });

      let aiText = '';
      if (response.ok) {
        const data = await response.json();
        aiText = data.reply || data.response || data.message || "I've handled that for your journey across Andhra Pradesh and Telangana!";
        if (data.model) {
          setActiveModelName(data.model);
        }
      } else {
        throw new Error('Edge worker unavailable');
      }

      const assistantMessage = {
        id: getMsgId('assistant'),
        sender: 'assistant',
        text: aiText,
        actionResult,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages((prev) => [...prev, assistantMessage]);

    } catch {
      let fallbackText = "I have processed your request using the verified 59-district tourism atlas.";
      if (actionResult?.type === 'initiated_booking') {
        fallbackText = `Opening official checkout for ${actionResult.place.name} (${actionResult.touristCount} visitor${actionResult.touristCount > 1 ? 's' : ''} • ₹${actionResult.totalAmount}). Please confirm your booking details in the secure payment gateway.`;
      } else if (actionResult?.type === 'booked_pass') {
        fallbackText = `Your pass for ${actionResult.place.name} has been issued! Your digital entry ticket with gate QR code is ready below.`;
      } else if (actionResult?.type === 'navigated') {
        fallbackText = `Navigating to ${actionResult.label} for you right now!`;
      } else if (actionResult?.type === 'itinerary_plan') {
        fallbackText = `Here is your custom ${actionResult.plan.title}! All stops are verified with zero queue bottlenecks. You can book this bundled circuit below.`;
      } else if (actionResult?.type === 'passes_list') {
        fallbackText = actionResult.passes.length > 0 
          ? `You have ${actionResult.passes.length} verified digital entry passes in your wallet.`
          : 'You do not have any active passes yet. Tell me which monument you would like to visit to issue one instantly!';
      } else if (actionResult?.type === 'places_search') {
        fallbackText = `Found ${actionResult.places.length} verified destinations matching your request!`;
      } else if (actionResult?.type === 'safety_advisory') {
        fallbackText = 'Here is your official safety and authentic purchase advisory:';
      }

      const assistantFallback = {
        id: getMsgId('assistant-fallback'),
        sender: 'assistant',
        text: fallbackText,
        actionResult,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages((prev) => [...prev, assistantFallback]);
    } finally {
      setIsThinking(false);
    }
  };

  const handleAddPlaceToTrip = (place) => {
    if (setSelectedPlaces) {
      setSelectedPlaces((prev) => {
        if (prev.some((p) => p.name === place.name)) return prev;
        return [...prev, place];
      });
      try {
        confetti({ particleCount: 40, spread: 50, origin: { y: 0.7 } });
      } catch {
        // Confetti fallback
      }
    }
  };

  const handleClearChat = () => {
    setMessages([
      {
        id: getMsgId('msg-reset'),
        sender: 'assistant',
        text: 'Chat history cleared. How can I assist your travel across Andhra Pradesh and Telangana?',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    ]);
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex justify-end pointer-events-none">
        
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm pointer-events-auto"
        />

        {/* Sliding Travel Assistant Drawer */}
        <motion.aside
          initial={{ x: '100%', opacity: 0.5 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: '100%', opacity: 0 }}
          transition={{ type: 'spring', damping: 28, stiffness: 260 }}
          className="relative z-10 w-full sm:w-[480px] md:w-[520px] h-full bg-[#080C14] border-l border-white/10 shadow-2xl flex flex-col pointer-events-auto text-slate-100 font-sans-clean overflow-hidden"
          aria-label="Travel Assistant Drawer"
        >
          {/* Header Bar */}
          <header className="px-5 py-4 border-b border-white/10 bg-[#0B101B]/95 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-8 h-8 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 text-slate-950 shadow-md">
                <Sparkles className="w-4 h-4 fill-current" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-sm font-bold text-white tracking-tight">Travel Assistant</h2>
                  <span className="text-[9px] px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 font-semibold font-mono">
                    {activeModelName}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 truncate max-w-[240px]">
                  Context: {TAB_NAMES[activeTab] || 'Active Screen'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={handleClearChat}
                className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
                title="Clear conversation"
              >
                <Trash2 className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={onClose}
                className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
                title="Close Assistant (Esc)"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </header>

          {/* Quick Action Suggestion Chips */}
          <div className="px-4 py-2.5 border-b border-white/5 bg-[#090D16] flex items-center gap-2 overflow-x-auto no-scrollbar">
            {PROMPT_SUGGESTIONS.map((sug, idx) => (
              <button
                key={sug.label || `chip-${idx}`}
                type="button"
                onClick={() => handleSendMessage(sug.text)}
                disabled={isThinking}
                className="shrink-0 px-2.5 py-1 rounded-full bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 hover:border-emerald-500/30 text-[11px] text-slate-300 hover:text-white font-medium transition-all cursor-pointer whitespace-nowrap disabled:opacity-50"
              >
                {sug.label}
              </button>
            ))}
          </div>

          {/* Messages Stream */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
              >
                {/* Message Bubble */}
                <div
                  className={`max-w-[88%] rounded-2xl px-4 py-3 text-xs leading-relaxed ${
                    msg.sender === 'user'
                      ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md'
                      : 'bg-[#101726] border border-white/10 text-slate-200'
                  }`}
                >
                  <p className="whitespace-pre-wrap">{msg.text}</p>
                  
                  <span className={`block text-[9px] mt-1.5 opacity-60 ${msg.sender === 'user' ? 'text-right' : 'text-left'}`}>
                    {msg.timestamp}
                  </span>
                </div>

                {/* Regional Travel Action Result Cards */}
                {msg.actionResult && (
                  <div className="w-full max-w-[92%] mt-2 space-y-2">
                    
                    {/* Tool Result: Initiated Booking Card */}
                    {msg.actionResult.type === 'initiated_booking' && (
                      <div className="p-3.5 rounded-2xl bg-gradient-to-br from-[#0D1524] to-[#09101C] border border-amber-500/30 shadow-lg flex flex-col gap-2.5">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] uppercase tracking-wider font-mono text-amber-400 font-bold flex items-center gap-1.5">
                            <Ticket className="w-3.5 h-3.5" /> Official Gate Pass Checkout
                          </span>
                          <span className="text-xs font-mono font-bold text-amber-300">
                            ₹{msg.actionResult.totalAmount}
                          </span>
                        </div>
                        
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-xl bg-white/5 border border-white/10">
                            <ShieldCheck className="w-7 h-7 text-amber-300" />
                          </div>
                          <div className="flex flex-col">
                            <span className="text-xs font-bold text-white">{msg.actionResult.place.name}</span>
                            <span className="text-[10px] text-slate-400 font-mono">
                              {msg.actionResult.touristCount} Visitor{msg.actionResult.touristCount > 1 ? 's' : ''} • {msg.actionResult.place.district}
                            </span>
                            <span className="text-[10px] text-emerald-300">Official State Tourism Verification</span>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            if (onInitiateBooking) {
                              onInitiateBooking({
                                circuitName: `${msg.actionResult.place.name} Entry Pass`,
                                destinations: [msg.actionResult.place.name],
                                totalAmount: msg.actionResult.totalAmount
                              });
                            }
                            onClose();
                          }}
                          className="w-full py-2 px-3 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-md"
                        >
                          <span>Proceed to Payment</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}

                    {/* Tool Result: Booked Pass Card */}
                    {msg.actionResult.type === 'booked_pass' && (
                      <div className="p-3.5 rounded-2xl bg-gradient-to-br from-[#0D1524] to-[#09101C] border border-emerald-500/30 shadow-lg flex flex-col gap-2.5">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] uppercase tracking-wider font-mono text-emerald-400 font-bold flex items-center gap-1.5">
                            <Ticket className="w-3.5 h-3.5" /> Official Gate Pass Minted
                          </span>
                          <span className="text-xs font-mono font-bold text-amber-300">
                            {msg.actionResult.pass.gateFeeTotal}
                          </span>
                        </div>
                        
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-xl bg-white/5 border border-white/10">
                            <QrCode className="w-8 h-8 text-emerald-300" />
                          </div>
                          <div className="flex flex-col">
                            <span className="text-xs font-bold text-white">{msg.actionResult.pass.circuitName}</span>
                            <span className="text-[10px] text-slate-400 font-mono">Code: {msg.actionResult.pass.reference}</span>
                            <span className="text-[10px] text-emerald-300">Valid: 7 Days • Fast-Track Entry</span>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            if (setActiveTab) setActiveTab('passes');
                            onClose();
                          }}
                          className="w-full py-2 px-3 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                        >
                          <span>View in Passes Wallet</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}

                    {/* Tool Result: Navigation Confirmation */}
                    {msg.actionResult.type === 'navigated' && (
                      <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                          <span className="text-xs font-medium text-emerald-200">Switched to {msg.actionResult.label}</span>
                        </div>
                        <button
                          type="button"
                          onClick={onClose}
                          className="text-[11px] text-amber-300 font-semibold hover:underline cursor-pointer"
                        >
                          View Screen →
                        </button>
                      </div>
                    )}

                    {/* Tool Result: Structured Itinerary Plan */}
                    {msg.actionResult.type === 'itinerary_plan' && (
                      <div className="p-3.5 rounded-2xl bg-[#0F1626] border border-amber-500/20 flex flex-col gap-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-white">{msg.actionResult.plan.title}</span>
                          <span className="text-xs font-mono font-bold text-amber-400">₹{msg.actionResult.plan.packagePrice}</span>
                        </div>

                        <div className="space-y-2">
                          {msg.actionResult.plan.days.map((day) => (
                            <div key={day.dayNumber} className="p-2 rounded-xl bg-white/[0.02] border border-white/5">
                              <span className="text-[10px] font-bold text-amber-300 block mb-1">
                                Day {day.dayNumber}: {day.title}
                              </span>
                              <div className="space-y-1">
                                {day.stops.map((stop, sIdx) => (
                                   <div key={sIdx} className="flex justify-between text-[11px] text-slate-300">
                                    <span>• {stop.name}</span>
                                    <span className="font-mono text-[10px] text-slate-400">{stop.time}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            if (onInitiateBooking) {
                              onInitiateBooking({
                                circuitName: msg.actionResult.plan.title,
                                destinations: msg.actionResult.plan.days.flatMap((d) => d.stops.map((s) => s.name)),
                                totalAmount: msg.actionResult.plan.packagePrice
                              });
                            }
                          }}
                          className="w-full py-2 px-3 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-md cursor-pointer"
                        >
                          <Ticket className="w-3.5 h-3.5" />
                          <span>Book Curated Pass (₹{msg.actionResult.plan.packagePrice})</span>
                        </button>
                      </div>
                    )}

                    {/* Tool Result: Destination Atlas Search Cards */}
                    {msg.actionResult.type === 'places_search' && (
                      <div className="space-y-2">
                        {msg.actionResult.places.map((place, pIdx) => (
                          <div key={pIdx} className="p-3 rounded-xl bg-[#0D1424] border border-white/10 flex flex-col gap-2">
                            <div className="flex justify-between items-start">
                              <div>
                                <h4 className="text-xs font-bold text-white">{place.name}</h4>
                                <span className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                                  <MapPin className="w-3 h-3 text-emerald-400" /> {place.district}
                                </span>
                              </div>
                              <span className="text-xs font-mono font-bold text-emerald-400">
                                {place.individualPrice ? `₹${place.individualPrice}` : 'Free Entry'}
                              </span>
                            </div>

                            <p className="text-[11px] text-slate-300 line-clamp-2">
                              {place.description}
                            </p>

                            <div className="flex items-center gap-2 pt-1 border-t border-white/5">
                              <button
                                type="button"
                                onClick={() => handleAddPlaceToTrip(place)}
                                className="flex-1 py-1.5 px-2 rounded-lg bg-white/5 hover:bg-white/10 text-[10px] text-slate-200 font-semibold flex items-center justify-center gap-1 transition-colors cursor-pointer"
                              >
                                <Plus className="w-3 h-3" /> Add to Trip
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  if (onInitiateBooking) {
                                    onInitiateBooking({
                                      circuitName: `${place.name} Official Pass`,
                                      destinations: [place.name],
                                      totalAmount: (place.individualPrice !== undefined && place.individualPrice !== null)
                                        ? Number(place.individualPrice)
                                        : (place.isTicketed === false ? 0 : 25)
                                    });
                                  }
                                }}
                                className="flex-1 py-1.5 px-2 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 text-[10px] font-semibold flex items-center justify-center gap-1 transition-colors cursor-pointer"
                              >
                                <Ticket className="w-3 h-3" /> Book Pass
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Tool Result: Safety & Scam Advisory */}
                    {msg.actionResult.type === 'safety_advisory' && (
                      <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-xs flex flex-col gap-2">
                        <div className="flex items-center gap-1.5 text-amber-400 font-bold text-xs">
                          <AlertTriangle className="w-4 h-4" />
                          <span>Official Tourist Safety Advisory</span>
                        </div>
                        <p className="text-slate-300 leading-relaxed text-[11px]">
                          {msg.actionResult.scamNotice}
                        </p>
                        <div className="pt-2 border-t border-amber-500/20 flex items-center justify-between text-[10px] text-slate-400">
                          <span className="flex items-center gap-1">
                            <PhoneCall className="w-3 h-3 text-emerald-400" /> Police: 112
                          </span>
                          <span>AP Tourism: 1800-42-545454</span>
                          <span>TG Tourism: 1800-42-546464</span>
                        </div>
                      </div>
                    )}

                  </div>
                )}

              </div>
            ))}

            {isThinking && (
              <div className="flex items-center gap-2 p-3 rounded-2xl bg-[#101726] border border-white/5 w-fit">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-400" />
                <span className="text-xs text-slate-400 font-medium">Assistant is searching verified atlas...</span>
              </div>
            )}

            <div ref={chatBottomRef} />
          </div>

          {/* Bottom Chat Input Bar */}
          <footer className="p-3 sm:p-4 border-t border-white/10 bg-[#0A0E18] flex flex-col gap-2">
            {/* Quick Inquiry Chips for Noisy / Crowded Sites */}
            <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none pb-0.5">
              {[
                { label: '🏛️ Monument Timings & Fees', query: 'Show me entry timings and fees for key monuments' },
                { label: '🚨 Emergency & Helplines', query: 'Show emergency medical and police helplines' },
                { label: '🍛 Authentic Regional Food', query: 'What authentic local food specialties should I try in Andhra and Telangana?' },
                { label: '🚗 Transport & Taxi Tips', query: 'What are standard local auto and taxi fare guidelines?' }
              ].map((chip) => (
                <button
                  key={chip.label}
                  type="button"
                  onClick={() => handleSendMessage(chip.query)}
                  className="px-2.5 py-1 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-[11px] text-slate-300 hover:text-white whitespace-nowrap transition-colors cursor-pointer shrink-0 font-sans-clean active:scale-95"
                >
                  {chip.label}
                </button>
              ))}
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage();
              }}
              className="flex items-center gap-2 p-1.5 rounded-2xl bg-[#121927] border border-white/10 focus-within:border-emerald-500/50 transition-all shadow-inner"
            >
              <input
                ref={inputRef}
                type="text"
                value={inputQuery}
                onChange={(e) => setInputQuery(e.target.value)}
                placeholder="Ask Assistant... ('Book pass for Golconda', 'Plan 2-day Araku trip')"
                className="flex-1 bg-transparent px-3 py-2 text-xs text-white placeholder:text-slate-500 focus:outline-none"
              />

              <button
                type="button"
                onClick={toggleVoiceListening}
                className={`p-2 rounded-xl transition-colors cursor-pointer ${
                  isListening
                    ? 'bg-rose-500 text-white'
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
                title={isListening ? 'Stop listening' : 'Speak your question'}
              >
                {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
              </button>

              <button
                type="submit"
                disabled={!inputQuery.trim() || isThinking}
                className="p-2 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 text-slate-950 font-bold hover:brightness-110 disabled:opacity-30 transition-all cursor-pointer shadow-md"
                title="Send message"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>

            <div className="mt-2 flex items-center justify-between text-[10px] text-slate-500 px-1">
              <span>Press <kbd className="px-1 py-0.5 rounded bg-white/5 border border-white/10 font-mono">Enter</kbd> to send</span>
              <span>All 59 Districts & Passes Integrated</span>
            </div>
          </footer>
        </motion.aside>
      </div>
    </AnimatePresence>
  );
}
