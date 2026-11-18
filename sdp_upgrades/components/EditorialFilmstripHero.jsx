import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Sparkles, 
  ArrowUpRight, 
  Ticket, 
  MapPin, 
  Palette,
  Check
} from 'lucide-react';
import { LUXURY_THEMES, applyTheme } from '../utils/luxuryThemes';
import ShinyText from './reactbits/ShinyText';
import DecryptedText from './reactbits/DecryptedText';

// The 8 Sovereign Circuits of Andhra Pradesh & Telangana
const FILMSTRIP_CIRCUITS = [
  {
    num: '01',
    id: 'vizag-heritage',
    title: 'Visakhapatnam Coastal Heritage',
    state: 'Andhra Pradesh',
    image: '/images/candidates/visakhapatnam/kailasagiri-hilltop-park-visakhapatnam-andhra-pradesh-1.jpeg',
    price: '₹299',
    spotsCount: 4,
    standout: 'Kailasagiri & Submarine Museum'
  },
  {
    num: '02',
    id: 'araku-tribal',
    title: 'Araku Valley & Borra Subterranean Caves',
    state: 'Andhra Pradesh',
    image: '/images/candidates/alluri_sitharama_raju/borra-caves-alluri-sitharama-raju-andhra-pradesh-1.jpeg',
    price: '₹349',
    spotsCount: 4,
    standout: 'Borra Million-Year Stalactites'
  },
  {
    num: '03',
    id: 'tirupati-sacred',
    title: 'Tirupati Sacred Foothills Corridor',
    state: 'Andhra Pradesh',
    image: '/images/candidates/tirupati/sri-venkateswara-swamy-vaari-temple-tirupati-andhra-pradesh-1.jpeg',
    price: '₹499',
    spotsCount: 4,
    standout: 'Tirumala & Chandragiri Fort'
  },
  {
    num: '04',
    id: 'hyderabad-imperial',
    title: 'Hyderabad Deccan Imperial Heritage',
    state: 'Telangana',
    image: '/images/candidates/hyderabad/charminar-hyderabad-telangana-1-city-homepage.jpeg',
    price: '₹399',
    spotsCount: 4,
    standout: 'Golconda Fort & Charminar'
  },
  {
    num: '05',
    id: 'warangal-kakatiya',
    title: 'Warangal Kakatiya Grand Dynasty',
    state: 'Telangana',
    image: '/images/candidates/mulugu/ramappa-temple-mulugu-telangana-1.jpeg',
    price: '₹249',
    spotsCount: 4,
    standout: 'UNESCO Ramappa Floating Bricks'
  },
  {
    num: '06',
    id: 'gandikota-canyon',
    title: 'Grand Canyon of India & Belum Caves',
    state: 'Andhra Pradesh',
    image: '/images/candidates/ysr/gandikota-fort-ysr-andhra-pradesh-1.jpeg',
    price: '₹299',
    spotsCount: 4,
    standout: 'Pennar River Gorge & Citadel'
  },
  {
    num: '07',
    id: 'nagarjuna-island',
    title: 'Nagarjunasagar Buddhist Island Corridor',
    state: 'Telangana',
    image: '/images/candidates/nalgonda/nagarjuna-sagar-dam-nalgonda-telangana-1.jpeg',
    price: '₹299',
    spotsCount: 3,
    standout: 'Island Museum & Hydro Dam'
  },
  {
    num: '08',
    id: 'amaravati-buddhist',
    title: 'Amaravati & Vijayawada Delta Corridor',
    state: 'Andhra Pradesh',
    image: '/images/candidates/ntr/undavalli-caves-ntr-andhra-pradesh-1.jpeg',
    price: '₹249',
    spotsCount: 4,
    standout: 'Undavalli 4-Tier Monolith Caves'
  }
];

export default function EditorialFilmstripHero({ 
  onSelectCircuit, 
  onBookPass, 
  onToggleHeroStyle 
}) {
  const [activeIdx, setActiveIdx] = useState(0);
  const [activeThemeKey, setActiveThemeKey] = useState(() => {
    return localStorage.getItem('globetrotter_luxury_theme') || 'coastalMidnight';
  });
  const [themeDropdownOpen, setThemeDropdownOpen] = useState(false);

  const activeCircuit = FILMSTRIP_CIRCUITS[activeIdx];
  const currentTheme = LUXURY_THEMES[activeThemeKey] || LUXURY_THEMES.coastalMidnight;

  const handleSwitchTheme = (key) => {
    applyTheme(key);
    setActiveThemeKey(key);
    setThemeDropdownOpen(false);
  };

  return (
    <section className="relative w-full min-h-[92dvh] flex flex-col justify-between pt-24 pb-8 px-4 sm:px-8 max-w-7xl mx-auto overflow-hidden">
      {/* Background Ambient Luxury Radial Wash */}
      <div 
        className="absolute inset-0 pointer-events-none transition-colors duration-700 opacity-40"
        style={{
          background: `radial-gradient(ellipse at 50% 30%, ${currentTheme.colors.primary}33 0%, ${currentTheme.colors.base} 70%)`
        }}
      />

      {/* Top Controls: Hero Style Toggle + Reel 1 Luxury Palette Switcher */}
      <div className="relative z-20 flex items-center justify-between pb-6 border-b border-white/10">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-share tracking-[0.2em] text-slate-400">
            HERO LAYOUT:
          </span>
          <button
            type="button"
            onClick={onToggleHeroStyle}
            className="px-3 py-1 rounded-full text-xs font-semibold bg-white/10 hover:bg-white/20 border border-white/20 text-white transition-all flex items-center gap-1.5 cursor-pointer font-sans-clean"
          >
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            <span>Switch to Liquid Drop Hero</span>
          </button>
        </div>

        {/* Luxury Palette Dropdown (Reel 1: Coastal Midnight, Warm Ember, Deep Rouge) */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setThemeDropdownOpen(!themeDropdownOpen)}
            className="px-3.5 py-1.5 rounded-full bg-black/60 hover:bg-black/80 border border-white/15 text-xs font-semibold text-slate-200 flex items-center gap-2 transition-all cursor-pointer font-sans-clean"
          >
            <div 
              className="w-3 h-3 rounded-full border border-white/30"
              style={{ backgroundColor: currentTheme.colors.primary }}
            />
            <span className="hidden sm:inline">{currentTheme.name}</span>
            <Palette className="w-3.5 h-3.5 text-slate-400" />
          </button>

          <AnimatePresence>
            {themeDropdownOpen && (
              <motion.div
                initial={{ opacity: 0, y: 8, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 4, scale: 0.96 }}
                className="absolute right-0 top-full mt-2 w-64 p-2 rounded-2xl bg-black/90 backdrop-blur-xl border border-white/15 shadow-2xl z-50 flex flex-col gap-1"
              >
                <div className="px-2.5 py-1.5 text-[10px] font-share tracking-wider text-slate-400 uppercase">
                  Reel 1 Luxury Palettes
                </div>
                {Object.entries(LUXURY_THEMES).map(([key, t]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => handleSwitchTheme(key)}
                    className={`flex items-center justify-between p-2 rounded-xl text-left transition-colors cursor-pointer ${
                      activeThemeKey === key ? 'bg-white/15 text-white' : 'hover:bg-white/5 text-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="flex gap-0.5">
                        {t.swatches.map((hex, i) => (
                          <div
                            key={i}
                            className="w-2.5 h-6 rounded-sm"
                            style={{ backgroundColor: hex }}
                          />
                        ))}
                      </div>
                      <div>
                        <div className="text-xs font-semibold font-sans-clean">{t.name}</div>
                        <div className="text-[10px] text-slate-400 leading-tight">{t.subtitle}</div>
                      </div>
                    </div>
                    {activeThemeKey === key && <Check className="w-3.5 h-3.5 text-cyan-400" />}
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Main Center Stage: Swiss Brutalist Condensed Mega-Typography (Reel 3) */}
      <div className="relative z-10 flex flex-col items-center justify-center text-center my-auto py-10">
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-white/[0.04] border border-white/10 mb-6"
        >
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-[11px] font-share text-slate-300 tracking-[0.15em]">
            59 DISTRICTS • 646 SANCTUARIES • 0% MODULO MATH
          </span>
        </motion.div>

        {/* High-Impact Condensed Title Inspired by Reel 3: CURATED (WORK) 12-26 */}
        <motion.h1
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.1 }}
          className="font-hexco text-5xl sm:text-7xl md:text-8xl lg:text-9xl text-white tracking-tighter uppercase leading-[0.9] select-none"
        >
          <span className="block text-slate-100">SOVEREIGN</span>
          <span className="block text-transparent bg-clip-text bg-gradient-to-r from-white via-slate-200 to-slate-400">
            (CORRIDORS)
          </span>
          <span className="block text-3xl sm:text-5xl md:text-6xl text-cyan-400 font-telemetry tracking-tight mt-2">
            <DecryptedText text="AP & TELANGANA 2026-27" speed={40} />
          </span>
        </motion.h1>

        <p className="max-w-2xl mt-6 text-sm sm:text-base text-slate-400 font-sans-clean leading-relaxed">
          State-wide cryptographic circuit ticketing and turnstile gate access. One unified biometric pass replaces standalone ticket queues across 8 cultural corridors.
        </p>
      </div>

      {/* Bottom Docked Filmstrip: Interactive Numbered Thumbnails 01 - 08 (Reel 3) */}
      <div className="relative z-20 mt-8 pt-4 border-t border-white/10 flex flex-col gap-4">
        {/* Active Circuit Quick-Info Bar */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeCircuit.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="flex flex-wrap items-center justify-between gap-4 p-3.5 rounded-2xl bg-black/50 backdrop-blur-md border border-white/10"
          >
            <div className="flex items-center gap-3">
              <span className="font-telemetry text-2xl font-black text-cyan-400">
                {activeCircuit.num}
              </span>
              <div>
                <h3 className="text-sm font-bold text-white font-sans-clean flex items-center gap-2">
                  <span>{activeCircuit.title}</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/10 text-slate-300 font-share">
                    {activeCircuit.state}
                  </span>
                </h3>
                <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5 font-sans-clean">
                  <MapPin className="w-3 h-3 text-cyan-400" />
                  <span>{activeCircuit.standout} • {activeCircuit.spotsCount} Checkpoints</span>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              <div className="text-right">
                <span className="text-[10px] text-slate-400 block font-share">ALL-ACCESS PASS</span>
                <span className="text-sm font-bold text-white font-telemetry">
                  <ShinyText text={activeCircuit.price} />
                </span>
              </div>
              <button
                type="button"
                onClick={() => onBookPass(activeCircuit)}
                className="px-4 py-2 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-black font-bold text-xs flex items-center gap-1.5 transition-all shadow-[0_0_20px_rgba(0,242,254,0.3)] cursor-pointer font-sans-clean"
              >
                <Ticket className="w-3.5 h-3.5" />
                <span>Instant Fast-Pass</span>
              </button>
              <button
                type="button"
                onClick={() => onSelectCircuit(activeCircuit)}
                className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white font-semibold text-xs flex items-center gap-1 transition-all cursor-pointer font-sans-clean"
              >
                <span>Plan</span>
                <ArrowUpRight className="w-3.5 h-3.5 text-slate-400" />
              </button>
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Filmstrip Strip Cards (01 to 08) */}
        <div className="grid grid-cols-4 sm:grid-cols-8 gap-2 overflow-x-auto scrollbar-none pb-2">
          {FILMSTRIP_CIRCUITS.map((circuit, idx) => {
            const isActive = idx === activeIdx;
            return (
              <button
                key={circuit.id}
                type="button"
                onClick={() => setActiveIdx(idx)}
                onMouseEnter={() => setActiveIdx(idx)}
                className={`group relative flex flex-col rounded-xl overflow-hidden border transition-all duration-300 cursor-pointer select-none text-left ${
                  isActive
                    ? 'border-cyan-400 ring-2 ring-cyan-400/40 scale-105 z-10 shadow-[0_0_25px_rgba(0,242,254,0.3)]'
                    : 'border-white/10 hover:border-white/30 opacity-70 hover:opacity-100'
                }`}
              >
                {/* Numbered Pill Header */}
                <div className={`px-2 py-1 flex items-center justify-between text-[11px] font-telemetry font-bold ${
                  isActive ? 'bg-cyan-400 text-black' : 'bg-black/60 text-slate-300'
                }`}>
                  <span>{circuit.num}</span>
                  <span className="text-[9px] font-share truncate max-w-[50px]">{circuit.price}</span>
                </div>

                {/* Aspect-Square Image Thumbnail */}
                <div className="relative aspect-square w-full bg-slate-900 overflow-hidden">
                  <img
                    src={circuit.image}
                    alt={circuit.title}
                    className={`w-full h-full object-cover transition-transform duration-500 ${
                      isActive ? 'scale-115' : 'group-hover:scale-110'
                    }`}
                    loading="lazy"
                    onError={(e) => {
                      e.currentTarget.src = '/images/candidates/visakhapatnam/kailasagiri-hilltop-park-visakhapatnam-andhra-pradesh-1.jpeg';
                    }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                  <span className="absolute bottom-1 left-1.5 right-1.5 text-[9px] font-semibold text-white truncate font-sans-clean">
                    {circuit.title.split(' ')[0]}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}
