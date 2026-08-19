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
import { getTracks } from '@/modules/tracks/actions';
import { isSuperAdmin } from './permissions';

const DEFAULT_TRACKS_FALLBACK: TrackItem[] = [
  { id: '11111111-1111-4111-8111-111111111111', name: 'Piste Astro 1/10', slug: 'astro-1-10', type: '1/10 Electric', is_open: true, status: 'OPEN', order_index: 1 },
  { id: '22222222-2222-4222-8222-222222222222', name: 'Piste Multi 1/8', slug: 'multi-1-8', type: '1/8 Nitro & Elec', is_open: true, status: 'OPEN', order_index: 2 },
  { id: '33333333-3333-4333-8333-333333333333', name: 'Piste Terre Vintage / Rallye Game', slug: 'terre-vintage-rallye', type: 'Vintage & Rallye', is_open: true, status: 'OPEN', order_index: 3 },
  { id: '44444444-4444-4444-8444-444444444444', name: 'Piste Crawler / Scale', slug: 'crawler-scale', type: 'Crawler & Scale', is_open: true, status: 'OPEN', order_index: 4 },
];

/**
 * 1. Récupère la liste dynamique des pistes du club pour l'attribution des droits
 */
export async function getAvailableTracks(): Promise<{ data: TrackItem[]; error: string | null }> {
  try {
    const res = await getTracks();
    if (res.error || !res.data || res.data.length === 0) {
      return { data: DEFAULT_TRACKS_FALLBACK, error: res.error };
    }
    return { data: res.data, error: null };
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
        can_create_edit_events: false,
        can_manage_event_registrations: false,
        allowed_event_track_ids: [],
        can_view_members_registry: false,
        can_view_member_contact_details: false,
        can_view_attendance: true,
        can_validate_attendance: false,
        can_pos_bar: false,
        can_manage_bar: false,
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
