import React from 'react';
import { 
  Compass, 
  Map, 
  Layers, 
  Ticket, 
  Sparkles 
} from 'lucide-react';

export default function MobileAppBottomDock({ 
  activeTab, 
  setActiveTab, 
  selectedPlacesCount = 0 
}) {
  const tabs = [
    { id: 'home', label: 'Overview', icon: Compass },
    { id: 'explore', label: 'Districts', icon: Map },
    { id: 'passes', label: 'Passes', icon: Ticket, isCenter: true },
    { id: 'planner', label: 'Plan', icon: Layers, badge: selectedPlacesCount > 0 ? selectedPlacesCount : null },
    { id: 'circuits', label: 'Tours', icon: Sparkles },
  ];

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 p-3 pointer-events-none">
      <div className="w-full max-w-md mx-auto glass-island rounded-[2rem] px-3 py-2 flex items-center justify-around pointer-events-auto border border-white/10 shadow-[0_-10px_30px_rgba(0,0,0,0.8)] backdrop-blur-3xl bg-[#06080D]/90">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          if (tab.isCenter) {
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab('passes')}
                className="relative -top-4 w-13 h-13 rounded-full bg-amber-500/20 border border-amber-400/40 p-[1.5px] shadow-sm active:scale-[0.97] transition-transform duration-100 cursor-pointer"
                aria-label="Fast Pass Ticket"
              >
                <div className="w-full h-full rounded-full bg-[#080A0F] flex items-center justify-center">
                  <Icon className="w-6 h-6 text-amber-400" />
                </div>
              </button>
            );
          }

          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`relative flex flex-col items-center gap-1 py-1 px-2 transition-colors duration-150 cursor-pointer ${
                isActive ? 'text-amber-400' : 'text-slate-400'
              }`}
            >
              <div className="relative">
                <Icon className={`w-5 h-5 ${isActive ? 'text-amber-400' : 'text-slate-400'}`} />
                {tab.badge && (
                  <span className="absolute -top-1.5 -right-2 w-4 h-4 rounded-full bg-amber-400 text-slate-950 font-bold text-[9px] flex items-center justify-center font-telemetry">
                    {tab.badge}
                  </span>
                )}
              </div>
              <span className={`text-[10px] font-semibold ${isActive ? 'text-white' : 'text-slate-400'}`}>
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
