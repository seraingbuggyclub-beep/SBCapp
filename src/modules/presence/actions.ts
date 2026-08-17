'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { PresenceSession, PublicPresenceItem, CheckInType } from '@/types/models';

// Enregistrer la présence (check-in)
export async function checkInMember(presence: {
  member_id: string;
  check_in_type: CheckInType;
  latitude?: number;
  longitude?: number;
  is_public: boolean;
}): Promise<{ data: PresenceSession | null; error: string | null }> {
  const supabase = await createClient();

  // 1. Désactiver toute présence active précédente pour ce membre (sécurité)
  await supabase
    .from('sbc_presence')
    .update({ is_active: false, check_out_time: new Date().toISOString() })
    .eq('member_id', presence.member_id)
    .eq('is_active', true);

  // 2. Insérer le nouveau check-in
  const { data, error } = await supabase
    .from('sbc_presence')
    .insert({
      member_id: presence.member_id,
      check_in_type: presence.check_in_type,
      latitude: presence.latitude || null,
      longitude: presence.longitude || null,
      is_public: presence.is_public,
      is_active: true,
      check_in_time: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) {
    return { data: null, error: error.message };
  }

  revalidatePath('/');
  revalidatePath('/dashboard');
  revalidatePath('/check-in');
  return { data: (data as PresenceSession) || null, error: null };
}

// Check-out de présence
export async function checkOutMember(presenceId: string): Promise<{ data: PresenceSession | null; error: string | null }> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('sbc_presence')
    .update({
      is_active: false,
      check_out_time: new Date().toISOString(),
    })
    .eq('id', presenceId)
    .select()
    .single();

  if (error) {
    return { data: null, error: error.message };
  }

  revalidatePath('/');
  revalidatePath('/dashboard');
  revalidatePath('/check-in');
  return { data: (data as PresenceSession) || null, error: null };
}

// Récupérer toutes les présences actives publiques (pour la Landing page)
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

// Récupérer la présence active d'un membre spécifique
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
