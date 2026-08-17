'use client';

import React from 'react';
import { ShieldAlert, ArrowRight, MapPin } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { usePresenceZone } from '../contexts/PresenceZoneContext';

interface FbaDisclaimerProps {
  forceInZone?: boolean;
  forceCheckedIn?: boolean;
}

export default function FbaDisclaimer({
  forceInZone,
  forceCheckedIn,
}: FbaDisclaimerProps = {}) {
  const pathname = usePathname();
  const presenceContext = usePresenceZone();

  // Résolution des conditions d'affichage
  const inZone = forceInZone !== undefined ? forceInZone : presenceContext.isInZone;
  const checkedIn = forceCheckedIn !== undefined ? forceCheckedIn : presenceContext.isCheckedIn;

  // Règle stricte : Afficher le bandeau UNIQUEMENT SI isInZone === true && !isCheckedIn
  // Masquer si hors zone (!isInZone) ou si déjà enregistré (isCheckedIn === true)
  if (!inZone || checkedIn) {
    return null;
  }

  const isCheckInView = pathname === '/check-in';

  // Vue spécifique sur la page /check-in
  if (isCheckInView) {
    return (
      <div className="w-full p-4 rounded-lg bg-secondary/15 border-2 border-secondary/40 flex items-start gap-3 shadow-[0_4px_15px_rgba(230,33,23,0.18)] animate-pulse transition-all">
        <ShieldAlert className="w-5 h-5 text-secondary shrink-0 mt-0.5" />
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h4 className="font-anybody font-black text-sm uppercase tracking-wide text-white sport-skew">
              Avertissement Important — Assurance FBA
            </h4>
            <span className="text-[10px] bg-secondary text-white px-2 py-0.5 rounded font-mono font-bold tracking-wider uppercase inline-flex items-center gap-1">
              <MapPin className="w-3 h-3" /> Zone Club Détectée
            </span>
          </div>
          <p className="text-xs text-secondary/95 font-mono leading-relaxed font-bold">
            Attention : Vous êtes actuellement dans la zone de la piste mais non enregistré dans le registre actif. Validez votre présence ci-dessous pour être couvert par l'assurance FBA.
          </p>
        </div>
      </div>
    );
  }

  // Vues globales (Dashboard, Home, Pit Lane, Events, etc.) : bandeau cliquable redirigeant vers /check-in
  return (
    <Link
      href="/check-in"
      className="block w-full p-4 rounded-lg bg-secondary/15 border-2 border-secondary/40 hover:bg-secondary/25 hover:border-secondary transition-all shadow-[0_4px_15px_rgba(230,33,23,0.18)] animate-pulse group cursor-pointer"
    >
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <ShieldAlert className="w-5 h-5 text-secondary shrink-0 mt-0.5 group-hover:scale-110 transition-transform" />
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="font-anybody font-black text-sm uppercase tracking-wide text-white sport-skew">
                Avertissement Important — Assurance FBA
              </h4>
              <span className="text-[10px] bg-secondary text-white px-2 py-0.5 rounded font-mono font-bold tracking-wider uppercase inline-flex items-center gap-1">
                <MapPin className="w-3 h-3" /> Zone Club Détectée
              </span>
            </div>
            <p className="text-xs text-secondary/95 font-mono leading-relaxed font-bold">
              Attention : Vous êtes sur le site du club et non enregistré dans le registre actif. Cliquez ici pour pointer immédiatement votre présence et activer votre couverture d'assurance FBA !
            </p>
          </div>
        </div>

        <div className="shrink-0 self-end sm:self-center">
          <span className="px-3.5 py-2 bg-secondary text-white font-anybody font-black text-xs uppercase tracking-wider rounded sport-skew flex items-center gap-1.5 group-hover:bg-red-600 transition-colors shadow-[2px_2px_0px_#000]">
            <span className="transform skew-x-8 flex items-center gap-1.5">
              Pointer ma présence <ArrowRight className="w-3.5 h-3.5" />
            </span>
          </span>
        </div>
      </div>
    </Link>
  );
}
