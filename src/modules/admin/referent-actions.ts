'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import {
  UserRole,
  ReferentPermissions,
  ModulePermissionsMap,
  TrackItem,
  getErrorMessage,
} from '@/types/models';
import { isSuperAdmin } from './permissions';

const DEFAULT_TRACKS_FALLBACK: TrackItem[] = [
  { id: 'track-1-10', name: 'Piste Astro 1/10', slug: 'astro-1-10', type: '1/10 Electric', is_open: true, status: 'OPEN' },
  { id: 'track-1-8', name: 'Piste Multi 1/8', slug: 'multi-1-8', type: '1/8 Nitro & Elec', is_open: true, status: 'OPEN' },
  { id: 'track-vintage-rallye', name: 'Piste Terre Vintage / Rallye Game', slug: 'terre-vintage-rallye', type: 'Vintage & Rallye', is_open: true, status: 'OPEN' },
  { id: 'track-crawler-scale', name: 'Piste Crawler / Scale', slug: 'crawler-scale', type: 'Crawler & Scale', is_open: true, status: 'OPEN' },
];

/**
 * 1. Récupère la liste dynamique des pistes du club pour l'attribution des droits
 */
export async function getAvailableTracks(): Promise<{ data: TrackItem[]; error: string | null }> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('tracks')
      .select('*')
      .order('name', { ascending: true });

    if (error || !data || data.length === 0) {
      return { data: DEFAULT_TRACKS_FALLBACK, error: null };
    }

    return { data: data as TrackItem[], error: null };
  } catch (err: unknown) {
    return { data: DEFAULT_TRACKS_FALLBACK, error: getErrorMessage(err) };
  }
}

/**
 * 2. Met à jour le rôle d'un membre et ses permissions granulaires (Référent ou Admin)
 */
export async function updateMemberRoleAndPermissions(
  memberId: string,
  role: UserRole,
  permissions?: ModulePermissionsMap | null,
  referentPermissions?: ReferentPermissions | null
): Promise<{ success: boolean; error: string | null }> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: 'Non authentifié.' };
    }

    // Vérifier les droits du demandeur (Admin ou Super-Admin)
    const { data: caller } = await supabase
      .from('sbc_members')
      .select('role, email')
      .eq('id', user.id)
      .single();

    const isSuper = isSuperAdmin(caller?.email || user.email);
    if (!isSuper && caller?.role !== 'admin') {
      return { success: false, error: 'Action réservée aux administrateurs.' };
    }

    const payload: {
      role: UserRole;
      permissions: ModulePermissionsMap;
      referent_permissions: ReferentPermissions | null;
      updated_at: string;
    } = {
      role,
      permissions: role === 'admin' ? (permissions || {}) : {},
      referent_permissions: role === 'referent' ? (referentPermissions || {
        allowed_track_ids: [],
        can_open_close_tracks: false,
        can_manage_track_events: false,
        allowed_event_track_ids: [],
        can_manage_bar: false,
        can_view_attendance: true,
        can_manage_pit_lane: false,
      }) : null,
      updated_at: new Date().toISOString(),
    };

    const { error: updateErr } = await supabase
      .from('sbc_members')
      .update(payload)
      .eq('id', memberId);

    if (updateErr) throw updateErr;

    revalidatePath('/admin');
    revalidatePath('/admin/presences');
    revalidatePath('/admin/events');
    revalidatePath('/admin/buvette');
    revalidatePath('/dashboard');

    return { success: true, error: null };
  } catch (err: unknown) {
    return { success: false, error: getErrorMessage(err) };
  }
}

/**
 * 3. Vérifie si un membre a le droit de gérer une piste spécifique
 */
export async function canUserManageTrack(
  userId: string,
  trackId: string
): Promise<{ canManage: boolean; error: string | null }> {
  try {
    const supabase = await createClient();
    const { data: member, error } = await supabase
      .from('sbc_members')
      .select('role, email, referent_permissions')
      .eq('id', userId)
      .single();

    if (error || !member) {
      return { canManage: false, error: 'Membre introuvable.' };
    }

    if (isSuperAdmin(member.email) || member.role === 'admin') {
      return { canManage: true, error: null };
    }

    if (member.role === 'referent' && member.referent_permissions) {
      const perms = member.referent_permissions as ReferentPermissions;
      const allowed =
        Boolean(perms.can_open_close_tracks) &&
        Array.isArray(perms.allowed_track_ids) &&
        perms.allowed_track_ids.includes(trackId);
      return { canManage: allowed, error: null };
    }

    return { canManage: false, error: null };
  } catch (err: unknown) {
    return { canManage: false, error: getErrorMessage(err) };
  }
}
