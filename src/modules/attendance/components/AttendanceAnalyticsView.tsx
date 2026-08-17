'use client';

import React from 'react';
import { AttendanceStats } from '@/types/models';
import {
  BarChart3,
  Clock,
  Calendar,
  Users,
  Compass,
  Zap,
  TrendingUp,
  Activity,
} from 'lucide-react';

interface AttendanceAnalyticsViewProps {
  stats: AttendanceStats;
  period: 'week' | 'month' | 'year';
  onPeriodChange: (p: 'week' | 'month' | 'year') => void;
}

export default function AttendanceAnalyticsView({
  stats,
  period,
  onPeriodChange,
}: AttendanceAnalyticsViewProps) {
  // Calcul du max pour les barres de jours
  const maxDayCount = Math.max(1, ...Object.values(stats.dayOfWeekCounts));

  // Heures triées
  const sortedHours = Object.keys(stats.hourlyDistribution).sort((a, b) => {
    const numA = parseInt(a.replace('h', ''));
    const numB = parseInt(b.replace('h', ''));
    return numA - numB;
  });
  const maxHourCount = Math.max(1, ...Object.values(stats.hourlyDistribution));

  const totalPilotes = stats.totalMembersCount + stats.totalVisitorsCount;
  const memberPct = totalPilotes > 0 ? Math.round((stats.totalMembersCount / totalPilotes) * 100) : 100;
  const visitorPct = totalPilotes > 0 ? 100 - memberPct : 0;

  return (
    <div className="space-y-6 font-mono text-xs animate-fade-in">
      {/* Sélecteur de période */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-primary" />
          <h3 className="font-anybody font-black text-sm uppercase text-white tracking-wide">
            Analyse de Fréquentation & Affluence
          </h3>
        </div>

        <div className="flex rounded-lg bg-surface border border-[#353535] p-0.5">
          <button
            onClick={() => onPeriodChange('week')}
            className={`px-3 py-1 rounded text-xs font-bold transition-colors cursor-pointer ${
              period === 'week' ? 'bg-primary text-black' : 'text-foreground/60 hover:text-white'
            }`}
          >
            7 Jours
          </button>
          <button
            onClick={() => onPeriodChange('month')}
            className={`px-3 py-1 rounded text-xs font-bold transition-colors cursor-pointer ${
              period === 'month' ? 'bg-primary text-black' : 'text-foreground/60 hover:text-white'
            }`}
          >
            Ce Mois
          </button>
          <button
            onClick={() => onPeriodChange('year')}
            className={`px-3 py-1 rounded text-xs font-bold transition-colors cursor-pointer ${
              period === 'year' ? 'bg-primary text-black' : 'text-foreground/60 hover:text-white'
            }`}
          >
            Cette Année
          </button>
        </div>
      </div>

      {/* KPIs Cartes */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 1. Total Sessions */}
        <div className="p-4 rounded-xl bg-surface border border-[#353535] space-y-2 shadow-[3px_3px_0px_#000]">
          <div className="flex items-center justify-between text-foreground/45 text-[10px] uppercase font-bold">
            <span>Sessions de Roulage</span>
            <Users className="w-4 h-4 text-primary" />
          </div>
          <span className="font-anybody font-black text-2xl text-white block">
            {stats.totalSessions}
          </span>
          <p className="text-[10px] text-foreground/50">
            {stats.totalMembersCount} membres • {stats.totalVisitorsCount} visiteurs
          </p>
        </div>

        {/* 2. Jour Record */}
        <div className="p-4 rounded-xl bg-surface border border-[#353535] space-y-2 shadow-[3px_3px_0px_#000]">
          <div className="flex items-center justify-between text-foreground/45 text-[10px] uppercase font-bold">
            <span>Jour de Pic d'Affluence</span>
            <Calendar className="w-4 h-4 text-green-400" />
          </div>
          <span className="font-anybody font-black text-2xl text-green-400 block">
            {stats.busiestDay}
          </span>
          <p className="text-[10px] text-foreground/50">
            Journée la plus fréquentée
          </p>
        </div>

        {/* 3. Heure de Pointe */}
        <div className="p-4 rounded-xl bg-surface border border-[#353535] space-y-2 shadow-[3px_3px_0px_#000]">
          <div className="flex items-center justify-between text-foreground/45 text-[10px] uppercase font-bold">
            <span>Créneau le plus actif</span>
            <Clock className="w-4 h-4 text-amber-400" />
          </div>
          <span className="font-anybody font-black text-2xl text-amber-400 block">
            {stats.peakHour}
          </span>
          <p className="text-[10px] text-foreground/50">
            Tranche horaire préférée des pilotes
          </p>
        </div>

        {/* 4. Durée Moyenne */}
        <div className="p-4 rounded-xl bg-surface border border-[#353535] space-y-2 shadow-[3px_3px_0px_#000]">
          <div className="flex items-center justify-between text-foreground/45 text-[10px] uppercase font-bold">
            <span>Temps moyen sur place</span>
            <Zap className="w-4 h-4 text-blue-400" />
          </div>
          <span className="font-anybody font-black text-2xl text-blue-400 block">
            {Math.floor(stats.averageDurationMinutes / 60)}h {stats.averageDurationMinutes % 60}m
          </span>
          <p className="text-[10px] text-foreground/50">
            Durée moyenne par pilote
          </p>
        </div>
      </div>

      {/* Graphiques Principaux */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 1. Fréquentation par Jour de la Semaine */}
        <div className="p-5 rounded-xl bg-surface border border-[#353535] space-y-4 shadow-[4px_4px_0px_#000]">
          <div className="flex items-center justify-between border-b border-[#353535] pb-2">
            <h4 className="font-anybody font-bold text-xs uppercase text-white">
              Affluence par Jour de la Semaine
            </h4>
            <span className="text-[10px] text-foreground/40">Total pointages</span>
          </div>

          <div className="space-y-2.5">
            {Object.entries(stats.dayOfWeekCounts).map(([day, count]) => {
              const pct = Math.round((count / maxDayCount) * 100);
              const isWeekend = day === 'Samedi' || day === 'Dimanche';

              return (
                <div key={day} className="space-y-1">
                  <div className="flex justify-between text-[11px]">
                    <span className={isWeekend ? 'text-primary font-bold' : 'text-foreground/70'}>
                      {day}
                    </span>
                    <strong className="text-white">{count}</strong>
                  </div>
                  <div className="w-full h-2.5 rounded-full bg-background overflow-hidden border border-[#353535]">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        isWeekend ? 'bg-primary' : 'bg-foreground/40'
                      }`}
                      style={{ width: `${Math.max(4, pct)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 2. Répartition par Piste & Visiteurs */}
        <div className="space-y-6">
          {/* Répartition par piste */}
          <div className="p-5 rounded-xl bg-surface border border-[#353535] space-y-4 shadow-[4px_4px_0px_#000]">
            <div className="flex items-center justify-between border-b border-[#353535] pb-2">
              <h4 className="font-anybody font-bold text-xs uppercase text-white">
                Répartition d'Utilisation des Pistes
              </h4>
              <span className="text-[10px] text-foreground/40">Popularité</span>
            </div>

            <div className="space-y-3">
              {Object.keys(stats.trackDistribution).length === 0 ? (
                <p className="text-foreground/40 py-4 text-center">Aucune donnée de piste disponible.</p>
              ) : (
                Object.entries(stats.trackDistribution).map(([trackName, count]) => {
                  const trackPct = stats.totalSessions > 0 ? Math.round((count / stats.totalSessions) * 100) : 0;

                  return (
                    <div key={trackName} className="space-y-1">
                      <div className="flex justify-between text-[11px]">
                        <span className="text-white font-bold">{trackName}</span>
                        <span className="text-foreground/60">{count} sessions ({trackPct}%)</span>
                      </div>
                      <div className="w-full h-2.5 rounded-full bg-background overflow-hidden border border-[#353535]">
                        <div
                          className="h-full rounded-full bg-green-500 transition-all duration-500"
                          style={{ width: `${Math.max(4, trackPct)}%` }}
                        />
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Ratio Membres vs Visiteurs */}
          <div className="p-5 rounded-xl bg-surface border border-[#353535] space-y-3 shadow-[4px_4px_0px_#000]">
            <h4 className="font-anybody font-bold text-xs uppercase text-white border-b border-[#353535] pb-2">
              Proportion Membres vs Visiteurs d'un jour
            </h4>

            <div className="space-y-2">
              <div className="w-full h-3 rounded-full bg-background overflow-hidden flex border border-[#353535]">
                <div
                  className="bg-primary h-full transition-all duration-500"
                  style={{ width: `${memberPct}%` }}
                  title={`Membres SBC: ${memberPct}%`}
                />
                <div
                  className="bg-amber-500 h-full transition-all duration-500"
                  style={{ width: `${visitorPct}%` }}
                  title={`Visiteurs: ${visitorPct}%`}
                />
              </div>

              <div className="flex justify-between text-[10px] text-foreground/60">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-primary" />
                  <span>Membres SBC : <strong>{memberPct}%</strong> ({stats.totalMembersCount})</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                  <span>Visiteurs : <strong>{visitorPct}%</strong> ({stats.totalVisitorsCount})</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
