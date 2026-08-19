'use client';

import React from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Plus,
  Wrench,
  Trophy,
} from 'lucide-react';
import { MergedCalendarItem } from '@/types/models';

export type CalendarFilterType = 'all' | 'sbc' | 'champ' | 'work' | 'holiday';

const MONTH_NAMES = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
];

const WEEKDAY_NAMES = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

interface CalendarGridProps {
  currentYear: number;
  currentMonth: number;
  selectedDate: string;
  mergedItems: MergedCalendarItem[];
  showHolidays: boolean;
  selectedFilter: CalendarFilterType;
  isAdmin?: boolean;
  onPrevMonth: () => void;
  onNextMonth: () => void;
  onGoToToday: () => void;
  onSelectDate: (date: string) => void;
  onToggleHolidays: (val: boolean) => void;
  onSelectFilter: (filter: CalendarFilterType) => void;
  onOpenCreateModal?: () => void;
}

export default function CalendarGrid({
  currentYear,
  currentMonth,
  selectedDate,
  mergedItems,
  showHolidays,
  selectedFilter,
  isAdmin = false,
  onPrevMonth,
  onNextMonth,
  onGoToToday,
  onSelectDate,
  onToggleHolidays,
  onSelectFilter,
  onOpenCreateModal,
}: CalendarGridProps) {
  const today = new Date();
  const todayString = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  // Construction de la grille du calendrier (Lundi = premier jour)
  const firstDayOfMonth = new Date(Date.UTC(currentYear, currentMonth, 1));
  const daysInMonth = new Date(Date.UTC(currentYear, currentMonth + 1, 0)).getUTCDate();

  let startOffset = firstDayOfMonth.getUTCDay() - 1;
  if (startOffset === -1) startOffset = 6;

  const calendarDays: Array<{ dateString: string; dayNumber: number; isCurrentMonth: boolean }> = [];

  // Jours du mois précédent pour combler
  const prevMonthDays = new Date(Date.UTC(currentYear, currentMonth, 0)).getUTCDate();
  for (let i = startOffset - 1; i >= 0; i--) {
    const d = prevMonthDays - i;
    const prevM = currentMonth === 0 ? 12 : currentMonth;
    const prevY = currentMonth === 0 ? currentYear - 1 : currentYear;
    calendarDays.push({
      dateString: `${prevY}-${String(prevM).padStart(2, '0')}-${String(d).padStart(2, '0')}`,
      dayNumber: d,
      isCurrentMonth: false,
    });
  }

  // Jours du mois courant
  for (let d = 1; d <= daysInMonth; d++) {
    const mStr = String(currentMonth + 1).padStart(2, '0');
    const dStr = String(d).padStart(2, '0');
    calendarDays.push({
      dateString: `${currentYear}-${mStr}-${dStr}`,
      dayNumber: d,
      isCurrentMonth: true,
    });
  }

  // Jours du mois suivant pour compléter à un multiple de 7
  const remaining = (7 - (calendarDays.length % 7)) % 7;
  for (let d = 1; d <= remaining; d++) {
    const nextM = currentMonth === 11 ? 1 : currentMonth + 2;
    const nextY = currentMonth === 11 ? currentYear + 1 : currentYear;
    calendarDays.push({
      dateString: `${nextY}-${String(nextM).padStart(2, '0')}-${String(d).padStart(2, '0')}`,
      dayNumber: d,
      isCurrentMonth: false,
    });
  }

  // Obtenir les items d'une date spécifique
  const getItemsForDate = (dateString: string) => {
    return mergedItems.filter((it) => it.date === dateString);
  };

  return (
    <div className="premium-card p-6 md:p-8 rounded-lg border border-[#353535] space-y-6">
      {/* Header : Navigation Mois/Année + Boutons Filtres & Action Admin */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#353535] pb-4">
        {/* Navigation Mois / Année */}
        <div className="flex items-center gap-3">
          <button
            onClick={onPrevMonth}
            className="p-2 rounded hover:bg-surface border border-[#353535] text-foreground/70 hover:text-white cursor-pointer transition-colors"
            title="Mois précédent"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          
          <h2 className="font-anybody font-black text-xl md:text-2xl uppercase tracking-tight sport-skew text-white min-w-44 text-center">
            {MONTH_NAMES[currentMonth]} <span className="text-primary">{currentYear}</span>
          </h2>

          <button
            onClick={onNextMonth}
            className="p-2 rounded hover:bg-surface border border-[#353535] text-foreground/70 hover:text-white cursor-pointer transition-colors"
            title="Mois suivant"
          >
            <ChevronRight className="w-4 h-4" />
          </button>

          <button
            onClick={onGoToToday}
            className="px-2.5 py-1 text-[10px] font-mono uppercase bg-surface hover:bg-surface-high border border-[#353535] text-foreground/70 hover:text-white rounded cursor-pointer transition-colors"
          >
            Aujourd'hui
          </button>
        </div>

        {/* Filtres & Bouton Admin */}
        <div className="flex items-center gap-2 flex-wrap justify-end">
          {/* Filtres rapides */}
          <div className="flex items-center bg-surface p-0.5 rounded border border-[#353535] text-[10px] font-mono">
            <button
              onClick={() => onSelectFilter('all')}
              className={`px-2 py-1 rounded transition-colors cursor-pointer ${
                selectedFilter === 'all' ? 'bg-primary text-black font-bold' : 'text-foreground/60 hover:text-white'
              }`}
            >
              Tous
            </button>
            <button
              onClick={() => onSelectFilter('sbc')}
              className={`px-2 py-1 rounded transition-colors cursor-pointer ${
                selectedFilter === 'sbc' ? 'bg-primary text-black font-bold' : 'text-foreground/60 hover:text-white'
              }`}
            >
              Courses SBC
            </button>
            <button
              onClick={() => onSelectFilter('champ')}
              className={`px-2 py-1 rounded transition-colors cursor-pointer ${
                selectedFilter === 'champ' ? 'bg-primary text-black font-bold' : 'text-foreground/60 hover:text-white'
              }`}
            >
              Champ. BE
            </button>
            <button
              onClick={() => onSelectFilter('work')}
              className={`px-2 py-1 rounded transition-colors cursor-pointer flex items-center gap-1 ${
                selectedFilter === 'work' ? 'bg-amber-400 text-black font-bold' : 'text-amber-400/80 hover:text-amber-300'
              }`}
            >
              <Wrench className="w-2.5 h-2.5" />
              <span>Travaux</span>
            </button>
            <button
              onClick={() => onSelectFilter('holiday')}
              className={`px-2 py-1 rounded transition-colors cursor-pointer ${
                selectedFilter === 'holiday' ? 'bg-primary text-black font-bold' : 'text-foreground/60 hover:text-white'
              }`}
            >
              Fêtes/Fériés
            </button>
          </div>

          {/* Toggle Fériés belges */}
          <label className="flex items-center gap-1.5 text-[10px] font-mono text-foreground/60 cursor-pointer bg-surface px-2 py-1.5 rounded border border-[#353535]">
            <input
              type="checkbox"
              checked={showHolidays}
              onChange={(e) => onToggleHolidays(e.target.checked)}
              className="accent-primary cursor-pointer w-3 h-3"
            />
            <span>Fériés BE</span>
          </label>

          {/* Bouton Création Admin si connecté avec privilèges */}
          {isAdmin && onOpenCreateModal && (
            <button
              onClick={onOpenCreateModal}
              className="px-3 py-1.5 bg-primary/20 hover:bg-primary border border-primary/40 hover:border-primary text-primary hover:text-black font-anybody font-black uppercase text-[10px] tracking-wider rounded transition-all sport-skew flex items-center gap-1 cursor-pointer shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span className="transform skew-x-8">Ajouter Course</span>
            </button>
          )}
        </div>
      </div>

      {/* Grille du Calendrier */}
      <div className="space-y-1">
        {/* Jours de la semaine */}
        <div className="grid grid-cols-7 gap-1 text-center font-mono text-[10px] text-foreground/45 uppercase tracking-wider pb-2 border-b border-[#353535]/50">
          {WEEKDAY_NAMES.map((w, idx) => (
            <div key={idx} className={idx >= 5 ? 'text-primary font-bold' : ''}>
              {w}
            </div>
          ))}
        </div>

        {/* Cellules des jours */}
        <div className="grid grid-cols-7 gap-1 md:gap-1.5">
          {calendarDays.map((cd) => {
            const items = getItemsForDate(cd.dateString);
            const isToday = cd.dateString === todayString;
            const isSelected = cd.dateString === selectedDate;
            const hasSbcEvent = items.some((it) => it.source === 'supabase_event');
            const hasWorkSession = items.some((it) => it.source === 'work_session');
            const hasHoliday = items.some((it) => it.source === 'belgian_holiday');

            return (
              <button
                key={cd.dateString}
                onClick={() => onSelectDate(cd.dateString)}
                className={`min-h-16 md:min-h-20 p-1.5 rounded text-left transition-all relative flex flex-col justify-between cursor-pointer border ${
                  isSelected
                    ? 'border-primary bg-primary/10 shadow-[inset_0_0_10px_rgba(255,110,0,0.2)] ring-1 ring-primary'
                    : isToday
                    ? 'border-primary/50 bg-surface-high'
                    : cd.isCurrentMonth
                    ? 'border-[#353535]/70 bg-surface/50 hover:bg-surface-high hover:border-[#454545]'
                    : 'border-[#252525] bg-surface-dim/30 opacity-40 hover:opacity-75'
                }`}
              >
                {/* Numéro du jour + Indicateur Today */}
                <div className="flex items-center justify-between w-full">
                  <span
                    className={`font-mono text-xs md:text-sm font-bold ${
                      isToday
                        ? 'w-5 h-5 rounded-full bg-primary text-black flex items-center justify-center font-black'
                        : isSelected
                        ? 'text-primary font-black'
                        : cd.isCurrentMonth
                        ? 'text-white'
                        : 'text-foreground/40'
                    }`}
                  >
                    {cd.dayNumber}
                  </span>

                  {/* Badges de quantité d'activités */}
                  {items.length > 0 && (
                    <span className="text-[9px] font-mono font-bold px-1 rounded bg-primary/20 text-primary border border-primary/30">
                      {items.length}
                    </span>
                  )}
                </div>

                {/* Mini Aperçu des événements sur le jour */}
                <div className="space-y-0.5 w-full mt-1 overflow-hidden">
                  {items.slice(0, 2).map((item) => (
                    <div
                      key={item.id}
                      className={`text-[8px] md:text-[9px] truncate px-1 py-0.5 rounded font-mono font-bold leading-tight ${
                        item.source === 'work_session'
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                          : item.source === 'supabase_event'
                          ? 'bg-racing-red/20 text-racing-red border border-racing-red/30'
                          : 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                      }`}
                      title={item.title}
                    >
                      {item.source === 'work_session' ? `🛠️ ${item.title}` : item.title}
                    </div>
                  ))}
                  {items.length > 2 && (
                    <div className="text-[8px] text-foreground/40 font-mono text-right">
                      +{items.length - 2} autre(s)
                    </div>
                  )}
                </div>

                {/* Indicateurs discrets en bas de cellule */}
                <div className="flex gap-1 mt-auto pt-1">
                  {hasWorkSession && <div className="w-1.5 h-1.5 rounded-full bg-amber-400" title="Session Travaux SBC" />}
                  {hasSbcEvent && <div className="w-1.5 h-1.5 rounded-full bg-primary" title="Course Club SBC" />}
                  {hasHoliday && <div className="w-1.5 h-1.5 rounded-full bg-blue-400" title="Jour Férié / Fête" />}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
