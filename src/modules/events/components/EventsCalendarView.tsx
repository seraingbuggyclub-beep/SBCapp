'use client';

import React, { useEffect, useState } from 'react';
import { getActiveEvents, createEventAdmin, EventFormData, EventType, RaceCategoryItem, MealOptionItem } from '@/modules/events/actions';
import { getBelgianHolidays } from '@/lib/belgian-holidays';
import { createClient } from '@/lib/supabase/client';
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Trophy,
  ExternalLink,
  MapPin,
  Clock,
  Plus,
  X,
  CheckCircle2,
  AlertTriangle,
  Save,
  Shield,
  PartyPopper,
  DollarSign,
  Utensils,
  Trash2,
} from 'lucide-react';
import Link from 'next/link';

export interface MergedCalendarItem {
  id: string;
  date: string; // YYYY-MM-DD
  title: string;
  description?: string;
  source: 'supabase_event' | 'belgian_holiday';
  event_type?: 'sbc_race' | 'belgian_championship' | 'holiday' | 'club_meeting';
  has_registration?: boolean;
  external_link?: string | null;
  location?: string;
  start_time?: string;
  end_time?: string;
  registration_fee?: number;
}

const DEFAULT_CATEGORIES: RaceCategoryItem[] = [
  { name: 'Buggy 1/10 2WD', fee: 10, type: 'Electric' },
  { name: 'Buggy 1/10 4WD', fee: 10, type: 'Electric' },
  { name: 'Truck 1/10 2wD', fee: 10, type: 'Electric' },
  { name: 'Buggy 1/8', fee: 15, type: 'Nitro / Elec' },
  { name: 'Truggy 1/8', fee: 15, type: 'Nitro / Elec' },
  { name: 'Vintage 1/10', fee: 10, type: 'Electric' },
  { name: 'Rallye Game 1/10', fee: 10, type: 'Electric' },
];

const DEFAULT_MEALS: MealOptionItem[] = [
  { name: 'Pain garni Hamburger', price: 4.5, desc: 'Pain garni avec hamburger chaud' },
  { name: 'Pain garni Mexicanos', price: 4.5, desc: 'Pain garni avec mexicanos chaud' },
  { name: 'Pain garni Saucisse géante', price: 4.5, desc: 'Pain garni avec saucisse géante' },
];

const MONTH_NAMES = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
];

const WEEKDAY_NAMES = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

export default function EventsCalendarView() {
  const today = new Date();
  const [currentYear, setCurrentYear] = useState<number>(today.getFullYear());
  const [currentMonth, setCurrentMonth] = useState<number>(today.getMonth()); // 0-11
  
  const [dbEvents, setDbEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedDate, setSelectedDate] = useState<string>(
    `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
  );
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'sbc' | 'champ' | 'holiday'>('all');
  const [showHolidays, setShowHolidays] = useState<boolean>(true);

  // Admin authentication state
  const [isAdmin, setIsAdmin] = useState<boolean>(false);

  // Quick Event Creation Modal State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);
  const [modalDate, setModalDate] = useState<string>('');
  const [modalTitle, setModalTitle] = useState<string>('');
  const [modalDesc, setModalDesc] = useState<string>('');
  const [modalType, setModalType] = useState<EventType>('sbc_race');
  const [modalHasReg, setModalHasReg] = useState<boolean>(true);
  const [modalExtLink, setModalExtLink] = useState<string>('');
  const [modalStartTime, setModalStartTime] = useState<string>('09:00');
  const [modalEndTime, setModalEndTime] = useState<string>('18:00');
  const [modalLocation, setModalLocation] = useState<string>('Seraing Buggy Track, Belgium');
  
  // Custom categories & meals for the event being created
  const [modalCategories, setModalCategories] = useState<RaceCategoryItem[]>(DEFAULT_CATEGORIES);
  const [modalMeals, setModalMeals] = useState<MealOptionItem[]>(DEFAULT_MEALS);

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [modalError, setModalError] = useState<string>('');
  const [toastMsg, setToastMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const supabase = createClient();

  const loadEvents = async () => {
    setLoading(true);
    const { data } = await getActiveEvents();
    setDbEvents(data || []);
    setLoading(false);
  };

  useEffect(() => {
    loadEvents();

    async function checkAdmin() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: profile } = await supabase
            .from('sbc_members')
            .select('role, email')
            .eq('id', user.id)
            .single();

          if (user.email === 'stefga1@gmail.com' || profile?.role === 'admin') {
            setIsAdmin(true);
          }
        }
      } catch (err) {
        console.error(err);
      }
    }
    checkAdmin();
  }, []);

  const showToast = (type: 'success' | 'error', text: string) => {
    setToastMsg({ type, text });
    setTimeout(() => setToastMsg(null), 4000);
  };

  // 1. Calcul des jours fériés pour l'année affichée (si activé)
  const holidays = showHolidays ? getBelgianHolidays(currentYear) : [];

  // 2. Fusion des événements Supabase et des jours fériés
  const mergedItems: MergedCalendarItem[] = [
    // Événements Supabase
    ...dbEvents.map((ev) => ({
      id: `ev-${ev.id}`,
      date: ev.event_date,
      title: ev.title,
      description: ev.description,
      source: 'supabase_event' as const,
      event_type: ev.event_type || 'sbc_race',
      has_registration: ev.has_registration !== false,
      external_link: ev.external_link,
      location: ev.location,
      start_time: ev.start_time,
      end_time: ev.end_time,
      registration_fee: ev.registration_fee,
    })),
    // Jours fériés & Fêtes belges
    ...holidays.map((h) => ({
      id: `hol-${h.date}-${h.name}`,
      date: h.date,
      title: h.name,
      description: h.description,
      source: 'belgian_holiday' as const,
      event_type: 'holiday' as const,
      has_registration: false,
      location: 'Belgique',
    })),
  ];

  // Navigation mois
  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(currentYear - 1);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(currentYear + 1);
    } else {
      setCurrentMonth(currentMonth + 1);
    }
  };

  const handleGoToday = () => {
    setCurrentYear(today.getFullYear());
    setCurrentMonth(today.getMonth());
    setSelectedDate(
      `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
    );
  };

  // Modal open helper
  const openCreateModal = (targetDate?: string) => {
    const initialDate = targetDate || selectedDate || `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    setModalDate(initialDate);
    setModalTitle('');
    setModalDesc('');
    setModalType('sbc_race');
    setModalHasReg(true);
    setModalExtLink('');
    setModalStartTime('09:00');
    setModalEndTime('18:00');
    setModalLocation('Seraing Buggy Track, Belgium');
    setModalCategories(DEFAULT_CATEGORIES);
    setModalMeals(DEFAULT_MEALS);
    setModalError('');
    setIsCreateModalOpen(true);
  };

  const handleModalTypeChange = (type: EventType) => {
    setModalType(type);
    if (type === 'sbc_race') {
      setModalHasReg(true);
      setModalLocation('Seraing Buggy Track, Belgium');
    } else if (type === 'belgian_championship') {
      setModalHasReg(false);
      setModalLocation('Belgique (Extérieur)');
    } else if (type === 'holiday') {
      setModalHasReg(false);
    } else if (type === 'club_meeting') {
      setModalHasReg(false);
    }
  };

  // Category handlers inside modal
  const handleModalAddCategory = () => {
    setModalCategories([...modalCategories, { name: 'Nouvelle Catégorie', fee: 10, type: 'Electric' }]);
  };

  const handleModalCategoryChange = (index: number, field: keyof RaceCategoryItem, val: any) => {
    const updated = [...modalCategories];
    updated[index] = { ...updated[index], [field]: val };
    setModalCategories(updated);
  };

  const handleModalRemoveCategory = (index: number) => {
    setModalCategories(modalCategories.filter((_, i) => i !== index));
  };

  // Meal handlers inside modal
  const handleModalAddMeal = () => {
    setModalMeals([...modalMeals, { name: 'Pain garni', price: 4.5, desc: '' }]);
  };

  const handleModalMealChange = (index: number, field: keyof MealOptionItem, val: any) => {
    const updated = [...modalMeals];
    updated[index] = { ...updated[index], [field]: val };
    setModalMeals(updated);
  };

  const handleModalRemoveMeal = (index: number) => {
    setModalMeals(modalMeals.filter((_, i) => i !== index));
  };

  const handleQuickCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!modalTitle.trim() || !modalDate) {
      setModalError('Le titre et la date sont requis.');
      return;
    }

    setIsSubmitting(true);
    setModalError('');

    try {
      const payload: EventFormData = {
        title: modalTitle.trim(),
        description: modalDesc.trim() || undefined,
        event_date: modalDate,
        start_time: modalStartTime,
        end_time: modalEndTime,
        category: modalType === 'sbc_race' ? 'Course Club SBC' : modalType === 'belgian_championship' ? 'Champ. de Belgique' : modalType === 'holiday' ? 'Événement Spécial' : 'Réunion Club',
        location: modalLocation.trim() || 'Seraing Buggy Track, Belgium',
        registration_fee: modalHasReg && modalCategories[0]?.fee ? modalCategories[0].fee : 0,
        status: 'open',
        event_type: modalType,
        has_registration: modalHasReg,
        external_link: modalExtLink.trim() || undefined,
        categories: modalHasReg ? modalCategories : [],
        meal_options: modalHasReg ? modalMeals : [],
      };

      const { data, error } = await createEventAdmin(payload);
      if (error) {
        setModalError(error);
      } else {
        setIsCreateModalOpen(false);
        showToast('success', `Événement "${modalTitle}" créé avec succès !`);
        await loadEvents();
      }
    } catch (err: any) {
      setModalError(err.message || 'Erreur lors de la création');
    } finally {
      setIsSubmitting(false);
    }
  };

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

  // Jours du mois en cours
  for (let d = 1; d <= daysInMonth; d++) {
    calendarDays.push({
      dateString: `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`,
      dayNumber: d,
      isCurrentMonth: true,
    });
  }

  // Jours du mois suivant pour compléter à 35 ou 42 cases
  const totalSlots = calendarDays.length <= 35 ? 35 : 42;
  const remaining = totalSlots - calendarDays.length;
  for (let d = 1; d <= remaining; d++) {
    const nextM = currentMonth === 11 ? 1 : currentMonth + 2;
    const nextY = currentMonth === 11 ? currentYear + 1 : currentYear;
    calendarDays.push({
      dateString: `${nextY}-${String(nextM).padStart(2, '0')}-${String(d).padStart(2, '0')}`,
      dayNumber: d,
      isCurrentMonth: false,
    });
  }

  const getItemsForDate = (dateStr: string) => {
    return mergedItems.filter((item) => {
      if (item.date !== dateStr) return false;
      if (selectedFilter === 'sbc') return item.event_type === 'sbc_race';
      if (selectedFilter === 'champ') return item.event_type === 'belgian_championship';
      if (selectedFilter === 'holiday') return item.event_type === 'holiday';
      return true;
    });
  };

  const selectedDateItems = mergedItems.filter((item) => item.date === selectedDate);

  const getItemVisual = (item: MergedCalendarItem) => {
    if (item.event_type === 'sbc_race') {
      return {
        bg: 'bg-primary text-black',
        badgeBg: 'bg-primary/15 text-primary border-primary/30',
        dot: 'bg-[#ff6e00]',
        tag: '🏁 Course SBC',
      };
    }
    if (item.event_type === 'belgian_championship') {
      return {
        bg: 'bg-blue-600 text-white',
        badgeBg: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
        dot: 'bg-[#2e5bff]',
        tag: '🏆 Champ. Belgique',
      };
    }
    if (item.event_type === 'club_meeting') {
      return {
        bg: 'bg-emerald-600 text-white',
        badgeBg: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
        dot: 'bg-emerald-400',
        tag: '🤝 Réunion Club',
      };
    }
    return {
      bg: 'bg-zinc-700 text-zinc-200',
      badgeBg: 'bg-zinc-700/30 text-zinc-300 border-zinc-600/40',
      dot: 'bg-zinc-400',
      tag: '🎈 Férié / Fête',
    };
  };

  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  return (
    <div className="premium-card p-5 md:p-7 rounded-lg border border-[#353535] space-y-6 relative">
      {/* Toast Notification */}
      {toastMsg && (
        <div
          className={`fixed bottom-6 right-6 z-50 p-4 rounded-lg shadow-xl border text-xs font-mono flex items-center gap-2.5 backdrop-blur-md transition-all animate-bounce ${
            toastMsg.type === 'success'
              ? 'bg-success/20 border-success text-success'
              : 'bg-secondary/20 border-secondary text-secondary'
          }`}
        >
          {toastMsg.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
          <span className="font-bold">{toastMsg.text}</span>
        </div>
      )}

      {/* Top Controls Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-[#353535] pb-4">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <CalendarIcon className="w-5 h-5 text-primary" />
            <h3 className="font-anybody font-black text-xl text-white uppercase tracking-tight sport-skew">
              Calendrier du Club & Compétitions
            </h3>
            {isAdmin && (
              <span className="px-2 py-0.5 rounded bg-primary/20 border border-primary/40 text-primary text-[9px] font-mono font-bold uppercase flex items-center gap-1">
                <Shield className="w-3 h-3" /> Mode Admin
              </span>
            )}
          </div>
          <p className="text-xs text-foreground/50 font-mono mt-0.5">
            Courses SBC, Championnats de Belgique et Jours Fériés
          </p>
        </div>

        {/* Navigation Mois & Année + Bouton Créer si Admin */}
        <div className="flex items-center gap-2 font-mono text-xs w-full sm:w-auto justify-between sm:justify-end flex-wrap">
          {isAdmin && (
            <button
              onClick={() => openCreateModal(selectedDate)}
              className="px-3 py-1.5 rounded bg-primary hover:bg-primary/90 text-black font-anybody font-extrabold uppercase text-xs tracking-wider transition-all sport-skew flex items-center gap-1.5 shadow-[2px_2px_0px_#000] cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 stroke-[3]" />
              <span>Ajouter un événement</span>
            </button>
          )}

          <button
            onClick={handleGoToday}
            className="px-2.5 py-1 rounded bg-surface hover:bg-surface-high border border-[#353535] text-foreground/70 hover:text-white transition-colors cursor-pointer text-[11px]"
          >
            Aujourd'hui
          </button>
          <div className="flex items-center gap-1 bg-surface-dim border border-[#353535] rounded p-1">
            <button
              onClick={handlePrevMonth}
              className="p-1 rounded hover:bg-surface text-foreground/70 hover:text-white transition-colors cursor-pointer"
              title="Mois précédent"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="font-anybody font-bold text-sm text-white px-2 min-w-28 text-center uppercase sport-skew">
              {MONTH_NAMES[currentMonth]} {currentYear}
            </span>
            <button
              onClick={handleNextMonth}
              className="p-1 rounded hover:bg-surface text-foreground/70 hover:text-white transition-colors cursor-pointer"
              title="Mois suivant"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Filtres & Légende */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 text-xs font-mono">
        {/* Filtres rapides */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[10px] text-foreground/45 uppercase mr-1">Filtrer :</span>
          {[
            { id: 'all' as const, label: 'Tous' },
            { id: 'sbc' as const, label: 'Courses SBC', color: 'text-primary' },
            { id: 'champ' as const, label: 'Champ. Belgique', color: 'text-blue-400' },
          ].map((f) => (
            <button
              key={f.id}
              onClick={() => setSelectedFilter(f.id)}
              className={`px-2.5 py-1 rounded text-[11px] font-bold transition-all cursor-pointer border ${
                selectedFilter === f.id
                  ? 'bg-surface-high border-primary text-white shadow-xs'
                  : 'bg-surface border-[#353535] text-foreground/60 hover:text-white'
              }`}
            >
              <span className={f.color}>{f.label}</span>
            </button>
          ))}

          {/* Case à cocher : Afficher les jours fériés */}
          <label className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-surface hover:bg-surface-high border border-[#353535] text-[11px] text-foreground/80 hover:text-white cursor-pointer select-none transition-colors ml-1">
            <input
              type="checkbox"
              checked={showHolidays}
              onChange={(e) => {
                setShowHolidays(e.target.checked);
                if (!e.target.checked && selectedFilter === 'holiday') {
                  setSelectedFilter('all');
                }
              }}
              className="w-3.5 h-3.5 text-primary accent-primary bg-background border-[#353535] rounded cursor-pointer"
            />
            <span>Afficher les jours fériés</span>
          </label>
        </div>

        {/* Légende couleurs */}
        <div className="flex items-center gap-3 text-[10px] text-foreground/60 flex-wrap">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#ff6e00] shadow-[0_0_6px_rgba(255,110,0,0.6)]" />
            <span>SBC</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#2e5bff] shadow-[0_0_6px_rgba(46,91,255,0.6)]" />
            <span>Belgique</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-zinc-400" />
            <span>Férié / Fête</span>
          </div>
        </div>
      </div>

      {/* Grille du Calendrier */}
      <div className="border border-[#353535] rounded-lg overflow-hidden bg-surface-dim">
        {/* Jours de la semaine */}
        <div className="grid grid-cols-7 bg-surface border-b border-[#353535] text-center font-anybody font-bold text-xs uppercase tracking-wider text-foreground/60 sport-skew py-2">
          {WEEKDAY_NAMES.map((w, idx) => (
            <div key={w} className={idx >= 5 ? 'text-primary/80' : ''}>
              {w}
            </div>
          ))}
        </div>

        {/* Cases des jours */}
        <div className="grid grid-cols-7 divide-x divide-y divide-[#353535]/60">
          {calendarDays.map((cDay, idx) => {
            const items = getItemsForDate(cDay.dateString);
            const isToday = cDay.dateString === todayStr;
            const isSelected = cDay.dateString === selectedDate;
            const isWeekend = idx % 7 === 5 || idx % 7 === 6;

            return (
              <div
                key={cDay.dateString + idx}
                onClick={() => setSelectedDate(cDay.dateString)}
                className={`min-h-18 md:min-h-22 p-1.5 md:p-2 flex flex-col justify-between transition-all cursor-pointer select-none relative group ${
                  !cDay.isCurrentMonth
                    ? 'opacity-30 bg-black/20'
                    : isWeekend
                    ? 'bg-surface/30'
                    : 'bg-surface-dim'
                } ${
                  isSelected
                    ? 'ring-2 ring-primary bg-primary/5 z-10'
                    : 'hover:bg-surface-high/30'
                }`}
              >
                {/* En-tête jour */}
                <div className="flex items-center justify-between">
                  <span
                    className={`font-mono text-xs font-bold w-5 h-5 flex items-center justify-center rounded ${
                      isToday
                        ? 'bg-primary text-black'
                        : isSelected
                        ? 'text-primary'
                        : isWeekend
                        ? 'text-foreground/90'
                        : 'text-foreground/60'
                    }`}
                  >
                    {cDay.dayNumber}
                  </span>

                  {/* Bouton rapide + pour les Admins au survol */}
                  {isAdmin && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        openCreateModal(cDay.dateString);
                      }}
                      className="opacity-0 group-hover:opacity-100 p-0.5 rounded bg-primary text-black hover:scale-110 transition-all cursor-pointer shadow-xs"
                      title={`Créer un événement le ${cDay.dateString}`}
                    >
                      <Plus className="w-3 h-3 stroke-[3]" />
                    </button>
                  )}

                  {/* Indicateur nombre d'événements si mobile */}
                  {items.length > 0 && !isAdmin && (
                    <span className="flex md:hidden gap-1">
                      {items.slice(0, 3).map((item, i) => {
                        const vis = getItemVisual(item);
                        return <span key={i} className={`w-1.5 h-1.5 rounded-full ${vis.dot}`} />;
                      })}
                    </span>
                  )}
                </div>

                {/* Items visibles sur Desktop */}
                <div className="hidden md:flex flex-col gap-1 mt-1 overflow-hidden">
                  {items.slice(0, 2).map((item) => {
                    const vis = getItemVisual(item);
                    return (
                      <div
                        key={item.id}
                        title={item.title}
                        className={`text-[9px] font-mono px-1.5 py-0.5 rounded truncate font-bold flex items-center gap-1 ${vis.bg}`}
                      >
                        <span className="truncate">{item.title}</span>
                      </div>
                    );
                  })}
                  {items.length > 2 && (
                    <span className="text-[8px] font-mono text-foreground/40 pl-1">
                      +{items.length - 2} autre(s)
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Détail de la date sélectionnée */}
      <div className="p-4 md:p-5 rounded-lg bg-surface border border-[#353535] space-y-3">
        <div className="flex items-center justify-between border-b border-[#353535]/60 pb-2 flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono uppercase text-foreground/50">Programme du</span>
            <span className="font-anybody font-black text-sm text-primary uppercase sport-skew">
              {new Date(selectedDate + 'T00:00:00').toLocaleDateString('fr-BE', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-[10px] font-mono text-foreground/40">
              {selectedDateItems.length} entrée(s)
            </span>

            {isAdmin && (
              <button
                onClick={() => openCreateModal(selectedDate)}
                className="flex items-center gap-1 px-2.5 py-1 rounded bg-primary/10 hover:bg-primary/20 border border-primary/30 text-primary text-[10px] font-mono font-bold cursor-pointer transition-colors"
              >
                <Plus className="w-3 h-3 stroke-[3]" />
                <span>Créer à cette date</span>
              </button>
            )}
          </div>
        </div>

        {selectedDateItems.length === 0 ? (
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center py-2 text-xs font-mono gap-3">
            <p className="text-foreground/45 italic">
              Aucun événement ni jour férié prévu à cette date. Piste ouverte selon horaires réguliers.
            </p>
            {isAdmin && (
              <button
                onClick={() => openCreateModal(selectedDate)}
                className="text-primary hover:underline font-bold text-xs flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5 stroke-[3]" /> Programmer une course ou réunion
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {selectedDateItems.map((item) => {
              const vis = getItemVisual(item);
              return (
                <div
                  key={item.id}
                  className="p-3.5 rounded bg-surface-dim border border-[#353535] flex flex-col justify-between space-y-2"
                >
                  <div className="space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className={`text-[9px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${vis.badgeBg}`}>
                        {vis.tag}
                      </span>
                      {item.start_time && (
                        <span className="text-[10px] text-foreground/50 font-mono flex items-center gap-1">
                          <Clock className="w-3 h-3 text-primary" />
                          {item.start_time.slice(0, 5)} - {item.end_time?.slice(0, 5)}
                        </span>
                      )}
                    </div>
                    <h4 className="font-anybody font-black text-base text-white uppercase sport-skew">
                      {item.title}
                    </h4>
                    {item.description && (
                      <p className="text-xs text-foreground/60 leading-relaxed font-sans">{item.description}</p>
                    )}
                    {item.location && (
                      <p className="text-[10px] text-foreground/40 font-mono flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-primary" /> {item.location}
                      </p>
                    )}
                  </div>

                  {/* Actions de redirection */}
                  <div className="pt-2 border-t border-[#353535]/40 flex items-center justify-between">
                    {item.has_registration ? (
                      <Link
                        href="/events"
                        className="inline-flex items-center gap-1 text-xs font-anybody font-extrabold uppercase text-primary hover:text-white transition-colors sport-skew"
                      >
                        <span>S'inscrire sur SBC App →</span>
                      </Link>
                    ) : item.external_link ? (
                      <a
                        href={item.external_link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs font-mono text-blue-400 hover:underline font-bold"
                      >
                        <span>Site officiel</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    ) : (
                      <span className="text-[10px] text-foreground/40 font-mono italic">
                        Information générale
                      </span>
                    )}

                    {item.registration_fee !== undefined && item.has_registration && (
                      <span className="text-xs font-mono text-primary font-bold">
                        Dès €{parseFloat(item.registration_fee as any || 0).toFixed(2)}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal / Dialog de Création Rapide (Admin) */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="premium-card rounded-lg max-w-2xl w-full border border-primary/40 overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
            <div className="p-5 bg-surface-dim border-b border-[#353535] flex items-center justify-between">
              <div>
                <span className="text-[10px] font-mono text-primary uppercase font-bold tracking-wider flex items-center gap-1">
                  <Shield className="w-3 h-3" /> Administration SBC
                </span>
                <h3 className="font-anybody font-black text-lg text-white uppercase sport-skew">
                  Programmer un Événement
                </h3>
              </div>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="p-1 rounded text-foreground/40 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleQuickCreateSubmit} className="p-6 overflow-y-auto space-y-4 font-mono text-xs">
              {modalError && (
                <div className="p-3 rounded bg-secondary/15 border border-secondary/30 text-secondary text-xs">
                  ⚠️ {modalError}
                </div>
              )}

              {/* 1. Type d'Événement */}
              <div>
                <label className="block text-[10px] uppercase text-foreground/50 mb-1.5 font-bold">
                  1. Type d'Événement
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: 'sbc_race' as EventType, label: 'Course Club SBC', icon: '🏁' },
                    { id: 'belgian_championship' as EventType, label: 'Champ. Belgique / Ext.', icon: '🏆' },
                    { id: 'holiday' as EventType, label: 'Événement Spécial', icon: '🎉' },
                    { id: 'club_meeting' as EventType, label: 'Réunion Club', icon: '🤝' },
                  ].map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => handleModalTypeChange(t.id)}
                      className={`p-2.5 border rounded text-left transition-all cursor-pointer flex items-center gap-2 ${
                        modalType === t.id
                          ? 'border-primary bg-primary/10 text-primary font-bold shadow-xs'
                          : 'border-[#353535] bg-surface hover:bg-surface-high text-foreground/80'
                      }`}
                    >
                      <span>{t.icon}</span>
                      <span className="text-[11px] truncate">{t.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* 2. Titre */}
              <div>
                <label className="block text-[10px] uppercase text-foreground/50 mb-1 font-bold">
                  2. Titre de l'événement *
                </label>
                <input
                  type="text"
                  required
                  value={modalTitle}
                  onChange={(e) => setModalTitle(e.target.value)}
                  placeholder="Ex: Manche 2 - Course Club 1/10 & 1/8"
                  className="w-full bg-background border border-[#353535] rounded px-3 py-2 text-white text-sm font-sans font-bold focus:outline-none focus:border-primary"
                />
              </div>

              {/* 3. Date & Horaires */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] uppercase text-foreground/50 mb-1 font-bold">
                    Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={modalDate}
                    onChange={(e) => setModalDate(e.target.value)}
                    className="w-full bg-background border border-[#353535] rounded px-2.5 py-2 text-white focus:outline-none focus:border-primary"
                  />
                </div>

                <div>
                  <label className="block text-[10px] uppercase text-foreground/50 mb-1 font-bold">
                    Horaires (Début - Fin)
                  </label>
                  <div className="flex items-center gap-1">
                    <input
                      type="time"
                      value={modalStartTime}
                      onChange={(e) => setModalStartTime(e.target.value)}
                      className="w-1/2 bg-background border border-[#353535] rounded px-1.5 py-2 text-white text-center focus:outline-none focus:border-primary"
                    />
                    <span className="text-foreground/40">-</span>
                    <input
                      type="time"
                      value={modalEndTime}
                      onChange={(e) => setModalEndTime(e.target.value)}
                      className="w-1/2 bg-background border border-[#353535] rounded px-1.5 py-2 text-white text-center focus:outline-none focus:border-primary"
                    />
                  </div>
                </div>
              </div>

              {/* 4. Lieu */}
              <div>
                <label className="block text-[10px] uppercase text-foreground/50 mb-1 font-bold">
                  Lieu
                </label>
                <input
                  type="text"
                  value={modalLocation}
                  onChange={(e) => setModalLocation(e.target.value)}
                  className="w-full bg-background border border-[#353535] rounded px-3 py-2 text-white focus:outline-none focus:border-primary"
                />
              </div>

              {/* 5. Inscriptions sur l'app & Lien externe */}
              <div className="p-3 bg-surface-dim border border-[#353535] rounded space-y-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={modalHasReg}
                    onChange={(e) => setModalHasReg(e.target.checked)}
                    className="w-4 h-4 text-primary bg-background border-[#353535] rounded focus:ring-primary cursor-pointer"
                  />
                  <span className="font-bold text-white text-xs font-sans">
                    Activer les inscriptions sur SBC App
                  </span>
                </label>
                <p className="text-[10px] text-foreground/50">
                  {modalHasReg
                    ? '✅ Les catégories et options repas ci-dessous seront accessibles aux pilotes pour s\'inscrire.'
                    : 'ℹ️ Sans inscription directe sur l\'app.'}
                </p>
              </div>

              {/* Sections Catégories & Restauration (Visibles si modalHasReg === true) */}
              {modalHasReg && (
                <div className="space-y-4 pt-2 border-t border-[#353535]">
                  {/* Section Catégories */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-[10px] uppercase text-white font-bold flex items-center gap-1.5">
                        <DollarSign className="w-3.5 h-3.5 text-primary" />
                        Catégories de Course ({modalCategories.length})
                      </label>
                      <button
                        type="button"
                        onClick={handleModalAddCategory}
                        className="text-[10px] text-primary hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        <Plus className="w-3 h-3" /> Ajouter catégorie
                      </button>
                    </div>

                    <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                      {modalCategories.map((cat, idx) => (
                        <div key={idx} className="flex items-center gap-2 bg-surface-dim p-1.5 rounded border border-[#353535]">
                          <input
                            type="text"
                            placeholder="Nom de la catégorie"
                            value={cat.name}
                            onChange={(e) => handleModalCategoryChange(idx, 'name', e.target.value)}
                            className="flex-1 bg-background border border-[#353535] rounded px-2 py-1 text-white text-xs"
                          />
                          <div className="flex items-center gap-1">
                            <input
                              type="number"
                              placeholder="Prix"
                              value={cat.fee}
                              onChange={(e) => handleModalCategoryChange(idx, 'fee', parseFloat(e.target.value) || 0)}
                              className="w-16 bg-background border border-[#353535] rounded px-2 py-1 text-primary text-xs text-right font-bold"
                            />
                            <span className="text-foreground/40 text-[10px]">€</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleModalRemoveCategory(idx)}
                            className="text-foreground/40 hover:text-secondary p-1 cursor-pointer"
                            title="Supprimer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Section Restauration */}
                  <div className="space-y-2 pt-2 border-t border-[#353535]/50">
                    <div className="flex items-center justify-between">
                      <label className="text-[10px] uppercase text-white font-bold flex items-center gap-1.5">
                        <Utensils className="w-3.5 h-3.5 text-primary" />
                        Options Restauration ({modalMeals.length})
                      </label>
                      <button
                        type="button"
                        onClick={handleModalAddMeal}
                        className="text-[10px] text-primary hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        <Plus className="w-3 h-3" /> Ajouter repas
                      </button>
                    </div>

                    <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                      {modalMeals.map((meal, idx) => (
                        <div key={idx} className="flex items-center gap-2 bg-surface-dim p-1.5 rounded border border-[#353535]">
                          <input
                            type="text"
                            placeholder="Nom du repas (ex: Pain garni...)"
                            value={meal.name}
                            onChange={(e) => handleModalMealChange(idx, 'name', e.target.value)}
                            className="flex-1 bg-background border border-[#353535] rounded px-2 py-1 text-white text-xs"
                          />
                          <div className="flex items-center gap-1">
                            <input
                              type="number"
                              step="0.50"
                              placeholder="Prix"
                              value={meal.price}
                              onChange={(e) => handleModalMealChange(idx, 'price', parseFloat(e.target.value) || 0)}
                              className="w-16 bg-background border border-[#353535] rounded px-2 py-1 text-success text-xs text-right font-bold"
                            />
                            <span className="text-foreground/40 text-[10px]">€</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleModalRemoveMeal(idx)}
                            className="text-foreground/40 hover:text-secondary p-1 cursor-pointer"
                            title="Supprimer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Lien externe optionnel */}
              <div>
                <label className="block text-[10px] uppercase text-foreground/50 mb-1 flex items-center gap-1.5">
                  <ExternalLink className="w-3.5 h-3.5 text-primary" />
                  Lien Externe Officiel (Optionnel)
                </label>
                <input
                  type="url"
                  value={modalExtLink}
                  onChange={(e) => setModalExtLink(e.target.value)}
                  placeholder="https://www.myrcm.ch/..."
                  className="w-full bg-background border border-[#353535] rounded px-3 py-2 text-white focus:outline-none focus:border-primary"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-[10px] uppercase text-foreground/50 mb-1">
                  Description (Optionnel)
                </label>
                <textarea
                  rows={2}
                  value={modalDesc}
                  onChange={(e) => setModalDesc(e.target.value)}
                  placeholder="Programme, consignes ou informations supplémentaires..."
                  className="w-full bg-background border border-[#353535] rounded px-3 py-2 text-white font-sans text-xs focus:outline-none focus:border-primary"
                />
              </div>

              {/* Bouton de validation */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full premium-btn text-xs flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <span className="transform skew-x-8 flex items-center gap-1.5">
                    <Save className="w-4 h-4" />
                    {isSubmitting ? 'Enregistrement...' : 'Créer et Afficher sur le Calendrier'}
                  </span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
