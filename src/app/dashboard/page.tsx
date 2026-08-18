'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useSimulation } from '@/modules/admin/contexts/SimulationContext';
import { isSuperAdmin } from '@/modules/admin/permissions';
import { getMemberRegistrations, getActiveEvents } from '@/modules/events/actions';
import { getMemberClubLockCode } from '@/modules/payments/actions';
import AuthForm from '@/modules/members/components/AuthForm';
import MemberQrCodeCard from '@/modules/members/components/MemberQrCodeCard';
import PilotAttendanceWidget from '@/modules/attendance/components/PilotAttendanceWidget';
import MemberPrivacyCenter from '@/modules/gdpr/components/MemberPrivacyCenter';
import MembershipPaymentModal from '@/modules/payments/components/MembershipPaymentModal';
import ReferentContractSignatureModal from '@/modules/members/components/ReferentContractSignatureModal';
import MemberKeysAndContractWidget from '@/modules/members/components/MemberKeysAndContractWidget';
import FeedbackIdeasWidget from '@/modules/feedback/components/widgets/FeedbackIdeasWidget';
import ProfileEditForm from '@/modules/members/components/ProfileEditForm';
import OfficialDocumentsModal from '@/modules/members/components/OfficialDocumentsModal';
import BarRechargeModal from '@/modules/buvette/components/BarRechargeModal';
import {
  AlertTriangle,
  Calendar,
  MapPin,
  Trophy,
  ShieldCheck,
  FileText,
  Shield,
  ArrowRight,
  Lock,
  Unlock,
  Sliders,
  Sparkles,
  BookOpen,
  Award,
  ChevronRight,
  Coffee,
  Wallet,
  CreditCard,
} from 'lucide-react';
import Link from 'next/link';
import { ClubEvent, getErrorMessage } from '@/types/models';
import { formatCurrency, formatDate } from '@/lib/utils/formatters';

interface MemberRegistrationItem {
  id: string;
  race_category: string;
  total_paid: number;
  sbc_events: {
    title: string;
    location: string;
    event_date: string;
  };
}

export default function DashboardPage() {
  const { user, profile, loading: authLoading, refresh: refreshAuth } = useAuth();
  const { simulatedProfile } = useSimulation();

  // Profil effectif : priorise le profil simulé en mode simulation
  const effectiveProfile = simulatedProfile || profile;
  const isSuper = isSuperAdmin(simulatedProfile ? simulatedProfile.email : (user ? user.email : null));
  const isAdminUser = Boolean(isSuper || effectiveProfile?.role === 'admin');
  const isPaid = Boolean(effectiveProfile?.payment_status === 'paid' || isAdminUser);
  const hasAgreements = Boolean(effectiveProfile?.roi_accepted && effectiveProfile?.insurance_ack);

  const [registrations, setRegistrations] = useState<MemberRegistrationItem[]>([]);
  const [, setUpcomingEvents] = useState<ClubEvent[]>([]);
  const [lockCode, setLockCode] = useState<string | null>(null);
  const [, setDataLoading] = useState(false);

  // Modale de lecture des documents officiels (ROI / Charte)
  const [activeDocModal, setActiveDocModal] = useState<'roi' | 'charte' | null>(null);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [rechargeModalOpen, setRechargeModalOpen] = useState(false);

  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const loadMemberData = useCallback(async (userId: string) => {
    setDataLoading(true);
    try {
      // Parallélisation des requêtes (suppression des waterfalls)
      const [{ data: regsData }, { data: eventsData }, { lockCode: code }] = await Promise.all([
        getMemberRegistrations(userId),
        getActiveEvents(),
        getMemberClubLockCode(),
      ]);

      if (isMountedRef.current) {
        setRegistrations((regsData || []) as unknown as MemberRegistrationItem[]);

        const regs = (regsData || []) as unknown as Array<{ event_id: string }>;
        const registeredEventIds = regs.map((r) => r.event_id);
        const filteredEvents = (eventsData || []).filter((e) => !registeredEventIds.includes(e.id));
        setUpcomingEvents(filteredEvents);

        setLockCode(code || '4000');
      }
    } catch (err: unknown) {
      console.error('Erreur chargement dashboard:', getErrorMessage(err));
    } finally {
      if (isMountedRef.current) {
        setDataLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    const activeUserId = user?.id || simulatedProfile?.id;
    if (activeUserId && isPaid) {
      if (simulatedProfile) {
        setLockCode('4000');
      }
      loadMemberData(activeUserId);
    } else {
      setRegistrations([]);
      setUpcomingEvents([]);
      setLockCode(null);
    }
  }, [user?.id, simulatedProfile, isPaid, loadMemberData]);

  if (authLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-3 font-mono text-xs text-foreground/50">
        <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
        <span>Initialisation de votre cockpit pilote...</span>
      </div>
    );
  }

  // Non connecté et sans simulation -> Affichage du Formulaire Auth
  if (!user && !simulatedProfile) {
    return (
      <div className="max-w-md mx-auto py-12 px-4 space-y-6">
        <div className="text-center space-y-2 mb-4">
          <h1 className="font-anybody font-black text-3xl uppercase tracking-tight sport-skew text-white">
            Cockpit <span className="text-primary">Pilote</span>
          </h1>
          <p className="text-xs font-mono text-foreground/50">
            Connectez-vous pour accéder à votre licence FBA, vos inscriptions et vos paramètres piste.
          </p>
        </div>
        <AuthForm />
      </div>
    );
  }

  const walletBalance = Number(effectiveProfile?.wallet_balance || 0);

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-8 animate-fade-in">
      {/* Bannière de blocage si engagements non acceptés */}
      {!hasAgreements && (
        <div className="p-4 md:p-5 rounded-lg border-2 border-secondary bg-secondary/15 text-white font-mono text-xs flex items-start sm:items-center justify-between gap-3 shadow-[0_0_30px_rgba(255,50,0,0.2)] animate-pulse">
          <div className="flex items-start sm:items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-secondary shrink-0 mt-0.5 sm:mt-0" />
            <div>
              <strong className="text-secondary font-bold block text-sm font-sans uppercase">
                Accès Piste & Courses Verrouillé
              </strong>
              <span className="text-foreground/90 text-xs">
                Vous devez obligatoirement valider le <strong>Règlement d&apos;Ordre Intérieur (ROI)</strong> et l&apos;<strong>Assurance FBA</strong> ci-dessous pour débloquer votre accès au terrain et aux inscriptions.
              </span>
            </div>
          </div>
          <a
            href="#engagements-section"
            className="px-3 py-1.5 rounded bg-secondary hover:bg-secondary/80 text-white font-bold text-[11px] shrink-0 uppercase tracking-wider transition-colors"
          >
            Valider
          </a>
        </div>
      )}

      {/* Bannière de relance de cotisation si non acquittée */}
      {!isPaid && (
        <div className="p-4 md:p-5 rounded-xl border-2 border-yellow-500/40 bg-yellow-500/10 text-white font-mono text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-[0_0_30px_rgba(234,179,8,0.15)] animate-fade-in">
          <div className="flex items-start sm:items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-yellow-400 shrink-0 mt-0.5 sm:mt-0" />
            <div>
              <strong className="text-yellow-400 font-bold block text-sm font-sans uppercase">
                Cotisation Annuelle en Attente
              </strong>
              <span className="text-foreground/85 text-xs">
                Réglez votre cotisation pour déverrouiller le code cadenas du portail, activer votre assurance FBA et obtenir votre Pass Pilote actif (QR Code Blanc).
              </span>
            </div>
          </div>
          <button
            onClick={() => setPaymentModalOpen(true)}
            className="px-4 py-2.5 rounded-lg bg-primary text-black font-anybody font-black uppercase text-xs tracking-wider border border-black hover:bg-secondary hover:text-white transition-all sport-skew shadow-[3px_3px_0px_#000] cursor-pointer shrink-0 self-start sm:self-center"
          >
            <span className="transform skew-x-8">Régler ma cotisation</span>
          </button>
        </div>
      )}

      {/* 1. Header Cockpit Pilote avec Boutons d'Action Rapide */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 border-b border-[#353535] pb-6">
        <div>
          <div className="flex items-center gap-2.5">
            <div className={`w-3 h-3 rounded-full ${hasAgreements ? 'bg-primary' : 'bg-secondary'} animate-pulse`} />
            <h1 className="font-anybody font-black text-2xl sm:text-3xl uppercase tracking-tight sport-skew text-white">
              Cockpit Pilote : <span className="text-primary">{effectiveProfile?.first_name} {effectiveProfile?.last_name}</span>
            </h1>
          </div>
          <div className="flex flex-wrap items-center gap-3 text-xs font-mono text-foreground/50 mt-1">
            <span>{user?.email || effectiveProfile?.email}</span>
            <span>•</span>
            <span>Licence FBA : <strong className="text-white">{effectiveProfile?.fba_license_number || effectiveProfile?.license_number || 'Non renseignée'}</strong></span>
            <span>•</span>
            <span
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase tracking-wider border ${
                isPaid
                  ? 'bg-success/15 text-success border-success/30'
                  : effectiveProfile?.payment_status === 'expired'
                  ? 'bg-secondary/15 text-secondary border-secondary/30'
                  : 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30'
              }`}
            >
              <ShieldCheck className="w-3 h-3" />
              <span>{isPaid ? 'Cotisation en ordre' : effectiveProfile?.payment_status === 'expired' ? 'Cotisation expirée' : 'Cotisation en attente'}</span>
            </span>
          </div>
        </div>

        {/* Boutons d'actions rapides */}
        <div className="flex flex-wrap items-center gap-3">
          {hasAgreements ? (
            <>
              <Link
                href="/events"
                className="premium-btn text-xs px-5 py-2.5 flex items-center gap-2 shadow-[0_0_20px_rgba(255,110,0,0.25)] cursor-pointer"
              >
                <Trophy className="w-4 h-4" />
                <span className="transform skew-x-8">S&apos;inscrire à une course</span>
              </Link>

              <Link
                href="/check-in"
                className="px-5 py-2.5 rounded bg-surface hover:bg-surface-high border border-[#353535] hover:border-primary text-xs font-anybody font-bold uppercase tracking-wider text-white flex items-center gap-2 transition-all cursor-pointer sport-skew"
              >
                <MapPin className="w-4 h-4 text-primary" />
                <span className="transform skew-x-8">Prendre la piste / Check-in</span>
              </Link>
            </>
          ) : (
            <div className="p-2.5 rounded bg-secondary/10 border border-secondary/30 text-secondary text-xs font-mono flex items-center gap-2">
              <Lock className="w-4 h-4" />
              <span>Actions bloquées (Engagements requis)</span>
            </div>
          )}
        </div>
      </div>

      {/* Pass Pilote Officiel avec QR Code Dynamique */}
      <section className="w-full">
        <MemberQrCodeCard member={effectiveProfile} />
      </section>

      {/* Pointage Officiel FBA en direct */}
      <section className="w-full">
        <PilotAttendanceWidget member={effectiveProfile} />
      </section>

      {/* 2. Grille des Widgets Clés (Cadenas, Solde Buvette, Assurance FBA, Setups) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Widget Cadenas d'accès */}
        <div className="premium-card p-5 rounded-lg border border-[#353535] flex flex-col justify-between space-y-3 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {isPaid ? (
                <Unlock className="w-5 h-5 text-success" />
              ) : (
                <Lock className="w-5 h-5 text-secondary" />
              )}
              <h3 className="font-anybody font-black text-sm uppercase sport-skew text-white">
                Cadenas Club
              </h3>
            </div>
            <span className={`px-2 py-0.5 rounded text-[9px] font-mono font-bold uppercase tracking-wider border ${
              isPaid ? 'bg-success/15 border-success/30 text-success' : 'bg-secondary/15 border-secondary/30 text-secondary'
            }`}>
              {isPaid ? 'Accès Ouvert' : 'Verrouillé'}
            </span>
          </div>

          <div className="py-1">
            {isPaid ? (
              <div>
                <span className="text-[10px] font-mono text-foreground/45 uppercase tracking-wider block mb-1">
                  Combinaison Active
                </span>
                <div className="text-3xl font-mono font-bold tracking-widest text-primary bg-background/80 px-3 py-1.5 rounded border border-primary/30 inline-block">
                  {lockCode || '4000'}
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-xs font-mono text-foreground/60 leading-relaxed">
                  Le code d&apos;accès au portail et aux stands est réservé aux membres en ordre de cotisation.
                </p>
                <button
                  onClick={() => setPaymentModalOpen(true)}
                  className="w-full py-2 rounded bg-primary/20 hover:bg-primary/30 border border-primary/40 text-primary font-anybody font-bold text-xs uppercase tracking-wider transition-all cursor-pointer sport-skew flex items-center justify-center gap-1.5"
                >
                  <span className="transform skew-x-8">Régler ma cotisation</span>
                </button>
              </div>
            )}
          </div>

          <div className="text-[10px] font-mono text-foreground/40 border-t border-[#353535]/40 pt-2 flex items-center gap-1">
            <span>{isPaid ? '⚠️ Reverrouiller le cadenas après départ' : 'Cotisation annuelle requise'}</span>
          </div>
        </div>

        {/* Widget Solde Buvette Pilote */}
        <div className="premium-card p-5 rounded-lg border border-[#353535] flex flex-col justify-between space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Coffee className="w-5 h-5 text-primary" />
              <h3 className="font-anybody font-black text-sm uppercase sport-skew text-white">
                Solde Buvette
              </h3>
            </div>
            <span
              className={`px-2 py-0.5 rounded text-[9px] font-mono font-bold uppercase tracking-wider border ${
                walletBalance < 0
                  ? 'bg-rose-500/15 border-rose-500/30 text-rose-400'
                  : 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400'
              }`}
            >
              {walletBalance < 0 ? 'Ardoise' : 'Créditeur'}
            </span>
          </div>

          <div className="py-1 space-y-2">
            <div>
              <span className="text-[10px] font-mono text-foreground/45 uppercase tracking-wider block mb-0.5">
                {walletBalance < 0 ? 'Ardoise à apurer' : 'Solde disponible'}
              </span>
              <div
                className={`text-2xl font-anybody font-black tracking-tight ${
                  walletBalance < 0 ? 'text-rose-400' : 'text-emerald-400'
                }`}
              >
                {walletBalance < 0
                  ? `-${Math.abs(walletBalance).toFixed(2)} €`
                  : `+${walletBalance.toFixed(2)} €`}
              </div>
            </div>

            <button
              onClick={() => setRechargeModalOpen(true)}
              className="w-full py-2 rounded bg-primary/20 hover:bg-primary/30 border border-primary/40 text-primary font-anybody font-bold text-xs uppercase tracking-wider transition-all cursor-pointer sport-skew flex items-center justify-center gap-1.5"
            >
              <CreditCard className="w-3.5 h-3.5" />
              <span className="transform skew-x-8">Recharger par virement</span>
            </button>
          </div>

          <div className="text-[10px] font-mono text-foreground/40 border-t border-[#353535]/40 pt-2 flex items-center gap-1">
            <span>Débité à la caisse du club</span>
          </div>
        </div>

        {/* Widget Assurance FBA */}
        <div className="premium-card p-5 rounded-lg border border-[#353535] flex flex-col justify-between space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-primary" />
              <h3 className="font-anybody font-black text-sm uppercase sport-skew text-white">
                Assurance FBA
              </h3>
            </div>
            <span className="px-2 py-0.5 rounded text-[9px] font-mono font-bold uppercase tracking-wider bg-primary/15 border border-primary/30 text-primary">
              Fédération FBA
            </span>
          </div>

          <div className="space-y-1">
            <div className="text-xs font-mono text-white font-bold">
              Couverture RC Piste & Entraînements
            </div>
            <p className="text-[11px] font-mono text-foreground/60 leading-relaxed">
              Assurance active lors de toute présence sur la piste de Seraing.
            </p>
          </div>

          <div className="text-[10px] font-mono text-primary/80 border-t border-[#353535]/40 pt-2 flex items-center gap-1">
            <MapPin className="w-3 h-3 shrink-0" />
            <span>Validation GPS requise via Check-in</span>
          </div>
        </div>

        {/* Widget Réglages Voitures (Teaser) */}
        <div className="premium-card p-5 rounded-lg border border-[#353535] flex flex-col justify-between space-y-3 bg-gradient-to-br from-surface to-surface-dim/40 relative">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sliders className="w-5 h-5 text-primary" />
              <h3 className="font-anybody font-black text-sm uppercase sport-skew text-white">
                Setups Voitures
              </h3>
            </div>
            <span className="px-2 py-0.5 rounded text-[9px] font-mono font-bold uppercase tracking-wider bg-purple-500/20 border border-purple-500/40 text-purple-300 animate-pulse flex items-center gap-1">
              <Sparkles className="w-2.5 h-2.5" /> Bientôt
            </span>
          </div>

          <div className="space-y-1">
            <div className="text-xs font-mono text-white font-bold">
              Fiches Réglages 1/8 & 1/10
            </div>
            <p className="text-[11px] font-mono text-foreground/60 leading-relaxed">
              Enregistrez vos configurations (huiles, différentiels, pneus, transmission) selon la météo.
            </p>
          </div>

          <div className="text-[10px] font-mono text-foreground/40 border-t border-[#353535]/40 pt-2">
            Module télémétrie en cours de développement
          </div>
        </div>
      </div>

      {/* 3. Section Intermédiaire : Mes Engagements Courses + Documents Officiels */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Mes Engagements Courses */}
        <div className="premium-card p-6 rounded-lg border border-[#353535] space-y-4">
          <div className="flex items-center justify-between border-b border-[#353535] pb-3">
            <div className="flex items-center gap-2">
              <Trophy className="w-4 h-4 text-primary" />
              <h3 className="font-anybody font-black text-sm uppercase sport-skew text-white">
                Mes Engagements Courses ({registrations.length})
              </h3>
            </div>
            <Link
              href="/events"
              className="text-[10px] font-mono text-primary hover:underline flex items-center gap-1"
            >
              Calendrier complet <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          {registrations.length === 0 ? (
            <div className="py-8 text-center text-foreground/40 font-mono text-xs space-y-2">
              <Trophy className="w-8 h-8 mx-auto text-foreground/20" />
              <p>Aucune course encodée actuellement.</p>
              <Link href="/events" className="text-primary hover:underline block text-[11px]">
                Consulter les prochaines courses ouvertes →
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {registrations.map((reg) => (
                <div
                  key={reg.id}
                  className="p-3.5 bg-surface-dim rounded border border-[#353535] space-y-1.5 hover:border-[#454545] transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-anybody font-bold text-xs uppercase sport-skew text-white">
                      {reg.sbc_events?.title || 'Événement Club'}
                    </span>
                    <span className="text-[10px] font-mono text-success font-bold px-2 py-0.5 rounded bg-success/10 border border-success/20">
                      {formatCurrency(reg.total_paid)} • Enregistré
                    </span>
                  </div>
                  <div className="text-[11px] font-mono text-foreground/60">
                    Catégorie : <strong className="text-primary">{reg.race_category}</strong>
                  </div>
                  <div className="flex items-center gap-4 text-[10px] font-mono text-foreground/40 pt-1">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-primary" />
                      {formatDate(reg.sbc_events?.event_date)}
                    </span>
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-primary" />
                      {reg.sbc_events?.location || 'Seraing'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Documents Officiels & Règlements */}
        <div className="premium-card p-6 rounded-lg border border-[#353535] space-y-4">
          <div className="flex items-center justify-between border-b border-[#353535] pb-3">
            <div className="flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-primary" />
              <h3 className="font-anybody font-black text-sm uppercase sport-skew text-white">
                Documents & Règlements ASBL
              </h3>
            </div>
            <span className="text-[10px] font-mono text-foreground/40">SBC Seraing</span>
          </div>

          <p className="text-xs font-mono text-foreground/60 leading-relaxed">
            Consultez les textes réglementaires régissant la pratique sur la piste et les engagements sportifs des membres.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            <button
              onClick={() => setActiveDocModal('roi')}
              className="p-4 rounded-lg bg-surface hover:bg-surface-high border border-[#353535] hover:border-primary text-left transition-all cursor-pointer group flex flex-col justify-between space-y-3"
            >
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="font-anybody font-black text-xs uppercase sport-skew text-white group-hover:text-primary transition-colors">
                    Règlement d&apos;Ordre Intérieur (ROI)
                  </span>
                  <FileText className="w-4 h-4 text-primary shrink-0" />
                </div>
                <p className="text-[10px] font-mono text-foreground/50 leading-relaxed">
                  Sécurité piste, ramassage, horaires et respect des installations.
                </p>
              </div>
              <div className="text-[10px] font-mono text-primary flex items-center gap-1 uppercase font-bold">
                <span>Lire le ROI</span> <ChevronRight className="w-3 h-3" />
              </div>
            </button>

            <button
              onClick={() => setActiveDocModal('charte')}
              className="p-4 rounded-lg bg-surface hover:bg-surface-high border border-[#353535] hover:border-primary text-left transition-all cursor-pointer group flex flex-col justify-between space-y-3"
            >
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="font-anybody font-black text-xs uppercase sport-skew text-white group-hover:text-primary transition-colors">
                    Charte du Pilote SBC
                  </span>
                  <Award className="w-4 h-4 text-primary shrink-0" />
                </div>
                <p className="text-[10px] font-mono text-foreground/50 leading-relaxed">
                  Fair-play, convivialité, entraide et esprit de club.
                </p>
              </div>
              <div className="text-[10px] font-mono text-primary flex items-center gap-1 uppercase font-bold">
                <span>Lire la Charte</span> <ChevronRight className="w-3 h-3" />
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* 4. Section Mes Clés, Matériels & Engagements Officiels */}
      <MemberKeysAndContractWidget
        member={effectiveProfile}
        onOpenDocModal={(doc) => setActiveDocModal(doc)}
      />

      {/* 5. Boîte à Idées & Signalement d'Anomalies */}
      <FeedbackIdeasWidget member={effectiveProfile} />

      {/* 6. Formulaire complet de gestion du Profil Pilote (Composant Découplé) */}
      <ProfileEditForm member={effectiveProfile} onProfileUpdated={refreshAuth} />

      {/* 7. Centre de Confidentialité & Préférences RGPD (Conformité APD) */}
      <section id="privacy-section" className="w-full">
        <MemberPrivacyCenter member={effectiveProfile} onUpdate={refreshAuth} />
      </section>

      {/* 8. Modale de Lecture des Documents Officiels (ROI & Charte - Composant Découplé) */}
      <OfficialDocumentsModal
        activeDoc={activeDocModal}
        onClose={() => setActiveDocModal(null)}
      />

      {/* Modale de Paiement de Cotisation */}
      {paymentModalOpen && (
        <MembershipPaymentModal
          member={effectiveProfile}
          isOpen={paymentModalOpen}
          onClose={() => setPaymentModalOpen(false)}
          onPaymentUpdated={refreshAuth}
        />
      )}

      {/* Modale de Recharge Solde Buvette par Virement */}
      {rechargeModalOpen && (
        <BarRechargeModal
          member={effectiveProfile}
          isOpen={rechargeModalOpen}
          onClose={() => {
            setRechargeModalOpen(false);
            refreshAuth();
          }}
        />
      )}

      {/* Modale Bloquante de Signature de la Convention Référent */}
      <ReferentContractSignatureModal
        member={effectiveProfile}
        isOpen={Boolean(effectiveProfile?.role === 'referent' && !effectiveProfile?.referent_contract_signed_at)}
        onSigned={refreshAuth}
      />
    </div>
  );
}
