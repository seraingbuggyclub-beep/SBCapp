'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { getMemberActivePresence } from '@/modules/presence/actions';
import CheckInToggle from '@/modules/presence/components/CheckInToggle';
import FbaDisclaimer from '@/modules/presence/components/FbaDisclaimer';
import { KeyRound } from 'lucide-react';
import Link from 'next/link';
import { PresenceSession } from '@/types/models';

export default function CheckInPage() {
  const { user, profile, loading: authLoading } = useAuth();
  const [activePresence, setActivePresence] = useState<PresenceSession | null>(null);
  const [presenceLoading, setPresenceLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function fetchPresence() {
      if (user && profile?.payment_status === 'paid') {
        setPresenceLoading(true);
        const { data } = await getMemberActivePresence(user.id);
        if (isMounted) {
          setActivePresence((data as PresenceSession) || null);
          setPresenceLoading(false);
        }
      } else {
        if (isMounted) {
          setActivePresence(null);
          setPresenceLoading(false);
        }
      }
    }

    fetchPresence();
    return () => { isMounted = false; };
  }, [user, profile?.payment_status]);

  if (authLoading || (user && profile?.payment_status === 'paid' && presenceLoading)) {
    return (
      <div className="flex flex-col items-center justify-center min-h-100 gap-2 font-mono text-xs">
        <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
        <span>Chargement du module de présence...</span>
      </div>
    );
  }

  // Non connecté
  if (!user) {
    return (
      <div className="max-w-md mx-auto py-10 space-y-6 text-center">
        <div className="premium-card p-6 md:p-8 rounded-lg border border-[#353535]">
          <div className="w-12 h-12 rounded-full bg-surface flex items-center justify-center mx-auto mb-4 border border-[#353535] text-primary">
            <KeyRound className="w-6 h-6" />
          </div>
          <h3 className="font-anybody font-black text-lg uppercase tracking-tight sport-skew text-white mb-2">
            Connexion Requise
          </h3>
          <p className="text-xs text-foreground/60 leading-relaxed mb-6 font-mono">
            Vous devez être connecté avec votre compte pilote pour vous enregistrer sur site.
          </p>
          <Link href="/dashboard" className="premium-btn text-xs w-full flex items-center justify-center">
            <span className="transform skew-x-8">Accéder à la connexion</span>
          </Link>
        </div>
        <FbaDisclaimer />
      </div>
    );
  }

  // Engagements ROI / Assurance non acceptés → Blocage strict
  const hasAgreements = Boolean(profile?.roi_accepted && profile?.insurance_ack);
  if (!hasAgreements) {
    return (
      <div className="max-w-md mx-auto py-10 space-y-6 text-center">
        <div className="premium-card p-6 md:p-8 rounded-lg border-2 border-secondary bg-secondary/10 shadow-[0_0_30px_rgba(255,50,0,0.2)]">
          <div className="w-12 h-12 rounded-full bg-secondary/20 flex items-center justify-center mx-auto mb-4 border border-secondary text-secondary">
            <KeyRound className="w-6 h-6" />
          </div>
          <h3 className="font-anybody font-black text-lg uppercase tracking-tight sport-skew text-white mb-2">
            Engagements Obligatoires Requis
          </h3>
          <p className="text-xs text-foreground/80 leading-relaxed mb-6 font-mono">
            Pour être couvert par l&apos;assurance FBA et activer l&apos;enregistrement de présence, vous devez obligatoirement accepter le <strong>Règlement d&apos;Ordre Intérieur (ROI)</strong> et les <strong>conditions d&apos;assurance FBA</strong> sur votre profil.
          </p>
          <Link href="/dashboard#engagements-section" className="premium-btn text-xs w-full flex items-center justify-center">
            <span className="transform skew-x-8">Valider mes engagements sur le Dashboard</span>
          </Link>
        </div>
        <FbaDisclaimer />
      </div>
    );
  }

  // Cotisation non en règle
  if (profile?.payment_status !== 'paid') {
    return (
      <div className="max-w-md mx-auto py-10 space-y-6 text-center">
        <div className="premium-card p-6 md:p-8 rounded-lg border border-[#353535]">
          <div className="w-12 h-12 rounded-full bg-surface flex items-center justify-center mx-auto mb-4 border border-[#353535] text-secondary">
            <KeyRound className="w-6 h-6" />
          </div>
          <h3 className="font-anybody font-black text-lg uppercase tracking-tight sport-skew text-white mb-2">
            Cotisation Non Acquittée
          </h3>
          <p className="text-xs text-foreground/60 leading-relaxed mb-6 font-mono">
            Votre cotisation annuelle est actuellement en attente ou expirée. Veuillez régulariser votre cotisation auprès du club pour accéder à l&apos;enregistrement de présence.
          </p>
          <Link href="/dashboard" className="premium-btn text-xs w-full flex items-center justify-center">
            <span className="transform skew-x-8">Accéder à mon Espace Pilote</span>
          </Link>
        </div>
        <FbaDisclaimer />
      </div>
    );
  }

  // En ordre → Afficher le module de présence complet
  return (
    <div className="max-w-4xl mx-auto space-y-6 py-4">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[#353535] pb-4">
        <div>
          <h1 className="font-anybody font-black text-2xl md:text-3xl uppercase tracking-tight sport-skew text-white">
            Enregistrement <span className="text-primary">Sur Site</span>
          </h1>
          <p className="text-xs text-foreground/50 font-mono mt-1">
            Pilote : {profile?.first_name} {profile?.last_name} • Licence: {profile?.license_number || 'Non encodée'}
          </p>
        </div>
        <div className="flex items-center gap-1 bg-success/15 border border-success/30 px-3 py-1 rounded text-[10px] text-success font-mono font-bold uppercase tracking-wider">
          <span className="w-1.5 h-1.5 rounded-full bg-success animate-ping shrink-0" />
          Radar FBA Actif
        </div>
      </div>

      {/* Mandatory disclaimer */}
      <FbaDisclaimer />

      {/* Module principal check-in complet */}
      <CheckInToggle memberId={user.id} initialPresence={activePresence} />
    </div>
  );
}
