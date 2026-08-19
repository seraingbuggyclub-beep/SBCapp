'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { TrackItem, TrackStatus, TrackClosureType, ReferentPermissions } from '@/types/models';
import { isSuperAdmin } from '../admin/permissions';

const DEFAULT_FALLBACK_TRACKS: TrackItem[] = [
  { id: '11111111-1111-4111-8111-111111111111', name: '1/10', is_open: true, order_index: 1 },
  { id: '22222222-2222-4222-8222-222222222222', name: '1/8', is_open: true, order_index: 2 },
  { id: '33333333-3333-4333-8333-333333333333', name: 'Rallye Game', is_open: true, order_index: 3 },
  { id: '44444444-4444-4444-8444-444444444444', name: 'Crawler', is_open: true, order_index: 4 },
];

/**
 * Récupère l'état de toutes les pistes du club, triées par order_index puis par nom
 */
export async function getTracks(): Promise<{ data: TrackItem[]; error: string | null }> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('tracks')
      .select('*')
      .order('order_index', { ascending: true })
      .order('name', { ascending: true });

    if (error) {
      console.warn('Erreur de récupération des pistes Supabase, utilisation du fallback:', error.message);
      return { data: DEFAULT_FALLBACK_TRACKS, error: null };
    }

    if (!data || data.length === 0) {
      return { data: DEFAULT_FALLBACK_TRACKS, error: null };
    }

    return { data: data as TrackItem[], error: null };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erreur inattendue';
    return { data: DEFAULT_FALLBACK_TRACKS, error: message };
  }
}

export interface TrackFormData {
  name: string;
  is_open?: boolean;
  status_message?: string | null;
  order_index?: number;
  closure_reason?: string | null;
  closure_type?: TrackClosureType | null;
  reopening_at?: string | null;
}

export interface UpdateTrackStatusOptions {
  status?: TrackStatus;
  status_message?: string | null;
  closure_reason?: string | null;
  closure_type?: TrackClosureType | null;
  reopening_at?: string | null;
}

/**
 * Crée une nouvelle piste (Réservé aux Administrateurs)
 */
export async function createTrack(
  formData: TrackFormData
): Promise<{ success: boolean; error: string | null; data?: TrackItem }> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: 'Vous devez être connecté.' };
    }

    const { data: memberProfile } = await supabase
      .from('sbc_members')
      .select('role, email')
      .eq('id', user.id)
      .single();

    const isSuper = isSuperAdmin(memberProfile?.email || user.email);
    const isAdmin = memberProfile?.role === 'admin';

    if (!isSuper && !isAdmin) {
      return { success: false, error: 'Action réservée aux administrateurs.' };
    }

    if (!formData.name || !formData.name.trim()) {
      return { success: false, error: 'Le nom de la piste est requis.' };
    }

    const now = new Date().toISOString();
    const isOpen = formData.is_open ?? true;

    const { data, error } = await supabase
      .from('tracks')
      .insert({
        name: formData.name.trim(),
        is_open: isOpen,
        status_message: formData.status_message?.trim() || null,
        closure_reason: formData.closure_reason?.trim() || null,
        closure_type: formData.closure_type || (isOpen ? 'DURATION' : 'INDEFINITE_WORKS'),
        reopening_at: formData.reopening_at || null,
        order_index: formData.order_index ?? 0,
        created_at: now,
        updated_at: now,
      })
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath('/');
    revalidatePath('/admin');
    revalidatePath('/dashboard');

    return { success: true, error: null, data: data as TrackItem };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erreur inattendue';
    return { success: false, error: message };
  }
}

/**
 * Modifie les caractéristiques d'une piste existante (Admin ou Référent assigné)
 */
export async function updateTrack(
  id: string,
  formData: Partial<TrackFormData>
): Promise<{ success: boolean; error: string | null; data?: TrackItem }> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: 'Vous devez être connecté.' };
    }

    const { data: memberProfile } = await supabase
      .from('sbc_members')
      .select('role, email, referent_permissions')
      .eq('id', user.id)
      .single();

    const isSuper = isSuperAdmin(memberProfile?.email || user.email);
    const isAdmin = memberProfile?.role === 'admin';
    const isAssignedReferent =
      memberProfile?.role === 'referent' &&
      memberProfile.referent_permissions &&
      Boolean((memberProfile.referent_permissions as ReferentPermissions).can_open_close_tracks) &&
      Array.isArray((memberProfile.referent_permissions as ReferentPermissions).allowed_track_ids) &&
      (memberProfile.referent_permissions as ReferentPermissions).allowed_track_ids.includes(id);

    if (!isSuper && !isAdmin && !isAssignedReferent) {
      return { success: false, error: 'Action non autorisée sur cette piste.' };
    }

    const now = new Date().toISOString();
    const updatePayload: Record<string, unknown> = {
      updated_at: now,
    };

    if (formData.name !== undefined) updatePayload.name = formData.name.trim();
    if (formData.is_open !== undefined) updatePayload.is_open = formData.is_open;
    if (formData.status_message !== undefined) updatePayload.status_message = formData.status_message?.trim() || null;
    if (formData.closure_reason !== undefined) updatePayload.closure_reason = formData.closure_reason?.trim() || null;
    if (formData.closure_type !== undefined) updatePayload.closure_type = formData.closure_type;
    if (formData.reopening_at !== undefined) updatePayload.reopening_at = formData.reopening_at || null;
    if (formData.order_index !== undefined) updatePayload.order_index = formData.order_index;

    const { data, error } = await supabase
      .from('tracks')
      .update(updatePayload)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath('/');
    revalidatePath('/admin');
    revalidatePath('/dashboard');

    return { success: true, error: null, data: data as TrackItem };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erreur inattendue';
    return { success: false, error: message };
  }
}

/**
 * Supprime une piste (Réservé aux Administrateurs)
 */
export async function deleteTrack(
  id: string
): Promise<{ success: boolean; error: string | null }> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: 'Vous devez être connecté.' };
    }

    const { data: memberProfile } = await supabase
      .from('sbc_members')
      .select('role, email')
      .eq('id', user.id)
      .single();

    const isSuper = isSuperAdmin(memberProfile?.email || user.email);
    const isAdmin = memberProfile?.role === 'admin';

    if (!isSuper && !isAdmin) {
      return { success: false, error: 'Action réservée aux administrateurs.' };
    }

    const { error } = await supabase
      .from('tracks')
      .delete()
      .eq('id', id);

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath('/');
    revalidatePath('/admin');
    revalidatePath('/dashboard');

    return { success: true, error: null };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erreur inattendue';
    return { success: false, error: message };
  }
}

/**
 * Met à jour l'état d'ouverture d'une piste (Admins et Référents assignés)
 */
export async function updateTrackStatus(
  id: string,
  is_open: boolean,
  options?: UpdateTrackStatusOptions | 'OPEN' | 'CLOSED' | 'WORK'
): Promise<{ success: boolean; error: string | null; updated?: TrackItem }> {
  try {
    const supabase = await createClient();

    // Vérifier les permissions utilisateur
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: 'Vous devez être connecté.' };
    }

    const { data: memberProfile } = await supabase
      .from('sbc_members')
      .select('role, email, referent_permissions')
      .eq('id', user.id)
      .single();

    const isSuper = isSuperAdmin(memberProfile?.email || user.email);
    const isAdmin = memberProfile?.role === 'admin';
    const isAssignedReferent =
      memberProfile?.role === 'referent' &&
      memberProfile.referent_permissions &&
      Boolean((memberProfile.referent_permissions as ReferentPermissions).can_open_close_tracks) &&
      Array.isArray((memberProfile.referent_permissions as ReferentPermissions).allowed_track_ids) &&
      (memberProfile.referent_permissions as ReferentPermissions).allowed_track_ids.includes(id);

    if (!isSuper && !isAdmin && !isAssignedReferent) {
      return { success: false, error: 'Action non autorisée sur cette piste.' };
    }

    // Normalisation des options
    const parsedOptions: UpdateTrackStatusOptions = typeof options === 'string'
      ? { status: options }
      : (options || {});

    let nextStatus: TrackStatus = 'OPEN';
    let closure_reason: string | null = null;
    let closure_type: TrackClosureType | null = null;
    let reopening_at: string | null = null;
    let status_message: string | null = null;

    if (is_open) {
      nextStatus = 'OPEN';
      closure_reason = null;
      closure_type = null;
      reopening_at = null;
      status_message = null;
    } else {
      nextStatus = parsedOptions.status || (parsedOptions.closure_type === 'INDEFINITE_WORKS' ? 'WORK' : 'CLOSED');
      closure_reason = parsedOptions.closure_reason || null;
      closure_type = parsedOptions.closure_type || (parsedOptions.status === 'WORK' ? 'INDEFINITE_WORKS' : 'DURATION');
      reopening_at = parsedOptions.reopening_at || null;
      status_message = parsedOptions.status_message || parsedOptions.closure_reason || null;
    }

    const now = new Date().toISOString();
    const { data, error } = await supabase
      .from('tracks')
      .update({
        is_open,
        status: nextStatus,
        closure_reason,
        closure_type,
        reopening_at,
        status_message,
        updated_at: now,
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath('/');
    revalidatePath('/admin');
    revalidatePath('/dashboard');

    return { success: true, error: null, updated: data as TrackItem };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erreur inattendue';
    return { success: false, error: message };
  }
}
