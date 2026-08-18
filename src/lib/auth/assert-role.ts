import { SupabaseClient, User } from '@supabase/supabase-js';
import { isSuperAdmin } from '@/modules/admin/permissions';
import { MemberProfile, ReferentPermissions } from '@/types/models';

export interface AuthAssertionResult {
  authorized: boolean;
  user: User | null;
  profile: MemberProfile | null;
  error: string | null;
}

/**
 * Vérifie que l'utilisateur est authentifié et possède le rôle Administrateur ou Super-Admin.
 */
export async function assertAdmin(
  supabase: SupabaseClient,
  currentUser?: User | null
): Promise<AuthAssertionResult> {
  try {
    let authUser = currentUser;
    if (!authUser) {
      const { data: authData } = await supabase.auth.getUser();
      authUser = authData?.user || null;
    }

    if (!authUser) {
      return { authorized: false, user: null, profile: null, error: 'Non authentifié.' };
    }

    const { data: profile } = await supabase
      .from('sbc_members')
      .select('id, role, email, first_name, last_name, permissions, referent_permissions')
      .eq('id', authUser.id)
      .single();

    const isSuper = isSuperAdmin(profile?.email || authUser.email);
    const isAdmin = profile?.role === 'admin';

    if (!isSuper && !isAdmin) {
      return {
        authorized: false,
        user: authUser,
        profile: profile as MemberProfile | null,
        error: 'Action réservée aux administrateurs du club.',
      };
    }

    return {
      authorized: true,
      user: authUser,
      profile: profile as MemberProfile,
      error: null,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erreur assertion administrateur';
    return { authorized: false, user: null, profile: null, error: message };
  }
}

/**
 * Vérifie que l'utilisateur est authentifié et possède le rôle Référent, Administrateur ou Super-Admin.
 */
export async function assertReferentOrAdmin(
  supabase: SupabaseClient,
  currentUser?: User | null,
  requiredReferentPermissionKey?: keyof ReferentPermissions
): Promise<AuthAssertionResult> {
  try {
    let authUser = currentUser;
    if (!authUser) {
      const { data: authData } = await supabase.auth.getUser();
      authUser = authData?.user || null;
    }

    if (!authUser) {
      return { authorized: false, user: null, profile: null, error: 'Non authentifié.' };
    }

    const { data: profile } = await supabase
      .from('sbc_members')
      .select('id, role, email, first_name, last_name, permissions, referent_permissions')
      .eq('id', authUser.id)
      .single();

    const isSuper = isSuperAdmin(profile?.email || authUser.email);
    const isAdmin = profile?.role === 'admin';
    const isReferent = profile?.role === 'referent';

    if (!isSuper && !isAdmin && !isReferent) {
      return {
        authorized: false,
        user: authUser,
        profile: profile as MemberProfile | null,
        error: 'Action réservée aux référents et administrateurs.',
      };
    }

    // Validation optionnelle d'une permission granulaire pour les référents
    if (isReferent && !isAdmin && !isSuper && requiredReferentPermissionKey) {
      const referentPerms = profile?.referent_permissions as ReferentPermissions | null;
      if (!referentPerms || !referentPerms[requiredReferentPermissionKey]) {
        return {
          authorized: false,
          user: authUser,
          profile: profile as MemberProfile | null,
          error: `Droits insuffisants : permission '${String(requiredReferentPermissionKey)}' requise.`,
        };
      }
    }

    return {
      authorized: true,
      user: authUser,
      profile: profile as MemberProfile,
      error: null,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erreur assertion rôle';
    return { authorized: false, user: null, profile: null, error: message };
  }
}
