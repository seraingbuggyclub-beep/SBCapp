import React from 'react';
import { getTracks } from '../actions';
import WeatherWidget from './WeatherWidget';
import { Flag, AlertTriangle, CheckCircle2, Activity } from 'lucide-react';

export default async function TracksLiveStatus() {
  const { data: tracks } = await getTracks();

  return (
    <div className="w-full space-y-4">
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#353535] pb-3">
        <div className="flex items-center gap-2">
          <Activity className="w-5 h-5 text-primary animate-pulse" />
          <h2 className="font-anybody font-black text-lg md:text-xl uppercase tracking-tight sport-skew text-white">
            Direct Circuit & Météo <span className="text-primary">SBC</span>
          </h2>
        </div>
        <span className="text-[11px] font-mono text-foreground/50">
          Mise à jour en temps réel par les commissaires de piste
        </span>
      </div>

      {/* Grid: Weather Widget + Track Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Weather Widget (takes 5 cols on large screen) */}
        <div className="lg:col-span-5 flex flex-col justify-center">
          <WeatherWidget />
        </div>

        {/* 4 Tracks Cards Grid (takes 7 cols on large screen) */}
        <div className="lg:col-span-7 grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          {tracks.map((track) => {
            const isOpen = track.is_open;

            return (
              <div
                key={track.id || track.name}
                className={`relative rounded-xl p-3.5 border transition-all duration-300 flex flex-col justify-between overflow-hidden shadow-[3px_3px_0px_#000] ${
                  isOpen
                    ? 'bg-surface/80 border-green-500/30 hover:border-green-500/60'
                    : 'bg-red-950/20 border-red-500/40 hover:border-red-500/70'
                }`}
              >
                {/* Background glow when open/closed */}
                <div
                  className={`absolute -top-10 -right-10 w-24 h-24 rounded-full blur-2xl pointer-events-none ${
                    isOpen ? 'bg-green-500/10' : 'bg-red-500/15'
                  }`}
                />

                {/* Top: Track Name & Status Light */}
                <div className="flex items-start justify-between gap-1 relative z-10">
                  <span className="font-anybody font-black text-sm uppercase tracking-tight text-white line-clamp-1">
                    {track.name}
                  </span>

                  {/* Pastille / Lampe d'état */}
                  <div className="flex items-center shrink-0 pt-0.5">
                    {isOpen ? (
                      <span className="relative flex h-3 w-3">
                        <span className="h-3 w-3 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.8)]" />
                      </span>
                    ) : (
                      <span className="relative flex h-3 w-3">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500 animate-pulse shadow-[0_0_10px_rgba(239,68,68,0.9)]" />
                      </span>
                    )}
                  </div>
                </div>

                {/* Bottom: Status Label */}
                <div className="mt-3 relative z-10">
                  {isOpen ? (
                    <div className="flex items-center gap-1.5 text-green-400 font-mono text-[11px] font-bold">
                      <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                      <span>Ouverte</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 text-red-400 font-mono text-[11px] font-bold">
                      <AlertTriangle className="w-3.5 h-3.5 shrink-0 animate-bounce" />
                      <span className="leading-tight">Fermée / Travaux</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
