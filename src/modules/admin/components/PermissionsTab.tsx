'use client';

import React from 'react';
import { Shield, ShieldAlert, Ghost, CheckCircle2, UserCheck, Eye } from 'lucide-react';
import { MemberProfile, UserRole } from '@/types/models';

interface PermissionsTabProps {
  simulatedProfile: MemberProfile | null;
  currentUserProfile: MemberProfile | null;
  isSuperAdmin: boolean;
  onSetSimulatedProfile: (profile: MemberProfile | null) => void;
}

export default function PermissionsTab({
  simulatedProfile,
  currentUserProfile,
  isSuperAdmin,
  onSetSimulatedProfile,
}: PermissionsTabProps) {
  const simulationOptions: Array<{
    id: string;
    label: string;
    description: string;
    profile: MemberProfile | null;
  }> = [
    {
      id: 'real',
      label: 'Rôle Réel (Aucune simulation)',
      description: 'Vos droits réels selon votre compte connecté.',
      profile: null,
    },
    {
      id: 'visitor',
      label: 'Visiteur (Non inscrit)',
      description: 'Accès public : vue calendrier, disclaimer FBA, formulaire inscription.',
      profile: {
        id: 'sim-visitor',
        email: 'visitor@example.com',
        first_name: 'Visiteur',
        last_name: 'Simulé',
        role: 'visitor',
        payment_status: 'pending',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        permissions: {},
        birth_date: null,
        city: null,
        insurance_ack: false,
        license_number: 'SBC-VISITOR',
        membership_choice: null,
        phone: null,
        roi_accepted: false,
        street_number: null,
        transponder_number: null,
        zip_code: null,
        wallet_balance: 0,
        tab_balance: 0,
        consent_email_club_news: true,
        consent_email_events: true,
        consent_image_rights: true,
        consent_whatsapp_group: false,
        consent_updated_at: new Date().toISOString(),
        unsubscribe_token: '00000000-0000-0000-0000-000000000001',
      },
    },
    {
      id: 'member_paid',
      label: 'Membre en ordre de cotisation',
      description: 'Accès complet : cadenas déverrouillé, check-in géolocalisé, inscription courses.',
      profile: {
        id: 'sim-member-paid',
        email: 'member@example.com',
        first_name: 'Pilote',
        last_name: 'EnOrdre',
        role: 'member',
        payment_status: 'paid',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        permissions: {},
        birth_date: null,
        city: null,
        insurance_ack: true,
        license_number: 'SBC-MEMBER',
        membership_choice: 'annual',
        phone: '+32 400 00 00 00',
        roi_accepted: true,
        street_number: null,
        transponder_number: '1234567',
        zip_code: null,
        wallet_balance: 50.0,
        tab_balance: 0,
        consent_email_club_news: true,
        consent_email_events: true,
        consent_image_rights: true,
        consent_whatsapp_group: true,
        consent_updated_at: new Date().toISOString(),
        unsubscribe_token: '00000000-0000-0000-0000-000000000002',
      },
    },
    {
      id: 'member_expired',
      label: 'Membre avec cotisation expirée',
      description: 'Accès restreint : cadenas verrouillé jusqu\'au renouvellement.',
      profile: {
        id: 'sim-member-expired',
        email: 'expired@example.com',
        first_name: 'Pilote',
        last_name: 'CotisationExpirée',
        role: 'member',
        payment_status: 'expired',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        permissions: {},
        birth_date: null,
        city: null,
        insurance_ack: true,
        license_number: 'SBC-DAILY',
        membership_choice: 'annual',
        phone: null,
        roi_accepted: true,
        street_number: null,
        transponder_number: null,
        zip_code: null,
        wallet_balance: 0,
        tab_balance: 14.50,
        consent_email_club_news: true,
        consent_email_events: false,
        consent_image_rights: false,
        consent_whatsapp_group: false,
        consent_updated_at: new Date().toISOString(),
        unsubscribe_token: '00000000-0000-0000-0000-000000000003',
      },
    },
    {
      id: 'referent',
      label: 'Référent Club (Piste Astro & Présences)',
      description: 'Droits délégués : gestion Piste Astro 1/10, Registre Présences FBA, Brief Pit-Lane.',
      profile: {
        id: 'sim-referent',
        email: 'referent.astro@example.com',
        first_name: 'Référent',
        last_name: 'PisteAstro',
        role: 'referent',
        payment_status: 'paid',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        permissions: {},
        referent_permissions: {
          allowed_track_ids: ['11111111-1111-4111-8111-111111111111', 'track-1-10', '1/10', 'astro-1-10'],
          can_open_close_tracks: true,
          can_manage_track_events: true,
          allowed_event_track_ids: ['11111111-1111-4111-8111-111111111111', 'track-1-10', '1/10', 'astro-1-10'],
          can_view_members_registry: true,
          can_view_attendance: true,
          can_validate_attendance: true,
          can_pos_bar: true,
          can_manage_bar: true,
          can_manage_pit_lane: true,
        },
        birth_date: null,
        city: null,
        insurance_ack: true,
        license_number: 'SBC-REFERENT',
        membership_choice: 'annual',
        phone: '+32 499 11 22 33',
        roi_accepted: true,
        street_number: null,
        transponder_number: null,
        zip_code: null,
        wallet_balance: 50.0,
        tab_balance: 0,
        consent_email_club_news: true,
        consent_email_events: true,
        consent_image_rights: true,
        consent_whatsapp_group: true,
        consent_updated_at: new Date().toISOString(),
        unsubscribe_token: '00000000-0000-0000-0000-000000000004',
      },
    },
  ];

  return (
    <div className="space-y-6">
      {/* Simulateur de rôles */}
      <div className="premium-card p-6 md:p-8 rounded-lg border border-[#353535] space-y-4">
        <div className="flex items-center justify-between border-b border-[#353535] pb-3">
          <div className="flex items-center gap-2">
            <Ghost className="w-5 h-5 text-primary" />
            <h3 className="font-anybody font-black text-lg uppercase tracking-tight sport-skew text-white">
              Simulateur de Rôles & Permissions
            </h3>
          </div>
          {simulatedProfile && (
            <span className="px-2.5 py-0.5 rounded bg-purple-500/20 border border-purple-500/40 text-purple-300 font-mono text-[10px] uppercase font-bold animate-pulse">
              Simulation Active
            </span>
          )}
        </div>

        <p className="text-xs text-foreground/60 font-mono leading-relaxed">
          Testez l'application sous la perspective d'un utilisateur cible sans altérer la base de données. Les droits d'écriture et de mutation sont automatiquement neutralisés en mode simulation.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-2">
          {simulationOptions.map((opt) => {
            const isSelected =
              (opt.profile === null && simulatedProfile === null) ||
              (opt.profile !== null && simulatedProfile?.id === opt.profile.id);

            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => onSetSimulatedProfile(opt.profile)}
                className={`p-4 rounded-lg text-left border transition-all cursor-pointer flex flex-col justify-between ${
                  isSelected
                    ? 'bg-primary/10 border-primary shadow-[inset_0_0_15px_rgba(255,110,0,0.15)] ring-1 ring-primary'
                    : 'bg-surface border-[#353535] hover:bg-surface-high hover:border-[#454545]'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-anybody font-black text-xs uppercase sport-skew text-white">
                      {opt.label}
                    </span>
                    {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-primary shrink-0" />}
                  </div>
                  <p className="text-[10px] text-foreground/50 font-mono leading-relaxed mt-1">
                    {opt.description}
                  </p>
                </div>

                <div className="pt-2 mt-2 border-t border-[#353535]/40 text-[9px] font-mono text-primary uppercase font-bold">
                  {isSelected ? 'Actif' : 'Cliquer pour tester'}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Guide des Rôles & Matrice */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="premium-card p-6 rounded-lg border border-[#353535] space-y-3 font-mono text-xs">
          <h4 className="font-anybody font-black text-sm uppercase sport-skew text-white flex items-center gap-2">
            <Shield className="w-4 h-4 text-primary" /> Hiérarchie des Rôles ASBL
          </h4>
          <ul className="space-y-2 text-foreground/70 text-[11px]">
            <li className="p-2 rounded bg-surface border border-[#353535]">
              <strong className="text-primary block font-sans uppercase">Super-Administrateur (Stéphane)</strong>
              Droits absolus : gestion des rôles, promotion des administrateurs, attribution granulaire des permissions, configuration du cadenas.
            </li>
            <li className="p-2 rounded bg-surface border border-[#353535]">
              <strong className="text-white block font-sans uppercase">Administrateurs Secondaires</strong>
              Membres du comité habilités selon les permissions granulaires (Membres, Événements, Présence, Config).
            </li>
            <li className="p-2 rounded bg-surface border border-[#353535]">
              <strong className="text-white block font-sans uppercase">Membres (Pilotes en règle)</strong>
              Accès au terrain, au code du cadenas, check-in géofencé et inscriptions directes aux courses.
            </li>
            <li className="p-2 rounded bg-surface border border-[#353535]">
              <strong className="text-white block font-sans uppercase">Visiteurs</strong>
              Consultation des calendriers et formulaire d'inscription en ligne.
            </li>
          </ul>
        </div>

        <div className="premium-card p-6 rounded-lg border border-[#353535] space-y-3 font-mono text-xs">
          <h4 className="font-anybody font-black text-sm uppercase sport-skew text-white flex items-center gap-2">
            <UserCheck className="w-4 h-4 text-success" /> Statuts de Cotisation
          </h4>
          <ul className="space-y-2 text-foreground/70 text-[11px]">
            <li className="p-2 rounded bg-surface border border-[#353535]">
              <strong className="text-success block font-sans uppercase">En ordre (Paid)</strong>
              Cotisation annuelle ou journalière acquittée. Accès complet aux installations du club et assurance FBA valide.
            </li>
            <li className="p-2 rounded bg-surface border border-[#353535]">
              <strong className="text-yellow-400 block font-sans uppercase">En attente (Pending)</strong>
              Compte créé en attente de validation ou de paiement auprès du trésorier.
            </li>
            <li className="p-2 rounded bg-surface border border-[#353535]">
              <strong className="text-secondary block font-sans uppercase">Expiré (Expired)</strong>
              Année échue sans renouvellement. Accès cadenas verrouillé.
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
