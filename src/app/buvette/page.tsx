'use client';

import React from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useSimulation } from '@/modules/admin/contexts/SimulationContext';
import { isSuperAdmin } from '@/modules/admin/permissions';
import BarPosTerminal from '@/modules/buvette/components/BarPosTerminal';
import { ShieldAlert, Coffee, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function BuvetteCaissePage() {
  const { user, profile, isAdmin, loading } = useAuth();
  const { simulatedProfile } = useSimulation();
  const effectiveProfile = simulatedProfile || profile;

  const isSuper = isSuperAdmin(effectiveProfile ? effectiveProfile.email : (user ? user.email : null));
  const isClubAdmin = Boolean(isAdmin || isSuper || effectiveProfile?.role === 'admin');
  const canManageBar = Boolean(
    isClubAdmin ||
    (effectiveProfile?.role === 'referent' && effectiveProfile?.referent_permissions?.can_manage_bar)
  );

  if (loading) {
    return (
      <div className="py-20 flex flex-col items-center justify-center gap-3 text-foreground/50 font-mono text-xs">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        <span>Vérification des accès Caisse Buvette...</span>
      </div>
    );
  }

  // Si l'utilisateur n'a pas les droits de tenue de caisse buvette
  if (!user || !canManageBar) {
    return (
      <div className="max-w-md mx-auto my-16 p-6 bg-surface border border-secondary/30 rounded-2xl text-center space-y-4 font-mono text-xs shadow-2xl">
        <ShieldAlert className="w-12 h-12 text-secondary mx-auto" />
        <h2 className="font-anybody font-black text-lg uppercase text-white">
          Caisse Réservée au Personnel
        </h2>
        <p className="text-foreground/60 leading-relaxed">
          La caisse de service est accessible uniquement aux référents buvette et administrateurs du club.
        </p>
        <p className="text-foreground/40 text-[11px]">
          Pour consulter ou recharger votre solde buvette, rendez-vous sur votre Espace Pilote.
        </p>
        <div className="pt-2">
          <Link
            href="/dashboard"
            className="inline-block premium-btn text-xs px-6 py-2.5 sport-skew"
          >
            <span className="transform skew-x-8">Accéder à mon Espace Pilote</span>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6 animate-fade-in">
      {/* Header Caisse Serveur */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#353535] pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/30 flex items-center justify-center text-primary">
            <Coffee className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-anybody font-black text-xl sm:text-2xl uppercase tracking-tight text-white sport-skew">
                Caisse Buvette <span className="text-primary">SBC</span>
              </h1>
              <span className="px-2 py-0.5 rounded bg-primary/15 border border-primary/30 text-primary text-[10px] font-mono font-bold uppercase">
                Service POS
              </span>
            </div>
            <p className="text-xs font-mono text-foreground/50">
              Sélectionnez ou scannez le pilote pour débiter ses consommations sur son compte.
            </p>
          </div>
        </div>

        {isClubAdmin && (
          <Link
            href="/admin/buvette"
            className="px-3.5 py-2 rounded-lg bg-surface hover:bg-surface-high border border-[#353535] text-foreground/70 hover:text-white text-xs font-mono flex items-center gap-1.5 transition-colors self-start sm:self-center"
          >
            <span>Back-office Stocks & Tarifs</span>
          </Link>
        )}
      </div>

      {/* Terminal Caisse Tactile POS */}
      <BarPosTerminal />
    </div>
  );
}
