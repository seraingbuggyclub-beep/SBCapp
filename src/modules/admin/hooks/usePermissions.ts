import { useMemo } from 'react';
import { User } from '@supabase/supabase-js';
import { isSuperAdmin, hasPermission } from '../permissions';
import { useSimulation } from '../contexts/SimulationContext';
import { MemberProfile } from '@/types/models';

/**
 * Hook client pour valider facilement les rôles et permissions d'un utilisateur.
 * Interroge automatiquement le contexte de simulation global s'il est actif.
 * 
 * @param currentUser Utilisateur connecté (facultatif, se replie sur la simulation)
 * @param userProfile Profil de l'utilisateur (facultatif, se replie sur la simulation)
 */
export function usePermissions(
  currentUser?: User | { email?: string | null } | null,
  userProfile?: MemberProfile | null
) {
  let simContext: { simulatedProfile: MemberProfile | null } | null = null;
  try {
    // Tente de récupérer l'état global du Mode Masquerade
    simContext = useSimulation();
  } catch {
    // Hook appelé en dehors du SimulationProvider (ex: page isolée)
  }

  const simulatedProfile = simContext?.simulatedProfile;

  // Profil actif : Simulation en priorité, puis repli sur le profil réel
  const activeProfile = simulatedProfile || userProfile;

  // Utilisateur actif : Email simulé en priorité, puis repli sur l'utilisateur réel
  const activeUser = simulatedProfile 
    ? { email: simulatedProfile.email } 
    : currentUser;

  const isSuper = useMemo(() => {
    return isSuperAdmin(activeUser?.email);
  }, [activeUser?.email]);

  const isAdminUser = useMemo(() => {
    return isSuper || activeProfile?.role === 'admin';
  }, [isSuper, activeProfile?.role]);

  const can = useMemo(() => {
    return (moduleId: string, actionId: string): boolean => {
      if (isSuper) return true;
      if (!activeProfile) return false;
      return hasPermission(activeProfile.role, activeProfile.permissions, moduleId, actionId, activeUser?.email);
    };
  }, [isSuper, activeProfile, activeUser?.email]);

  return {
    isSuperAdmin: isSuper,
    isAdmin: isAdminUser,
    activeProfile,
    can,
    role: activeProfile?.role || 'visitor',
  };
}
