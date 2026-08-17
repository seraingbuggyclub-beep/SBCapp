'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import {
  getAllEventsAdmin,
  createEventAdmin,
  updateEventAdmin,
  deleteEventAdmin,
  getEventRegistrationsAdmin,
  EventFormData,
  EventType,
  RaceCategoryItem,
  MealOptionItem,
} from '@/modules/events/actions';
import AdminNav from '@/components/admin/AdminNav';
import {
  Trophy,
  Calendar,
  MapPin,
  Clock,
  Plus,
  Trash2,
  Edit,
  Save,
  Users,
  Eye,
  X,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  DollarSign,
  Utensils,
  ShieldAlert,
  Shield,
  ExternalLink,
  Flag,
  PartyPopper,
  Users2,
  Check,
} from 'lucide-react';

import { useAuth } from '@/hooks/useAuth';
import { ClubEvent, SelectedCategoryItem, SelectedMealItem } from '@/types/models';
import CategoryMealFields from '@/modules/events/components/CategoryMealFields';

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

interface EventWithRegCount extends ClubEvent {
  registrations_count: number;
}

interface EventRegistrationAdminItem {
  id: string;
  race_category: string;
  food_options: string[] | null;
  selected_meals: SelectedMealItem[] | null;
  selected_categories: SelectedCategoryItem[] | null;
  transponder_id: string | null;
  total_paid: number;
  created_at: string | null;
  sbc_members: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    phone: string | null;
    license_number: string | null;
  } | null;
}

export default function AdminEventsPage() {
  const { user: currentUser, profile: userProfile, isAdmin: userIsAdmin } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminPass, setAdminPass] = useState('');
  const [passError, setPassError] = useState('');

  const [events, setEvents] = useState<EventWithRegCount[]>([]);
  const [loading, setLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Form State
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('18:00');
  const [categoryBadge, setCategoryBadge] = useState('Course Club SBC');
  const [location, setLocation] = useState('Seraing Buggy Track, Belgium');
  const [status, setStatus] = useState<'open' | 'closed' | 'draft'>('open');
  const [eventType, setEventType] = useState<EventType>('sbc_race');
  const [hasRegistration, setHasRegistration] = useState<boolean>(true);
  const [externalLink, setExternalLink] = useState<string>('');
  const [maxParticipants, setMaxParticipants] = useState<string>('');

  const [categories, setCategories] = useState<RaceCategoryItem[]>(DEFAULT_CATEGORIES);
  const [mealOptions, setMealOptions] = useState<MealOptionItem[]>(DEFAULT_MEALS);

  // Registrations Modal State
  const [selectedEventForRegs, setSelectedEventForRegs] = useState<ClubEvent | null>(null);
  const [registrations, setRegistrations] = useState<EventRegistrationAdminItem[]>([]);
  const [loadingRegs, setLoadingRegs] = useState(false);

  const supabase = createClient();

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    const { data, error } = await getAllEventsAdmin();
    if (error) {
      showMessage('error', `Erreur chargement : ${error}`);
    } else {
      setEvents((data as EventWithRegCount[]) || []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (userIsAdmin) {
      setIsAdmin(true);
      fetchEvents();
    }
  }, [userIsAdmin, fetchEvents]);

  const handleAdminAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setPassError('');
    if (!currentUser) {
      setPassError('Connectez-vous d\'abord.');
      return;
    }
    const { error } = await supabase.auth.signInWithPassword({
      email: currentUser.email!,
      password: adminPass,
    });
    if (error) {
      setPassError(`Erreur : ${error.message}`);
    } else {
      setIsAdmin(true);
      fetchEvents();
    }
  };

  const showMessage = (type: 'success' | 'error', text: string) => {
    setStatusMsg({ type, text });
    setTimeout(() => setStatusMsg(null), 4000);
  };

  const handleEventTypeChange = (type: EventType) => {
    setEventType(type);
    if (type === 'sbc_race') {
      setHasRegistration(true);
      setCategoryBadge('Course Club SBC');
    } else if (type === 'belgian_championship') {
      setHasRegistration(false);
      setCategoryBadge('Champ. de Belgique');
      if (!location || location === 'Seraing Buggy Track, Belgium') {
        setLocation('Belgique (Extérieur)');
      }
    } else if (type === 'holiday') {
      setHasRegistration(false);
      setCategoryBadge('Événement Spécial');
    } else if (type === 'club_meeting') {
      setHasRegistration(false);
      setCategoryBadge('Réunion Club');
    }
  };

  const resetForm = () => {
    setEditingEventId(null);
    setTitle('');
    setDescription('');
    setEventDate('');
    setStartTime('09:00');
    setEndTime('18:00');
    setCategoryBadge('Course Club SBC');
    setLocation('Seraing Buggy Track, Belgium');
    setStatus('open');
    setEventType('sbc_race');
    setHasRegistration(true);
    setExternalLink('');
    setMaxParticipants('');
    setCategories(DEFAULT_CATEGORIES);
    setMealOptions(DEFAULT_MEALS);
  };

  const handleEditClick = (event: ClubEvent) => {
    setEditingEventId(event.id);
    setTitle(event.title || '');
    setDescription(event.description || '');
    setEventDate(event.event_date || '');
    setStartTime(event.start_time?.slice(0, 5) || '09:00');
    setEndTime(event.end_time?.slice(0, 5) || '18:00');
    setCategoryBadge(event.category || 'Course Club SBC');
    setLocation(event.location || 'Seraing Buggy Track, Belgium');
    setStatus((event.status as 'open' | 'closed' | 'draft') || 'open');
    setEventType(event.event_type || 'sbc_race');
    setHasRegistration(event.has_registration ?? true);
    setExternalLink(event.external_link || '');
    setMaxParticipants(event.max_participants ? String(event.max_participants) : '');

    const parsedCats = Array.isArray(event.categories) && event.categories.length > 0
      ? (event.categories as unknown as RaceCategoryItem[])
      : DEFAULT_CATEGORIES;
    setCategories(parsedCats);

    const parsedMeals = Array.isArray(event.meal_options) && event.meal_options.length > 0
      ? (event.meal_options as unknown as MealOptionItem[])
      : DEFAULT_MEALS;
    setMealOptions(parsedMeals);

    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !eventDate) {
      showMessage('error', 'Le titre et la date sont obligatoires.');
      return;
    }

    const payload: EventFormData = {
      title,
      description,
      event_date: eventDate,
      start_time: startTime,
      end_time: endTime,
      category: categoryBadge,
      location,
      registration_fee: hasRegistration && categories[0]?.fee ? categories[0].fee : 0,
      status,
      event_type: eventType,
      has_registration: hasRegistration,
      external_link: externalLink.trim() || undefined,
      categories: hasRegistration ? categories : [],
      meal_options: hasRegistration ? mealOptions : [],
      max_participants: maxParticipants ? parseInt(maxParticipants, 10) : undefined,
    };

    if (editingEventId) {
      const { error } = await updateEventAdmin(editingEventId, payload);
      if (error) {
        showMessage('error', `Erreur mise à jour : ${error}`);
      } else {
        showMessage('success', 'Événement mis à jour avec succès !');
        resetForm();
        fetchEvents();
      }
    } else {
      const { error } = await createEventAdmin(payload);
      if (error) {
        showMessage('error', `Erreur création : ${error}`);
      } else {
        showMessage('success', 'Événement créé avec succès !');
        resetForm();
        fetchEvents();
      }
    }
  };

  const handleDelete = async (id: string, title: string) => {
    if (!confirm(`Supprimer définitivement l'événement "${title}" ? Les inscriptions associées seront aussi supprimées.`)) {
      return;
    }
    const { success, error } = await deleteEventAdmin(id);
    if (!success) {
      showMessage('error', `Erreur suppression : ${error}`);
    } else {
      showMessage('success', 'Événement supprimé.');
      if (editingEventId === id) resetForm();
      fetchEvents();
    }
  };

  const handleToggleStatus = async (event: ClubEvent) => {
    const nextStatus = event.status === 'open' ? 'closed' : 'open';
    const { error } = await updateEventAdmin(event.id, { status: nextStatus });
    if (error) {
      showMessage('error', `Erreur : ${error}`);
    } else {
      showMessage('success', `Statut passé à "${nextStatus}".`);
      fetchEvents();
    }
  };

  const handleOpenRegistrations = async (event: ClubEvent) => {
    setSelectedEventForRegs(event);
    setLoadingRegs(true);
    const { data, error } = await getEventRegistrationsAdmin(event.id);
    if (error) {
      showMessage('error', `Erreur inscriptions : ${error}`);
    } else {
      setRegistrations((data as EventRegistrationAdminItem[]) || []);
    }
    setLoadingRegs(false);
  };

  // Category helpers
  const handleAddCategory = () => {
    setCategories([...categories, { name: 'Nouvelle Catégorie', fee: 25, type: 'Electric' }]);
  };

  const handleCategoryChange = (index: number, field: keyof RaceCategoryItem, val: string | number) => {
    const updated = [...categories];
    updated[index] = { ...updated[index], [field]: val };
    setCategories(updated);
  };

  const handleRemoveCategory = (index: number) => {
    setCategories(categories.filter((_, i) => i !== index));
  };

  // Meal helpers
  const handleAddMeal = () => {
    setMealOptions([...mealOptions, { name: 'Option Repas', price: 10, desc: '' }]);
  };

  const handleMealChange = (index: number, field: keyof MealOptionItem, val: string | number) => {
    const updated = [...mealOptions];
    updated[index] = { ...updated[index], [field]: val };
    setMealOptions(updated);
  };

  const handleRemoveMeal = (index: number) => {
    setMealOptions(mealOptions.filter((_, i) => i !== index));
  };

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

  if (!isAdmin) {
    return (
      <div className="max-w-md mx-auto py-12">
        <form onSubmit={handleAdminAuth} className="premium-card p-6 md:p-8 rounded-lg border border-[#353535] space-y-4">
          <div className="text-center mb-4">
            <div className="w-12 h-12 rounded bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto mb-3 text-primary">
              <Shield className="w-6 h-6" />
            </div>
            <h2 className="font-anybody font-black text-xl uppercase tracking-tight sport-skew text-white">
              Gestion des Événements
            </h2>
            <p className="text-[10px] text-foreground/50 font-mono mt-1">
              Accès réservé aux administrateurs du Seraing Buggy Club
            </p>
          </div>

          {passError && (
            <div className="p-3 rounded bg-secondary/10 border border-secondary/20 text-secondary text-xs font-mono text-center">
              ⚠️ {passError}
            </div>
          )}

          <div>
            <label className="block text-[10px] font-mono uppercase tracking-wider text-foreground/50 mb-1">
              Mot de passe Admin
            </label>
            <input
              type="password"
              required
              value={adminPass}
              onChange={(e) => setAdminPass(e.target.value)}
              className="w-full bg-background border border-[#353535] rounded px-3 py-2 text-center text-sm text-white focus:outline-none focus:border-primary font-mono tracking-widest"
              placeholder="••••••••"
            />
          </div>

          <button type="submit" className="w-full premium-btn text-xs">
            <span className="transform skew-x-8">Déverrouiller</span>
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8 py-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-[#353535] pb-4">
        <div>
          <h1 className="font-anybody font-black text-2xl md:text-3xl uppercase tracking-tight sport-skew text-white">
            ADMINISTRATION <span className="text-primary">SBC</span>
          </h1>
          <p className="text-xs text-foreground/50 font-mono mt-1">
            Gestion du calendrier des compétitions, événements extérieurs et jours fériés
          </p>
        </div>

        <button
          onClick={fetchEvents}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-surface border border-[#353535] hover:border-primary transition-all text-xs font-mono cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Actualiser
        </button>
      </div>

      <AdminNav />

      {statusMsg && (
        <div
          className={`p-3.5 rounded border text-xs font-mono flex items-center gap-2 ${
            statusMsg.type === 'success'
              ? 'bg-success/15 border-success/30 text-success'
              : 'bg-secondary/15 border-secondary/30 text-secondary'
          }`}
        >
          {statusMsg.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
          <span>{statusMsg.text}</span>
        </div>
      )}

      {/* Main Grid: Form (Left) & Events List (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Formulaire de création / édition */}
        <div className="lg:col-span-6 premium-card p-6 rounded-lg border border-[#353535] space-y-6">
          <div className="flex items-center justify-between border-b border-[#353535] pb-3">
            <h3 className="font-anybody font-black text-base uppercase tracking-wider text-white sport-skew flex items-center gap-2">
              <Trophy className="w-4 h-4 text-primary" />
              {editingEventId ? 'Modifier l\'Événement' : 'Créer un Nouvel Événement'}
            </h3>
            {editingEventId && (
              <button
                onClick={resetForm}
                className="text-[10px] text-foreground/50 hover:text-white font-mono uppercase cursor-pointer"
              >
                Annuler
              </button>
            )}
          </div>

          <form onSubmit={handleSubmit} className="space-y-5 text-xs font-mono">
            {/* Sélecteur de Type d'Événement */}
            <div>
              <label className="block text-[10px] uppercase tracking-wider text-foreground/50 mb-1.5 font-bold">
                1. Type d'Événement *
              </label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  {
                    id: 'sbc_race' as EventType,
                    label: 'Course Club SBC',
                    icon: '🏁',
                    desc: 'Course locale avec paiements & repas',
                  },
                  {
                    id: 'belgian_championship' as EventType,
                    label: 'Champ. de Belgique / Ext.',
                    icon: '🏆',
                    desc: 'Course extérieure / lien officiel',
                  },
                  {
                    id: 'holiday' as EventType,
                    label: 'Événement Spécial / Fête Club',
                    icon: '🎉',
                    desc: 'Événement ponctuel ou fête locale sans inscription',
                  },
                  {
                    id: 'club_meeting' as EventType,
                    label: 'Réunion / Activité',
                    icon: '🤝',
                    desc: 'Activité du club ou assemblée',
                  },
                ].map((item) => {
                  const isSelected = eventType === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => handleEventTypeChange(item.id)}
                      className={`p-3 border text-left rounded transition-all cursor-pointer flex flex-col justify-between ${
                        isSelected
                          ? 'border-primary bg-primary/10 text-primary shadow-[inset_0_0_12px_rgba(255,110,0,0.12)]'
                          : 'border-[#353535] bg-surface hover:bg-surface-high text-foreground/80'
                      }`}
                    >
                      <div className="flex items-center gap-1.5 font-bold text-white text-xs">
                        <span>{item.icon}</span>
                        <span>{item.label}</span>
                      </div>
                      <span className="text-[9px] text-foreground/50 mt-1 leading-tight">{item.desc}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Case à cocher : Inscriptions sur l'app */}
            <div className="p-3 bg-surface-dim border border-[#353535] rounded space-y-2">
              <label className="flex items-center gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={hasRegistration}
                  onChange={(e) => setHasRegistration(e.target.checked)}
                  className="w-4 h-4 text-primary bg-background border-[#353535] rounded focus:ring-primary focus:ring-offset-0 cursor-pointer"
                />
                <span className="font-bold text-white text-xs font-sans">
                  Activer les inscriptions sur SBC App
                </span>
              </label>
              <p className="text-[10px] text-foreground/50 leading-relaxed">
                {hasRegistration
                  ? '✅ Les pilotes pourront s\'inscrire directement, choisir leurs catégories et commander des repas.'
                  : 'ℹ️ Pas d\'inscription ni de paiement sur l\'app. L\'événement est informatif ou utilise un lien externe.'}
              </p>
            </div>

            {/* Lien externe (Utile pour Champ. Belgique / MyRCM) */}
            <div>
              <label className="block text-[10px] uppercase tracking-wider text-foreground/50 mb-1 flex items-center gap-1.5">
                <ExternalLink className="w-3.5 h-3.5 text-primary" />
                Lien Externe Officiel (Optionnel)
              </label>
              <input
                type="url"
                value={externalLink}
                onChange={(e) => setExternalLink(e.target.value)}
                placeholder="Ex: https://www.myrcm.ch/myrcm/main?pLa=fr&pFi=..."
                className="w-full bg-background border border-[#353535] rounded px-3 py-2 text-white focus:outline-none focus:border-primary font-mono text-xs"
              />
              <p className="text-[9px] text-foreground/45 mt-1 leading-tight">
                Idéal pour renvoyer vers MyRCM, la FBA ou la billetterie extérieure.
              </p>
            </div>

            {/* Titre */}
            <div>
              <label className="block text-[10px] uppercase tracking-wider text-foreground/50 mb-1">
                Titre de l'événement *
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ex: Manche 1 - Championnat de Belgique 1/8 Buggy"
                className="w-full bg-background border border-[#353535] rounded px-3 py-2 text-white focus:outline-none focus:border-primary font-sans text-sm font-bold"
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-[10px] uppercase tracking-wider text-foreground/50 mb-1">
                Description & Programme
              </label>
              <textarea
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Ex: Compétition officielle 1/8 Thermique & Électrique. Contrôle technique dès 08h30..."
                className="w-full bg-background border border-[#353535] rounded px-3 py-2 text-white focus:outline-none focus:border-primary font-sans text-xs leading-relaxed"
              />
            </div>

            {/* Date, Heures & Statut */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[10px] uppercase tracking-wider text-foreground/50 mb-1">
                  Date *
                </label>
                <input
                  type="date"
                  required
                  value={eventDate}
                  onChange={(e) => setEventDate(e.target.value)}
                  className="w-full bg-background border border-[#353535] rounded px-2.5 py-2 text-white focus:outline-none focus:border-primary font-mono text-xs"
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase tracking-wider text-foreground/50 mb-1">
                  Début - Fin
                </label>
                <div className="flex items-center gap-1">
                  <input
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="w-1/2 bg-background border border-[#353535] rounded px-1.5 py-2 text-white focus:outline-none focus:border-primary text-center font-mono text-xs"
                  />
                  <span className="text-foreground/40">-</span>
                  <input
                    type="time"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="w-1/2 bg-background border border-[#353535] rounded px-1.5 py-2 text-white focus:outline-none focus:border-primary text-center font-mono text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] uppercase tracking-wider text-foreground/50 mb-1">
                  Statut
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as 'open' | 'closed' | 'draft')}
                  className="w-full bg-background border border-[#353535] rounded px-2 py-2 text-white focus:outline-none focus:border-primary font-mono text-xs"
                >
                  <option value="open">🟢 Ouvert / Affiché</option>
                  <option value="closed">🔴 Fermé / Clôturé</option>
                  <option value="draft">⚪ Brouillon (Masqué)</option>
                </select>
              </div>
            </div>

            {/* Lieu & Catégorie Badge */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] uppercase tracking-wider text-foreground/50 mb-1">
                  Lieu
                </label>
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="w-full bg-background border border-[#353535] rounded px-3 py-2 text-white focus:outline-none focus:border-primary font-mono text-xs"
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase tracking-wider text-foreground/50 mb-1">
                  Badge personnalisé
                </label>
                <input
                  type="text"
                  value={categoryBadge}
                  onChange={(e) => setCategoryBadge(e.target.value)}
                  placeholder="Ex: Course Club SBC"
                  className="w-full bg-background border border-[#353535] rounded px-3 py-2 text-white focus:outline-none focus:border-primary font-mono text-xs"
                />
              </div>
            </div>

            {/* Sections Tarifs & Repas — UNIQUEMENT SI hasRegistration === true */}
            {hasRegistration ? (
              <div className="pt-2 border-t border-[#353535]/60">
                <CategoryMealFields
                  categories={categories}
                  onCategoryChange={handleCategoryChange}
                  onAddCategory={handleAddCategory}
                  onRemoveCategory={handleRemoveCategory}
                  mealOptions={mealOptions}
                  onMealChange={handleMealChange}
                  onAddMeal={handleAddMeal}
                  onRemoveMeal={handleRemoveMeal}
                />
              </div>
            ) : (
              <div className="p-3 bg-surface border border-[#353535] rounded text-center text-foreground/45 text-[11px] font-mono">
                Sections tarifs & repas masquées (Inscriptions désactivées sur l'app).
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              className="w-full premium-btn text-xs flex items-center justify-center gap-2 cursor-pointer mt-4"
            >
              <span className="transform skew-x-8 flex items-center gap-1.5">
                <Save className="w-4 h-4" />
                {editingEventId ? 'Enregistrer les Modifications' : 'Créer l\'Événement'}
              </span>
            </button>
          </form>
        </div>

        {/* Liste des Événements Existants */}
        <div className="lg:col-span-6 space-y-4">
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
                return (
                  <div
                    key={ev.id}
                    className={`premium-card p-5 rounded-lg border transition-all ${
                      editingEventId === ev.id ? 'border-primary shadow-[0_0_15px_rgba(255,110,0,0.2)]' : 'border-[#353535]'
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
                            {new Date(ev.event_date).toLocaleDateString('fr-BE')}
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
                            <a href={ev.external_link} target="_blank" rel="noopener noreferrer" className="hover:underline truncate">
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
                          onClick={() => handleOpenRegistrations(ev)}
                          className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-surface-high hover:bg-surface border border-[#353535] text-white cursor-pointer"
                        >
                          <Users className="w-3.5 h-3.5 text-primary" />
                          <span>{ev.registrations_count} Pilotes inscrits</span>
                        </button>
                      ) : (
                        <span className="text-[10px] text-foreground/40 font-mono italic">
                          Sans inscription sur l'app
                        </span>
                      )}

                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => handleToggleStatus(ev)}
                          title={ev.status === 'open' ? 'Fermer / Clôturer' : 'Ouvrir'}
                          className="px-2 py-1 rounded bg-surface hover:bg-surface-high border border-[#353535] text-[10px] uppercase font-bold cursor-pointer"
                        >
                          {ev.status === 'open' ? 'Fermer' : 'Ouvrir'}
                        </button>

                        <button
                          onClick={() => handleEditClick(ev)}
                          className="p-1.5 rounded bg-surface hover:bg-surface-high border border-[#353535] text-primary hover:text-white cursor-pointer"
                          title="Modifier"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() => handleDelete(ev.id, ev.title)}
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
      </div>

      {/* Modal / Drawer des Inscrits */}
      {selectedEventForRegs && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="premium-card rounded-lg max-w-3xl w-full border border-primary/40 overflow-hidden max-h-[85vh] flex flex-col">
            <div className="p-5 bg-surface-dim border-b border-[#353535] flex items-center justify-between">
              <div>
                <span className="text-[10px] font-mono text-primary uppercase font-bold tracking-wider">
                  Registre des Engagés
                </span>
                <h3 className="font-anybody font-black text-lg text-white uppercase sport-skew">
                  {selectedEventForRegs.title}
                </h3>
              </div>
              <button
                onClick={() => setSelectedEventForRegs(null)}
                className="p-1 rounded text-foreground/40 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4">
              {loadingRegs ? (
                <div className="p-8 text-center font-mono text-xs text-foreground/50">
                  Chargement des inscriptions...
                </div>
              ) : registrations.length === 0 ? (
                <div className="p-8 text-center font-mono text-xs text-foreground/50 border border-[#353535] rounded">
                  Aucun pilote inscrit pour le moment.
                </div>
              ) : (
                <div className="divide-y divide-[#353535] border border-[#353535] rounded overflow-hidden">
                  <table className="w-full text-left font-mono text-xs">
                    <thead className="bg-surface-dim text-[10px] text-foreground/40 uppercase">
                      <tr>
                        <th className="p-3">Pilote</th>
                        <th className="p-3">Catégories</th>
                        <th className="p-3">Transpondeur</th>
                        <th className="p-3">Repas</th>
                        <th className="p-3 text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#353535]/50">
                      {registrations.map((reg) => (
                        <tr key={reg.id} className="hover:bg-surface-high/20">
                          <td className="p-3">
                            <div className="font-bold text-white font-sans">
                              {reg.sbc_members?.first_name} {reg.sbc_members?.last_name}
                            </div>
                            <div className="text-[10px] text-foreground/40">
                              {reg.sbc_members?.phone || reg.sbc_members?.email}
                            </div>
                          </td>
                          <td className="p-3">
                            <span className="text-primary font-bold">{reg.race_category}</span>
                          </td>
                          <td className="p-3 text-foreground/60">
                            {reg.transponder_id || 'Location club'}
                          </td>
                          <td className="p-3 text-[11px] text-foreground/80">
                            {Array.isArray(reg.food_options) && reg.food_options.length > 0 ? (
                              <div className="flex flex-wrap gap-1.5">
                                {reg.food_options.map((opt: string, idx: number) => (
                                  <span key={idx} className="inline-flex items-center px-2 py-0.5 rounded bg-primary/10 border border-primary/20 text-primary font-bold text-[10px]">
                                    {opt}
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <span className="text-foreground/40 italic">Aucun repas</span>
                            )}
                          </td>
                          <td className="p-3 text-right font-bold text-success">
                            €{Number(reg.total_paid || 0).toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
