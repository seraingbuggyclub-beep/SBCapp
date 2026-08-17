'use client';

import React from 'react';
import Link from 'next/link';
import {
  Calendar as CalendarIcon,
  MapPin,
  Clock,
  ExternalLink,
  Trophy,
  PartyPopper,
  Info,
} from 'lucide-react';
import { MergedCalendarItem, EventType } from '@/types/models';

interface EventDetailDrawerProps {
  selectedDate: string;
  items: MergedCalendarItem[];
  onSelectEventForRegistration?: (eventId: string) => void;
}

export default function EventDetailDrawer({
  selectedDate,
  items,
  onSelectEventForRegistration,
}: EventDetailDrawerProps) {
  const parsedDate = new Date(`${selectedDate}T00:00:00`);
  const formattedDate = parsedDate.toLocaleDateString('fr-BE', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const getEventTypeBadge = (type?: EventType) => {
    switch (type) {
      case 'sbc_race':
        return {
          label: '🏁 Course Club SBC',
          className: 'bg-primary/15 text-primary border-primary/30',
        };
      case 'belgian_championship':
        return {
          label: '🏆 Champ. de Belgique / Extérieur',
          className: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
        };
      case 'holiday':
        return {
          label: '🎉 Événement Spécial / Fête',
          className: 'bg-purple-500/15 text-purple-400 border-purple-500/30',
        };
      case 'club_meeting':
        return {
          label: '🤝 Réunion Club',
          className: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
        };
      default:
        return {
          label: 'Course / Activité',
          className: 'bg-primary/10 text-primary border-primary/20',
        };
    }
  };

  return (
    <div className="premium-card p-6 md:p-8 rounded-lg border border-[#353535] space-y-6">
      {/* Date Header */}
      <div className="border-b border-[#353535] pb-3 flex items-center justify-between">
        <div>
          <span className="text-[10px] font-mono text-primary uppercase tracking-wider block">
            Programme du jour
          </span>
          <h3 className="font-anybody font-black text-lg md:text-xl uppercase tracking-tight sport-skew text-white capitalize">
            {formattedDate}
          </h3>
        </div>
        <span className="text-xs font-mono text-foreground/50 bg-surface px-2.5 py-1 rounded border border-[#353535]">
          {items.length} activité(s)
        </span>
      </div>

      {/* Liste des activités du jour */}
      {items.length === 0 ? (
        <div className="p-8 text-center space-y-2 border border-dashed border-[#353535] rounded-lg bg-surface/20">
          <CalendarIcon className="w-8 h-8 text-foreground/30 mx-auto mb-2" />
          <p className="text-xs font-mono text-foreground/50">
            Aucun événement ni fête répertorié pour cette date.
          </p>
          <p className="text-[10px] font-mono text-foreground/30">
            Piste ouverte pour les entraînements libres des membres en règle de cotisation.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {items.map((item) => {
            const isSupabase = item.source === 'supabase_event';
            const badge = isSupabase
              ? getEventTypeBadge(item.event_type)
              : {
                  label: '🇧🇪 Férié / Fête Belge',
                  className: 'bg-blue-500/15 text-blue-300 border-blue-500/30',
                };

            const realEventId = item.id.startsWith('ev-') ? item.id.replace('ev-', '') : item.id;

            return (
              <div
                key={item.id}
                className="p-5 rounded-lg border border-[#353535] bg-surface/50 hover:bg-surface transition-all space-y-3"
              >
                {/* Badge type + Titre */}
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`px-2 py-0.5 rounded text-[9px] font-mono font-bold uppercase tracking-wider border ${badge.className}`}>
                      {badge.label}
                    </span>
                    {item.start_time && (
                      <span className="text-[10px] text-foreground/50 font-mono flex items-center gap-1">
                        <Clock className="w-3 h-3 text-primary" />
                        {item.start_time.slice(0, 5)} {item.end_time ? `- ${item.end_time.slice(0, 5)}` : ''}
                      </span>
                    )}
                  </div>

                  <h4 className="font-anybody font-black text-base text-white uppercase sport-skew">
                    {item.title}
                  </h4>
                </div>

                {/* Description */}
                {item.description && (
                  <p className="text-xs text-foreground/70 leading-relaxed font-sans">
                    {item.description}
                  </p>
                )}

                {/* Localisation */}
                {item.location && (
                  <div className="text-[10px] text-foreground/50 font-mono flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-primary shrink-0" />
                    <span>{item.location}</span>
                  </div>
                )}

                {/* Actions & Tarification */}
                <div className="pt-2 border-t border-[#353535]/50 flex items-center justify-between gap-3 flex-wrap">
                  {isSupabase && item.has_registration ? (
                    <div className="flex items-center justify-between w-full">
                      <div className="text-xs font-mono text-primary font-bold">
                        À partir de €{Number(item.registration_fee || 0).toFixed(2)}
                      </div>

                      {onSelectEventForRegistration ? (
                        <button
                          type="button"
                          onClick={() => onSelectEventForRegistration(realEventId)}
                          className="px-4 py-1.5 bg-primary text-black font-anybody font-black uppercase text-xs tracking-wider rounded sport-skew hover:bg-secondary hover:text-white transition-all cursor-pointer shadow-xs"
                        >
                          <span className="transform skew-x-8">S'inscrire</span>
                        </button>
                      ) : (
                        <Link
                          href="/events"
                          className="px-4 py-1.5 bg-primary text-black font-anybody font-black uppercase text-xs tracking-wider rounded sport-skew hover:bg-secondary hover:text-white transition-all cursor-pointer shadow-xs"
                        >
                          <span className="transform skew-x-8">S'inscrire</span>
                        </Link>
                      )}
                    </div>
                  ) : item.external_link ? (
                    <a
                      href={item.external_link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-blue-400 hover:text-blue-300 font-mono text-xs font-bold transition-colors"
                    >
                      <span>Site officiel & Informations</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  ) : (
                    <span className="text-[10px] text-foreground/40 font-mono italic">
                      Information générale
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
