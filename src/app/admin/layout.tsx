'use client';

import React, { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { usePermissions } from '@/modules/admin/hooks/usePermissions';
import { useSimulation } from '@/modules/admin/contexts/SimulationContext';
import { ShieldAlert, AlertTriangle } from 'lucide-react';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, profile, isAdmin, loading: authLoading } = useAuth();
  const { simulatedProfile, isSimulationActive } = useSimulation();
  const permissions = usePermissions(user, profile);

  const isSimulatedNonAdmin = Boolean(
    isSimulationActive && simulatedProfile && simulatedProfile.role !== 'admin' && simulatedProfile.role !== 'referent'
  );

  const canAccessAdminArea = permissions.isAdmin || permissions.hasAnyAdminAccess || isSimulationActive;

  // Redirection automatique vers /dashboard si un utilisateur sans droits tente d'accéder à /admin
  useEffect(() => {
    if (!authLoading && !canAccessAdminArea) {
      router.replace('/dashboard');
    }
  }, [authLoading, canAccessAdminArea, router]);

  if (authLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-3 font-mono text-xs text-foreground/50">
        <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
        <span>Vérification des droits d'accès administrateur / référent...</span>
      </div>
    );
  }

  // Si utilisateur non autorisé en conditions réelles, bloquer l'affichage pendant la redirection
  if (!canAccessAdminArea) {
    return null;
  }

  return (
    <div className="w-full">
      {/* Avertissement d'inaccessibilité en mode simulation pour un rôle non-admin */}
      {isSimulatedNonAdmin && (
        <div className="max-w-6xl mx-auto px-4 mb-4 mt-2">
          <div className="p-3.5 rounded-lg border-2 border-secondary bg-secondary/15 text-white font-mono text-xs flex items-center justify-between gap-3 shadow-[0_0_20px_rgba(255,50,0,0.2)] animate-pulse">
            <div className="flex items-center gap-2.5">
              <ShieldAlert className="w-5 h-5 text-secondary shrink-0" />
              <div>
                <strong className="text-secondary font-bold font-sans uppercase block text-sm">
                  🚫 Page inaccessible hors simulation pour ce rôle ({simulatedProfile?.role})
                </strong>
                <span className="text-foreground/90 text-xs">
                  Vous visualisez cette interface car votre compte réel est Administrateur. Un utilisateur avec ce rôle est normalement redirigé vers l'espace pilote.
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {children}
    </div>
  );
}
