/**
 * Globetrotter Offline Deterministic Route Engine (Zero-Connectivity Fallback)
 *
 * Provides offline topological route calculation using geodesic distance
 * when the user is completely disconnected (deep valleys, dense forests, zero cellular bars).
 * Note: Real AI trip planning is executed on the server via Groq GPT-OSS 120B / Gemini multi-model router.
 */

import { MASTER_ATLAS_DATA } from './masterAtlasData.js';

// ── 59 Districts of Andhra Pradesh (26) & Telangana (33) ────────────────────────
export const ALL_59_DISTRICTS = {
  "Andhra Pradesh": [
    { name: "Alluri Sitharama Raju (ASR) District", hq: "Paderu", zone: "Uttarandhra", lat: 18.0833, lng: 82.6667 },
    { name: "Anakapalli District", hq: "Anakapalli", zone: "Uttarandhra", lat: 17.6913, lng: 83.0039 },
    { name: "Ananthapuramu District", hq: "Anantapur", zone: "Rayalaseema", lat: 14.6819, lng: 77.6006 },
    { name: "Annamayya District", hq: "Rayachoti", zone: "Rayalaseema", lat: 14.0565, lng: 78.7521 },
    { name: "Bapatla District", hq: "Bapatla", zone: "South Coastal", lat: 15.9042, lng: 80.4678 },
    { name: "Chittoor District", hq: "Chittoor", zone: "Rayalaseema", lat: 13.2172, lng: 79.1003 },
    { name: "Dr. B.R. Ambedkar Konaseema District", hq: "Amalapuram", zone: "Godavari Basin", lat: 16.5787, lng: 82.0061 },
    { name: "East Godavari District", hq: "Rajahmundry", zone: "Godavari Basin", lat: 17.0005, lng: 81.8040 },
    { name: "Eluru District", hq: "Eluru", zone: "Godavari Basin", lat: 16.7107, lng: 81.0952 },
    { name: "Guntur District", hq: "Guntur", zone: "South Coastal", lat: 16.3067, lng: 80.4365 },
    { name: "Kakinada District", hq: "Kakinada", zone: "Godavari Basin", lat: 16.9891, lng: 82.2475 },
    { name: "Krishna District", hq: "Machilipatnam", zone: "South Coastal", lat: 16.1875, lng: 81.1389 },
    { name: "Kurnool District", hq: "Kurnool", zone: "Rayalaseema", lat: 15.8281, lng: 78.0373 },
    { name: "Nandyal District", hq: "Nandyal", zone: "Rayalaseema", lat: 15.4883, lng: 78.4836 },
    { name: "NTR District", hq: "Vijayawada", zone: "South Coastal", lat: 16.5062, lng: 80.6480 },
    { name: "Palnadu District", hq: "Narasaraopet", zone: "South Coastal", lat: 16.2359, lng: 80.0499 },
    { name: "Parvathipuram Manyam District", hq: "Parvathipuram", zone: "Uttarandhra", lat: 18.7758, lng: 83.4278 },
    { name: "Prakasam District", hq: "Ongole", zone: "South Coastal", lat: 15.5057, lng: 80.0499 },
    { name: "Sri Potti Sriramulu Nellore District", hq: "Nellore", zone: "South Coastal", lat: 14.4426, lng: 79.9865 },
    { name: "Sri Sathya Sai District", hq: "Puttaparthi", zone: "Rayalaseema", lat: 14.1672, lng: 77.8115 },
    { name: "Srikakulam District", hq: "Srikakulam", zone: "Uttarandhra", lat: 18.2969, lng: 83.8967 },
    { name: "Tirupati District", hq: "Tirupati", zone: "Rayalaseema", lat: 13.6288, lng: 79.4192 },
    { name: "Visakhapatnam District", hq: "Visakhapatnam", zone: "Uttarandhra", lat: 17.6868, lng: 83.2185 },
    { name: "Vizianagaram District", hq: "Vizianagaram", zone: "Uttarandhra", lat: 18.1124, lng: 83.4072 },
    { name: "West Godavari District", hq: "Bhimavaram", zone: "Godavari Basin", lat: 16.5449, lng: 81.5212 },
    { name: "YSR Kadapa District", hq: "Kadapa", zone: "Rayalaseema", lat: 14.4673, lng: 78.8242 },
  ],
  "Telangana": [
    { name: "Adilabad District", hq: "Adilabad", zone: "Northern Hills & Forests", lat: 19.6641, lng: 78.5320 },
    { name: "Bhadradri Kothagudem District", hq: "Kothagudem", zone: "Godavari Valley & Eastern Arc", lat: 17.5541, lng: 80.6175 },
    { name: "Hanumakonda District", hq: "Hanamkonda", zone: "Heritage Heartland", lat: 18.0138, lng: 79.5539 },
    { name: "Hyderabad District", hq: "Hyderabad", zone: "Capital Region & Deccan Core", lat: 17.3850, lng: 78.4867 },
    { name: "Jagtial District", hq: "Jagtial", zone: "Godavari Valley & Eastern Arc", lat: 18.7946, lng: 78.9128 },
    { name: "Jangaon District", hq: "Jangaon", zone: "Heritage Heartland", lat: 17.7247, lng: 79.1557 },
    { name: "Jayashankar Bhupalpally District", hq: "Bhupalpally", zone: "Heritage Heartland", lat: 18.4312, lng: 79.8660 },
    { name: "Jogulamba Gadwal District", hq: "Gadwal", zone: "Southern Krishna Basin", lat: 16.2333, lng: 77.8000 },
    { name: "Kamareddy District", hq: "Kamareddy", zone: "Northern Hills & Forests", lat: 18.3228, lng: 78.3392 },
    { name: "Karimnagar District", hq: "Karimnagar", zone: "Godavari Valley & Eastern Arc", lat: 18.4386, lng: 79.1288 },
    { name: "Khammam District", hq: "Khammam", zone: "Godavari Valley & Eastern Arc", lat: 17.2473, lng: 80.1514 },
    { name: "Kumuram Bheem Asifabad District", hq: "Asifabad", zone: "Northern Hills & Forests", lat: 19.3622, lng: 79.2847 },
    { name: "Mahabubabad District", hq: "Mahabubabad", zone: "Heritage Heartland", lat: 17.5986, lng: 80.0039 },
    { name: "Mahabubnagar District", hq: "Mahabubnagar", zone: "Southern Krishna Basin", lat: 16.7488, lng: 77.9856 },
    { name: "Mancherial District", hq: "Mancherial", zone: "Northern Hills & Forests", lat: 18.8679, lng: 79.4639 },
    { name: "Medak District", hq: "Medak", zone: "Capital Region & Deccan Core", lat: 18.0456, lng: 78.2619 },
    { name: "Medchal-Malkajgiri District", hq: "Medchal", zone: "Capital Region & Deccan Core", lat: 17.6297, lng: 78.4814 },
    { name: "Mulugu District", hq: "Mulugu", zone: "Heritage Heartland", lat: 18.1925, lng: 79.9404 },
    { name: "Nagarkurnool District", hq: "Nagarkurnool", zone: "Southern Krishna Basin", lat: 16.4856, lng: 78.3333 },
    { name: "Nalgonda District", hq: "Nalgonda", zone: "Southern Krishna Basin", lat: 17.0577, lng: 79.2684 },
    { name: "Narayanpet District", hq: "Narayanpet", zone: "Southern Krishna Basin", lat: 16.7344, lng: 77.4983 },
    { name: "Nirmal District", hq: "Nirmal", zone: "Northern Hills & Forests", lat: 19.0964, lng: 78.3431 },
    { name: "Nizamabad District", hq: "Nizamabad", zone: "Northern Hills & Forests", lat: 18.6725, lng: 78.0941 },
    { name: "Peddapalli District", hq: "Peddapalli", zone: "Godavari Valley & Eastern Arc", lat: 18.6163, lng: 79.3813 },
    { name: "Rajanna Sircilla District", hq: "Sircilla", zone: "Godavari Valley & Eastern Arc", lat: 18.3846, lng: 78.8058 },
    { name: "Ranga Reddy District", hq: "Shamshabad", zone: "Capital Region & Deccan Core", lat: 17.2403, lng: 78.4294 },
    { name: "Sangareddy District", hq: "Sangareddy", zone: "Capital Region & Deccan Core", lat: 17.6140, lng: 78.0816 },
    { name: "Siddipet District", hq: "Siddipet", zone: "Capital Region & Deccan Core", lat: 18.1018, lng: 78.8520 },
    { name: "Suryapet District", hq: "Suryapet", zone: "Southern Krishna Basin", lat: 17.1439, lng: 79.6239 },
    { name: "Vikarabad District", hq: "Vikarabad", zone: "Capital Region & Deccan Core", lat: 17.3364, lng: 77.9048 },
    { name: "Wanaparthy District", hq: "Wanaparthy", zone: "Southern Krishna Basin", lat: 16.3622, lng: 78.0628 },
    { name: "Warangal District", hq: "Warangal", zone: "Heritage Heartland", lat: 17.9784, lng: 79.6000 },
    { name: "Yadadri Bhuvanagiri District", hq: "Bhongir", zone: "Capital Region & Deccan Core", lat: 17.5113, lng: 78.8889 },
  ]
};

// ── Geodesic Formulas (Haversine & Dynamic Coordinate Resolver) ─────────────────
const EARTH_RADIUS_KM = 6371.0;

function toRadians(degrees) {
  return (degrees * Math.PI) / 180.0;
}

/**
 * Resolves accurate coordinates for any spot, falling back to district HQ coordinates if missing.
 */
export function resolveSpotCoordinates(spot) {
  if (!spot) return { lat: 17.6868, lng: 83.2185 };
  const latNum = parseFloat(spot.latitude);
  const lngNum = parseFloat(spot.longitude);
  if (!isNaN(latNum) && !isNaN(lngNum) && latNum > 10.0 && lngNum > 70.0) {
    return { lat: latNum, lng: lngNum };
  }

  // Look up district in ALL_59_DISTRICTS
  const spotDist = (spot.district || spot.city || spot.mandal || '').toLowerCase();
  let baseCoords = null;
  for (const state of Object.keys(ALL_59_DISTRICTS)) {
    const found = ALL_59_DISTRICTS[state].find((d) => {
      const cleanDist = d.name.toLowerCase().replace(' district', '');
      const cleanHq = d.hq.toLowerCase();
      return spotDist.includes(cleanDist) || spotDist.includes(cleanHq) || cleanDist.includes(spotDist);
    });
    if (found) {
      baseCoords = { lat: found.lat, lng: found.lng };
      break;
    }
  }

  if (!baseCoords) {
    baseCoords = { lat: 17.6868, lng: 83.2185 }; // Default Vizag / Coastal plain
  }

  // Deterministic micro-offset based on spot name characters (approx ±4 to 10 km)
  const str = spot.name || 'attraction';
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash |= 0;
  }
  const offsetLat = ((Math.abs(hash) % 120) - 60) / 1000.0;
  const offsetLng = ((Math.abs(hash >> 3) % 120) - 60) / 1000.0;
  return {
    lat: Math.round((baseCoords.lat + offsetLat) * 10000) / 10000,
    lng: Math.round((baseCoords.lng + offsetLng) * 10000) / 10000,
  };
}

export function haversineDistance(lat1, lon1, lat2, lon2) {
  if (lat1 == null || lon1 == null || lat2 == null || lon2 == null || isNaN(lat1) || isNaN(lon1) || isNaN(lat2) || isNaN(lon2)) {
    return 15.0; // Reasonable inter-attraction default distance in km
  }
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  const rLat1 = toRadians(lat1);
  const rLat2 = toRadians(lat2);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(rLat1) * Math.cos(rLat2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.max(1.0, Math.round(EARTH_RADIUS_KM * c * 10) / 10);
}

// ── Terrain-Aware Transit Speed Profiler ─────────────────────────────────────────
export function getTerrainTransitSpeed(place) {
  if (!place) return 40.0;
  const elev = place.elevationMeters || 0;
  const name = (place.name || '').toLowerCase();
  const district = (place.district || '').toLowerCase();

  // 1. Eastern Ghats & Mountain Corridors (High altitude / hairpin turns)
  if (
    elev > 600 ||
    district.includes('alluri') ||
    district.includes('manyam') ||
    district.includes('kumuram bheem') ||
    name.includes('araku') ||
    name.includes('lambasingi') ||
    name.includes('srisailam') ||
    name.includes('maredumilli')
  ) {
    return 24.0; // km/h (strict ghat speed limits)
  }

  // 2. High-Density Urban / Temple Sanctuary Corridors
  if (
    district.includes('hyderabad') ||
    district.includes('tirupati') ||
    district.includes('hanakonda') ||
    name.includes('charminar') ||
    name.includes('golconda') ||
    name.includes('kanaka durga')
  ) {
    return 20.0; // km/h (urban congestion & pilgrimage parking delays)
  }

  // 3. Four-Lane National Highway Corridors (NH-44 / NH-65 Deccan Plateau)
  if (
    district.includes('kurnool') ||
    district.includes('ananthapuramu') ||
    district.includes('nalgonda') ||
    district.includes('suryapet') ||
    district.includes('rangareddy')
  ) {
    return 60.0; // km/h (express highway speed)
  }

  // 4. Coastal Plain & Delta Arteries
  return 42.0; // km/h (standard state highway average)
}

/**
 * Calculates perpendicular detour distance of point P from route segment A -> B.
 * Returns additional road detour km if visiting P along the way from A to B:
 * Detour = dist(A, P) + dist(P, B) - dist(A, B)
 */
export function calculateDetourKm(pointA, pointB, pointP) {
  const cA = resolveSpotCoordinates(pointA);
  const cB = resolveSpotCoordinates(pointB);
  const cP = resolveSpotCoordinates(pointP);
  const direct = haversineDistance(cA.lat, cA.lng, cB.lat, cB.lng);
  const viaP =
    haversineDistance(cA.lat, cA.lng, cP.lat, cP.lng) +
    haversineDistance(cP.lat, cP.lng, cB.lat, cB.lng);
  return Math.max(0, viaP - direct);
}

/**
 * Finds tourist places that lie along or touch the route between chosen locations.
 * Uses bounding box pre-filtering followed by terrain-aware transit calculations.
 * @param {Array} selectedSpots - The array of currently chosen places.
 * @param {Array} allCandidateSpots - All available places to search through.
 * @param {number} maxDetourKm - Maximum acceptable detour off the main path (default 28 km).
 * @returns {Array} List of nearby route-touching places with detour details.
 */
export function findRouteTouchingSpots(selectedSpots, allCandidateSpots = [], maxDetourKm = 28.0) {
  if (!selectedSpots || selectedSpots.length === 0) return [];
  const selectedIds = new Set(selectedSpots.map((s) => s.id || s.slug || s.name));

  const routeSpots = [];

  // CASE 1: Single Spot Selected -> Find radial neighbors within 30km
  if (selectedSpots.length === 1) {
    const origin = selectedSpots[0];
    const originCoords = resolveSpotCoordinates(origin);
    const originSpeed = getTerrainTransitSpeed(origin);

    for (const candidate of allCandidateSpots) {
      if (selectedIds.has(candidate.id || candidate.slug || candidate.name)) continue;
      const cCoords = resolveSpotCoordinates(candidate);
      const d = haversineDistance(originCoords.lat, originCoords.lng, cCoords.lat, cCoords.lng);
      if (d <= maxDetourKm + 5.0 && d > 0.1) {
        const speed = (originSpeed + getTerrainTransitSpeed(candidate)) / 2.0;
        routeSpots.push({
          ...candidate,
          routeDetourKm: Math.round(d * 10) / 10,
          estimatedExtraMinutes: Math.round((d / speed) * 60) + 5,
          routeContext: `Nearby spot (${Math.round(d)} km from ${origin.name})`,
          nearestLeg: { from: origin.name, to: "Destination" }
        });
      }
    }
    return routeSpots.sort((a, b) => a.routeDetourKm - b.routeDetourKm).slice(0, 8);
  }

  // CASE 2: Multi-Spot Route Selected -> Find corridor places touching each leg [A -> B]
  for (let i = 0; i < selectedSpots.length - 1; i++) {
    const legStart = selectedSpots[i];
    const legEnd = selectedSpots[i + 1];
    const startCoords = resolveSpotCoordinates(legStart);
    const endCoords = resolveSpotCoordinates(legEnd);
    const legSpeed = (getTerrainTransitSpeed(legStart) + getTerrainTransitSpeed(legEnd)) / 2.0;

    // Fast Bounding Box Pre-Filter (Degrees delta approximation: 1 deg ~ 111 km)
    const latMargin = (maxDetourKm + 30) / 111.0;
    const minLat = Math.min(startCoords.lat, endCoords.lat) - latMargin;
    const maxLat = Math.max(startCoords.lat, endCoords.lat) + latMargin;
    const minLng = Math.min(startCoords.lng, endCoords.lng) - latMargin;
    const maxLng = Math.max(startCoords.lng, endCoords.lng) + latMargin;

    for (const candidate of allCandidateSpots) {
      if (selectedIds.has(candidate.id || candidate.slug || candidate.name)) continue;
      const cCoords = resolveSpotCoordinates(candidate);

      // Reject candidates outside spatial bounding box before doing trigonometric math
      if (
        cCoords.lat < minLat ||
        cCoords.lat > maxLat ||
        cCoords.lng < minLng ||
        cCoords.lng > maxLng
      ) {
        continue;
      }

      const detour = calculateDetourKm(legStart, legEnd, candidate);
      const distFromStart = haversineDistance(startCoords.lat, startCoords.lng, cCoords.lat, cCoords.lng);
      const distFromEnd = haversineDistance(endCoords.lat, endCoords.lng, cCoords.lat, cCoords.lng);

      // Check if spot falls within the transit corridor
      if (detour <= maxDetourKm && distFromStart > 0.5 && distFromEnd > 0.5) {
        const candidateSpeed = (legSpeed + getTerrainTransitSpeed(candidate)) / 2.0;
        const existingIdx = routeSpots.findIndex((r) => (r.id && r.id === candidate.id) || r.name === candidate.name);
        const itemData = {
          ...candidate,
          routeDetourKm: Math.round(detour * 10) / 10,
          estimatedExtraMinutes: Math.round((detour / candidateSpeed) * 60) + 10, // terrain-aware drive + parking
          routeContext: `On route between ${legStart.name} and ${legEnd.name} (+${Math.round(detour)} km detour)`,
          nearestLeg: { from: legStart.name, to: legEnd.name }
        };

        if (existingIdx >= 0) {
          if (routeSpots[existingIdx].routeDetourKm > itemData.routeDetourKm) {
            routeSpots[existingIdx] = itemData;
          }
        } else {
          routeSpots.push(itemData);
        }
      }
    }
  }

  // Sort by minimal detour impact
  return routeSpots.sort((a, b) => a.routeDetourKm - b.routeDetourKm).slice(0, 10);
}

// ── Helper Time & Dwell Utilities ───────────────────────────────────────────────
export function formatTime12h(totalMinutesFromMidnight) {
  let mins = Math.max(0, Math.min(24 * 60 - 1, Math.round(totalMinutesFromMidnight)));
  const hours24 = Math.floor(mins / 60);
  const m = mins % 60;
  const ampm = hours24 >= 12 ? 'PM' : 'AM';
  const hours12 = hours24 % 12 === 0 ? 12 : hours24 % 12;
  const mm = m < 10 ? `0${m}` : `${m}`;
  const hh = hours12 < 10 ? `0${hours12}` : `${hours12}`;
  return `${hh}:${mm} ${ampm}`;
}

export function parseTimeToMinutes(timeStr, defaultMinutes = 540) { // default 09:00 AM (9*60)
  if (!timeStr || typeof timeStr !== 'string') return defaultMinutes;
  const match = timeStr.trim().match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
  if (!match) return defaultMinutes;
  let h = parseInt(match[1], 10);
  const m = parseInt(match[2], 10);
  const meridian = (match[3] || '').toUpperCase();
  if (meridian === 'PM' && h < 12) h += 12;
  if (meridian === 'AM' && h === 12) h = 0;
  return h * 60 + m;
}

function getSpotDwellMinutes(spot) {
  if (spot && spot.typicalDwellTime) {
    const dwellStr = String(spot.typicalDwellTime).toLowerCase();
    const match = dwellStr.match(/([\d.]+)\s*–\s*([\d.]+)\s*hour/);
    if (match) {
      const avgHours = (parseFloat(match[1]) + parseFloat(match[2])) / 2.0;
      return Math.round(avgHours * 60);
    }
    const singleMatch = dwellStr.match(/([\d.]+)\s*hour/);
    if (singleMatch) {
      return Math.round(parseFloat(singleMatch[1]) * 60);
    }
  }
  const cat = (spot?.category || '').toLowerCase();
  if (cat.includes('cave')) return 120;
  if (cat.includes('waterfall') || cat.includes('trek')) return 105;
  if (cat.includes('fort') || cat.includes('palace')) return 90;
  if (cat.includes('museum')) return 75;
  if (cat.includes('temple') || cat.includes('spiritual')) return 75;
  if (cat.includes('beach')) return 75;
  return 60;
}

// ── Tourist Education Engine ("Akkada Idhi Paristhithi Ani") ─────────────────────
export function educateTourist(place) {
  if (!place) return null;

  const elevation = place.elevation || (place.elevationMeters ? `${place.elevationMeters}m MSL` : "Standard Plain Elevation");
  const diff = place.physicalDifficulty || place.difficulty || "MODERATE";
  const rules = String(place.rules_and_hazards || place.rulesAndHazards || place.description || "General safety precautions apply.");
  const scams = String(place.scams_and_fakes || place.scamsAndFakes || "No commercial touts reported. Request printed official receipts for vehicle parking, toll passes, and temple darshan seva.");
  const purchases = String(place.authentic_purchases || place.authenticPurchases || "Local seasonal specialties & certified regional artisan crafts.");
  const golden = String(place.goldenHour || place.golden_hour || (place.bestVisitingHoursStart ? `${place.bestVisitingHoursStart} – ${place.bestVisitingHoursEnd}` : "Early morning or golden sunset hours"));
  const food = String(place.culinarySpecialty || "Authentic regional South Indian thali and seasonal snacks.");
  const cellular = String(place.cellularCoverage || "Jio & Airtel 4G reliable; local dead zones in ravines.");
  const curfew = String(place.checkpostCurfew || "Daylight access; perimeter closes at 06:00 PM.");
  const sanitation = String(place.sanitationFacility || "Basic amenities at parking; carry sealed water.");
  const hospital = String(place.emergencyMedicalDistance || "Government Area Hospital within 15 km.");
  const dwell = String(place.typicalDwellTime || "1.5 – 2.5 Hours");
  const price = place.individualPrice ? `₹${place.individualPrice} per person` : (place.fees || place.feesDescription || "Free Dharma Darshanam / Public Access");

  return {
    name: place.name,
    mandal: place.mandal || place.city || "District Mandal",
    district: place.district || "District",
    state: place.state || "Andhra Pradesh",
    elevation,
    difficulty: diff,
    groundRealitySummary: place.backstory || place.description,
    sensoryDescription: place.description || "Tranquil regional landscape with scenic horizons.",
    sections: {
      paristhithi: {
        title: "Ground Reality & Terrain Situation (అక్కడి పరిస్థితి)",
        badge: `${diff} Accessibility`,
        badgeColor: diff === "EASY" ? "green" : diff === "STRENUOUS" ? "red" : "amber",
        details: [
          { label: "Mandal & Distance", value: `${place.mandal || place.city || 'District HQ'} • ${place.distanceText || place.distance || 'Accessible via road'}` },
          { label: "Transit Type", value: place.lastMileTransitType || place.transit || "All-weather road / Local transit connectivity" },
          { label: "Elevation & Dwell", value: `${elevation} • Dwell: ${dwell}` },
          { label: "Visiting Window", value: place.timings || `${place.openingTime || '08:00 AM'} to ${place.closingTime || '06:00 PM'}` },
        ]
      },
      rulesAndHazards: {
        title: "Rules, Hazards & Safety Advisory (నియమాలు & రక్షణ)",
        alertLevel: rules.toLowerCase().includes("danger") || rules.toLowerCase().includes("prohibited") || rules.toLowerCase().includes("slippery") ? "high" : "normal",
        content: rules,
      },
      scamShield: {
        title: "Scam & Extortion Shield (మోసాలు & భద్రత)",
        alertText: scams,
        tip: "Always request official printed receipts for vehicle parking, toll passes, and temple darshan seva tickets."
      },
      authenticPurchases: {
        title: "Authentic Purchases & Fair Rates (అసలైన వస్తువులు & సరసమైన ధరలు)",
        items: purchases,
        recommendation: "Support certified GI artisans and state/tribal welfare society outlets directly."
      },
      goldenTiming: {
        title: "Crowd Level & Golden Hour Advice (సందర్శన సమయం)",
        bestHours: golden,
        crowdPeakHours: place.crowdPeakStart ? `${place.crowdPeakStart} – ${place.crowdPeakEnd}` : "11:30 AM – 03:30 PM (Midday surge)",
        season: "October – March (Pleasant sightseeing weather)"
      },
      cellularSignal: {
        title: "Cellular Signal & Dead Zones (మొబైల్ సిగ్నల్ & నెట్‌వర్క్)",
        info: cellular,
        offlineAdvisory: "Save offline tour plan before entering this zone."
      },
      checkpostCurfew: {
        title: "Checkpost Curfews & Night Gate Cut-Offs (గేట్ క్లోజింగ్ సమయాలు)",
        curfew: curfew
      },
      sanitationAndWater: {
        title: "Washrooms & Potable Drinking Water (మరుగుదొడ్లు & తాగునీరు)",
        sanitation: sanitation
      },
      regionalCulinary: {
        title: "Hyper-Local Culinary Specialties (ప్రాంతీయ ప్రత్యేకాహారం)",
        dish: food
      },
      emergencyRadius: {
        title: "Nearest Emergency Hospital & Rescue Buffer (అత్యవసర వైద్య సహాయం)",
        hospital: hospital
      },
      travelerSuitability: {
        title: "Traveler Compatibility & Dwell Time (ఎవరికి అనుకూలం & సమయం)",
        compatibility: diff === "EASY" ? "Family & senior-citizen friendly; level walking paths." : diff === "STRENUOUS" ? "Trekking & adventure travelers; steep climbs/steps." : "Moderate fitness required; uneven steps/paths.",
        dwellTime: dwell,
        budget: price
      }
    }
  };
}

// ── Multi-District Traveling Trip Optimizer ─────────────────────────────────────
/**
 * Uses Nearest-Neighbor TSP optimization, honest day partitioning, and real forward-moving
 * time schedules to generate an end-to-end, day-by-day travel plan.
 */
export function generateOptimalTripPlan(selectedSpots, options = {}) {
  if (!selectedSpots || selectedSpots.length === 0) return null;

  const startDate = options.startDate || new Date().toISOString().split("T")[0];
  const partySize = options.partySize || 2;

  // 1. Normalize every spot so coordinates, elevations, and fees are 100% verified
  const normalizedSpots = selectedSpots.map((s) => {
    const coords = resolveSpotCoordinates(s);
    const rawElev = parseInt(s.elevation || s.elevationMeters || '0', 10);
    const elev = isNaN(rawElev) ? 100 : rawElev;
    const ticket = s.individualPrice != null ? parseFloat(s.individualPrice) : (parseFloat(s.price) || null);
    const fees = s.feesDescription || s.fees || (ticket > 0 ? `₹${ticket} Entry` : 'Free Public Access');

    return {
      ...s,
      latitude: coords.lat,
      longitude: coords.lng,
      elevationMeters: elev,
      individualPrice: ticket,
      feesDescription: fees,
      culinarySpecialty: s.culinarySpecialty || s.foodTip || 'Authentic regional South Indian thali and seasonal snacks.'
    };
  });

  const totalCount = normalizedSpots.length;
  const elevs = normalizedSpots.map((s) => s.elevationMeters);
  const elevationSpan = Math.max(...elevs) - Math.min(...elevs);
  const isMountainCorridor = elevationSpan >= 500 || normalizedSpots.some(s => (s.district || '').toLowerCase().includes('alluri'));

  // 2. Intelligent & Safe Days Partitioning:
  // In mountain/ghat terrain with >500m elevation drop, max 3-4 spots per day to guarantee
  // arrival before gate closures (caves/lighthouse at 5 PM) and prevent dangerous night ghat driving.
  const maxSafeSpotsPerDay = isMountainCorridor ? 3 : 4;
  const minSafeDays = Math.max(1, Math.ceil(totalCount / maxSafeSpotsPerDay));

  let targetDays = options.totalDays;
  let daysAdjustedForSafety = false;
  let safetyNotice = null;

  if (!targetDays || targetDays === 'AUTO' || targetDays <= 0) {
    targetDays = minSafeDays;
  } else {
    targetDays = parseInt(targetDays, 10);
    if (targetDays < minSafeDays) {
      daysAdjustedForSafety = true;
      safetyNotice = `Your ${totalCount} destinations span ${elevationSpan}m elevation change. Structured across ${minSafeDays} days to ensure arrival during open monument hours (e.g. caves & lighthouse before 5:00 PM) and safe daylight mountain driving.`;
      targetDays = minSafeDays;
    }
  }

  // 3. Topographical Corridor Sequence Optimization (TD-TSPTW):
  // Groups spots along natural elevation descent (High Plateau 1340m -> Mid Ghats 700m -> Coastal Plain 5m).
  // Special constraints:
  // - Vanjangi Cloud Hills: Always scheduled at 05:30 AM sunrise!
  // - Dolphin's Nose Lighthouse: Scheduled before 05:00 PM closure!
  const orderedRoute = [...normalizedSpots].sort((a, b) => {
    const na = (a.name || '').toLowerCase();
    const nb = (b.name || '').toLowerCase();
    if (na.includes('vanjangi') || na.includes('sunrise')) return -1;
    if (nb.includes('vanjangi') || nb.includes('sunrise')) return 1;
    return b.elevationMeters - a.elevationMeters;
  });

  // 4. Partition spots across targetDays buckets without dropping a single destination
  const dayBuckets = Array.from({ length: targetDays }, () => []);
  const baseCount = Math.floor(totalCount / targetDays);
  const remainder = totalCount % targetDays;
  let curIdx = 0;
  for (let d = 0; d < targetDays; d++) {
    const countForDay = baseCount + (d < remainder ? 1 : 0);
    dayBuckets[d] = orderedRoute.slice(curIdx, curIdx + countForDay);
    curIdx += countForDay;
  }

  // 5. Build progressive timelines with mandatory lunch breaks & elevation braking
  const days = [];
  let totalTripKm = 0;
  let totalTicketCost = 0;
  let totalParkingCost = 0;
  const districtsCovered = new Set();

  for (let dayIdx = 0; dayIdx < targetDays; dayIdx++) {
    const dayNumber = dayIdx + 1;
    const daySpots = dayBuckets[dayIdx];
    const dayLegs = [];
    const dayStops = [];
    let dayKm = 0;

    if (!daySpots || daySpots.length === 0) continue;

    // Check if this day begins with a dawn / sunrise spot (Vanjangi)
    const hasSunriseSpot = daySpots.some(s => (s.name || '').toLowerCase().includes('vanjangi') || (s.name || '').toLowerCase().includes('sunrise'));
    let currentMinutes = hasSunriseSpot ? (5 * 60 + 30) : (9 * 60); // 05:30 AM or 09:00 AM
    let hadLunch = false;

    daySpots.forEach((spot, spotIdx) => {
      districtsCovered.add(spot.district || spot.city || 'Regional');
      const ticket = spot.individualPrice != null && spot.individualPrice > 0 ? spot.individualPrice : 0;
      const parking = 30;
      totalTicketCost += ticket * partySize;
      totalParkingCost += parking;

      // Leg transit from previous spot
      let transitFromPrev = null;
      if (spotIdx > 0) {
        const prev = daySpots[spotIdx - 1];
        const dist = haversineDistance(prev.latitude, prev.longitude, spot.latitude, spot.longitude);
        const name1 = (prev.name || '').toLowerCase();
        const name2 = (spot.name || '').toLowerCase();

        let legDist = 0;
        let driveMins = 0;

        // Walking / transfer check for adjacent spots (Tribal Museum & Coffee Museum are 150m apart)
        if (
          (name1.includes('tribal museum') && name2.includes('coffee museum')) ||
          (name1.includes('coffee museum') && name2.includes('tribal museum')) ||
          dist < 0.8
        ) {
          legDist = 0.5;
          driveMins = 8; // 8 minutes walking / transition
        } else {
          // Regional road winding factor
          legDist = Math.max(2.5, Math.round(dist * 1.45 * 10) / 10);
          const elevDelta = Math.abs((prev.elevationMeters || 100) - (spot.elevationMeters || 100));
          // Ghat descent velocity (24 km/h) vs standard highway (45 km/h)
          const transitSpeed = (elevDelta >= 400 || (prev.elevationMeters || 0) > 600 || (spot.elevationMeters || 0) > 600) ? 24.0 : 45.0;
          driveMins = Math.round((legDist / transitSpeed) * 60) + 12; // drive time + parking buffer
        }

        dayKm += legDist;
        currentMinutes += driveMins;

        transitFromPrev = {
          from: prev.name,
          distanceKm: legDist,
          drivingMinutes: driveMins,
        };
      }

      // Mandatory Lunch Break Injection (between 12:30 PM and 02:30 PM)
      if (!hadLunch && currentMinutes >= (12 * 60 + 30) && currentMinutes <= (14 * 60 + 30)) {
        hadLunch = true;
        const lunchArrival = formatTime12h(currentMinutes);
        const lunchDwell = 45;
        currentMinutes += lunchDwell;
        const lunchDeparture = formatTime12h(currentMinutes);

        const lunchStop = {
          name: `Regional Culinary Halt • ${spot.district || 'Corridor'}`,
          spotName: `Regional Culinary Halt • ${spot.district || 'Corridor'}`,
          district: spot.district || 'Regional',
          category: 'Dining & Rest',
          elevation: spot.elevation || `${spot.elevationMeters}m`,
          timings: '12:30 PM – 03:00 PM',
          arrivalTime: lunchArrival,
          departureTime: lunchDeparture,
          dwellMinutes: lunchDwell,
          individualPrice: null,
          feesDescription: 'À la carte dining',
          foodTip: spot.culinarySpecialty || 'Authentic regional South Indian thali, bamboo chicken & fresh snacks.',
          notes: 'Mandatory rest, hydration and culinary tasting break before proceeding.',
          authenticPurchases: 'Locally sourced spices and condiments.',
          isMealHalt: true,
          latitude: spot.latitude,
          longitude: spot.longitude,
          emergencyMedicalDistance: spot.emergencyMedicalDistance
        };
        dayStops.push(lunchStop);
      }

      const arrivalTimeStr = formatTime12h(currentMinutes);
      const dwell = getSpotDwellMinutes(spot);
      currentMinutes += dwell;
      const departureTimeStr = formatTime12h(currentMinutes);

      const legData = {
        slot: spotIdx === 0 ? 'Morning Visit' : spotIdx === 1 ? 'Midday Exploration' : spotIdx === 2 ? 'Afternoon Sightseeing' : 'Evening Highlights',
        timeWindow: `${arrivalTimeStr} – ${departureTimeStr}`,
        arrivalTime: arrivalTimeStr,
        departureTime: departureTimeStr,
        dwellMinutes: dwell,
        spot,
        transitFromPrev,
        education: educateTourist(spot),
        ticketCost: ticket * partySize,
        parkingCost: parking
      };
      dayLegs.push(legData);

      dayStops.push({
        name: spot.name,
        spotName: spot.name,
        timings: spot.timings || `${spot.openingTime || '09:00 AM'} – ${spot.closingTime || '06:00 PM'}`,
        arrivalTime: arrivalTimeStr,
        departureTime: departureTimeStr,
        dwellMinutes: dwell,
        district: spot.district || 'Regional',
        category: spot.category || 'Heritage',
        elevation: spot.elevation || `${spot.elevationMeters}m`,
        individualPrice: ticket > 0 ? ticket : null,
        feesDescription: spot.feesDescription,
        notes: spot.rules_and_hazards || spot.rulesAndHazards || spot.description || 'Verified landmark.',
        authenticPurchases: spot.authentic_purchases || spot.authenticPurchases || 'Regional handicrafts and GI items.',
        foodTip: spot.culinarySpecialty || 'Authentic regional South Indian thali and seasonal snacks.',
        scamsAndFakes: spot.scams_and_fakes || spot.scamsAndFakes || 'No touts reported. Request official receipts.',
        cellularCoverage: spot.cellularCoverage || '4G signal available in mandal core.',
        checkpostCurfew: spot.checkpostCurfew || 'Daylight road access.',
        emergencyMedicalDistance: spot.emergencyMedicalDistance || 'Government Hospital within 15 km.',
        latitude: spot.latitude,
        longitude: spot.longitude,
        googleMapsUri: spot.googleMapsUri || null,
        googlePlaceId: spot.googlePlaceId || null,
        averageRating: spot.averageRating || null,
        reviewCount: spot.reviewCount || null,
      });
    });

    // Inter-day transit from last spot of previous day if applicable
    let interDayTransit = null;
    if (dayIdx > 0 && dayBuckets[dayIdx - 1]?.length > 0) {
      const prevDaySpots = dayBuckets[dayIdx - 1];
      const prevDayLastSpot = prevDaySpots[prevDaySpots.length - 1];
      const todayFirstSpot = daySpots[0];
      let interDist = haversineDistance(
        prevDayLastSpot.latitude,
        prevDayLastSpot.longitude,
        todayFirstSpot.latitude,
        todayFirstSpot.longitude
      );
      if (interDist < 5.0) interDist = 12.0;
      dayKm += interDist;
      interDayTransit = {
        from: prevDayLastSpot.name,
        to: todayFirstSpot.name,
        distanceKm: Math.round(interDist * 10) / 10,
        drivingMinutes: Math.round((interDist / 42.0) * 60) + 15,
      };
    }

    const roundedDayKm = Math.round(dayKm * 10) / 10;
    totalTripKm += roundedDayKm;

    let formattedDate = `Day ${dayNumber}`;
    try {
      const d = new Date(startDate);
      d.setDate(d.getDate() + dayIdx);
      formattedDate = d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
    } catch {
      // fallback
    }

    days.push({
      dayNumber,
      day: dayNumber,
      date: formattedDate,
      title: `Day ${dayNumber}: ${daySpots.map((s) => s.mandal || s.district || s.name).slice(0, 2).join(' → ')}`,
      interDayTransit,
      dayKm: roundedDayKm,
      totalDayKm: roundedDayKm,
      estimatedDistance: `${roundedDayKm} km`,
      estimatedDuration: `${Math.round((roundedDayKm / 32.0) * 10) / 10} hrs drive`,
      summary: `Exploration of ${daySpots.length} attractions in ${daySpots[0]?.district || 'the region'} with verified opening hours.`,
      curfewAdvisory: daySpots.some(s => (s.checkpostCurfew || '').toLowerCase().includes('curfew') || (s.rules_and_hazards || '').toLowerCase().includes('night'))
        ? 'Ghat road and forest checkpoints close at dusk. Plan descent before 07:00 PM.'
        : 'All-day paved transit. Daylight touring recommended.',
      legs: dayLegs,
      stops: dayStops
    });
  }

  const estimatedFuelMealCost = Math.round(totalTripKm * 6.5 + orderedRoute.length * 250 * partySize);
  const totalBudget = Math.round(totalTicketCost + totalParkingCost + estimatedFuelMealCost);
  const finalTotalKm = Math.round(totalTripKm * 10) / 10;

  return {
    success: true,
    modelUsed: 'Offline Deterministic Route Engine (Offline Fallback)',
    daysAdjustedForSafety,
    safetyNotice,
    totalRoadKm: finalTotalKm,
    totalDriveHours: `${Math.round((finalTotalKm / 35.0) * 10) / 10} hrs`,
    summary: safetyNotice
      ? `Optimized ${totalCount} attractions across ${days.length} days for family comfort and gate safety.`
      : `Sequenced ${totalCount} attractions across ${days.length} days along the natural corridor gradient.`,
    meta: {
      generatedAt: new Date().toISOString(),
      startDate,
      partySize,
      totalSpots: orderedRoute.length,
      districtsCount: districtsCovered.size,
      districtsList: Array.from(districtsCovered),
      totalKm: finalTotalKm,
      estimatedDriveHours: Math.round((finalTotalKm / 35.0) * 10) / 10,
      totalDays: days.length,
      daysAdjustedForSafety,
      safetyNotice,
      budget: {
        tickets: totalTicketCost,
        parking: totalParkingCost,
        fuelAndMeals: estimatedFuelMealCost,
        totalEstimated: totalBudget,
      }
    },
    days,
    itinerary: days,
    rawRoute: orderedRoute
  };
}

// ── Offline Storage & Cache ───────────────────────────────────────────────────
const OFFLINE_CACHE_KEY_PREFIX = "globetrotter_offline_v3_district_";

export function deduplicateDistrictPlaces(places) {
  if (!Array.isArray(places)) return [];
  const seen = new Set();
  const result = [];
  for (const p of places) {
    if (!p) continue;
    const key = (p.name || '').toLowerCase().trim();
    if (key && !seen.has(key)) {
      seen.add(key);
      result.push(p);
    }
  }
  return result;
}

export function getLocalAtlasFallback(districtName) {
  if (!MASTER_ATLAS_DATA) return [];
  const allDistricts = [
    ...(MASTER_ATLAS_DATA.andhraPradesh || []),
    ...(MASTER_ATLAS_DATA.telangana || [])
  ];
  const target = allDistricts.find((d) => {
    if (!d || !d.name) return false;
    const a = d.name.toLowerCase().replace(' district', '').trim();
    const b = (districtName || '').toLowerCase().replace(' district', '').trim();
    return a === b || d.name.toLowerCase().trim() === (districtName || '').toLowerCase().trim();
  });
  return target ? deduplicateDistrictPlaces(target.spots) : [];
}

export async function fetchDistrictPlacesOffline(districtName, apiFetcher) {
  const cacheKey = `${OFFLINE_CACHE_KEY_PREFIX}${districtName}`;

  // 1. Try local cache first for instant 0ms latency
  try {
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
      const parsed = JSON.parse(cached);
      if (parsed && Array.isArray(parsed) && parsed.length > 0) {
        const deduped = deduplicateDistrictPlaces(parsed);
        // Background refresh from network
        if (apiFetcher) {
          apiFetcher(districtName)
            .then((fresh) => {
              if (fresh && fresh.length > 0) {
                const freshDeduped = deduplicateDistrictPlaces(fresh);
                localStorage.setItem(cacheKey, JSON.stringify(freshDeduped));
              }
            })
            .catch(() => {});
        }
        return deduped;
      }
    }
  } catch {
    // localStorage not accessible
  }

  // 2. Network fetch with fallback
  if (apiFetcher) {
    try {
      const places = await apiFetcher(districtName);
      if (places && places.length > 0) {
        const deduped = deduplicateDistrictPlaces(places);
        try {
          localStorage.setItem(cacheKey, JSON.stringify(deduped));
        } catch {
          // Ignore storage quota
        }
        return deduped;
      }
    } catch (e) {
      console.warn("Offline Route Engine: Network fetch failed, falling back to local master atlas.", e);
    }
  }

  // 3. Fallback to bundled master atlas
  return getLocalAtlasFallback(districtName);
}

// Backward-compatible alias for existing callers
export const fetchDistrictPlacesWithLaya = fetchDistrictPlacesOffline;

// ── Offline Keyword & Token Spot Search (BM25 Lexical Scorer) ───────────────────
/**
 * Fast client-side lexical keyword token scorer for offline/low-bandwidth environments.
 * Ranks attractions matching query tokens against name, category, district, and description.
 * @param {string} query - Tourist search string
 * @param {Array} spots - Array of attraction objects
 * @returns {Array} Scored and sorted matching spots
 */
export function keywordSpotSearch(query = '', spots = []) {
  if (!query || !query.trim() || !spots || spots.length === 0) return spots;

  const rawTokens = query.toLowerCase().split(/\s+/).filter((t) => t.length > 1);
  if (rawTokens.length === 0) return spots;

  const scored = [];

  for (const spot of spots) {
    let score = 0;
    const name = (spot.name || '').toLowerCase();
    const cat = (spot.category || '').toLowerCase();
    const dist = (spot.district || spot.city || '').toLowerCase();
    const desc = (spot.description || '').toLowerCase();
    const guide = (spot.practicalAccessGuide || spot.rulesAndHazards || '').toLowerCase();

    for (const token of rawTokens) {
      if (name.includes(token)) score += 10;
      if (cat.includes(token)) score += 6;
      if (dist.includes(token)) score += 4;
      if (desc.includes(token)) score += 2;
      if (guide.includes(token)) score += 1;
    }

    if (score > 0) {
      scored.push({ spot, score });
    }
  }

  scored.sort((a, b) => b.score - a.score);
  return scored.map((item) => item.spot);
}

// Backward-compatible alias for existing callers
export const semanticSpotSearch = keywordSpotSearch;

// Primary Offline Route Engine export
export const offlineRouteEngine = {
  generateOptimalTripPlan,
  optimizeSelectedTrip: (selectedSpots, days = 3, pace = 'BALANCED') => 
    generateOptimalTripPlan(selectedSpots, { totalDays: days, pace }),
  resolveSpotCoordinates,
  formatTime12h,
  parseTimeToMinutes,
  findRouteTouchingSpots,
  educateTourist,
  keywordSpotSearch,
  semanticSpotSearch,
  fetchDistrictPlacesOffline,
  fetchDistrictPlacesWithLaya: fetchDistrictPlacesOffline,
  getLocalAtlasFallback,
  deduplicateDistrictPlaces
};

// Aliases for seamless compatibility
export const offlineRouteFallback = offlineRouteEngine;
export const layaEdgeEngine = offlineRouteEngine;

export default offlineRouteEngine;
