'use client';

import React from 'react';
import { Calendar, Users, Edit, Trash2, ExternalLink } from 'lucide-react';
import { ClubEvent, EventType } from '@/types/models';
import { formatDate } from '@/lib/utils/formatters';

export interface EventWithRegCount extends ClubEvent {
  registrations_count: number;
}

interface AdminEventsTableProps {
  events: EventWithRegCount[];
  editingEventId: string | null;
  onEdit: (event: ClubEvent) => void;
  onDelete: (id: string, title: string) => void;
  onToggleStatus: (event: ClubEvent) => void;
  onOpenRegistrations: (event: ClubEvent) => void;
}

export default function AdminEventsTable({
  events,
  editingEventId,
  onEdit,
  onDelete,
  onToggleStatus,
  onOpenRegistrations,
}: AdminEventsTableProps) {
  const getEventTypeBadge = (type: EventType) => {
    switch (type) {
      case 'sbc_race':
        return {
          label: '🏁 Course Club SBC',
          className: 'bg-primary/15 text-primary border-primary/30',
        };
      case 'belgian_championship':
        return {
          label: '🏆 Champ. Belgique / Extérieur',
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
          label: 'Course',
          className: 'bg-primary/10 text-primary border-primary/20',
        };
    }
  };

  return (
    <div className="space-y-4">
      <h3 className="font-anybody font-black text-base uppercase tracking-wider text-white sport-skew border-b border-[#353535] pb-2 flex items-center justify-between">
        <span>Événements Enregistrés ({events.length})</span>
      </h3>

      {events.length === 0 ? (
        <div className="p-8 text-center text-xs text-foreground/50 font-mono border border-[#353535] rounded bg-surface">
          Aucun événement dans la base de données. Utilisez le formulaire pour en créer un.
        </div>
      ) : (
        <div className="space-y-4">
          {events.map((ev) => {
            const typeBadge = getEventTypeBadge(ev.event_type || 'sbc_race');
            const isEditing = editingEventId === ev.id;

            return (
              <div
                key={ev.id}
                className={`premium-card p-5 rounded-lg border transition-all ${
                  isEditing
                    ? 'border-primary shadow-[0_0_15px_rgba(255,110,0,0.2)]'
                    : 'border-[#353535]'
                }`}
              >
                <div className="flex justify-between items-start gap-3">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      {/* Type d'événement */}
                      <span className={`text-[9px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 border rounded ${typeBadge.className}`}>
                        {typeBadge.label}
                      </span>

                      {/* Statut ouvert/fermé */}
                      <span
                        className={`text-[9px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${
                          ev.status === 'open'
                            ? 'bg-success/15 text-success border-success/30'
                            : ev.status === 'closed'
                            ? 'bg-secondary/15 text-secondary border-secondary/30'
                            : 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20'
                        }`}
                      >
                        {ev.status === 'open' ? '🟢 Ouvert' : ev.status === 'closed' ? '🔴 Fermé' : '⚪ Brouillon'}
                      </span>

                      {/* Inscription active ou informatif */}
                      <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-surface border border-[#353535] text-foreground/60">
                        {ev.has_registration !== false ? 'Inscriptions Actives' : 'Informatif'}
                      </span>

                      <span className="text-[10px] text-foreground/50 font-mono flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-primary" />
                        {formatDate(ev.event_date)}
                      </span>
                    </div>

                    <h4 className="font-anybody font-black text-base text-white uppercase sport-skew mt-1">
                      {ev.title}
                    </h4>
                    {ev.description && (
                      <p className="text-xs text-foreground/60 line-clamp-2">{ev.description}</p>
                    )}

                    {ev.external_link && (
                      <div className="text-[10px] font-mono text-blue-400 flex items-center gap-1 truncate max-w-xs pt-0.5">
                        <ExternalLink className="w-3 h-3 shrink-0" />
                        <a
                          href={ev.external_link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="hover:underline truncate"
                        >
                          {ev.external_link}
                        </a>
                      </div>
                    )}
                  </div>
                </div>

                {/* Actions bar */}
                <div className="mt-4 pt-3 border-t border-[#353535]/50 flex items-center justify-between flex-wrap gap-2 text-xs font-mono">
                  {ev.has_registration !== false ? (
                    <button
                      onClick={() => onOpenRegistrations(ev)}
                      className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-surface-high hover:bg-surface border border-[#353535] text-white cursor-pointer"
                    >
                      <Users className="w-3.5 h-3.5 text-primary" />
                      <span>{ev.registrations_count} Pilotes inscrits</span>
                    </button>
                  ) : (
                    <span className="text-[10px] text-foreground/40 font-mono italic">
                      Sans inscription sur l&apos;app
                    </span>
                  )}

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => onToggleStatus(ev)}
                      title={ev.status === 'open' ? 'Fermer / Clôturer' : 'Ouvrir'}
                      className="px-2 py-1 rounded bg-surface hover:bg-surface-high border border-[#353535] text-[10px] uppercase font-bold cursor-pointer"
                    >
                      {ev.status === 'open' ? 'Fermer' : 'Ouvrir'}
                    </button>

                    <button
                      onClick={() => onEdit(ev)}
                      className="p-1.5 rounded bg-surface hover:bg-surface-high border border-[#353535] text-primary hover:text-white cursor-pointer"
                      title="Modifier"
                    >
                      <Edit className="w-3.5 h-3.5" />
                    </button>

                    <button
                      onClick={() => onDelete(ev.id, ev.title)}
                      className="p-1.5 rounded bg-surface hover:bg-surface-high border border-[#353535] text-secondary hover:text-red-400 cursor-pointer"
                      title="Supprimer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
