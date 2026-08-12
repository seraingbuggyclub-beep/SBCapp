'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

// Récupérer tous les événements à venir
export async function getActiveEvents() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('sbc_events')
    .select('*')
    .order('event_date', { ascending: true });

  if (error) {
    return { data: [], error: error.message };
  }
  return { data, error: null };
}

// Inscrire un pilote à un événement (avec choix de catégorie, options repas et transpondeur)
export async function registerForEvent(registration: {
  event_id: string;
  member_id: string;
  race_category: string;
  food_options: string[];
  transponder_id: string;
  total_paid: number;
}) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('sbc_event_registrations')
    .insert({
      event_id: registration.event_id,
      member_id: registration.member_id,
      race_category: registration.race_category,
      food_options: registration.food_options,
      transponder_id: registration.transponder_id || null,
      total_paid: registration.total_paid,
    })
    .select()
    .single();

  if (error) {
    return { data: null, error: error.message };
  }

  revalidatePath('/dashboard');
  revalidatePath('/events');
  return { data, error: null };
}

// Récupérer toutes les inscriptions d'un membre avec les détails des événements
export async function getMemberRegistrations(memberId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('sbc_event_registrations')
    .select(`
      id,
      race_category,
      food_options,
      transponder_id,
      total_paid,
      created_at,
      sbc_events (
        title,
        description,
        event_date,
        location
      )
    `)
    .eq('member_id', memberId)
    .order('created_at', { ascending: false });

  if (error) {
    return { data: [], error: error.message };
  }
  return { data, error: null };
}
