/**
 * Real-Time Live Weather Service for Globetrotter Gateway
 * 
 * Fetches hyper-local meteorological conditions for tourist destinations
 * using coordinate-based satellite meteorological data (Open-Meteo Open API).
 * Zero rate-limit token consumption, zero API keys required, cached for 30 minutes.
 */

const WEATHER_CACHE = new Map();
const CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes

/**
 * WMO Weather interpretation codes (WW)
 */
function decodeWmoWeather(code) {
  if (code === 0) return { label: 'Clear Sky', icon: 'sun', advisory: 'Optimal visibility for sightseeing and outdoor photography.' };
  if (code === 1) return { label: 'Mainly Clear', icon: 'sun', advisory: 'Pleasant daylight conditions for exploring.' };
  if (code === 2) return { label: 'Partly Cloudy', icon: 'cloud-sun', advisory: 'Comfortable cloud cover; gentle sunlight.' };
  if (code === 3) return { label: 'Overcast', icon: 'cloud', advisory: 'Diffused sunlight; cooler daytime ambient temperature.' };
  if (code === 45 || code === 48) return { label: 'Misty / Foggy', icon: 'cloud-fog', advisory: 'Low visibility in valleys; exercise caution on ghat roads.' };
  if (code >= 51 && code <= 55) return { label: 'Light Drizzle', icon: 'cloud-drizzle', advisory: 'Carry an umbrella; rock surfaces may be mildly slick.' };
  if (code >= 61 && code <= 65) return { label: 'Rain', icon: 'cloud-rain', advisory: 'Wet pathways; wear high-traction footwear near waterfalls.' };
  if (code >= 80 && code <= 82) return { label: 'Rain Showers', icon: 'cloud-rain', advisory: 'Intermittent showers; monitor waterfall plunge pools.' };
  if (code >= 95) return { label: 'Thunderstorm', icon: 'cloud-lightning', advisory: 'Severe weather advisory: avoid clifftops and open viewpoints.' };
  return { label: 'Fair Weather', icon: 'sun', advisory: 'Standard regional seasonal conditions.' };
}

/**
 * Fetches real-time weather for any spot given latitude and longitude.
 * @param {number} latitude
 * @param {number} longitude
 * @returns {Promise<Object>} Formatted weather summary
 */
export async function getLiveSpotWeather(latitude, longitude) {
  const lat = parseFloat(latitude);
  const lng = parseFloat(longitude);

  if (isNaN(lat) || isNaN(lng) || lat < 5.0 || lng < 60.0) {
    return {
      available: false,
      temperature: null,
      condition: 'Regional Weather',
      advisory: 'Pleasant regional seasonal travel window.'
    };
  }

  // Rounded coordinate cache key (resolution ~1.1km)
  const cacheKey = `${lat.toFixed(2)}_${lng.toFixed(2)}`;
  const cached = WEATHER_CACHE.get(cacheKey);
  if (cached && (Date.now() - cached.timestamp < CACHE_TTL_MS)) {
    return cached.data;
  }

  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m&timezone=auto`;
    const response = await fetch(url, { signal: AbortSignal.timeout(4000) });
    
    if (!response.ok) {
      throw new Error(`Open-Meteo HTTP error ${response.status}`);
    }

    const json = await response.json();
    const current = json.current;
    if (!current) {
      throw new Error('Missing current weather data');
    }

    const decoded = decodeWmoWeather(current.weather_code);
    const tempC = Math.round(current.temperature_2m);
    const feelsLikeC = Math.round(current.apparent_temperature);
    const humidity = current.relative_humidity_2m;
    const windSpeed = Math.round(current.wind_speed_10m);

    const weatherData = {
      available: true,
      temperature: `${tempC}°C`,
      tempNumber: tempC,
      feelsLike: `${feelsLikeC}°C`,
      condition: decoded.label,
      iconType: decoded.icon,
      advisory: decoded.advisory,
      humidity: `${humidity}%`,
      windSpeed: `${windSpeed} km/h`,
      precipitation: `${current.precipitation} mm`,
      fetchedAt: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
    };

    WEATHER_CACHE.set(cacheKey, { timestamp: Date.now(), data: weatherData });
    return weatherData;
  } catch {
    // Graceful fallback without throwing
    const fallback = {
      available: false,
      temperature: null,
      condition: 'Typical Season (26°C – 32°C)',
      advisory: 'Pleasant daytime sightseeing conditions.'
    };
    return fallback;
  }
}

export default {
  getLiveSpotWeather
};
