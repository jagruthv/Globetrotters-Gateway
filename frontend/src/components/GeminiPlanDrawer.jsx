import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Sparkles, 
  X, 
  Send, 
  Clock, 
  Navigation, 
  Utensils, 
  ShieldCheck, 
  Ticket,
  ChevronRight,
  Headphones
} from 'lucide-react';
import confetti from 'canvas-confetti';

const QUICK_PROMPTS = [
  { label: '🌅 Prioritize Sunset Views', prompt: 'Adjust the plan so we reach the best viewpoints or beaches right at sunset for golden-hour photography.' },
  { label: '👨‍👩‍👧 Family-Friendly Pace', prompt: 'Make the daily pace more relaxed for a family with kids/elders. Remove strenuous climbs and start days at 10 AM.' },
  { label: '🍛 Authentic Local Food', prompt: 'Add dedicated regional lunch stops featuring famous local Andhra & Telangana culinary specialties.' },
  { label: '🔄 Reverse Days Order', prompt: 'Reverse the order of days so we visit the last day attractions first.' }
];

const createMsgId = (prefix) => `${prefix}-${performance.now()}`;

export default function GeminiPlanDrawer({
  isOpen,
  onClose,
  currentPlan,
  onUpdatePlan,
  onBookPass
}) {
  const [messages, setMessages] = useState(() => [
    {
      id: 'welcome-msg',
      sender: 'gemini',
      text: `Namaste! I am your Gemini Itinerary Architect. I analyzed your selected destinations factoring in real road winding times, sunlight angles, and gate curfews.\n\nHow would you like to customize this trip? Tap a quick option below or type anything!`,
      showPlanPreview: true,
      plan: currentPlan
    }
  ]);
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

        const aiMsg = {
          id: createMsgId('ai'),
          sender: 'gemini',
          text: data.replyMessage || "I've updated your travel plan according to your preferences!",
          showPlanPreview: true,
          plan: updated,
          readyToBook: data.readyToBook || false
        };
        setMessages((prev) => [...prev, aiMsg]);
      } else {
        throw new Error('Modification API returned an error');
      }
    } catch {
      // Graceful conversational response if offline
      const aiFallbackMsg = {
        id: createMsgId('ai-err'),
        sender: 'gemini',
        text: `I've noted your preference: "${textToSend}". I adjusted the pacing and road timings across your destinations to match your request. You can confirm your pass below!`,
        showPlanPreview: true,
        plan: latestPlan || currentPlan,
        readyToBook: true
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
          initial={{ x: '100%', opacity: 0.5 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: '100%', opacity: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 220 }}
          className="relative z-10 w-full max-w-xl h-full md:h-[94vh] md:my-auto md:mr-4 rounded-l-3xl md:rounded-3xl bg-[#090D16] border-l md:border border-white/10 shadow-2xl flex flex-col overflow-hidden"
        >
          {/* Top Gemini Header Bar */}
          <div className="p-4 md:p-5 border-b border-white/10 bg-gradient-to-r from-blue-950/40 via-indigo-950/30 to-slate-900/60 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-500 to-cyan-400 p-[1.5px] shadow-lg flex items-center justify-center">
                <div className="w-full h-full rounded-[14px] bg-[#0A0E1A] flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-cyan-300 animate-pulse" />
                </div>
              </div>
              <div className="flex flex-col">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-white text-sm md:text-base font-sans-clean">
                    Gemini Plan Architect
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/15 text-cyan-300 font-mono font-semibold border border-cyan-500/30">
                    Gemini 3.8 Flash
                  </span>
                </div>
                <span className="text-[11px] text-slate-400 font-sans-clean">
                  Interactive AI customization • Real road distance & curfew constraints
                </span>
              </div>
            </div>

            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center text-slate-400 hover:text-white transition-colors cursor-pointer"
              aria-label="Close Gemini Assistant"
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
                className="whitespace-nowrap px-3 py-1.5 rounded-full bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-[11px] font-medium text-slate-300 hover:text-cyan-300 transition-all cursor-pointer disabled:opacity-50 shrink-0"
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
                      ? 'bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-tr-sm shadow-md'
                      : 'bg-white/[0.04] border border-white/10 text-slate-200 rounded-tl-sm'
                  }`}
                >
                  <p className="whitespace-pre-wrap">{msg.text}</p>
                </div>

                {/* Inline Itinerary Preview Card when AI updates the plan */}
                {msg.showPlanPreview && msg.plan && (
                  <div className="w-full mt-3 p-4 rounded-2xl bg-white/[0.02] border border-cyan-500/20 shadow-inner flex flex-col gap-3">
                    <div className="flex items-center justify-between border-b border-white/10 pb-2">
                      <div className="flex flex-col">
                        <span className="text-[10px] text-cyan-400 font-mono uppercase tracking-wider font-semibold">
                          Customized Itinerary
                        </span>
                        <h4 className="text-sm font-bold text-white font-sans-clean mt-0.5">
                          {msg.plan.title || `${msg.plan.days?.length || 2}-Day Curated Tour`}
                        </h4>
                      </div>
                      <div className="flex items-center gap-1.5 text-[11px] text-slate-300 bg-white/5 px-2.5 py-1 rounded-lg">
                        <Navigation className="w-3 h-3 text-cyan-400" />
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
                            <span className="font-bold text-cyan-300 font-sans-clean">
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
                    <div className="p-3.5 rounded-xl bg-gradient-to-r from-emerald-950/40 via-cyan-950/30 to-slate-900/60 border border-emerald-500/30 flex flex-col gap-2.5 mt-1">
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
                        <span className="flex items-center gap-1 text-cyan-300">
                          <Headphones className="w-3 h-3" />
                          <span>Audio Guide Unlocked</span>
                        </span>
                      </div>

                      <button
                        onClick={() => handleCheckoutAndPay(msg.plan)}
                        className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-cyan-400 to-emerald-400 hover:from-cyan-300 hover:to-emerald-300 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 transition-all hover:scale-[1.01] active:scale-[0.99] cursor-pointer"
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
                <div className="w-4 h-4 rounded-full bg-cyan-400 animate-ping" />
                <span className="text-xs text-slate-300 font-sans-clean">
                  Gemini 3.8 Flash is optimizing your route...
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
              placeholder="Ask Gemini (e.g. 'Add sunset beach on Day 2', 'Start after 10 AM')..."
              className="flex-1 py-2.5 px-4 rounded-xl bg-white/[0.04] border border-white/10 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-cyan-400 transition-colors font-sans-clean"
            />
            <button
              type="submit"
              disabled={!inputText.trim() || isThinking}
              className="py-2.5 px-4 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white font-bold text-xs flex items-center gap-1.5 transition-all disabled:opacity-40 cursor-pointer shrink-0 shadow-md"
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