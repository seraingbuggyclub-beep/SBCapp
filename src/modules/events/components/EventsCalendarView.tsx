'use client';

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { getActiveEvents } from '@/modules/events/actions';
import { getBelgianHolidays } from '@/lib/belgian-holidays';
import { useAuth } from '@/hooks/useAuth';
import { ClubEvent, MergedCalendarItem } from '@/types/models';
import CalendarGrid, { CalendarFilterType } from './CalendarGrid';
import EventDetailDrawer from './EventDetailDrawer';
import QuickEventCreateModal from './QuickEventCreateModal';

interface EventsCalendarViewProps {
  onSelectEventForRegistration?: (eventId: string) => void;
}

export default function EventsCalendarView({
  onSelectEventForRegistration,
}: EventsCalendarViewProps) {
  const today = new Date();
  const [currentYear, setCurrentYear] = useState<number>(today.getFullYear());
  const [currentMonth, setCurrentMonth] = useState<number>(today.getMonth()); // 0-11
  const [dbEvents, setDbEvents] = useState<ClubEvent[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedDate, setSelectedDate] = useState<string>(
    `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
  );
  const [selectedFilter, setSelectedFilter] = useState<CalendarFilterType>('all');
  const [showHolidays, setShowHolidays] = useState<boolean>(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);
  const [toastMsg, setToastMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const { isAdmin } = useAuth();

  const loadEvents = useCallback(async () => {
    setLoading(true);
    const { data } = await getActiveEvents();
    setDbEvents(data || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  const showToast = useCallback((type: 'success' | 'error', text: string) => {
    setToastMsg({ type, text });
    setTimeout(() => setToastMsg(null), 4000);
  }, []);

  // 1. Calcul des jours fériés belges
  const holidays = useMemo(() => {
    return showHolidays ? getBelgianHolidays(currentYear) : [];
  }, [showHolidays, currentYear]);

  // 2. Fusion des événements Supabase et des jours fériés
  const mergedItems = useMemo<MergedCalendarItem[]>(() => {
    const sbcMapped: MergedCalendarItem[] = dbEvents.map((ev) => ({
      id: `ev-${ev.id}`,
      date: ev.event_date,
      title: ev.title,
      description: ev.description,
      source: 'supabase_event',
      event_type: ev.event_type || 'sbc_race',
      has_registration: ev.has_registration !== false,
      external_link: ev.external_link,
      location: ev.location,
      start_time: ev.start_time,
      end_time: ev.end_time,
      registration_fee: ev.registration_fee,
    }));

    const holidaysMapped: MergedCalendarItem[] = holidays.map((h) => ({
      id: `hol-${h.date}-${h.name}`,
      date: h.date,
      title: h.name,
      description: h.description,
      source: 'belgian_holiday',
      event_type: 'holiday',
      has_registration: false,
    }));

    const all = [...sbcMapped, ...holidaysMapped];

    // Application du filtre
    if (selectedFilter === 'sbc') {
      return all.filter((it) => it.source === 'supabase_event' && (it.event_type === 'sbc_race' || it.event_type === 'club_meeting'));
    }
    if (selectedFilter === 'champ') {
      return all.filter((it) => it.source === 'supabase_event' && it.event_type === 'belgian_championship');
    }
    if (selectedFilter === 'holiday') {
      return all.filter((it) => it.source === 'belgian_holiday' || it.event_type === 'holiday');
    }
    return all;
  }, [dbEvents, holidays, selectedFilter]);

  // Items sur la date sélectionnée
  const selectedDateItems = useMemo(() => {
    return mergedItems.filter((it) => it.date === selectedDate);
  }, [mergedItems, selectedDate]);

  // Navigation calendrier
  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear((y) => y - 1);
    } else {
      setCurrentMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear((y) => y + 1);
    } else {
      setCurrentMonth((m) => m + 1);
    }
  };

  const handleGoToToday = () => {
    const now = new Date();
    setCurrentYear(now.getFullYear());
    setCurrentMonth(now.getMonth());
    setSelectedDate(
      `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
    );
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMsg && (
        <div
          className={`fixed top-4 right-4 z-50 p-4 rounded shadow-2xl border font-mono text-xs animate-slide-in ${
            toastMsg.type === 'success'
              ? 'bg-success/20 border-success text-success'
              : 'bg-secondary/20 border-secondary text-secondary'
          }`}
        >
          {toastMsg.text}
        </div>
      )}

      {/* Grille principale du mois */}
      <CalendarGrid
        currentYear={currentYear}
        currentMonth={currentMonth}
        selectedDate={selectedDate}
        mergedItems={mergedItems}
        showHolidays={showHolidays}
        selectedFilter={selectedFilter}
        isAdmin={isAdmin}
        onPrevMonth={handlePrevMonth}
        onNextMonth={handleNextMonth}
        onGoToToday={handleGoToToday}
        onSelectDate={setSelectedDate}
        onToggleHolidays={setShowHolidays}
        onSelectFilter={setSelectedFilter}
        onOpenCreateModal={() => setIsCreateModalOpen(true)}
      />

      {/* Détails du jour sélectionné */}
      <EventDetailDrawer
        selectedDate={selectedDate}
        items={selectedDateItems}
        onSelectEventForRegistration={onSelectEventForRegistration}
      />

      {/* Modale d'ajout rapide admin */}
      <QuickEventCreateModal
        isOpen={isCreateModalOpen}
        defaultDate={selectedDate}
        onClose={() => setIsCreateModalOpen(false)}
        onCreated={async () => {
          showToast('success', 'Événement créé avec succès !');
          await loadEvents();
        }}
      />
    </div>
  );
}
