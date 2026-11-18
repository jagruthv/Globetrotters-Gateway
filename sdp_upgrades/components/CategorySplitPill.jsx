import React from 'react';
import { motion } from 'framer-motion';

/**
 * CategorySplitPill — Inspired by Reel 4 (Creative Vaani e-commerce UI pattern)
 * Two-tone split pill: Left image thumbnail + Right tinted label with micro-elevation.
 */
export default function CategorySplitPill({ 
  label, 
  image, 
  count = null, 
  isSelected = false, 
  onClick 
}) {
  return (
    <motion.button
      type="button"
      whileHover={{ y: -2, scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={`group flex items-center h-10 pl-1 pr-3 rounded-full border transition-all duration-200 cursor-pointer select-none ${
        isSelected
          ? 'bg-white/[0.12] border-cyan-400 shadow-[0_0_20px_rgba(0,242,254,0.25)] text-white'
          : 'bg-white/[0.04] hover:bg-white/[0.08] border-white/10 hover:border-white/20 text-slate-300'
      }`}
    >
      {/* Left Pill Half: Visual Image Thumbnail */}
      <div className="w-8 h-8 rounded-full overflow-hidden shrink-0 border border-white/10 bg-black/40 relative">
        <img
          src={image}
          alt={label}
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
          loading="lazy"
          onError={(e) => {
            e.currentTarget.src = '/images/candidates/visakhapatnam/kailasagiri-hilltop-park-visakhapatnam-andhra-pradesh-1.jpeg';
          }}
        />
        {isSelected && (
          <div className="absolute inset-0 bg-cyan-400/20 backdrop-blur-[1px]" />
        )}
      </div>

      {/* Right Pill Half: Category Label & Optional Badge */}
      <div className="ml-2.5 flex items-center gap-1.5">
        <span className="text-xs font-semibold tracking-wide font-sans-clean">
          {label}
        </span>
        {count !== null && (
          <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-telemetry ${
            isSelected
              ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
              : 'bg-white/[0.06] text-slate-400'
          }`}>
            {count}
          </span>
        )}
      </div>
    </motion.button>
  );
}
