'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { PresenceSession, PublicPresenceItem, CheckInType } from '@/types/models';

/**
 * Enregistre la présence d'un membre sur site (check-in GPS)
 * - Ouvre une session active dans sbc_presence (check_in_time = now(), check_out_time = null)
 * - Enregistre l'émargement officiel dans fba_attendances (check_in_at = now(), check_out_at = null)
 */
export async function checkInMember(presence: {
  member_id: string;
  check_in_type?: CheckInType;
  latitude?: number;
  longitude?: number;
  is_public: boolean;
}): Promise<{ data: PresenceSession | null; error: string | null }> {
  const supabase = await createClient();
  const nowIso = new Date().toISOString();

  // 1. Clôture toute session active précédente pour ce membre (sécurité)
  await supabase
    .from('sbc_presence')
    .update({ is_active: false, check_out_time: nowIso })
    .eq('member_id', presence.member_id)
    .eq('is_active', true);

  await supabase
    .from('fba_attendances')
    .update({ check_out_at: nowIso })
    .eq('user_id', presence.member_id)
    .is('check_out_at', null);

  // 2. Insérer le nouveau check-in dans sbc_presence
  const { data, error } = await supabase
    .from('sbc_presence')
    .insert({
      member_id: presence.member_id,
      check_in_type: presence.check_in_type || 'auto',
      latitude: presence.latitude || null,
      longitude: presence.longitude || null,
      is_public: presence.is_public,
      is_active: true,
      check_in_time: nowIso,
      check_out_time: null,
    })
    .select()
    .single();

  if (error) {
    return { data: null, error: error.message };
  }

  // 3. Insérer dans fba_attendances pour le registre officiel FBA
  try {
    await supabase.from('fba_attendances').insert({
      user_id: presence.member_id,
      track_id: null,
      source: 'SELF_DASHBOARD',
      check_in_at: nowIso,
      check_out_at: null,
    });
  } catch (syncErr) {
    console.error('Erreur sync fba_attendances:', syncErr);
  }

  revalidatePath('/');
  revalidatePath('/dashboard');
  revalidatePath('/check-in');
  revalidatePath('/admin/presences');
  return { data: (data as PresenceSession) || null, error: null };
}

/**
 * Check-out de présence par ID de session
 * - Met à jour heure_depart = NOW() dans sbc_presence
 * - Met à jour heure_depart = NOW() dans fba_attendances
 */
export async function checkOutMember(presenceId: string): Promise<{ data: PresenceSession | null; error: string | null }> {
  const supabase = await createClient();
  const nowIso = new Date().toISOString();

  const { data, error } = await supabase
    .from('sbc_presence')
    .update({
      is_active: false,
      check_out_time: nowIso,
    })
    .eq('id', presenceId)
    .select()
    .single();

  if (error) {
    return { data: null, error: error.message };
  }

  // Mettre à jour la session ouverte correspondante dans fba_attendances
  if (data?.member_id) {
    try {
      await supabase
        .from('fba_attendances')
        .update({ check_out_at: nowIso })
        .eq('user_id', data.member_id)
        .is('check_out_at', null);
    } catch (syncErr) {
      console.error('Erreur sync checkout fba_attendances:', syncErr);
    }
  }

  revalidatePath('/');
  revalidatePath('/dashboard');
  revalidatePath('/check-in');
  revalidatePath('/admin/presences');
  return { data: (data as PresenceSession) || null, error: null };
}

/**
 * Check-out automatique par ID membre (pour détection GPS ou focus/visibilitychange)
 * Clôt la session ouverte sans recréer de ligne
 */
export async function checkOutByMemberId(memberId: string): Promise<{ success: boolean; error: string | null }> {
  const supabase = await createClient();
  const nowIso = new Date().toISOString();

  const { error } = await supabase
    .from('sbc_presence')
    .update({
      is_active: false,
      check_out_time: nowIso,
    })
    .eq('member_id', memberId)
    .eq('is_active', true);

  if (error) {
    return { success: false, error: error.message };
  }

  try {
    await supabase
      .from('fba_attendances')
      .update({ check_out_at: nowIso })
      .eq('user_id', memberId)
      .is('check_out_at', null);
  } catch (syncErr) {
    console.error('Erreur sync checkout fba_attendances by memberId:', syncErr);
  }

  revalidatePath('/');
  revalidatePath('/dashboard');
  revalidatePath('/check-in');
  revalidatePath('/admin/presences');
  return { success: true, error: null };
}

/**
 * Récupère toutes les présences actives publiques (pour la Landing Page)
 */
export async function getPublicActivePresences(): Promise<{ data: PublicPresenceItem[]; error: string | null }> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('sbc_presence')
    .select(`
      id,
      check_in_time,
      check_in_type,
      sbc_members (
        first_name,
        last_name,
        license_number
      )
    `)
    .eq('is_active', true)
    .eq('is_public', true)
    .order('check_in_time', { ascending: false });

  if (error) {
    return { data: [], error: error.message };
  }
  return { data: (data as unknown as PublicPresenceItem[]) || [], error: null };
}

/**
 * Récupère la présence active d'un membre spécifique
 */
export async function getMemberActivePresence(memberId: string): Promise<{ data: PresenceSession | null; error: string | null }> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('sbc_presence')
    .select('*')
    .eq('member_id', memberId)
    .eq('is_active', true)
    .maybeSingle();

  if (error) {
    return { data: null, error: error.message };
  }
  return { data: (data as PresenceSession) || null, error: null };
}
