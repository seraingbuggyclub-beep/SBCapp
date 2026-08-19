'use client';

import React from 'react';
import { useAuth } from '@/hooks/useAuth';
import { usePermissions } from '@/modules/admin/hooks/usePermissions';
import AdminNav from '@/components/admin/AdminNav';
import AsblAgRegisterView from '@/modules/asbl/components/AsblAgRegisterView';
import { CLUB_CONFIG } from '@/config/club';
import { Landmark, ShieldAlert, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function AdminAsblPage() {
  const { user, profile } = useAuth();
  const permissions = usePermissions(profile);

  // Strictement réservé aux Administrateurs ASBL
  if (!user || (!permissions.isAdmin && !permissions.isSuperAdmin)) {
    return (
      <div className="max-w-md mx-auto my-12 p-6 bg-surface border border-secondary/30 rounded-2xl text-center space-y-4 font-mono text-xs shadow-2xl">
        <ShieldAlert className="w-10 h-10 text-secondary mx-auto" />
        <h2 className="font-anybody font-black text-lg uppercase text-white">
          Accès Restreint
        </h2>
        <p className="text-foreground/60 leading-relaxed">
          Le registre officiel des Assemblées Générales et les procès-verbaux de l'ASBL sont réservés exclusivement aux administrateurs du Seraing Buggy Club.
        </p>
        <div className="pt-2">
          <Link
            href="/dashboard"
            className="inline-block premium-btn text-xs px-6 py-2.5 sport-skew"
          >
            <span className="transform skew-x-8">Retour Espace Pilote</span>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6 py-4 px-4 sm:px-0">
      {/* Header Vie ASBL & AG */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#353535] pb-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-primary/20 border border-primary/40 flex items-center justify-center text-primary">
              <Landmark className="w-4 h-4" />
            </div>
            <h1 className="font-anybody font-black text-2xl uppercase tracking-tight sport-skew text-white">
              Vie ASBL & <span className="text-primary">Assemblées Générales</span>
            </h1>
          </div>
          <p className="text-xs text-foreground/50 font-mono mt-1">
            Registre légal des AG, ordres du jour, votes des résolutions et signatures électroniques des PV (BCE {CLUB_CONFIG.bce} - {CLUB_CONFIG.rpm} • {CLUB_CONFIG.address.street}, {CLUB_CONFIG.address.zipCode} {CLUB_CONFIG.address.city})
          </p>
        </div>
      </div>

      {/* Navigation Modules Admin */}
      <AdminNav />

      {/* Contenu principal : Registre des Assemblées Générales */}
      <AsblAgRegisterView />
    </div>
  );
}
