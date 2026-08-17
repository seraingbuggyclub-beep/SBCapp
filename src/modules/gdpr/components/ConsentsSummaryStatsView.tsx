'use client';

import React from 'react';
import { MemberConsentsStats } from '@/types/models';
import {
  Bell,
  Trophy,
  Camera,
  MessageSquare,
  Users,
  ShieldCheck,
  Percent,
} from 'lucide-react';

interface ConsentsSummaryStatsViewProps {
  stats: MemberConsentsStats;
}

export default function ConsentsSummaryStatsView({
  stats,
}: ConsentsSummaryStatsViewProps) {
  const cards = [
    {
      title: 'Communications Officielles Club',
      desc: 'Convocations AG, cotisations, avis officiels',
      icon: Bell,
      count: stats.newsOptInCount,
      pct: stats.newsOptInPct,
      color: 'primary',
    },
    {
      title: 'Courses, Compétitions & Travaux',
      desc: 'Calendrier des courses et journées piste',
      icon: Trophy,
      count: stats.eventsOptInCount,
      pct: stats.eventsOptInPct,
      color: 'green-500',
    },
    {
      title: 'Droit à l\'Image (Photos/Médias)',
      desc: 'Podiums, photos de course sur les réseaux',
      icon: Camera,
      count: stats.imageRightsOptInCount,
      pct: stats.imageRightsOptInPct,
      color: 'blue-400',
    },
    {
      title: 'Groupe Communautaire WhatsApp',
      desc: 'Échanges informels entre pilotes du club',
      icon: MessageSquare,
      count: stats.whatsappOptInCount,
      pct: stats.whatsappOptInPct,
      color: 'emerald-400',
    },
  ];

  return (
    <div className="space-y-6 font-mono text-xs animate-fade-in">
      {/* Header Statut */}
      <div className="p-4 rounded-xl bg-surface border border-[#353535] flex items-center justify-between shadow-[3px_3px_0px_#000]">
        <div className="flex items-center gap-3">
          <Users className="w-5 h-5 text-primary" />
          <div>
            <span className="text-foreground/50 text-[10px] uppercase block font-bold">
              Base de Données Pilotes
            </span>
            <strong className="text-white font-anybody font-black text-lg">
              {stats.totalMembers} membres inscrits au registre
            </strong>
          </div>
        </div>

        <span className="px-3 py-1 rounded-full bg-primary/10 border border-primary/30 text-primary text-[10px] font-bold uppercase">
          Opt-in Conforme APD
        </span>
      </div>

      {/* Cartes de consentements */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {cards.map((card) => {
          const Icon = card.icon;

          return (
            <div
              key={card.title}
              className="p-5 rounded-xl bg-surface border border-[#353535] space-y-3 shadow-[4px_4px_0px_#000]"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-lg bg-surface-dim border border-[#353535] text-primary">
                    <Icon className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-anybody font-bold text-xs uppercase text-white">
                      {card.title}
                    </h4>
                    <p className="text-[10px] text-foreground/50">{card.desc}</p>
                  </div>
                </div>

                <span className="font-anybody font-black text-lg text-white">
                  {card.pct}%
                </span>
              </div>

              <div className="space-y-1.5 pt-1">
                <div className="w-full h-2.5 rounded-full bg-background overflow-hidden border border-[#353535]">
                  <div
                    className="h-full rounded-full bg-primary transition-all duration-500"
                    style={{ width: `${Math.max(4, card.pct)}%` }}
                  />
                </div>
                <div className="flex justify-between text-[10px] text-foreground/50">
                  <span>{card.count} membres consentants</span>
                  <span>{stats.totalMembers - card.count} opt-out</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
