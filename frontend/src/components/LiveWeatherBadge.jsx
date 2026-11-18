import React, { useState, useEffect } from 'react';
import { Sun, CloudSun, Cloud, CloudRain, CloudLightning, CloudFog, Wind, Droplets } from 'lucide-react';
import { getLiveSpotWeather } from '../services/weatherService';

export default function LiveWeatherBadge({ latitude, longitude, compact = true }) {
  const [weather, setWeather] = useState(null);

  useEffect(() => {
    let isMounted = true;
    if (!latitude || !longitude) return;

    getLiveSpotWeather(latitude, longitude)
      .then((data) => {
        if (isMounted) {
          setWeather(data);
        }
      })
      .catch(() => {});

    return () => {
      isMounted = false;
    };
  }, [latitude, longitude]);

  if (!latitude || !longitude || !weather || !weather.available) {
    return null;
  }

  const renderIcon = (type) => {
    const iconClass = 'w-3 h-3 text-amber-400 flex-shrink-0';
    switch (type) {
      case 'cloud-sun':
        return <CloudSun className={iconClass} />;
      case 'cloud':
        return <Cloud className="w-3 h-3 text-slate-300 flex-shrink-0" />;
      case 'cloud-rain':
      case 'cloud-drizzle':
        return <CloudRain className="w-3 h-3 text-sky-400 flex-shrink-0" />;
      case 'cloud-lightning':
        return <CloudLightning className="w-3 h-3 text-amber-300 flex-shrink-0" />;
      case 'cloud-fog':
        return <CloudFog className="w-3 h-3 text-slate-400 flex-shrink-0" />;
      case 'sun':
      default:
        return <Sun className={iconClass} />;
    }
  };

  if (compact) {
    return (
      <span
        title={`Live Weather: ${weather.condition} (${weather.temperature}), Humidity: ${weather.humidity}. ${weather.advisory}`}
        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/[0.04] border border-white/10 text-[10px] text-slate-300 font-sans-clean font-medium cursor-help hover:border-amber-400/40 transition-colors"
      >
        {renderIcon(weather.iconType)}
        <span className="text-amber-300 font-bold font-mono">{weather.temperature}</span>
        <span className="hidden sm:inline text-slate-400 truncate max-w-[80px]">{weather.condition}</span>
      </span>
    );
  }

  return (
    <div className="flex flex-col gap-1 p-2.5 rounded-xl bg-white/[0.03] border border-white/10 text-xs font-sans-clean">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          {renderIcon(weather.iconType)}
          <span className="font-bold text-white">{weather.temperature}</span>
          <span className="text-slate-400">• {weather.condition}</span>
        </div>
        <span className="text-[10px] text-slate-500 font-mono">Live</span>
      </div>
      <div className="flex items-center gap-3 text-[10px] text-slate-400">
        <span className="flex items-center gap-1">
          <Droplets className="w-2.5 h-2.5 text-sky-400" />
          {weather.humidity}
        </span>
        <span className="flex items-center gap-1">
          <Wind className="w-2.5 h-2.5 text-slate-400" />
          {weather.windSpeed}
        </span>
      </div>
      {weather.advisory && (
        <p className="text-[10px] text-amber-200/80 italic pt-0.5 leading-tight">
          {weather.advisory}
        </p>
      )}
    </div>
  );
}
