import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Ticket,
  Percent
} from 'lucide-react';
import { circuitService } from '../services/api';

const SIGNATURE_CIRCUITS = [
  {
    id: 'buddhist-arc',
    title: 'Grand Buddhist Heritage Arc',
    states: 'Andhra Pradesh & Telangana',
    duration: '4 Days • 3 Nights',
    attractionsCount: 6,
    standout: 'Bojjannakonda & Amaravati Mahastupa',
    retailPrice: 420,
    passPrice: 280,
    savings: '33% Savings',
    image: '/images/aptourism/mahachaitya_amaravathi.jpg',
    description: 'Ancient monastic cave stupas, relic caskets, and UNESCO Mahachaitya sites tracing 2,200 years of Buddhist scholarship.',
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
    duration: '3 Days • 2 Nights',
    attractionsCount: 5,
    standout: 'Ramappa UNESCO & Thousand Pillar Temple',
    retailPrice: 380,
    passPrice: 240,
    savings: '37% Savings',
    image: '/images/telangana/bhongir_fort.jpg',
    description: 'Floating brick engineering, acoustic Golconda whispering porticos, and Warangal monolithic stone gateways.',
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
    duration: '3 Days • 2 Nights',
    attractionsCount: 5,
    standout: 'Coringa Boardwalk & Antarvedi Confluence',
    retailPrice: 350,
    passPrice: 220,
    savings: '37% Savings',
    image: '/images/aptourism/coringa_wildlife_sanctuary.jpg',
    description: 'Second largest mangrove forest in India, serene backwaters of Dindi, and sacred river-ocean sangamam.',
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
    duration: '3 Days • 2 Nights',
    attractionsCount: 5,
    standout: 'Borra Caves & Araku Tribal Reserve',
    retailPrice: 460,
    passPrice: 310,
    savings: '32% Savings',
    image: '/images/aptourism/borra_caves.jpg',
    description: 'Ancient million-year-old limestone caves, organic coffee gardens, and scenic misty hill valleys.',
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
            duration: c.durationDays ? `${c.durationDays} Days` : '3 Days • 2 Nights',
            attractionsCount: c.circuitPlaces ? c.circuitPlaces.length : 5,
            standout: c.tag || 'UNESCO World Heritage & Royal Forts',
            retailPrice: Number(c.basePrice) || 350,
            passPrice: Number(c.discountedCircuitPrice) || 220,
            savings: c.basePrice && c.discountedCircuitPrice 
              ? `${Math.round((1 - Number(c.discountedCircuitPrice) / Number(c.basePrice)) * 100)}% Savings` 
              : '35% Savings',
            image: c.coverImageUrl || '/images/telangana/bhongir_fort.jpg',
            description: c.summary || c.description || 'Verified regional tourism corridor pass.',
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
              Tour Packages
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 max-w-lg leading-relaxed font-sans-clean">
              Curated multi-stop passes with direct gate entry across top routes.
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-400 font-sans-clean">
            <Percent className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-emerald-300 font-medium">Save up to 40%</span>
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
                    <span className="px-2.5 py-0.5 rounded-md bg-white/10 border border-white/15 text-[10px] font-semibold text-white">
                      {circuit.savings}
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

                  <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/5 flex items-center justify-between text-xs font-mono">
                    <div>
                      <span className="text-[10px] text-slate-500 block">Main Highlight</span>
                      <span className="text-white font-semibold">{circuit.standout}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] text-slate-500 block">Pass Price</span>
                      <div className="flex items-center gap-1.5">
                        <span className="text-slate-500 line-through text-[11px]">₹{circuit.retailPrice}</span>
                        <span className="text-emerald-400 font-bold text-sm">₹{circuit.passPrice}</span>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-3 pt-2">
                    <button
                      onClick={() => onBookCircuit(circuit)}
                      className="flex-1 py-2.5 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 transition-colors font-sans-clean cursor-pointer active:scale-[0.98]"
                    >
                      <Ticket className="w-3.5 h-3.5" />
                      <span>Get Tour Pass</span>
                    </button>
                    <button
                      onClick={() => onSelectCircuit(circuit)}
                      className="px-4 py-2.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-slate-300 font-semibold text-xs transition-colors font-sans-clean cursor-pointer"
                    >
                      Plan This Tour
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
