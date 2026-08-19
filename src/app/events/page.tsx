'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import {
  getActiveEvents,
  getMemberRegistrations,
} from '@/modules/events/actions';
import { useEventRegistration } from '@/modules/events/hooks/useEventRegistration';
import CadenasLock from '@/modules/payments/components/CadenasLock';
import FbaDisclaimer from '@/modules/presence/components/FbaDisclaimer';
import {
  Trophy,
  Calendar,
  MapPin,
  KeyRound,
  Send,
  Utensils,
  CheckCircle2,
  Minus,
  Plus,
  Check,
  ArrowLeft,
  ExternalLink,
  Edit,
  Lock,
  RotateCcw,
} from 'lucide-react';
import Link from 'next/link';
import { ClubEvent, EventRegistration, SelectedCategoryItem } from '@/types/models';
import WorkSessionPilotSection from '@/modules/work-sessions/components/WorkSessionPilotSection';
import { Wrench } from 'lucide-react';

interface RegistrationWithEvent extends EventRegistration {
  sbc_events?: {
    id: string;
    title: string;
    description: string | null;
    event_date: string;
    start_time?: string;
    location: string;
  } | null;
}

export default function EventsPage() {
  const { user, profile, loading: authLoading, refresh: refreshAuth } = useAuth();
  const [events, setEvents] = useState<ClubEvent[]>([]);
  const [registrations, setRegistrations] = useState<RegistrationWithEvent[]>([]);
  const [eventsLoading, setEventsLoading] = useState(true);
  const [activeMainTab, setActiveMainTab] = useState<'events' | 'work_sessions'>('events');

  const {
    selectedEvent,
    editingRegistrationId,
    selectedCategories,
    mealQuantities,
    transponderId,
    loading: regLoading,
    success: regSuccess,
    error: regError,
    setTransponderId,
    selectEvent,
    editRegistration,
    resetRegistration,
    toggleCategory,
    updateMealQuantity,
    getEventCategories,
    getEventMeals,
    getSelectedMealsArray,
    calculateTotal,
    isWithin48Hours,
    submit,
  } = useEventRegistration({
    defaultTransponder: profile?.transponder_number,
  });

  const isMountedRef = React.useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const loadMemberRegs = useCallback(async (userId: string) => {
    const { data: regsData } = await getMemberRegistrations(userId);
    if (isMountedRef.current) {
      setRegistrations((regsData as RegistrationWithEvent[]) || []);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;
    
    async function fetchEvents() {
      setEventsLoading(true);
      const { data: eventsData } = await getActiveEvents();
      if (isMounted) {
        setEvents(eventsData || []);
        setEventsLoading(false);
      }
    }

    fetchEvents();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const tabParam = params.get('tab');
      const hash = window.location.hash;
      if (tabParam === 'work_sessions' || hash === '#work_sessions' || hash === '#travaux') {
        setActiveMainTab('work_sessions');
      }
    }
  }, []);

  useEffect(() => {
    if (user) {
      loadMemberRegs(user.id);
    } else {
      setRegistrations([]);
    }
  }, [user, loadMemberRegs]);

  const getExistingRegistration = (eventId: string) => {
    return registrations.find((r) => r.event_id === eventId || r.sbc_events?.id === eventId);
  };

  const handleStartEdit = (event: ClubEvent, reg: RegistrationWithEvent) => {
    editRegistration(event, reg);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    await submit(user.id, async () => {
      await loadMemberRegs(user.id);
      setTimeout(() => {
        resetRegistration();
      }, 2000);
    });
  };

  const getEventTypeBadge = (event: ClubEvent) => {
    const type = event.event_type || 'sbc_race';
    switch (type) {
      case 'sbc_race':
        return {
          label: event.category || '🏁 Course Club SBC',
          className: 'bg-primary/15 text-primary border-primary/30',
        };
      case 'belgian_championship':
        return {
          label: event.category || '🏆 Champ. de Belgique / Extérieur',
          className: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
        };
      case 'holiday':
        return {
          label: event.category || '🎉 Événement Spécial / Fête',
          className: 'bg-purple-500/15 text-purple-400 border-purple-500/30',
        };
      case 'club_meeting':
        return {
          label: event.category || '🤝 Réunion Club',
          className: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
        };
      default:
        return {
          label: event.category || 'Course',
          className: 'bg-primary/10 text-primary border-primary/20',
        };
    }
  };

  if (authLoading || eventsLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-100 gap-2 font-mono text-xs">
        <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
        <span>Chargement des événements...</span>
      </div>
    );
  }

  // Utilisateur non connecté -> Alerte + aperçu public
  if (!user) {
    return (
      <div className="max-w-4xl mx-auto space-y-8 py-4">
        <div className="premium-card p-6 md:p-8 rounded-lg border border-[#353535] text-center">
          <KeyRound className="w-12 h-12 text-primary mx-auto mb-3" />
          <h2 className="font-anybody font-black text-xl uppercase tracking-tight sport-skew text-white">
            Connexion Requise pour l'Inscription
          </h2>
          <p className="text-xs text-foreground/50 font-mono mt-1 mb-4">
            Connectez-vous pour vous inscrire officiellement aux courses du club
          </p>
          <Link href="/dashboard" className="premium-btn text-xs">
            <span className="transform skew-x-8">Se connecter</span>
          </Link>
        </div>

        {/* Liste publique des courses */}
        <div className="space-y-4">
          <h3 className="font-anybody font-black text-lg uppercase tracking-tight sport-skew text-white">
            Prochaines Courses & Activités
          </h3>
          {events.length === 0 ? (
            <div className="p-8 text-center text-xs text-foreground/50 font-mono border border-[#353535] rounded">
              Aucun événement programmé pour l'instant.
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {events.map((event) => {
                const typeBadge = getEventTypeBadge(event);
                return (
                  <div key={event.id} className="premium-card p-5 rounded-lg border border-[#353535] flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`px-2 py-0.5 rounded text-[9px] font-mono font-bold uppercase tracking-wider border ${typeBadge.className}`}>
                          {typeBadge.label}
                        </span>
                        <span className="text-[10px] text-foreground/50 font-mono flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5 text-primary" />
                          {new Date(event.event_date).toLocaleDateString('fr-BE')}
                        </span>
                      </div>
                      <h4 className="font-anybody font-black text-base text-white uppercase sport-skew">
                        {event.title}
                      </h4>
                      {event.description && (
                        <p className="text-xs text-foreground/60 leading-relaxed font-sans">{event.description}</p>
                      )}
                      {event.location && (
                        <p className="text-[10px] text-foreground/40 font-mono flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5 text-primary" /> {event.location}
                        </p>
                      )}
                    </div>
                    <div className="text-right font-mono text-xs text-foreground/50 shrink-0">
                      {event.has_registration !== false ? (
                        <div className="text-primary font-bold">À partir de €{Number(event.registration_fee || 0).toFixed(2)}</div>
                      ) : event.external_link ? (
                        <a
                          href={event.external_link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-blue-400 hover:underline font-bold text-xs"
                        >
                          <span>Site officiel</span>
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      ) : (
                        <span className="text-foreground/40 text-[10px]">Informatif</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Engagements ROI / Assurance non acceptés -> Blocage
  const hasAgreements = Boolean(profile?.roi_accepted && profile?.insurance_ack);
  if (user && !hasAgreements) {
    return (
      <div className="max-w-md mx-auto py-10 space-y-6 text-center">
        <div className="premium-card p-6 md:p-8 rounded-lg border-2 border-secondary bg-secondary/10 shadow-[0_0_30px_rgba(255,50,0,0.2)]">
          <div className="w-12 h-12 rounded-full bg-secondary/20 flex items-center justify-center mx-auto mb-4 border border-secondary text-secondary">
            <Lock className="w-6 h-6" />
          </div>
          <h3 className="font-anybody font-black text-lg uppercase tracking-tight sport-skew text-white mb-2">
            Inscriptions Verrouillées
          </h3>
          <p className="text-xs text-foreground/80 leading-relaxed mb-6 font-mono">
            Pour vous inscrire aux courses officielles du club, vous devez obligatoirement accepter le <strong>Règlement d'Ordre Intérieur (ROI)</strong> et l'<strong>Assurance FBA</strong> sur votre profil pilote.
          </p>
          <Link
            href="/dashboard#engagements-section"
            className="premium-btn text-xs w-full flex items-center justify-center"
          >
            <span className="transform skew-x-8">Valider mes engagements sur le Dashboard</span>
          </Link>
        </div>

        <FbaDisclaimer />
      </div>
    );
  }

  // Cotisation non payée
  if (profile && profile.payment_status !== 'paid') {
    return (
      <div className="max-w-md mx-auto py-10 space-y-6 text-center">
        <div className="premium-card p-6 md:p-8 rounded-lg border border-[#353535]">
          <div className="w-12 h-12 rounded-full bg-surface flex items-center justify-center mx-auto mb-4 border border-[#353535] text-secondary">
            <Lock className="w-6 h-6" />
          </div>
          <h3 className="font-anybody font-black text-lg uppercase tracking-tight sport-skew text-white mb-2">
            Cotisation Non Acquittée
          </h3>
          <p className="text-xs text-foreground/60 leading-relaxed mb-6 font-mono">
            Les inscriptions aux courses du club nécessitent une cotisation annuelle ou journalière valide.
          </p>
          <Link
            href="/dashboard"
            className="premium-btn text-xs w-full flex items-center justify-center"
          >
            <span className="transform skew-x-8">Accéder à mon Espace Pilote</span>
          </Link>
        </div>
        <FbaDisclaimer />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-8 py-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#353535] pb-4">
        <div>
          <h1 className="font-anybody font-black text-2xl md:text-3xl uppercase tracking-tight sport-skew text-white">
            Calendrier & <span className="text-primary">Inscriptions</span>
          </h1>
          <p className="text-xs text-foreground/50 font-mono mt-1">
            Pilote : {profile?.first_name} {profile?.last_name} ({profile?.license_number || 'Licence FBA'})
          </p>
        </div>

        {/* Navigation Onglets Événements / Sessions Travaux */}
        <div className="flex items-center gap-2 overflow-x-auto">
          <button
            onClick={() => {
              setActiveMainTab('events');
              resetRegistration();
            }}
            className={`px-4 py-2 rounded-lg font-anybody font-bold text-xs uppercase tracking-wider transition-all sport-skew flex items-center gap-2 cursor-pointer ${
              activeMainTab === 'events'
                ? 'bg-primary text-black shadow-[2px_2px_0px_#000]'
                : 'bg-surface border border-[#353535] text-foreground/60 hover:text-white'
            }`}
          >
            <Trophy className="w-4 h-4" />
            <span className="transform skew-x-8">Courses & Compétitions</span>
          </button>

          <button
            onClick={() => {
              setActiveMainTab('work_sessions');
              resetRegistration();
            }}
            className={`px-4 py-2 rounded-lg font-anybody font-bold text-xs uppercase tracking-wider transition-all sport-skew flex items-center gap-2 cursor-pointer ${
              activeMainTab === 'work_sessions'
                ? 'bg-primary text-black shadow-[2px_2px_0px_#000]'
                : 'bg-surface border border-[#353535] text-foreground/60 hover:text-white'
            }`}
          >
            <Wrench className="w-4 h-4" />
            <span className="transform skew-x-8">Sessions Travaux & Bénévoles</span>
          </button>
        </div>
      </div>

      <FbaDisclaimer />

      {/* Vue Sessions Travaux */}
      {activeMainTab === 'work_sessions' ? (
        <WorkSessionPilotSection />
      ) : (
        <>
          {/* Bloc de Formulaire d'Inscription / Modification */}
          {selectedEvent ? (
        <div className="space-y-3">
          <button
            type="button"
            onClick={resetRegistration}
            className="inline-flex items-center gap-2 text-xs font-mono text-foreground/60 hover:text-primary transition-colors cursor-pointer group py-1"
          >
            <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
            <span>← Retour aux événements</span>
          </button>

          <div className="premium-card rounded-lg overflow-hidden border border-primary/30">
            <div className="bg-primary/10 border-b border-[#353535] p-5 flex justify-between items-center">
              <div>
                <span className={`text-white text-[9px] font-bold px-2 py-0.5 uppercase tracking-wider rounded ${
                  editingRegistrationId ? 'bg-blue-600' : 'bg-racing-red'
                }`}>
                  {editingRegistrationId ? 'Modification d\'engagement' : 'Formulaire Officiel'}
                </span>
                <h3 className="font-anybody font-black text-lg text-white uppercase sport-skew mt-1">
                  {editingRegistrationId ? 'Mise à jour :' : 'Inscription :'} {selectedEvent.title}
                </h3>
              </div>
              <button
                type="button"
                onClick={resetRegistration}
                className="text-xs text-foreground/50 hover:text-primary font-mono uppercase cursor-pointer transition-colors"
              >
                Annuler
              </button>
            </div>

            <form onSubmit={handleFormSubmit} className="grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-[#353535]">
              {/* Colonne gauche : Catégories et options */}
              <div className="lg:col-span-8 p-6 space-y-6">
                {regError && (
                  <div className="p-3 rounded bg-secondary/10 border border-secondary/20 text-secondary text-xs font-mono">
                    ⚠️ {regError}
                  </div>
                )}

                {regSuccess && (
                  <div className="p-3 rounded bg-success/15 border border-success/30 text-success text-xs font-mono flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>
                      {editingRegistrationId ? 'Engagement mis à jour avec succès !' : 'Inscription validée ! Préparation du départ...'}
                    </span>
                  </div>
                )}

                {/* 1. Catégories de Course (Multi-Select) */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-anybody font-black text-xs uppercase tracking-wider text-white sport-skew flex items-center gap-2">
                      <Trophy className="w-3.5 h-3.5 text-primary" />
                      1. Catégories de Course (Choix multiple)
                    </h4>
                    <span className="text-[10px] font-mono text-primary font-bold">
                      {selectedCategories.length} sélectionnée(s)
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {getEventCategories(selectedEvent).map((item) => {
                      const isSelected = selectedCategories.some((c) => c.name === item.name);
                      return (
                        <button
                          key={item.name}
                          type="button"
                          onClick={() => toggleCategory(item)}
                          className={`p-4 border text-left rounded flex flex-col justify-between transition-all cursor-pointer relative ${
                            isSelected
                              ? 'border-primary bg-primary/10 text-primary shadow-[inset_0_0_15px_rgba(255,110,0,0.15)] ring-1 ring-primary'
                              : 'border-[#353535] bg-surface hover:bg-surface-high text-foreground'
                          }`}
                        >
                          <div className="flex items-center justify-between w-full">
                            <span className="text-[9px] font-mono uppercase text-foreground/45">
                              {item.type || 'Course'}
                            </span>
                            <span
                              className={`w-4 h-4 rounded flex items-center justify-center text-[10px] border ${
                                isSelected
                                  ? 'bg-primary border-primary text-black'
                                  : 'border-[#353535] bg-background'
                              }`}
                            >
                              {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                            </span>
                          </div>

                          <span className="font-anybody font-black text-sm uppercase sport-skew text-white mt-2">
                            {item.name}
                          </span>

                          <div className="flex items-center justify-between mt-2 pt-2 border-t border-[#353535]/40">
                            <span className="text-xs font-mono font-bold text-primary">
                              €{Number(item.fee || 0).toFixed(2)}
                            </span>
                            <span className="text-[9px] font-mono text-foreground/50">
                              {isSelected ? 'Cochée' : 'Cliquer pour ajouter'}
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  {selectedCategories.length === 0 && (
                    <p className="text-[10px] text-secondary font-mono mt-2">
                      ⚠️ Veuillez cocher au moins une catégorie pour participer à l'événement.
                    </p>
                  )}
                </div>

                {/* 2. Repas & Télémétrie */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  {/* Restauration avec compteur */}
                  <div>
                    <h4 className="font-anybody font-black text-xs uppercase tracking-wider text-white sport-skew mb-3 flex items-center gap-1.5">
                      <Utensils className="w-3.5 h-3.5 text-primary" />
                      2. Repas & Restauration (Quantité 0 à 10)
                    </h4>
                    <div className="space-y-2.5">
                      {getEventMeals(selectedEvent).map((meal) => {
                        const qty = mealQuantities[meal.name] || 0;
                        return (
                          <div
                            key={meal.name}
                            className={`flex items-center justify-between p-3 rounded border transition-all ${
                              qty > 0
                                ? 'border-primary/60 bg-primary/5 shadow-[inset_0_0_10px_rgba(255,110,0,0.08)]'
                                : 'border-[#353535] bg-surface hover:bg-surface-high'
                            }`}
                          >
                            <div className="space-y-0.5 pr-2">
                              <div className="text-xs font-bold text-white flex items-center gap-1.5 flex-wrap">
                                <span>{meal.name}</span>
                                <span className="text-primary font-mono text-[11px] font-bold">
                                  €{Number(meal.price).toFixed(2)}/u
                                </span>
                              </div>
                              {meal.desc && <div className="text-[10px] text-foreground/50">{meal.desc}</div>}
                              {qty > 0 && (
                                <div className="text-[10px] text-success font-mono font-bold">
                                  Total : €{(qty * Number(meal.price)).toFixed(2)}
                                </div>
                              )}
                            </div>

                            <div className="flex items-center gap-1.5 bg-surface-dim border border-[#353535] rounded p-1 shrink-0">
                              <button
                                type="button"
                                onClick={() => updateMealQuantity(meal.name, -1)}
                                disabled={qty <= 0}
                                className="w-7 h-7 flex items-center justify-center rounded bg-surface hover:bg-surface-high border border-[#353535] text-white disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer text-xs font-bold active:scale-95 transition-all"
                              >
                                <Minus className="w-3 h-3" />
                              </button>
                              <span className="w-6 text-center font-mono font-bold text-xs text-white">
                                {qty}
                              </span>
                              <button
                                type="button"
                                onClick={() => updateMealQuantity(meal.name, 1)}
                                disabled={qty >= 10}
                                className="w-7 h-7 flex items-center justify-center rounded bg-surface hover:bg-surface-high border border-[#353535] text-primary hover:text-white disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer text-xs font-bold active:scale-95 transition-all"
                              >
                                <Plus className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Transpondeur */}
                  <div>
                    <h4 className="font-anybody font-black text-xs uppercase tracking-wider text-white sport-skew mb-3">
                      3. Matériel Télémétrie
                    </h4>
                    <div className="p-4 bg-surface border border-[#353535] rounded space-y-3">
                      <label className="block text-[10px] font-mono uppercase tracking-wider text-foreground/50">
                        N° Transpondeur (AMB/MyLaps)
                      </label>
                      <input
                        type="text"
                        value={transponderId}
                        onChange={(e) => setTransponderId(e.target.value)}
                        placeholder="#1234567"
                        className="w-full bg-background border border-[#353535] rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-primary font-mono"
                      />
                      <p className="text-[9px] text-foreground/45 font-mono leading-tight">
                        Laissez vide si vous n'avez pas de transpondeur personnel (location possible sur place).
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Colonne droite : Résumé Facturation */}
              <div className="lg:col-span-4 p-6 bg-surface-dim flex flex-col justify-between space-y-6">
                <div className="space-y-4">
                  <h4 className="font-anybody font-black text-xs uppercase tracking-wider text-white sport-skew border-b border-[#353535] pb-2">
                    Résumé Facturation
                  </h4>
                  <div className="space-y-2 text-xs font-mono">
                    {selectedCategories.length === 0 ? (
                      <div className="text-secondary text-[11px]">
                        Aucune catégorie cochée
                      </div>
                    ) : (
                      selectedCategories.map((c) => (
                        <div key={c.name} className="flex justify-between">
                          <span className="text-foreground/55 truncate max-w-40">Cat. {c.name} :</span>
                          <span className="text-primary font-bold">€{Number(c.fee || 0).toFixed(2)}</span>
                        </div>
                      ))
                    )}

                    {getSelectedMealsArray().map((m) => (
                      <div key={m.name} className="flex justify-between">
                        <span className="text-foreground/55 truncate max-w-40">{m.name} (x{m.quantity}) :</span>
                        <span className="text-white font-bold">€{(m.quantity * m.unit_price).toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-4 pt-4 border-t border-[#353535]/50">
                  <div className="flex justify-between items-end">
                    <span className="font-anybody font-black text-sm uppercase sport-skew text-foreground/50">Total</span>
                    <span className="font-anybody font-black text-2xl uppercase sport-skew text-success">
                      €{calculateTotal().toFixed(2)}
                    </span>
                  </div>

                  <button
                    type="submit"
                    disabled={regLoading || regSuccess || selectedCategories.length === 0}
                    className="w-full premium-btn text-xs flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <span className="transform skew-x-8 flex items-center gap-1.5">
                      {editingRegistrationId ? <RotateCcw className="w-4 h-4" /> : <Send className="w-4 h-4" />}
                      {regLoading
                        ? 'Traitement...'
                        : editingRegistrationId
                        ? 'Mettre à jour mon engagement'
                        : 'Confirmer Inscription'}
                    </span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Liste des courses disponibles */}
          <div className="md:col-span-2 space-y-4">
            <h3 className="font-anybody font-black text-sm uppercase tracking-wider text-white sport-skew border-b border-[#353535] pb-2">
              Courses & Compétitions Ouvertes ({events.length})
            </h3>

            {events.length === 0 ? (
              <div className="p-8 text-center text-xs text-foreground/50 font-mono border border-[#353535] rounded">
                Aucun événement prévu pour le moment.
              </div>
            ) : (
              events.map((event) => {
                const typeBadge = getEventTypeBadge(event);
                const canRegister = event.has_registration !== false;
                const existingReg = getExistingRegistration(event.id);
                const isLocked = isWithin48Hours(event.event_date, event.start_time);

                return (
                  <div key={event.id} className="premium-card p-6 rounded-lg border border-[#353535] flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-[9px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 border rounded ${typeBadge.className}`}>
                          {typeBadge.label}
                        </span>

                        {existingReg && (
                          <span className="px-2 py-0.5 rounded bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-[9px] font-mono font-bold uppercase tracking-wider flex items-center gap-1">
                            <Check className="w-3 h-3 stroke-[3]" /> DÉJÀ INSCRIT
                          </span>
                        )}

                        <span className="text-[10px] text-foreground/45 font-mono flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5 text-primary" />
                          {new Date(event.event_date).toLocaleDateString('fr-BE')}
                        </span>
                        {event.location && (
                          <span className="text-[10px] text-foreground/40 font-mono flex items-center gap-1">
                            <MapPin className="w-3.5 h-3.5 text-primary" /> {event.location}
                          </span>
                        )}
                      </div>
                      <h4 className="font-anybody font-black text-lg text-white uppercase sport-skew">
                        {event.title}
                      </h4>
                      {event.description && (
                        <p className="text-xs text-foreground/60 leading-relaxed font-sans">{event.description}</p>
                      )}
                    </div>

                    <div className="flex items-center gap-3 w-full sm:w-auto shrink-0 justify-end mt-4 sm:mt-0">
                      {canRegister ? (
                        existingReg ? (
                          !isLocked ? (
                            <button
                              onClick={() => handleStartEdit(event, existingReg)}
                              className="w-full sm:w-auto px-4 py-2 border border-[#353535] hover:border-primary bg-surface hover:bg-surface-high text-white font-anybody font-extrabold uppercase text-xs tracking-wider transition-all sport-skew flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                            >
                              <span className="transform skew-x-8 flex items-center gap-1.5">
                                <Edit className="w-3.5 h-3.5 text-primary" />
                                Modifier mon inscription
                              </span>
                            </button>
                          ) : (
                            <div className="w-full sm:w-auto px-3.5 py-2 bg-surface-dim border border-[#353535] text-foreground/40 font-mono text-[11px] font-bold flex items-center justify-center gap-1.5 cursor-not-allowed select-none rounded">
                              <Lock className="w-3.5 h-3.5 text-secondary/60" />
                              <span>INSCRIPTION VERROUILLÉE (&lt; 48H)</span>
                            </div>
                          )
                        ) : (
                          <button
                            onClick={() => selectEvent(event, profile?.transponder_number)}
                            className="w-full sm:w-auto px-5 py-2 border-2 border-primary text-primary hover:bg-primary hover:text-black font-anybody font-extrabold uppercase text-xs tracking-wider transition-all sport-skew shadow-[2px_2px_0px_#000] cursor-pointer"
                          >
                            <span className="transform skew-x-8">S'inscrire</span>
                          </button>
                        )
                      ) : event.external_link ? (
                        <a
                          href={event.external_link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-4 py-2 border-2 border-blue-500/50 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 font-anybody font-extrabold uppercase text-xs tracking-wider transition-all sport-skew shadow-[2px_2px_0px_#000] cursor-pointer"
                        >
                          <span className="transform skew-x-8 flex items-center gap-1.5">
                            Voir sur le site officiel
                            <ExternalLink className="w-3.5 h-3.5" />
                          </span>
                        </a>
                      ) : (
                        <span className="px-3.5 py-1.5 rounded bg-surface border border-[#353535] text-[11px] font-mono text-foreground/50 italic">
                          ℹ️ Informatif seul
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Historique des engagements du pilote */}
          <div className="premium-card p-6 rounded-lg border border-[#353535] h-fit space-y-4">
            <h3 className="font-anybody font-black text-sm uppercase tracking-wider text-white sport-skew border-b border-[#353535] pb-2">
              Mes Engagements ({registrations.length})
            </h3>

            {registrations.length === 0 ? (
              <div className="p-4 text-center text-[10px] text-foreground/40 font-mono">
                Vous n'êtes inscrit à aucune course pour le moment.
              </div>
            ) : (
              <div className="space-y-3 max-h-75 overflow-y-auto">
                {registrations.map((reg) => {
                  const selCats = reg.selected_categories as unknown as SelectedCategoryItem[] | null;
                  const selMeals = reg.selected_meals as unknown as { name: string; quantity: number }[] | null;

                  return (
                    <div key={reg.id} className="p-3 bg-surface-dim border border-[#353535]/50 rounded font-mono text-[11px] space-y-1">
                      <div className="font-bold text-white text-xs font-sans truncate uppercase sport-skew">
                        {reg.sbc_events?.title || 'Événement'}
                      </div>
                      <div className="text-foreground/45 flex justify-between items-start">
                        <span>Catégories :</span>
                        <span className="text-primary font-bold text-right ml-2">
                          {Array.isArray(selCats) && selCats.length > 0
                            ? selCats.map((c) => c.name).join(' + ')
                            : reg.race_category || 'Non spécifié'}
                        </span>
                      </div>
                      <div className="text-foreground/45 flex justify-between">
                        <span>Transpondeur :</span>
                        <span className="text-white">{reg.transponder_id || 'Aucun'}</span>
                      </div>
                      {Array.isArray(selMeals) && selMeals.length > 0 ? (
                        <div className="text-foreground/45 flex justify-between">
                          <span>Repas :</span>
                          <span className="text-white">
                            {selMeals.map((m) => `${m.name} x${m.quantity}`).join(', ')}
                          </span>
                        </div>
                      ) : Array.isArray(reg.food_options) && reg.food_options.length > 0 ? (
                        <div className="text-foreground/45 flex justify-between">
                          <span>Repas :</span>
                          <span className="text-white">{reg.food_options.join(', ')}</span>
                        </div>
                      ) : null}
                      <div className="text-foreground/45 flex justify-between">
                        <span>Total :</span>
                        <span className="text-success font-bold">€{Number(reg.total_paid || 0).toFixed(2)}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
        </>
      )}
    </div>
  );
}
