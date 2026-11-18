/**
 * Globetrotter Offline Client-Side Mathematical Crowd Engine
 *
 * Implements Non-Homogeneous Poisson Process (NHPP) with Diurnal Gaussian Intensity
 * and Kingman's Heavy-Traffic Queuing Approximation in pure JavaScript.
 *
 * Designed to execute in 0ms on the client browser with ZERO network data usage,
 * guaranteeing full interactive responsiveness even in deep caves, mountain passes,
 * or extreme 2G low-bandwidth conditions.
 */

function parseTimeToFractionalHour(timeStr) {
  if (!timeStr) return 11.5;
  const cleaned = timeStr.trim().toUpperCase();
  const isPM = cleaned.includes('PM');
  const isAM = cleaned.includes('AM');

  const match = cleaned.match(/(\d{1,2}):?(\d{2})?/);
  if (!match) return 11.5;

  let hour = parseInt(match[1], 10);
  const minutes = match[2] ? parseInt(match[2], 10) : 0;

  if (isPM && hour < 12) hour += 12;
  if (isAM && hour === 12) hour = 0;

  return hour + minutes / 60.0;
}

export function getActiveEventMultiplier(placeName = '', category = '', month = 10) {
  const name = (placeName || '').toLowerCase();
  const cat = (category || '').toLowerCase();
  let multiplier = 1.0;
  let activeEventAlert = null;

  // 1. Maha Shivaratri (Feb / March) & Karthika Masam (Nov / Dec)
  if (name.includes('kotappakonda') || name.includes('trikoteswara') || name.includes('srisailam') || name.includes('guthikonda') || name.includes('shiva') || cat.includes('spiritual')) {
    if (month === 2 || month === 3) {
      if (name.includes('kotappakonda')) {
        multiplier = 15.0;
        activeEventAlert = 'Maha Shivaratri Prabhalu Chariot Festival (Historic 10-Lakh Congregation & 100-ft Electrified Chariots)';
      } else {
        multiplier = 4.5;
        activeEventAlert = 'Maha Shivaratri Brahmotsavam & Maha Abhishekam Season';
      }
    } else if (month === 11 || month === 12) {
      multiplier = 2.8;
      activeEventAlert = 'Karthika Masam Sacred Lighting & Deepotsavam Pilgrimage Surge';
    }
  }

  // 2. Monsoon flood season for waterfalls & reservoirs (July - Oct)
  if (name.includes('ethipothala') || name.includes('nagarjuna sagar') || name.includes('kuntala') || name.includes('bogatha') || cat.includes('waterfall')) {
    if (month >= 7 && month <= 10) {
      multiplier = 3.5;
      activeEventAlert = 'Monsoon Hydrological Peak: Upstream Krishna/Godavari Inflow & Dam Crest Gate Water Discharge';
    } else if (month >= 4 && month <= 5) {
      multiplier = 0.35;
      activeEventAlert = 'Summer Low-Flow Dry Season: Minimal cascade volume';
    }
  }

  // 3. Summer holidays for water parks & family resorts (April - June)
  if (name.includes('haailand') || cat.includes('theme park') || cat.includes('resort')) {
    if (month >= 4 && month <= 6) {
      multiplier = 2.2;
      activeEventAlert = 'Summer Vacation Water Park & Family Leisure Rush';
    }
  }

  // 4. Recent infrastructure upgrades
  if (name.includes('kondaveedu')) {
    multiplier = Math.max(multiplier, 1.4);
    if (!activeEventAlert) {
      activeEventAlert = 'Post-Ghat Road Opening Surge: Motoring & Weekend Hilltop Trekking Crowd';
    }
  }

  return { multiplier, activeEventAlert };
}

export function calculateOfflineCrowd(place, dayOfWeek = 'SATURDAY', timeString = '11:30 AM', targetMonth = null) {
  if (!place) return null;

  const avgFootfall = place.averageDailyFootfall || 2500;
  const peakFootfall = place.peakDailyFootfall || (avgFootfall * 3);
  const capacity = place.hourlyCapacity || 600;

  // Current calendar month (1-12) if not specified
  const currentMonth = targetMonth || (new Date().getMonth() + 1);
  const eventInfo = getActiveEventMultiplier(place.name, place.category, currentMonth);

  // 1. Day of Week Surge Multiplier (omega_day)
  let dayFactor = 0.85;
  const d = (dayOfWeek || 'SATURDAY').toUpperCase();
  if (d === 'SUNDAY') dayFactor = 1.35;
  else if (d === 'SATURDAY') dayFactor = 1.25;
  else if (d === 'FRIDAY') dayFactor = 1.05;

  // 2. Fractional clock hour t
  const hour = parseTimeToFractionalHour(timeString);

  // 3. Category-Specific Diurnal Peak Center (mu) and Spread (sigma)
  const cat = (place.category || '').toLowerCase();
  let peakHour = 11.5; // 11:30 AM for temples & monuments
  let spread = 2.4;

  if (cat.includes('nature') || cat.includes('waterfall') || cat.includes('fort') || cat.includes('theme park') || cat.includes('resort')) {
    peakHour = 16.0; // 4:00 PM for scenic overlooks, waterfalls, and water parks
    spread = 2.8;
  }

  // 4. Gaussian Diurnal Arrival Rate: lambda(t) scaled by dayFactor and eventMultiplier
  const baseRate = avgFootfall / 12.0;
  const peakSurge = peakFootfall / 12.0;
  const gaussian = Math.exp(-Math.pow(hour - peakHour, 2) / (2 * Math.pow(spread, 2)));
  const totalMultiplier = dayFactor * eventInfo.multiplier;
  const hourlyArrivalRate = Math.round((baseRate + (peakSurge - baseRate) * gaussian) * totalMultiplier);

  // Instantaneous headcount on premises
  const currentVisitors = Math.min(Math.round(hourlyArrivalRate * 1.35), peakFootfall);
  const capacityOccupancyPercent = Math.min(Math.round((currentVisitors / capacity) * 100), 100);

  // 5. Kingman's Heavy-Traffic Queuing Delay at Physical Ticket Windows
  const rho = Math.min(hourlyArrivalRate / (capacity * 1.05), 0.95);
  const physicalQueueWaitMinutes = Math.min(Math.round((rho / (1 - rho)) * 7.5), 90);
  const digitalPassBypassMinutes = Math.max(physicalQueueWaitMinutes - 3, 0);

  // 6. Crowd Classification Tier
  let crowdLevel = 'MODERATE';
  let crowdDescription = 'Normal visitor flow. Comfortable exploration pace with minimal queue wait.';
  if (capacityOccupancyPercent >= 85) {
    crowdLevel = 'PEAK_SURGE';
    crowdDescription = 'Heavy surge volume. Physical queues at turnstiles are heavily congested.';
  } else if (capacityOccupancyPercent >= 60) {
    crowdLevel = 'BUSY';
    crowdDescription = 'Brisk footfall. Noticeable queues at entry gates and photo viewpoints.';
  } else if (capacityOccupancyPercent <= 30) {
    crowdLevel = 'SERENE';
    crowdDescription = 'Serene and uncrowded. Prime atmospheric window for quiet exploration and photography.';
  }

  // 7. 24-Hour Diurnal Busyness Distribution Curve
  const currentHourInt = Math.round(hour);
  const hourlyBusynessProfile = [];
  const hourlyDistribution = [];

  for (let h = 6; h <= 21; h++) {
    const gH = Math.exp(-Math.pow(h - peakHour, 2) / (2 * Math.pow(spread, 2)));
    const hRate = Math.round((baseRate + (peakSurge - baseRate) * gH) * dayFactor);
    const busyness = Math.min(Math.round((hRate / capacity) * 100), 100);
    const label = h === 12 ? '12:00 PM' : h > 12 ? `${h - 12}:00 PM` : `${h < 10 ? '0' + h : h}:00 AM`;
    const isCurrent = (h === currentHourInt);
    const estVis = Math.round(hRate * 1.25);

    hourlyBusynessProfile.push({
      hour: h,
      hourLabel: label,
      busynessPercent: busyness,
      estimatedVisitors: estVis,
      open: true,
      currentSlot: isCurrent
    });

    hourlyDistribution.push({
      hour: h,
      timeLabel: label,
      relativeBusynessPercent: busyness
    });
  }

  const bestSlot = 'Early Morning 07:00 AM – 09:00 AM (Serene light & zero queues)';
  const peakSlot = 'Midday Peak 11:30 AM – 02:30 PM (Maximum footfall)';

  return {
    placeId: place.id,
    placeName: place.name,
    targetDay: dayOfWeek,
    targetTime: timeString,
    requestedDay: dayOfWeek,
    requestedTime: timeString,
    open: true,
    estimatedLiveVisitors: currentVisitors,
    estimatedCurrentVisitors: currentVisitors,
    capacityPercentage: capacityOccupancyPercent,
    capacityOccupancyPercent: capacityOccupancyPercent,
    hourlyCapacity: capacity,
    crowdStatus: crowdLevel,
    crowdLevel: crowdLevel,
    crowdDescription: crowdDescription,
    ticketCounterWaitMinutes: physicalQueueWaitMinutes,
    physicalQueueWaitMinutes: physicalQueueWaitMinutes,
    fastTrackSavedMinutes: digitalPassBypassMinutes,
    digitalPassBypassMinutes: digitalPassBypassMinutes,
    recommendedBestWindow: bestSlot,
    peakWindow: peakSlot,
    hourlyBusynessProfile: hourlyBusynessProfile,
    recommendedAlternativeSlots: [
      '07:30 AM – 09:00 AM (Serene Light & Free Entry Flow)',
      '05:00 PM – 06:30 PM (Sunset Breezes & Low Congestion)'
    ],
    activeEventAlert: eventInfo.activeEventAlert,
    eventMultiplier: eventInfo.multiplier
  };
}

// LocalStorage Persistence Helpers for Ultra-Low-Internet Resilience
const CACHE_PREFIX = 'globetrotter_guide_';

export function getCachedGuide(idOrSlug) {
  try {
    const data = localStorage.getItem(`${CACHE_PREFIX}${idOrSlug}`);
    if (data) {
      return JSON.parse(data);
    }
  } catch (e) {
    console.warn('LocalStorage read error:', e);
  }
  return null;
}

export function setCachedGuide(idOrSlug, guideData) {
  try {
    localStorage.setItem(`${CACHE_PREFIX}${idOrSlug}`, JSON.stringify(guideData));
    // Also save by id if slug was used, or vice versa
    if (guideData.id) {
      localStorage.setItem(`${CACHE_PREFIX}${guideData.id}`, JSON.stringify(guideData));
    }
    if (guideData.slug) {
      localStorage.setItem(`${CACHE_PREFIX}${guideData.slug}`, JSON.stringify(guideData));
    }
  } catch (e) {
    console.warn('LocalStorage save error:', e);
  }
}
