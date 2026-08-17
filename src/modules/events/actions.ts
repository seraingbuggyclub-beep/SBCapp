'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export interface RaceCategoryItem {
  name: string;
  fee: number;
  type?: string;
}

export interface MealOptionItem {
  name: string;
  price: number;
  desc?: string;
}

export type EventType = 'sbc_race' | 'belgian_championship' | 'holiday' | 'club_meeting';

export interface EventFormData {
  title: string;
  description?: string;
  event_date: string;
  start_time?: string;
  end_time?: string;
  category?: string;
  location?: string;
  registration_fee?: number;
  status: 'open' | 'closed' | 'draft';
  event_type: EventType;
  has_registration: boolean;
  external_link?: string;
  categories: RaceCategoryItem[];
  meal_options: MealOptionItem[];
  max_participants?: number;
}

// 1. Récupérer tous les événements ouverts (public / membres)
export async function getActiveEvents() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('sbc_events')
    .select('*')
    .in('status', ['open'])
    .order('event_date', { ascending: true });

  if (error) {
    // Si la colonne status n'existe pas encore sur une ancienne version du schéma, fallback sur SELECT all
    const fallback = await supabase
      .from('sbc_events')
      .select('*')
      .order('event_date', { ascending: true });
    
    return { data: fallback.data || [], error: fallback.error?.message || null };
  }
  return { data: data || [], error: null };
}

// 2. Récupérer tous les événements (Backoffice Admin) avec compteur d'inscriptions
export async function getAllEventsAdmin() {
  const supabase = await createClient();
  const { data: events, error } = await supabase
    .from('sbc_events')
    .select(`
      *,
      sbc_event_registrations (
        id
      )
    `)
    .order('event_date', { ascending: true });

  if (error) {
    return { data: [], error: error.message };
  }

  const formatted = (events || []).map((ev: any) => ({
    ...ev,
    registrations_count: ev.sbc_event_registrations?.length || 0,
  }));

  return { data: formatted, error: null };
}

// 3. Créer un nouvel événement (Admin)
export async function createEventAdmin(formData: EventFormData) {
  const supabase = await createClient();

  const payload: any = {
    title: formData.title,
    description: formData.description || null,
    event_date: formData.event_date,
    start_time: formData.start_time || '09:00:00',
    end_time: formData.end_time || '18:00:00',
    category: formData.category || 'Compétition',
    location: formData.location || 'Seraing Buggy Track, Belgium',
    registration_fee: formData.registration_fee || 0,
    status: formData.status || 'open',
    event_type: formData.event_type || 'sbc_race',
    has_registration: formData.has_registration ?? true,
    external_link: formData.external_link || null,
    categories: formData.categories || [],
    meal_options: formData.meal_options || [],
    max_participants: formData.max_participants || null,
  };

  const { data, error } = await supabase
    .from('sbc_events')
    .insert(payload)
    .select()
    .single();

  if (error) {
    return { data: null, error: error.message };
  }

  revalidatePath('/events');
  revalidatePath('/admin/events');
  revalidatePath('/admin');
  return { data, error: null };
}

// 4. Mettre à jour un événement existant (Admin)
export async function updateEventAdmin(eventId: string, formData: Partial<EventFormData>) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('sbc_events')
    .update(formData as any)
    .eq('id', eventId)
    .select()
    .single();

  if (error) {
    return { data: null, error: error.message };
  }

  revalidatePath('/events');
  revalidatePath('/admin/events');
  revalidatePath('/admin');
  return { data, error: null };
}

// 5. Supprimer un événement (Admin)
export async function deleteEventAdmin(eventId: string) {
  const supabase = await createClient();

  const { error } = await supabase
    .from('sbc_events')
    .delete()
    .eq('id', eventId);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath('/events');
  revalidatePath('/admin/events');
  revalidatePath('/admin');
  return { success: true, error: null };
}

export interface SelectedCategoryItem {
  name: string;
  fee: number;
  type?: string;
}

export interface SelectedMealItem {
  name: string;
  quantity: number;
  unit_price: number;
}

// 6. Inscrire un pilote à un événement (avec support des catégories multiples et repas)
export async function registerForEvent(registration: {
  event_id: string;
  member_id: string;
  selected_categories: SelectedCategoryItem[];
  selected_meals: SelectedMealItem[];
  transponder_id: string;
  total_paid: number;
  race_category?: string;
}) {
  const supabase = await createClient();

  const activeCategories = registration.selected_categories || [];
  const raceCategoryText = registration.race_category || activeCategories.map((c) => c.name).join(', ');

  const activeMeals = (registration.selected_meals || []).filter((m) => m.quantity > 0);
  const food_options_text = activeMeals.map((m) => `${m.name} x${m.quantity}`);

  let { data, error } = await supabase
    .from('sbc_event_registrations')
    .insert({
      event_id: registration.event_id,
      member_id: registration.member_id,
      race_category: raceCategoryText,
      food_options: food_options_text,
      selected_meals: activeMeals as any,
      selected_categories: activeCategories as any,
      transponder_id: registration.transponder_id || null,
      total_paid: registration.total_paid,
    })
    .select()
    .single();

  // Fallback si la colonne selected_categories ou selected_meals n'existe pas encore
  if (error && (error.message.includes('selected_categories') || error.message.includes('selected_meals'))) {
    const fallback = await supabase
      .from('sbc_event_registrations')
      .insert({
        event_id: registration.event_id,
        member_id: registration.member_id,
        race_category: raceCategoryText,
        food_options: food_options_text,
        transponder_id: registration.transponder_id || null,
        total_paid: registration.total_paid,
      })
      .select()
      .single();
    data = fallback.data;
    error = fallback.error;
  }

  if (error) {
    return { data: null, error: error.message };
  }

  revalidatePath('/dashboard');
  revalidatePath('/events');
  revalidatePath('/admin/events');
  return { data, error: null };
}

// 7. Mettre à jour une inscription existante (avec règle de sécurité < 48h)
export async function updateEventRegistration(registrationId: string, payload: {
  selected_categories: SelectedCategoryItem[];
  selected_meals: SelectedMealItem[];
  transponder_id: string;
  total_paid: number;
  race_category?: string;
}) {
  const supabase = await createClient();

  // 1. Vérifier l'authentification du pilote
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { data: null, error: 'Vous devez être connecté pour modifier votre inscription.' };
  }

  // 2. Récupérer l'inscription existante et la date de l'événement associé
  const { data: existingReg, error: fetchError } = await supabase
    .from('sbc_event_registrations')
    .select(`
      id,
      event_id,
      member_id,
      sbc_events (
        id,
        event_date,
        start_time
      )
    `)
    .eq('id', registrationId)
    .maybeSingle();

  if (fetchError || !existingReg) {
    return { data: null, error: 'Inscription introuvable.' };
  }

  // 3. Vérification de la règle des 48h
  const eventInfo: any = existingReg.sbc_events;
  if (eventInfo?.event_date) {
    const eventDateStr = eventInfo.event_date;
    const startTimeStr = eventInfo.start_time || '09:00:00';
    const eventDateTime = new Date(`${eventDateStr}T${startTimeStr}`);
    
    // Calcul de la différence en heures
    const now = new Date();
    const diffMs = eventDateTime.getTime() - now.getTime();
    const diffHours = diffMs / (1000 * 60 * 60);

    if (diffHours < 48) {
      return {
        data: null,
        error: 'Les modifications sont verrouillées à moins de 48h du départ. Veuillez contacter la direction de course.',
      };
    }
  }

  // 4. Mise à jour de l'inscription
  const activeCategories = payload.selected_categories || [];
  const raceCategoryText = payload.race_category || activeCategories.map((c) => c.name).join(', ');

  const activeMeals = (payload.selected_meals || []).filter((m) => m.quantity > 0);
  const food_options_text = activeMeals.map((m) => `${m.name} x${m.quantity}`);

  let { data, error } = await supabase
    .from('sbc_event_registrations')
    .update({
      race_category: raceCategoryText,
      food_options: food_options_text,
      selected_meals: activeMeals as any,
      selected_categories: activeCategories as any,
      transponder_id: payload.transponder_id || null,
      total_paid: payload.total_paid,
    })
    .eq('id', registrationId)
    .eq('member_id', user.id)
    .select()
    .maybeSingle();

  if (error && (error.message.includes('selected_categories') || error.message.includes('selected_meals'))) {
    const fallback = await supabase
      .from('sbc_event_registrations')
      .update({
        race_category: raceCategoryText,
        food_options: food_options_text,
        transponder_id: payload.transponder_id || null,
        total_paid: payload.total_paid,
      })
      .eq('id', registrationId)
      .eq('member_id', user.id)
      .select()
      .maybeSingle();
    data = fallback.data;
    error = fallback.error;
  }

  if (error) {
    return { data: null, error: error.message };
  }

  revalidatePath('/dashboard');
  revalidatePath('/events');
  revalidatePath('/admin/events');
  return { data: data || { id: registrationId }, error: null };
}

// 8. Récupérer toutes les inscriptions d'un membre avec les détails des événements
export async function getMemberRegistrations(memberId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('sbc_event_registrations')
    .select(`
      id,
      event_id,
      race_category,
      food_options,
      selected_meals,
      selected_categories,
      transponder_id,
      total_paid,
      created_at,
      sbc_events (
        id,
        title,
        description,
        event_date,
        start_time,
        location
      )
    `)
    .eq('member_id', memberId)
    .order('created_at', { ascending: false });

  if (error) {
    return { data: [], error: error.message };
  }
  return { data: data || [], error: null };
}

// 8. Récupérer la liste des inscrits pour un événement donné (Admin)
export async function getEventRegistrationsAdmin(eventId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('sbc_event_registrations')
    .select(`
      id,
      race_category,
      food_options,
      selected_meals,
      selected_categories,
      transponder_id,
      total_paid,
      created_at,
      sbc_members (
        id,
        first_name,
        last_name,
        email,
        phone,
        license_number
      )
    `)
    .eq('event_id', eventId)
    .order('created_at', { ascending: false });

  if (error) {
    return { data: [], error: error.message };
  }
  return { data: data || [], error: null };
}
