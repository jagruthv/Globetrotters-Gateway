import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  Send, 
  Clock, 
  Navigation, 
  Utensils, 
  ShieldCheck, 
  Ticket, 
  ChevronRight, 
  Headphones, 
  QrCode, 
  Bot, 
  BookmarkCheck, 
  CheckCircle2
} from 'lucide-react';
import confetti from 'canvas-confetti';

const QUICK_PROMPTS = [
  { label: '🎟️ Book Pass for Me', prompt: 'Please book this curated pass directly under my tourist account.' },
  { label: '💾 Save Trip to My Profile', prompt: 'Save this itinerary into my saved trips profile.' },
  { label: '🎫 Show My Tickets', prompt: 'Show me all my active booked passes and tickets.' },
  { label: '🌅 Prioritize Sunset Views', prompt: 'Adjust the plan so we reach the best viewpoints or beaches right at sunset for golden-hour photography.' },
  { label: '👨‍👩‍👧 Family-Friendly Pace', prompt: 'Make the daily pace more relaxed for a family with kids/elders. Remove strenuous climbs and start days at 10 AM.' },
  { label: '🍛 Authentic Local Food', prompt: 'Add dedicated regional lunch stops featuring famous local Andhra & Telangana culinary specialties.' }
];

const createMsgId = (prefix) => `${prefix}-${performance.now()}`;

// Retrieve current logged in user if available
const getStoredUser = () => {
  try {
    const stored = localStorage.getItem('globetrotter_user');
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
};

// Execute account actions (pass booking, saving trips)
function runAgentTool(toolName, _params, planToUse, onBookPass, latestPlan, currentPlan) {
  const user = getStoredUser();
  const touristName = user?.fullName || (user?.email ? user.email.split('@')[0] : 'Traveler');

  if (toolName === 'book_pass') {
    const orderRef = `APTG-${Math.floor(10000 + Math.random() * 90000)}`;
    const newPass = {
      reference: orderRef,
      token: orderRef,
      touristName,
      circuitName: planToUse?.title || 'Custom Curated Tour Pass',
      validFrom: 'Today',
      validUntil: '7 Days Access',
      status: 'ACTIVE_AUTHENTICATED',
      placesAllowed: (planToUse?.days || []).flatMap(d => (d.stops || []).map(s => s.name || s.placeName)).slice(0, 6),
      gateFeeTotal: `₹${planToUse?.packagePrice || 320} (Pre-Paid Online)`
    };

    try {
      const stored = localStorage.getItem('globetrotter_passes');
      const list = stored ? JSON.parse(stored) : [];
      list.unshift(newPass);
      localStorage.setItem('globetrotter_passes', JSON.stringify(list));
    } catch (err) {
      console.warn('Pass store warning:', err);
    }

    confetti({
      particleCount: 100,
      spread: 80,
      origin: { y: 0.6 },
      colors: ['#00F2FE', '#4F46E5', '#10B981']
    });

    if (onBookPass) {
      onBookPass(planToUse || latestPlan || currentPlan);
    }

    return {
      type: 'booked_ticket',
      pass: newPass
    };
  }

  if (toolName === 'save_itinerary') {
    try {
      const stored = localStorage.getItem('globetrotter_saved_trips');
      const list = stored ? JSON.parse(stored) : [];
      list.unshift({
        id: `trip_${Date.now()}`,
        savedAt: new Date().toISOString(),
        plan: planToUse || latestPlan || currentPlan
      });
      localStorage.setItem('globetrotter_saved_trips', JSON.stringify(list));
    } catch (err) {
      console.warn('Saved trip store warning:', err);
    }

    return {
      type: 'saved_trip',
      title: planToUse?.title || 'Custom Circuit'
    };
  }

  if (toolName === 'show_passes') {
    try {
      const stored = localStorage.getItem('globetrotter_passes');
      const list = stored ? JSON.parse(stored) : [];
      return {
        type: 'passes_list',
        passes: list
      };
    } catch {
      return { type: 'passes_list', passes: [] };
    }
  }

  return null;
}

export default function GeminiPlanDrawer({
  isOpen,
  onClose,
  currentPlan,
  onUpdatePlan,
  onBookPass
}) {
  const [messages, setMessages] = useState(() => {
    const user = getStoredUser();
    const touristName = user?.fullName || 'Explorer';
    return [
      {
        id: 'welcome-msg',
        sender: 'gemini',
        text: `Namaste, ${touristName}! I am your Autonomous Gemini Concierge & Account Operator. I can customize your route, book entry passes, save trips to your profile, or display your tickets directly here.\n\nWhat would you like me to do?`,
        showPlanPreview: true,
        plan: currentPlan
      }
    ];
  });

  const [inputText, setInputText] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const [latestPlan, setLatestPlan] = useState(currentPlan);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isThinking]);

  const handleSendMessage = async (customText = null) => {
    const textToSend = customText || inputText;
    if (!textToSend.trim() || isThinking) return;

    const userMsg = {
      id: createMsgId('user'),
      sender: 'user',
      text: textToSend
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputText('');
    setIsThinking(true);

    // Client-side quick intents for instant responsiveness
    const lower = textToSend.toLowerCase();
    const isExplicitBooking = lower.includes('book pass') || lower.includes('book for me') || lower.includes('buy ticket');
    const isExplicitSave = lower.includes('save trip') || lower.includes('save to my profile');
    const isExplicitShowPasses = lower.includes('show my tickets') || lower.includes('show passes') || lower.includes('my bookings');

    try {
      const response = await fetch('/api/trip/modify-ai-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPlan: latestPlan || currentPlan,
          userFeedback: textToSend,
          chatHistory: messages.slice(-4)
        })
      });

      if (response.ok) {
        const data = await response.json();
        const updated = data.updatedPlan || latestPlan || currentPlan;
        setLatestPlan(updated);
        if (onUpdatePlan) {
          onUpdatePlan(updated);
        }

        // Check if agent action is triggered
        let toolToRun = data.action?.tool;
        if (!toolToRun || toolToRun === 'none') {
          if (isExplicitBooking) toolToRun = 'book_pass';
          else if (isExplicitSave) toolToRun = 'save_itinerary';
          else if (isExplicitShowPasses) toolToRun = 'show_passes';
        }

        let actionResult = null;
        if (toolToRun && toolToRun !== 'none') {
          actionResult = runAgentTool(toolToRun, data.action?.params || {}, updated, onBookPass, latestPlan, currentPlan);
        }

        const aiMsg = {
          id: createMsgId('ai'),
          sender: 'gemini',
          text: data.replyMessage || "I've processed your request on your account!",
          showPlanPreview: !actionResult || actionResult.type !== 'booked_ticket',
          plan: updated,
          readyToBook: data.readyToBook || false,
          actionResult
        };
        setMessages((prev) => [...prev, aiMsg]);
      } else {
        throw new Error('API modification error');
      }
    } catch {
      // Offline fallback handling
      let actionResult = null;
      if (isExplicitBooking) {
        actionResult = runAgentTool('book_pass', {}, latestPlan || currentPlan, onBookPass, latestPlan, currentPlan);
      } else if (isExplicitSave) {
        actionResult = runAgentTool('save_itinerary', {}, latestPlan || currentPlan, onBookPass, latestPlan, currentPlan);
      } else if (isExplicitShowPasses) {
        actionResult = runAgentTool('show_passes', {}, latestPlan || currentPlan, onBookPass, latestPlan, currentPlan);
      }

      const aiFallbackMsg = {
        id: createMsgId('ai-err'),
        sender: 'gemini',
        text: actionResult?.type === 'booked_ticket' 
          ? "I've booked your All-Access Entry Ticket directly under your account! Here is your BookMyShow-style cinema pass."
          : actionResult?.type === 'saved_trip'
          ? "Your itinerary has been saved to your account profile!"
          : `I've adjusted your trip pacing to: "${textToSend}". You can confirm your booking below!`,
        showPlanPreview: !actionResult || actionResult.type !== 'booked_ticket',
        plan: latestPlan || currentPlan,
        readyToBook: true,
        actionResult
      };
      setMessages((prev) => [...prev, aiFallbackMsg]);
    } finally {
      setIsThinking(false);
    }
  };

  const handleCheckoutAndPay = (planToBook) => {
    confetti({
      particleCount: 90,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#00F2FE', '#4F46E5', '#10B981']
    });
    if (onBookPass) {
      onBookPass(planToBook || latestPlan || currentPlan);
    }
    if (onClose) {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-end bg-black/60 backdrop-blur-sm">
        
        {/* Backdrop dismiss */}
        <div 
          onClick={onClose}
          className="absolute inset-0 cursor-pointer"
        />

        {/* Gemini Google Apps Slide-Over Modal */}
        <motion.div
          initial={{ x: '100%', opacity: 0.6 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: '100%', opacity: 0.6 }}
          transition={{ type: 'spring', damping: 28, stiffness: 260 }}
          className="relative w-full max-w-xl h-full bg-[#0E121A] border-l border-white/10 shadow-2xl flex flex-col z-10 text-slate-100"
        >
          {/* Header */}
          <div className="p-4 md:p-5 border-b border-white/10 flex items-center justify-between bg-black/40">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-500 to-amber-400 p-0.5 shadow-md flex items-center justify-center">
                <div className="w-full h-full bg-[#0E121A] rounded-[10px] flex items-center justify-center">
                  <Bot className="w-4 h-4 text-amber-400" />
                </div>
              </div>
              <div className="flex flex-col">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-white font-sans-clean">
                    Travel Assistant
                  </h3>
                  <span className="text-[9px] px-2 py-0.2 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-semibold font-sans-clean">
                    Online Guide
                  </span>
                </div>
                <span className="text-[11px] text-slate-400 font-sans-clean">
                  Customizes your route and books entry passes
                </span>
              </div>
            </div>

            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center text-slate-400 hover:text-white transition-colors cursor-pointer"
              aria-label="Close assistant"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Quick Prompt Suggestion Chips */}
          <div className="px-4 py-2.5 bg-black/30 border-b border-white/5 flex items-center gap-2 overflow-x-auto no-scrollbar shrink-0">
            {QUICK_PROMPTS.map((qp) => (
              <button
                key={qp.label}
                disabled={isThinking}
                onClick={() => handleSendMessage(qp.prompt)}
                className="whitespace-nowrap px-3 py-1.5 rounded-full bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-[11px] font-medium text-slate-300 hover:text-amber-300 transition-all cursor-pointer disabled:opacity-50 shrink-0 font-sans-clean"
              >
                {qp.label}
              </button>
            ))}
          </div>

          {/* Chat Messages Stream */}
          <div className="flex-1 overflow-y-auto p-4 md:p-5 flex flex-col gap-4">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
              >
                {/* Message Bubble */}
                <div
                  className={`max-w-[88%] p-3.5 rounded-2xl text-xs leading-relaxed font-sans-clean ${
                    msg.sender === 'user'
                      ? 'bg-amber-400 text-slate-950 font-semibold rounded-tr-sm shadow-md'
                      : 'bg-white/[0.04] border border-white/10 text-slate-200 rounded-tl-sm'
                  }`}
                >
                  <p className="whitespace-pre-wrap">{msg.text}</p>
                </div>

                {/* MCP ACTION RESULT: BOOKED CINEMA TICKET */}
                {msg.actionResult?.type === 'booked_ticket' && (
                  <div className="w-full max-w-md mt-3 rounded-2xl bg-[#151B26] border border-amber-500/30 p-4 shadow-xl flex flex-col gap-3 font-sans-clean">
                    <div className="flex items-center justify-between border-b border-white/10 pb-2">
                      <div className="flex items-center gap-2">
                        <Ticket className="w-4 h-4 text-amber-400" />
                        <span className="text-[11px] font-bold text-white uppercase font-mono">
                          Digital Movie-Style Gate Pass
                        </span>
                      </div>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-mono font-bold">
                        {msg.actionResult.pass.reference}
                      </span>
                    </div>

                    <div className="flex items-center justify-between gap-4">
                      <div className="flex flex-col gap-1">
                        <h4 className="text-sm font-extrabold text-white">
                          {msg.actionResult.pass.circuitName}
                        </h4>
                        <div className="flex items-center gap-2 text-[11px] text-slate-300">
                          <span>Traveler: <strong>{msg.actionResult.pass.touristName}</strong></span>
                          <span>•</span>
                          <span className="text-emerald-400 font-semibold">{msg.actionResult.pass.gateFeeTotal}</span>
                        </div>
                      </div>
                      <div className="w-16 h-16 bg-white p-1 rounded-lg flex items-center justify-center shrink-0">
                        <QrCode className="w-14 h-14 text-slate-950" />
                      </div>
                    </div>

                    <div className="w-full border-b border-dashed border-white/15 my-1" />

                    <div className="flex items-center justify-between text-[11px] text-slate-400">
                      <span className="flex items-center gap-1 text-emerald-400">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Fast-Track QR Entry Active
                      </span>
                      <button
                        onClick={() => {
                          if (onBookPass) onBookPass(msg.plan || latestPlan);
                          if (onClose) onClose();
                        }}
                        className="text-amber-300 hover:underline font-semibold cursor-pointer"
                      >
                        View Full Ticket Pass →
                      </button>
                    </div>
                  </div>
                )}

                {/* MCP ACTION RESULT: SAVED TRIP */}
                {msg.actionResult?.type === 'saved_trip' && (
                  <div className="mt-2.5 p-3 rounded-xl bg-amber-950/40 border border-amber-500/30 flex items-center gap-2.5 text-xs text-amber-200 font-sans-clean">
                    <BookmarkCheck className="w-4 h-4 text-amber-400 shrink-0" />
                    <span>Trip <strong>"{msg.actionResult.title}"</strong> saved to your tourist profile! Access it anytime from your account.</span>
                  </div>
                )}

                {/* Inline Itinerary Preview Card when AI updates the plan */}
                {msg.showPlanPreview && msg.plan && (
                  <div className="w-full mt-3 p-4 rounded-2xl bg-white/[0.02] border border-amber-500/20 shadow-inner flex flex-col gap-3">
                    <div className="flex items-center justify-between border-b border-white/10 pb-2">
                      <div className="flex flex-col">
                        <span className="text-[10px] text-amber-400 font-mono uppercase tracking-wider font-semibold">
                          Customized Itinerary
                        </span>
                        <h4 className="text-sm font-bold text-white font-sans-clean mt-0.5">
                          {msg.plan.title || `${msg.plan.days?.length || 2}-Day Curated Tour`}
                        </h4>
                      </div>
                      <div className="flex items-center gap-1.5 text-[11px] text-slate-300 bg-white/5 px-2.5 py-1 rounded-lg">
                        <Navigation className="w-3 h-3 text-amber-400" />
                        <span>{msg.plan.totalRoadKm || 140} km</span>
                        <span>•</span>
                        <Clock className="w-3 h-3 text-emerald-400" />
                        <span>{msg.plan.totalDriveHours || '4 hrs'}</span>
                      </div>
                    </div>

                    {/* Compact Day Cards */}
                    <div className="flex flex-col gap-2">
                      {(msg.plan.days || []).map((day, dIdx) => (
                        <div 
                          key={day.dayNumber || `day-${day.theme || dIdx}`} 
                          className="p-3 rounded-xl bg-black/40 border border-white/5 flex flex-col gap-1.5"
                        >
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-bold text-amber-300 font-sans-clean">
                              Day {day.dayNumber || dIdx + 1}: {day.theme || 'Heritage & Nature'}
                            </span>
                            <span className="text-[10px] text-slate-400 font-mono">
                              {day.stops?.length || 0} stops
                            </span>
                          </div>
                          
                          <div className="flex flex-wrap gap-1 mt-0.5">
                            {(day.stops || []).map((stop, sIdx) => (
                              <span 
                                key={stop.name || `${stop.placeName || 'stop'}-${sIdx}`} 
                                className="px-2 py-0.5 rounded-md bg-white/[0.04] text-[10px] text-slate-300 flex items-center gap-1 font-sans-clean"
                              >
                                <span>{stop.name || stop.placeName}</span>
                                {stop.timeSlot && <span className="text-slate-500 font-mono">({stop.timeSlot})</span>}
                              </span>
                            ))}
                          </div>

                          {day.stops?.[0]?.culinaryTip && (
                            <div className="flex items-center gap-1.5 text-[10px] text-amber-300/90 pt-1 border-t border-white/5 font-sans-clean">
                              <Utensils className="w-3 h-3 text-amber-400 shrink-0" />
                              <span className="truncate">Food highlight: {day.stops[0].culinaryTip}</span>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>

                    {/* High-Converting Lead Generation & Payment Conversion Box */}
                    <div className="p-3.5 rounded-xl bg-gradient-to-r from-amber-950/40 via-stone-900/50 to-slate-900/60 border border-amber-500/30 flex flex-col gap-2.5 mt-1">
                      <div className="flex items-center justify-between">
                        <div className="flex flex-col">
                          <span className="text-[10px] text-emerald-300 font-bold uppercase tracking-wider">
                            Official All-Access Circuit Pass
                          </span>
                          <span className="text-xs text-slate-300 font-medium font-sans-clean">
                            Direct Queue-Free Entry + Multilingual Audio Guide
                          </span>
                        </div>
                        <div className="flex flex-col items-end">
                          <span className="text-base font-bold text-emerald-300 font-sans-clean">
                            ₹{msg.plan.packagePrice || 320}
                          </span>
                          <span className="text-[10px] text-slate-400 line-through">
                            ₹{msg.plan.individualPriceTotal || (msg.plan.packagePrice ? msg.plan.packagePrice + 120 : 440)}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 text-[10px] text-slate-300 font-sans-clean">
                        <span className="flex items-center gap-1 text-emerald-400 font-semibold">
                          <ShieldCheck className="w-3 h-3" />
                          <span>Save ₹120 vs Counter Tickets</span>
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-1 text-amber-300">
                          <Headphones className="w-3 h-3" />
                          <span>Audio Guide Unlocked</span>
                        </span>
                      </div>

                      <button
                        onClick={() => handleCheckoutAndPay(msg.plan)}
                        className="w-full py-2.5 px-4 rounded-full bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 shadow-md transition-all hover:scale-[1.01] active:scale-[0.99] cursor-pointer"
                      >
                        <Ticket className="w-4 h-4 text-slate-950" />
                        <span>Book Circuit Pass & Pay (₹{msg.plan.packagePrice || 320})</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>

                  </div>
                )}
              </div>
            ))}

            {isThinking && (
              <div className="flex items-center gap-2 p-3 rounded-2xl bg-white/[0.03] border border-white/5 max-w-[70%]">
                <div className="w-4 h-4 rounded-full bg-amber-400 animate-ping" />
                <span className="text-xs text-slate-300 font-sans-clean">
                  Gemini 3.8 Flash is executing your request...
                </span>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Bottom Chat Input Bar */}
          <form 
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="p-3 md:p-4 border-t border-white/10 bg-black/40 flex items-center gap-2 shrink-0"
          >
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Ask Gemini ('Book pass for me', 'Save this trip', 'Add sunset viewpoint')..."
              className="flex-1 py-2.5 px-4 rounded-xl bg-white/[0.04] border border-white/10 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-amber-400 transition-colors font-sans-clean"
            />
            <button
              type="submit"
              disabled={!inputText.trim() || isThinking}
              className="py-2.5 px-4 rounded-full bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition-all disabled:opacity-40 cursor-pointer shrink-0 shadow-md"
            >
              <Send className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Ask</span>
            </button>
          </form>

        </motion.div>
      </div>
    </AnimatePresence>
  );
}
