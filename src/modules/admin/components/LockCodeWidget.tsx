'use client';

import React from 'react';
import { LockOpen } from 'lucide-react';
import { useSimulation } from '../contexts/SimulationContext';
import { usePermissions } from '../hooks/usePermissions';
import { MemberProfile } from '@/types/models';

interface LockCodeWidgetProps {
  initialLockCode: string | null;
  realUserProfile: MemberProfile | null;
}

export default function LockCodeWidget({ initialLockCode, realUserProfile }: LockCodeWidgetProps) {
  const { simulatedProfile } = useSimulation();

  // Le profil actif de validation est le profil simulé s'il existe, sinon le profil réel
  const activeProfile = simulatedProfile || realUserProfile;

  // Utilisateur simulé pour le hook (pour l'e-mail du Super-Admin)
  const activeUser = simulatedProfile 
    ? { email: simulatedProfile.email } 
    : (realUserProfile ? { email: realUserProfile.email } : null);

  const permissions = usePermissions(activeUser, activeProfile);

  // Si l'utilisateur ou le rôle simulé actif n'a pas le droit de consulter la configuration (cadenas)
  if (!permissions.can('config', 'view')) {
    return null; // On ne montre rien du tout (exactement comme un visiteur standard)
  }

  // Code cadenas à afficher (reçu du serveur ou valeur de repli sécurisée)
  const codeToShow = initialLockCode || '4000';

  return (
    <div className="bg-success/15 border border-success/30 p-3 rounded font-mono text-xs text-success flex items-center justify-end gap-2 max-w-sm ml-auto sport-skew shadow-[2px_2px_0px_#000]">
      <span className="transform skew-x-8 flex items-center gap-1.5 font-bold">
        <LockOpen className="w-4 h-4 text-primary animate-bounce" />
        Code cadenas piste : <strong className="text-white text-sm tracking-widest">{codeToShow}</strong>
      </span>
    </div>
  );
}
