import React from 'react';
import { getTracks } from '../actions';
import WeatherWidget from './WeatherWidget';
import { Flag, AlertTriangle, CheckCircle2, Activity, Clock, Wrench } from 'lucide-react';

function getReopeningInfo(dateStr?: string | null) {
  if (!dateStr) return null;
  try {
    const target = new Date(dateStr);
    const now = new Date();
    const diffMs = target.getTime() - now.getTime();
    const diffMins = Math.round(diffMs / 60000);

    const timeString = target.toLocaleTimeString('fr-BE', { hour: '2-digit', minute: '2-digit' });
    const isToday = target.toDateString() === now.toDateString();
    const dateLabel = isToday ? '' : ` le ${target.toLocaleDateString('fr-BE', { day: '2-digit', month: '2-digit' })}`;

    let relative = '';
    if (diffMins > 0) {
      if (diffMins < 60) {
        relative = ` (dans ${diffMins} min)`;
      } else {
        const hours = Math.floor(diffMins / 60);
        const remainingMins = diffMins % 60;
        relative = remainingMins > 0 ? ` (~${hours}h${remainingMins < 10 ? '0' : ''}${remainingMins})` : ` (~${hours}h)`;
      }
    }

    return {
      text: `Réouverture prévue vers ${timeString}${dateLabel}`,
      relative,
    };
  } catch {
    return null;
  }
}

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
        <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
          {tracks.map((track) => {
            const isOpen = track.is_open;
            const reopeningInfo = !isOpen ? getReopeningInfo(track.reopening_at) : null;
            const isIndefinite = !isOpen && track.closure_type === 'INDEFINITE_WORKS';

            return (
              <div
                key={track.id || track.name}
                className={`relative rounded-xl p-3.5 border transition-all duration-300 flex flex-col justify-between overflow-hidden shadow-[3px_3px_0px_#000] ${
                  isOpen
                    ? 'bg-surface/80 border-green-500/30 hover:border-green-500/60'
                    : isIndefinite
                    ? 'bg-amber-950/20 border-amber-500/40 hover:border-amber-500/70'
                    : 'bg-red-950/20 border-red-500/40 hover:border-red-500/70'
                }`}
              >
                {/* Background glow when open/closed */}
                <div
                  className={`absolute -top-10 -right-10 w-24 h-24 rounded-full blur-2xl pointer-events-none ${
                    isOpen ? 'bg-green-500/10' : isIndefinite ? 'bg-amber-500/15' : 'bg-red-500/15'
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
                      <span className="h-3 w-3 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.8)]" />
                    ) : isIndefinite ? (
                      <span className="h-3 w-3 rounded-full bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.8)]" />
                    ) : (
                      <span className="h-3 w-3 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8)]" />
                    )}
                  </div>
                </div>

                {/* Bottom: Status Label & Closure Details */}
                <div className="mt-3 relative z-10 space-y-1">
                  {isOpen ? (
                    <div className="flex items-center gap-1.5 text-green-400 font-mono text-[11px] font-bold">
                      <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                      <span>Ouverte</span>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5 text-red-400 font-mono text-[11px] font-bold">
                        <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                        <span className="leading-tight">Fermée</span>
                      </div>

                      {/* Motif et durée de fermeture */}
                      {isIndefinite ? (
                        <div className="flex items-center gap-1 text-[10px] font-mono text-amber-400 font-medium">
                          <Wrench className="w-3 h-3 shrink-0" />
                          <span>Travaux en cours (Indéterminé)</span>
                        </div>
                      ) : reopeningInfo ? (
                        <div className="flex items-start gap-1 text-[10px] font-mono text-foreground/80 leading-tight">
                          <Clock className="w-3 h-3 shrink-0 text-primary mt-0.5" />
                          <div>
                            <span className="text-red-300">{reopeningInfo.text}</span>
                            {reopeningInfo.relative && (
                              <span className="text-foreground/50 font-bold ml-1">{reopeningInfo.relative}</span>
                            )}
                          </div>
                        </div>
                      ) : null}

                      {/* Motif textuel si spécifié */}
                      {track.closure_reason && (
                        <p className="text-[10px] font-mono text-foreground/50 italic line-clamp-1">
                          {track.closure_reason}
                        </p>
                      )}
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
