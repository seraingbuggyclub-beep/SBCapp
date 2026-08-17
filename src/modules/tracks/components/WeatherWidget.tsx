'use client';

import React, { useEffect, useState } from 'react';
import {
  Sun,
  CloudSun,
  Cloud,
  CloudFog,
  CloudDrizzle,
  CloudRain,
  CloudSnow,
  CloudLightning,
  Wind,
  Droplets,
  Thermometer,
  RefreshCw,
} from 'lucide-react';

interface WeatherData {
  temperature: number;
  apparentTemperature: number;
  windSpeed: number;
  weatherCode: number;
  isDay: boolean;
  precipitationProbability: number;
  lastUpdated: string;
}

export default function WeatherWidget() {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchWeather = async () => {
    try {
      setLoading(true);
      setError(null);

      // Coordonnées GPS du complexe SBC à Seraing
      const lat = 50.599627;
      const lng = 5.529321;

      const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,apparent_temperature,is_day,weather_code,wind_speed_10m&daily=precipitation_probability_max&timezone=Europe%2FBrussels`;

      const res = await fetch(url, {
        next: { revalidate: 900 }, // 15 min cache
      });

      if (!res.ok) {
        throw new Error('Impossible de charger la météo en direct');
      }

      const data = await res.json();

      setWeather({
        temperature: Math.round(data.current.temperature_2m),
        apparentTemperature: Math.round(data.current.apparent_temperature),
        windSpeed: Math.round(data.current.wind_speed_10m),
        weatherCode: data.current.weather_code,
        isDay: data.current.is_day === 1,
        precipitationProbability: data.daily?.precipitation_probability_max?.[0] ?? 0,
        lastUpdated: new Date().toLocaleTimeString('fr-BE', { hour: '2-digit', minute: '2-digit' }),
      });
    } catch (err: unknown) {
      console.error('Weather fetch error:', err);
      setError('Météo momentanément indisponible');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWeather();
    // Rafraîchir toutes les 15 minutes
    const interval = setInterval(fetchWeather, 15 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  // Décodage du code WMO Open-Meteo
  const getWeatherInfo = (code: number, isDay: boolean) => {
    switch (code) {
      case 0:
        return {
          label: isDay ? 'Ensoleillé' : 'Nuit claire',
          icon: <Sun className="w-6 h-6 text-amber-400 animate-[spin_20s_linear_infinite]" />,
          bgColor: 'from-amber-500/10 to-transparent',
        };
      case 1:
      case 2:
        return {
          label: 'Éclaircies',
          icon: <CloudSun className="w-6 h-6 text-amber-300" />,
          bgColor: 'from-amber-500/10 to-transparent',
        };
      case 3:
        return {
          label: 'Couvert',
          icon: <Cloud className="w-6 h-6 text-slate-400" />,
          bgColor: 'from-slate-500/10 to-transparent',
        };
      case 45:
      case 48:
        return {
          label: 'Brouillard',
          icon: <CloudFog className="w-6 h-6 text-slate-400" />,
          bgColor: 'from-slate-500/10 to-transparent',
        };
      case 51:
      case 53:
      case 55:
      case 56:
      case 57:
        return {
          label: 'Bruine',
          icon: <CloudDrizzle className="w-6 h-6 text-cyan-400" />,
          bgColor: 'from-cyan-500/10 to-transparent',
        };
      case 61:
      case 63:
      case 65:
      case 80:
      case 81:
      case 82:
        return {
          label: 'Pluie',
          icon: <CloudRain className="w-6 h-6 text-blue-400" />,
          bgColor: 'from-blue-500/10 to-transparent',
        };
      case 71:
      case 73:
      case 75:
      case 77:
      case 85:
      case 86:
        return {
          label: 'Neige',
          icon: <CloudSnow className="w-6 h-6 text-indigo-300" />,
          bgColor: 'from-indigo-500/10 to-transparent',
        };
      case 95:
      case 96:
      case 99:
        return {
          label: 'Orage',
          icon: <CloudLightning className="w-6 h-6 text-yellow-400 animate-pulse" />,
          bgColor: 'from-yellow-500/15 to-transparent',
        };
      default:
        return {
          label: 'Variable',
          icon: <CloudSun className="w-6 h-6 text-amber-300" />,
          bgColor: 'from-slate-500/10 to-transparent',
        };
    }
  };

  if (loading && !weather) {
    return (
      <div className="bg-surface/90 backdrop-blur-md border border-[#353535] rounded-xl p-4 flex items-center justify-between min-h-[96px] animate-pulse shadow-[3px_3px_0px_#000]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-surface-high animate-pulse" />
          <div className="space-y-2">
            <div className="h-4 w-24 bg-surface-high rounded" />
            <div className="h-3 w-16 bg-surface-high rounded" />
          </div>
        </div>
        <div className="flex gap-4">
          <div className="h-8 w-16 bg-surface-high rounded" />
          <div className="h-8 w-16 bg-surface-high rounded" />
        </div>
      </div>
    );
  }

  if (error || !weather) {
    return (
      <div className="bg-surface/90 border border-[#353535] rounded-xl p-4 flex items-center justify-between shadow-[3px_3px_0px_#000]">
        <div className="flex items-center gap-2 text-foreground/50 text-xs font-mono">
          <Thermometer className="w-4 h-4 text-primary" />
          <span>Seraing (Piste SBC) : Météo hors ligne</span>
        </div>
        <button
          onClick={fetchWeather}
          className="p-1.5 rounded bg-surface hover:bg-surface-high text-foreground/70 hover:text-white transition-colors"
          title="Réessayer"
        >
          <RefreshCw className="w-3.5 h-3.5" />
        </button>
      </div>
    );
  }

  const weatherInfo = getWeatherInfo(weather.weatherCode, weather.isDay);

  return (
    <div className={`bg-linear-to-r ${weatherInfo.bgColor} bg-surface/90 backdrop-blur-md border border-[#353535] rounded-xl p-4 shadow-[4px_4px_0px_#000] relative overflow-hidden transition-all duration-300`}>
      {/* Subtle top indicator */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {/* Left: Weather condition and Location */}
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-background/80 border border-[#353535] flex items-center justify-center shadow-inner shrink-0">
            {weatherInfo.icon}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-anybody font-black text-2xl text-white tracking-tight">
                {weather.temperature}°C
              </span>
              <span className="text-[11px] font-mono text-foreground/50 uppercase px-2 py-0.5 rounded bg-background/60 border border-[#353535]">
                {weatherInfo.label}
              </span>
            </div>
            <div className="text-[11px] font-mono text-foreground/60 flex items-center gap-1.5 mt-0.5">
              <span>Seraing (Piste SBC)</span>
              <span>•</span>
              <span className="text-foreground/40">Ressenti {weather.apparentTemperature}°C</span>
            </div>
          </div>
        </div>

        {/* Right: Metrics (Wind & Rain probability) */}
        <div className="flex items-center gap-3 shrink-0 self-end sm:self-center">
          {/* Vent */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-background/60 border border-[#353535]">
            <Wind className="w-4 h-4 text-cyan-400" />
            <div className="flex flex-col">
              <span className="text-[10px] text-foreground/50 uppercase font-mono leading-none">Vent</span>
              <span className="text-xs font-mono font-bold text-white leading-tight">
                {weather.windSpeed} <span className="text-[10px] text-foreground/60 font-normal">km/h</span>
              </span>
            </div>
          </div>

          {/* Probabilité de Pluie */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-background/60 border border-[#353535]">
            <Droplets className="w-4 h-4 text-blue-400" />
            <div className="flex flex-col">
              <span className="text-[10px] text-foreground/50 uppercase font-mono leading-none">Risque Pluie</span>
              <span className={`text-xs font-mono font-bold leading-tight ${weather.precipitationProbability > 40 ? 'text-amber-400' : 'text-white'}`}>
                {weather.precipitationProbability} <span className="text-[10px] text-foreground/60 font-normal">%</span>
              </span>
            </div>
          </div>

          {/* Bouton rafraîchir discret */}
          <button
            onClick={fetchWeather}
            disabled={loading}
            className="p-2 rounded-lg bg-background/60 hover:bg-surface-high border border-[#353535] text-foreground/40 hover:text-white transition-colors cursor-pointer"
            title={`Dernière mise à jour à ${weather.lastUpdated}`}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-primary' : ''}`} />
          </button>
        </div>
      </div>
    </div>
  );
}
