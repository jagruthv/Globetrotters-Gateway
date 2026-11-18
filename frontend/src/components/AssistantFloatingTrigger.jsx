import React from 'react';
import { motion } from 'framer-motion';
import { Sparkles, MessageSquare } from 'lucide-react';

export default function AssistantFloatingTrigger({ isOpen, onToggle }) {
  return (
    <motion.button
      onClick={onToggle}
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      aria-label="Toggle Travel Assistant"
      className={`fixed bottom-6 right-6 z-40 flex items-center gap-2.5 px-4 py-2.5 rounded-full shadow-[0_10px_35px_rgba(0,0,0,0.6)] backdrop-blur-xl border transition-all cursor-pointer ${
        isOpen
          ? 'bg-amber-400 text-slate-950 border-amber-300 font-bold ring-2 ring-amber-400/40'
          : 'bg-[#0B0F17]/90 text-white border-amber-400/30 hover:border-amber-400/60'
      }`}
    >
      <div className="relative flex items-center justify-center">
        {isOpen ? (
          <MessageSquare className="w-4 h-4 text-slate-950" />
        ) : (
          <>
            <Sparkles className="w-4 h-4 text-amber-400" />
            <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-emerald-400" />
          </>
        )}
      </div>

      <span className="text-xs font-semibold font-sans-clean tracking-tight">
        {isOpen ? 'Close Assistant' : 'AI Assistant'}
      </span>

      <span
        className={`hidden sm:inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono border ${
          isOpen
            ? 'bg-slate-950/20 text-slate-900 border-slate-950/30'
            : 'bg-white/10 text-slate-400 border-white/10'
        }`}
      >
        Ctrl+K
      </span>
    </motion.button>
  );
}
