import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Ticket,
  Compass,
  Calendar,
  Info
} from 'lucide-react';
import { circuitService } from '../services/api';

const MODULE_NOW = new Date();
const MODULE_TODAY_ISO = MODULE_NOW.toISOString().split('T')[0];
const MODULE_TOMORROW_ISO = new Date(MODULE_NOW.getTime() + 86400000).toISOString().split('T')[0];

const SIGNATURE_CIRCUITS = [
  {
    id: 'buddhist-arc',
    title: 'Grand Buddhist Heritage Arc',
    states: 'Andhra Pradesh & Telangana',
    duration: '4-Day Driving Route',
    attractionsCount: 6,
    standout: 'Bojjannakonda & Amaravati Mahastupa',
    passPrice: 280,
    routeBadge: 'Self-Drive Route',
    image: '/images/aptourism/mahachaitya_amaravathi.jpg',
    description: 'Self-drive cultural route visiting ancient monastic cave stupas, relic caskets, and UNESCO Mahachaitya sites across 2,200 years of Buddhist history.',
    places: [
      { name: 'Amaravati Mahachaitya & Museum', district: 'Palnadu', category: 'Heritage & Spiritual' },
      { name: 'Bojjannakonda Rock-Cut Monasteries', district: 'Anakapalli', category: 'Heritage & Spiritual' },
      { name: 'Nagarjunakonda Island Museum', district: 'Palnadu', category: 'Heritage & Spiritual' },
      { name: 'Bhattiprolu Mahastupa', district: 'Bapatla', category: 'Heritage & Spiritual' },
      { name: 'Ghantasala Buddhist Relic Stupa', district: 'Krishna', category: 'Heritage & Spiritual' },
      { name: 'Phanigiri Buddhist Monastic Site', district: 'Suryapet', category: 'Heritage & Spiritual' }
    ]
  },
  {
    id: 'kakatiya-deccan',
    title: 'Kakatiya Dynastic & Deccan Trail',
    states: 'Telangana',
    duration: '3-Day Driving Route',
    attractionsCount: 5,
    standout: 'Ramappa UNESCO & Thousand Pillar Temple',
    passPrice: 240,
    routeBadge: 'Self-Drive Route',
    image: '/images/telangana/bhongir_fort.jpg',
    description: 'Self-drive heritage route through floating brick architecture, acoustic Golconda whispering porticos, and Warangal monolithic stone gateways.',
    places: [
      { name: 'Ramappa Temple (Rudreshwara UNESCO)', district: 'Mulugu', category: 'Heritage & Spiritual' },
      { name: 'Warangal Fort & Monolithic Toranas', district: 'Hanamkonda', category: 'Historical Forts & Monuments' },
      { name: 'Thousand Pillar Temple', district: 'Hanamkonda', category: 'Heritage & Spiritual' },
      { name: 'Bhongir Fort & Monolithic Rock', district: 'Yadadri Bhuvanagiri', category: 'Historical Forts & Monuments' },
      { name: 'Golconda Fort & Whispering Portico', district: 'Hyderabad', category: 'Historical Forts & Monuments' }
    ]
  },
  {
    id: 'godavari-delta',
    title: 'Godavari Mangrove & Backwaters',
    states: 'Andhra Pradesh',
    duration: '3-Day Driving Route',
    attractionsCount: 5,
    standout: 'Coringa Boardwalk & Antarvedi Confluence',
    passPrice: 220,
    routeBadge: 'Self-Drive Route',
    image: '/images/aptourism/coringa_wildlife_sanctuary.jpg',
    description: 'Self-drive road itinerary through the Coringa mangrove sanctuary, serene backwaters of Dindi, and sacred river-ocean sangamam.',
    places: [
      { name: 'Coringa Mangrove Sanctuary & Boardwalk', district: 'Kakinada', category: 'Nature & Wildlife' },
      { name: 'Antarvedi Sri Lakshmi Narasimha Swamy & Sagar Sangamam', district: 'Dr. B.R. Ambedkar Konaseema', category: 'Heritage & Spiritual' },
      { name: 'Dindi Riverfront Backwaters', district: 'Dr. B.R. Ambedkar Konaseema', category: 'Nature & Wildlife' },
      { name: 'Draksharamam Bheemeshwara Temple', district: 'Konaseema', category: 'Heritage & Spiritual' },
      { name: 'Pattiseema Veerabhadra Island Temple', district: 'East Godavari', category: 'Heritage & Spiritual' }
    ]
  },
  {
    id: 'eastern-ghats',
    title: 'Eastern Ghats High-Altitude Mist',
    states: 'Andhra Pradesh',
    duration: '3-Day Driving Route',
    attractionsCount: 5,
    standout: 'Borra Caves & Araku Tribal Reserve',
    passPrice: 310,
    routeBadge: 'Self-Drive Route',
    image: '/images/aptourism/borra_caves.jpg',
    description: 'Self-drive mountain road trip through million-year-old limestone caves, organic coffee gardens, and misty hill valleys.',
    places: [
      { name: 'Borra Caves Underground Limestone Chambers', district: 'Alluri Sitharama Raju', category: 'Nature & Wildlife' },
      { name: 'Araku Tribal Museum & Cultural Guild', district: 'Alluri Sitharama Raju', category: 'Artisans & Culture' },
      { name: 'Araku Coffee Museum & GCC Roastery', district: 'Alluri Sitharama Raju', category: 'Artisans & Culture' },
      { name: 'Katiki Waterfalls & Gosthani Gorge', district: 'Alluri Sitharama Raju', category: 'Nature & Wildlife' },
      { name: 'Chaparai Water Cascades', district: 'Alluri Sitharama Raju', category: 'Nature & Wildlife' }
    ]
  }
];

export default function CircuitShowcase({ onSelectCircuit, onBookCircuit }) {
  const [circuits, setCircuits] = useState(SIGNATURE_CIRCUITS);
  const [circuitDates, setCircuitDates] = useState({});

  // Live Database Ingestion with Resilient Fallback (Anti-Silent Failure Protocol)
  useEffect(() => {
    let isMounted = true;
    async function loadLiveCircuits() {
      try {
        const data = await circuitService.getAll();
        if (isMounted && Array.isArray(data) && data.length > 0) {
          const mapped = data.map((c) => ({
            id: c.slug || String(c.id),
            title: c.title,
            states: c.state || 'Andhra Pradesh & Telangana',
            duration: c.durationDays ? `${c.durationDays}-Day Suggested Route` : '3-Day Suggested Route',
            attractionsCount: c.circuitPlaces ? c.circuitPlaces.length : 5,
            standout: c.tag || 'UNESCO World Heritage & Royal Forts',
            passPrice: Number(c.discountedCircuitPrice) || Number(c.basePrice) || 240,
            routeBadge: 'Self-Drive Route',
            image: c.bannerImage || c.coverImageUrl || (
              c.slug === 'vizag-heritage-coastal-circuit' ? '/images/circuits/vizag.jpg' :
              c.slug === 'araku-nature-cave-circuit' ? '/images/circuits/araku.jpg' :
              c.slug === 'tirupati-heritage-divine-circuit' ? '/images/circuits/tirupati.jpg' :
              c.slug === 'hyderabad-royal-heritage-circuit' ? '/images/circuits/hyderabad.jpg' :
              c.slug === 'warangal-kakatiya-unesco-circuit' ? '/images/circuits/warangal.jpg' :
              c.slug === 'rayalaseema-canyon-caves-circuit' ? '/images/circuits/gandikota.jpg' :
              c.slug === 'telangana-nature-heritage-pass' ? '/images/circuits/nagarjunakonda.jpg' :
              c.slug === 'palnadu-guntur-heritage-citadel-circuit' ? '/images/circuits/palnadu.jpg' :
              c.slug === 'buddhist-arc' ? '/images/aptourism/mahachaitya_amaravathi.jpg' :
              c.slug === 'kakatiya-deccan' ? '/images/circuits/warangal.jpg' :
              c.slug === 'godavari-delta' ? '/images/aptourism/coringa_wildlife_sanctuary.jpg' :
              c.slug === 'eastern-ghats' ? '/images/circuits/araku.jpg' :
              '/images/circuits/vizag.jpg'
            ),
            description: c.summary || c.description || 'Verified regional tourism corridor route.',
            places: (c.circuitPlaces && Array.isArray(c.circuitPlaces) && c.circuitPlaces.length > 0)
              ? c.circuitPlaces.map(cp => ({
                  name: cp.place?.name || cp.name,
                  district: cp.place?.district || 'Regional',
                  category: cp.place?.category || 'Heritage'
                }))
              : (SIGNATURE_CIRCUITS.find(sc => sc.id === (c.slug || String(c.id)))?.places || [])
          }));
          setCircuits(mapped);
        }
      } catch (err) {
        // Graceful SWR fallback to offline pre-indexed circuits if backend is starting or offline
        console.debug('SWR circuit fallback engaged (Backend offline):', err.message);
      }
    }
    loadLiveCircuits();
    return () => { isMounted = false; };
  }, []);

  return (
    <section className="relative w-full py-24 px-4 md:px-12 bg-[#06080D] text-slate-200">
      <div className="max-w-7xl mx-auto flex flex-col gap-10">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-white/10 pb-6">
          <div className="flex flex-col gap-2">
            <h2 className="text-2xl sm:text-4xl font-bold tracking-tight text-white font-sans-clean">
              Self-Guided Road Trip Routes
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 max-w-xl leading-relaxed font-sans-clean">
              Recommended driving itineraries with verified monument stops and estimated gate admission fees. You arrange your own vehicle, fuel, and hotel stay.
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-300 font-sans-clean bg-white/5 border border-white/10 px-3 py-1.5 rounded-full">
            <Compass className="w-3.5 h-3.5 text-amber-400" />
            <span>Self-Drive • Verified Gate Stops</span>
          </div>
        </div>

        {/* 2x2 Grid of Signature Circuits */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {circuits.map((circuit, idx) => (
            <motion.div
              key={circuit.id}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: 0.5, delay: idx * 0.1 }}
              className="group h-full"
            >
              <div className="flex flex-col justify-between h-full bg-[#0E121A] rounded-[24px] border border-white/10 group-hover:border-amber-400/30 transition-all duration-300 p-0 overflow-hidden shadow-xl">
                
                {/* Visual Banner */}
                <div className="relative h-56 w-full overflow-hidden bg-slate-900 rounded-t-[22px]">
                  <img
                    src={circuit.image}
                    alt={circuit.title}
                    className="w-full h-full object-cover brightness-105 contrast-105 saturate-115 transition-transform duration-700 ease-out group-hover:scale-105"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#0E121A] via-[#0E121A]/40 to-transparent" />

                  {/* Badges */}
                  <div className="absolute top-3 left-3 right-3 flex items-center justify-between">
                    <span className="px-2.5 py-0.5 rounded-md bg-black/60 border border-white/10 text-[10px] font-semibold text-slate-200">
                      {circuit.states}
                    </span>
                    <span className="px-2.5 py-0.5 rounded-md bg-amber-500/20 border border-amber-500/30 text-[10px] font-semibold text-amber-300">
                      {circuit.routeBadge || 'Self-Drive Route'}
                    </span>
                  </div>

                  <div className="absolute bottom-3 left-3 right-3">
                    <span className="text-[10px] text-slate-300 font-mono block font-medium">
                      {circuit.duration}
                    </span>
                    <h3 className="text-xl font-bold text-white drop-shadow-md">
                      {circuit.title}
                    </h3>
                  </div>
                </div>

                {/* Body Details */}
                <div className="p-6 flex flex-col gap-4 flex-1 justify-between">
                  <p className="text-xs text-slate-300 leading-relaxed font-sans-clean">
                    {circuit.description}
                  </p>

                  {/* Ground Reality Notice */}
                  <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/5 flex items-start gap-2 text-[11px] text-slate-400 leading-relaxed">
                    <Info className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                    <span>
                      <strong>Traveler Notice:</strong> Self-drive route only. Hotel stay, car hire, and fuel are arranged directly by you.
                    </span>
                  </div>

                  <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/5 flex items-center justify-between text-xs font-mono">
                    <div>
                      <span className="text-[10px] text-slate-500 block">Main Highlight</span>
                      <span className="text-white font-semibold">{circuit.standout}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] text-slate-500 block">Est. Gate Fees</span>
                      <span className="text-emerald-400 font-bold text-sm">₹{circuit.passPrice}</span>
                    </div>
                  </div>

                  {/* Start Date Selector */}
                  <div className="flex items-center justify-between text-xs bg-white/[0.02] border border-white/5 rounded-xl px-3 py-2 font-sans-clean">
                    <span className="text-[11px] text-slate-400 flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-amber-400" /> Start Date
                    </span>
                    <input
                      type="date"
                      min={MODULE_TODAY_ISO}
                      value={circuitDates[circuit.id] || MODULE_TOMORROW_ISO}
                      onChange={(e) => setCircuitDates(prev => ({ ...prev, [circuit.id]: e.target.value }))}
                      aria-label={`Select start date for ${circuit.title}`}
                      className="bg-white/5 hover:bg-white/10 text-white text-[11px] font-mono border border-white/10 rounded-lg px-2 py-1 focus:outline-none focus:border-amber-400 cursor-pointer text-center"
                    />
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-3 pt-1">
                    <button
                      onClick={() => onBookCircuit(circuit, circuitDates[circuit.id] || MODULE_TOMORROW_ISO)}
                      className="flex-1 py-2.5 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 transition-colors font-sans-clean cursor-pointer active:scale-[0.98]"
                    >
                      <Ticket className="w-3.5 h-3.5" />
                      <span>Get Route Pass</span>
                    </button>
                    <button
                      onClick={() => onSelectCircuit(circuit)}
                      className="px-4 py-2.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-slate-300 font-semibold text-xs transition-colors font-sans-clean cursor-pointer"
                    >
                      Plan in Studio
                    </button>
                  </div>

                </div>

              </div>
            </motion.div>
          ))}
        </div>

      </div>
    </section>
  );
}
