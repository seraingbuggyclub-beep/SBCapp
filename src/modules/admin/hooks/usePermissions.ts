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

  const isReferentUser = useMemo(() => {
    return activeProfile?.role === 'referent';
  }, [activeProfile?.role]);

  const referentPermissions = useMemo(() => {
    return activeProfile?.referent_permissions || null;
  }, [activeProfile?.referent_permissions]);

  const canManageTrack = useMemo(() => {
    return (trackId: string): boolean => {
      if (isAdminUser) return true;
      if (!isReferentUser || !referentPermissions) return false;
      return (
        Boolean(referentPermissions.can_open_close_tracks) &&
        Array.isArray(referentPermissions.allowed_track_ids) &&
        referentPermissions.allowed_track_ids.includes(trackId)
      );
    };
  }, [isAdminUser, isReferentUser, referentPermissions]);

  const can = useMemo(() => {
    return (moduleId: string, actionId: string): boolean => {
      if (isSuper) return true;
      if (!activeProfile) return false;
      
      // Si référent, vérification des prérogatives modulaires spécifiques
      if (isReferentUser && referentPermissions) {
        if (moduleId === 'members') {
          if (actionId === 'contacts') {
            return Boolean(referentPermissions.can_view_members_registry && referentPermissions.can_view_member_contact_details);
          }
          if (actionId === 'view' || actionId === 'list') {
            return Boolean(referentPermissions.can_view_members_registry);
          }
          return false; // Référents ne peuvent pas éditer, licencier ou blacklister les membres
        }
        if (moduleId === 'tracks') {
          return Boolean(referentPermissions.can_open_close_tracks);
        }
        if (moduleId === 'events') {
          if (actionId === 'create' || actionId === 'edit') {
            return Boolean(referentPermissions.can_create_edit_events ?? referentPermissions.can_manage_track_events);
          }
          if (actionId === 'registrations' || actionId === 'checkin') {
            return Boolean(referentPermissions.can_manage_event_registrations ?? referentPermissions.can_manage_track_events);
          }
          return Boolean(referentPermissions.can_manage_track_events);
        }
        if (moduleId === 'buvette' || moduleId === 'bar') {
          if (actionId === 'pos' || actionId === 'service') {
            return Boolean(referentPermissions.can_pos_bar || referentPermissions.can_manage_bar);
          }
          return false; // Tarifs, caisse globale et stocks réservés aux admins
        }
        if (moduleId === 'presences' || moduleId === 'attendance') {
          if (actionId === 'validate') {
            return Boolean(referentPermissions.can_validate_attendance);
          }
          return Boolean(referentPermissions.can_view_attendance || referentPermissions.can_validate_attendance);
        }
        if (moduleId === 'pit_lane' || moduleId === 'news' || moduleId === 'communications') {
          return Boolean(referentPermissions.can_manage_pit_lane);
        }
        return false;
      }

      return hasPermission(activeProfile.role, activeProfile.permissions, moduleId, actionId, activeUser?.email);
    };
  }, [isSuper, activeProfile, isReferentUser, referentPermissions, activeUser?.email]);

  const hasAnyAdminAccess = useMemo(() => {
    if (isAdminUser) return true;
    if (!isReferentUser || !referentPermissions) return false;
    return Boolean(
      referentPermissions.can_view_members_registry ||
      referentPermissions.can_view_attendance ||
      referentPermissions.can_validate_attendance ||
      referentPermissions.can_open_close_tracks ||
      referentPermissions.can_manage_track_events ||
      referentPermissions.can_manage_pit_lane
    );
  }, [isAdminUser, isReferentUser, referentPermissions]);

  return {
    isSuperAdmin: isSuper,
    isAdmin: isAdminUser,
    isReferent: isReferentUser,
    hasAnyAdminAccess,
    referentPermissions,
    canManageTrack,
    activeProfile,
    can,
    role: activeProfile?.role || 'visitor',
  };
}
