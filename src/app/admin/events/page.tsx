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
  Shield,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { usePermissions } from '@/modules/admin/hooks/usePermissions';
import { ClubEvent } from '@/types/models';
import EventFormModal from '@/modules/events/components/EventFormModal';
import AdminEventsTable, { EventWithRegCount } from '@/modules/events/components/AdminEventsTable';
import EventRegistrationsDrawer, { EventRegistrationAdminItem } from '@/modules/events/components/EventRegistrationsDrawer';

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

export default function AdminEventsPage() {
  const { user: currentUser, profile: userProfile } = useAuth();
  const permissions = usePermissions(currentUser, userProfile);
  const canAccessEvents = permissions.isAdmin || Boolean(permissions.referentPermissions?.can_manage_track_events);

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

  const showMessage = useCallback((type: 'success' | 'error', text: string) => {
    setStatusMsg({ type, text });
    setTimeout(() => setStatusMsg(null), 4000);
  }, []);

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    const { data, error } = await getAllEventsAdmin();
    if (error) {
      showMessage('error', `Erreur chargement : ${error}`);
    } else {
      setEvents((data as EventWithRegCount[]) || []);
    }
    setLoading(false);
  }, [showMessage]);

  useEffect(() => {
    if (canAccessEvents) {
      setIsAdmin(true);
      fetchEvents();
    }
  }, [canAccessEvents, fetchEvents]);

  const handleAdminAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setPassError('');
    if (!currentUser) {
      setPassError("Connectez-vous d'abord.");
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

  const handleDelete = async (id: string, eventTitle: string) => {
    if (!confirm(`Supprimer définitivement l'événement "${eventTitle}" ? Les inscriptions associées seront aussi supprimées.`)) {
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
        {/* Formulaire modulaire de création / édition */}
        <div className="lg:col-span-6">
          <EventFormModal
            editingEventId={editingEventId}
            title={title}
            setTitle={setTitle}
            description={description}
            setDescription={setDescription}
            eventDate={eventDate}
            setEventDate={setEventDate}
            startTime={startTime}
            setStartTime={setStartTime}
            endTime={endTime}
            setEndTime={setEndTime}
            categoryBadge={categoryBadge}
            setCategoryBadge={setCategoryBadge}
            location={location}
            setLocation={setLocation}
            status={status}
            setStatus={setStatus}
            eventType={eventType}
            onEventTypeChange={handleEventTypeChange}
            hasRegistration={hasRegistration}
            setHasRegistration={setHasRegistration}
            externalLink={externalLink}
            setExternalLink={setExternalLink}
            categories={categories}
            onCategoryChange={handleCategoryChange}
            onAddCategory={handleAddCategory}
            onRemoveCategory={handleRemoveCategory}
            mealOptions={mealOptions}
            onMealChange={handleMealChange}
            onAddMeal={handleAddMeal}
            onRemoveMeal={handleRemoveMeal}
            onSubmit={handleSubmit}
            onReset={resetForm}
          />
        </div>

        {/* Tableau / Cartes des Événements Existants */}
        <div className="lg:col-span-6">
          <AdminEventsTable
            events={events}
            editingEventId={editingEventId}
            onEdit={handleEditClick}
            onDelete={handleDelete}
            onToggleStatus={handleToggleStatus}
            onOpenRegistrations={handleOpenRegistrations}
          />
        </div>
      </div>

      {/* Modal / Drawer des Inscrits */}
      <EventRegistrationsDrawer
        event={selectedEventForRegs}
        registrations={registrations}
        loading={loadingRegs}
        onClose={() => setSelectedEventForRegs(null)}
      />
    </div>
  );
}
