import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Compass, 
  Map, 
  Layers, 
  Ticket, 
  Menu, 
  X, 
  ShieldCheck,
  ChevronRight,
  User,
  LogOut,
  Settings,
  Sparkles
} from 'lucide-react';
import { logger } from '../utils/telemetryLogger';

export default function FloatingIslandNav({ 
  activeTab, 
  setActiveTab, 
  selectedPlacesCount = 0,
  onOpenSettings,
  onOpenAssistant,
  onOpenSafetyModal
}) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const stored = localStorage.getItem('globetrotter_user');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  useEffect(() => {
    const handleAuthChange = () => {
      try {
        const stored = localStorage.getItem('globetrotter_user');
        setCurrentUser(stored ? JSON.parse(stored) : null);
      } catch {
        setCurrentUser(null);
      }
    };

    window.addEventListener('auth-change', handleAuthChange);
    return () => {
      window.removeEventListener('auth-change', handleAuthChange);
    };
  }, []);

  const handleSignOut = () => {
    localStorage.removeItem('globetrotter_user');
    localStorage.removeItem('globetrotter_token');
    setCurrentUser(null);
    window.dispatchEvent(new Event('auth-change'));
  };

  const navItems = [
    { id: 'home', label: 'Overview', icon: Compass },
    { id: 'explore', label: '59 Districts', icon: Map },
    { id: 'planner', label: 'Planner', icon: Layers, badge: selectedPlacesCount > 0 ? selectedPlacesCount : null },
    { id: 'circuits', label: 'Packages', icon: Layers },
    { id: 'passes', label: 'Passes', icon: Ticket }
  ];

  return (
    <>
      {/* Desktop Floating Island Dock */}
      <nav className="fixed top-5 left-1/2 -translate-x-1/2 z-50 w-[94%] max-w-5xl glass-island rounded-full px-3 sm:px-4 py-2 sm:py-2.5 flex items-center justify-between transition-colors duration-200">
        
        {/* Brand Emblem */}
        <div 
          onClick={() => setActiveTab('home')}
          className="flex items-center gap-2 cursor-pointer group pl-1.5 shrink-0"
        >
          <div className="w-8 h-8 rounded-full bg-amber-500/15 border border-amber-400/30 flex items-center justify-center transition-transform group-hover:scale-105 shrink-0">
            <span className="font-display font-bold text-sm text-amber-400 tracking-wider">G</span>
          </div>
          <span className="font-display font-bold tracking-wider text-xs sm:text-sm text-white group-hover:text-amber-300 transition-colors">
            GLOBETROTTER
          </span>
        </div>

        {/* Center Nav Links with Shared Layout (Visible on desktop >= 1024px; collapses into hamburger on smaller screens) */}
        <div className="hidden lg:flex items-center gap-1 shrink-0">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`relative px-3 py-1.5 rounded-full text-xs font-semibold transition-colors duration-200 flex items-center gap-1.5 cursor-pointer ${
                  isActive ? 'text-white' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {isActive && (
                  <motion.div
                    layoutId="island-active-pill"
                    className="absolute inset-0 rounded-full bg-white/[0.08] border border-white/10"
                    transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                  />
                )}
                <Icon className={`w-3.5 h-3.5 relative z-10 ${isActive ? 'text-amber-400' : 'text-slate-400'}`} />
                <span className="relative z-10">{item.label}</span>
                {item.badge && (
                  <span className="relative z-10 px-1.5 py-0.2 rounded-full bg-amber-400 text-slate-950 font-bold text-[10px] font-mono">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Right Action: Tourist Safety & Auth Button */}
        <div className="flex items-center gap-1.5 sm:gap-2 pr-1 shrink-0">
          {/* Persistent High-Visibility SOS Emergency Alert Trigger */}
          <button
            type="button"
            onClick={onOpenSafetyModal}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-300 hover:text-rose-200 transition-all cursor-pointer shrink-0 text-xs font-bold"
            title="Emergency SOS & 24/7 Police / Ambulance (112, 108, 1363)"
            aria-label="Emergency SOS & 24/7 Police Helplines"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
            <span className="font-mono text-[10px] tracking-wider font-extrabold text-rose-300">SOS</span>
          </button>

          {/* User Sign In / Account Avatar - No bulky text greeting */}
          {currentUser ? (
            <div className="flex items-center gap-1.5 pl-0.5 shrink-0">
              <div 
                className="w-8 h-8 rounded-full bg-emerald-500/15 border border-emerald-400/30 flex items-center justify-center text-emerald-300 text-xs font-semibold relative cursor-default"
                title={`Signed in as ${currentUser.fullName || currentUser.phoneNumber || currentUser.email || 'Traveler'}`}
              >
                <User className="w-3.5 h-3.5 text-emerald-400" />
                <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-400 border border-[#06080D]" />
              </div>
              <button
                onClick={handleSignOut}
                className="w-8 h-8 rounded-full bg-white/5 hover:bg-rose-500/20 border border-white/10 hover:border-rose-500/30 flex items-center justify-center text-slate-400 hover:text-rose-300 transition-colors cursor-pointer shrink-0"
                title="Sign Out"
                aria-label="Sign Out"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => {
                logger.info('UI', 'Sign In button clicked from navbar dock');
                window.dispatchEvent(new CustomEvent('open-auth-modal', { detail: { reason: 'Sign in to access your booked passes and account.' } }));
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/[0.06] hover:bg-white/[0.1] border border-white/15 text-slate-100 hover:text-white text-xs font-semibold transition-colors cursor-pointer shrink-0"
              title="Tourist Account Sign In"
            >
              <User className="w-3.5 h-3.5 text-amber-400" />
              <span>Sign In</span>
            </button>
          )}

          {/* Split-Screen & Mobile Hamburger Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden w-8 h-8 rounded-full bg-white/[0.05] hover:bg-white/[0.1] border border-white/10 flex items-center justify-center text-slate-300 hover:text-white transition-colors cursor-pointer shrink-0"
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </button>
        </div>
      </nav>

      {/* Mobile Fullscreen Glass Overlay with Staggered Links */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.25 }}
            className="fixed inset-0 z-40 bg-[#06080D]/95 backdrop-blur-3xl lg:hidden pt-28 px-6 pb-12 flex flex-col justify-between"
          >
            <div className="flex flex-col gap-3">
              
              {/* Mobile Auth Bar */}
              <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/10 flex items-center justify-between mb-2">
                {currentUser ? (
                  <div className="flex items-center justify-between w-full">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-300 font-bold text-xs">
                        {currentUser.fullName ? currentUser.fullName[0].toUpperCase() : 'U'}
                      </div>
                      <div className="flex flex-col">
                        <span className="text-xs font-semibold text-white">{currentUser.fullName || (currentUser.email ? currentUser.email.split('@')[0] : 'Traveler')}</span>
                        <span className="text-[10px] text-amber-300/80">{currentUser.email}</span>
                      </div>
                    </div>
                    <button
                      onClick={handleSignOut}
                      className="px-3 py-1 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs font-medium cursor-pointer"
                    >
                      Sign Out
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center justify-between w-full">
                    <div className="flex flex-col">
                      <span className="text-xs font-semibold text-white">Tourist Profile</span>
                      <span className="text-[10px] text-slate-400">Save passes & bookings</span>
                    </div>
                    <button
                      onClick={() => {
                        setMobileMenuOpen(false);
                        window.dispatchEvent(new CustomEvent('open-auth-modal', { detail: { reason: 'Sign in to access your booked passes and account.' } }));
                      }}
                      className="px-4 py-1.5 rounded-xl bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 cursor-pointer hover:bg-amber-300 transition-colors"
                    >
                      <User className="w-3.5 h-3.5" />
                      <span>Sign In</span>
                    </button>
                  </div>
                )}
              </div>

              <span className="text-[11px] uppercase tracking-[0.2em] text-slate-500 font-mono pb-2">
                Navigation Directory
              </span>
              {navItems.map((item, idx) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <motion.button
                    key={item.id}
                    initial={{ opacity: 0, x: -16 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    onClick={() => {
                      setActiveTab(item.id);
                      setMobileMenuOpen(false);
                    }}
                    className={`w-full p-4 rounded-2xl border text-left flex items-center justify-between transition-colors cursor-pointer ${
                      isActive
                        ? 'bg-amber-500/10 border-amber-400/30 text-amber-300'
                        : 'bg-white/[0.02] border-white/5 text-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-3.5">
                      <Icon className="w-5 h-5 text-amber-400" />
                      <span className="font-semibold text-base">{item.label}</span>
                    </div>
                    {item.badge ? (
                      <span className="px-2 py-0.5 rounded-full bg-amber-400 text-slate-950 font-bold text-xs">
                        {item.badge}
                      </span>
                    ) : (
                      <ChevronRight className="w-4 h-4 text-slate-500" />
                    )}
                  </motion.button>
                );
              })}
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  if (onOpenAssistant) onOpenAssistant();
                }}
                className="w-full p-4 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 hover:bg-emerald-500/20 text-left flex items-center justify-between transition-colors text-emerald-200 cursor-pointer"
              >
                <div className="flex items-center gap-3.5">
                  <Sparkles className="w-5 h-5 text-emerald-400" />
                  <span className="font-semibold text-base">Ask Travel Assistant</span>
                </div>
                <ChevronRight className="w-4 h-4 text-emerald-400" />
              </button>
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  if (onOpenSafetyModal) onOpenSafetyModal();
                }}
                className="w-full p-4 rounded-2xl border border-rose-500/20 bg-rose-500/10 hover:bg-rose-500/20 text-left flex items-center justify-between transition-colors text-rose-200 cursor-pointer"
              >
                <div className="flex items-center gap-3.5">
                  <ShieldCheck className="w-5 h-5 text-rose-400" />
                  <span className="font-semibold text-base">Safety & Helplines (112 / 108)</span>
                </div>
                <ChevronRight className="w-4 h-4 text-rose-400" />
              </button>
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  onOpenSettings();
                }}
                className="w-full p-4 rounded-2xl border border-white/10 bg-white/[0.03] hover:bg-white/[0.06] text-left flex items-center justify-between transition-colors text-slate-300 cursor-pointer"
              >
                <div className="flex items-center gap-3.5">
                  <Settings className="w-5 h-5 text-slate-400" />
                  <span className="font-semibold text-base">Settings & Preferences</span>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-500" />
              </button>
            </div>

            <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 flex items-center justify-between text-xs text-slate-400 font-sans-clean">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>59 Districts Verified</span>
              </div>
              <span>Live Travel Guide</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

    </>
  );
}
