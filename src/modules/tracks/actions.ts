'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { TrackItem } from '@/types/models';

const DEFAULT_TRACKS: Omit<TrackItem, 'id'>[] = [
  { name: '1/10', is_open: true },
  { name: '1/8', is_open: true },
  { name: 'Rallye Game', is_open: true },
  { name: 'Crawler', is_open: true },
];

/**
 * Récupère l'état de toutes les pistes du club
 */
export async function getTracks(): Promise<{ data: TrackItem[]; error: string | null }> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('tracks')
      .select('*')
      .order('name', { ascending: true });

    if (error) {
      console.warn('Erreur de récupération des pistes Supabase, utilisation du fallback:', error.message);
      return {
        data: [
          { id: '1/10', name: '1/10', is_open: true },
          { id: '1/8', name: '1/8', is_open: true },
          { id: 'Rallye Game', name: 'Rallye Game', is_open: true },
          { id: 'Crawler', name: 'Crawler', is_open: true },
        ],
        error: null,
      };
    }

    if (!data || data.length === 0) {
      // Si la table est encore vide, tenter une insertion automatique ou renvoyer la liste par défaut
      const defaultWithIds: TrackItem[] = [
        { id: 'track-1-10', name: '1/10', is_open: true },
        { id: 'track-1-8', name: '1/8', is_open: true },
        { id: 'track-rallye-game', name: 'Rallye Game', is_open: true },
        { id: 'track-crawler', name: 'Crawler', is_open: true },
      ];
      return { data: defaultWithIds, error: null };
    }

    // Réordonner selon l'ordre officiel : 1/10, 1/8, Rallye Game, Crawler
    const orderMap: Record<string, number> = {
      '1/10': 1,
      '1/8': 2,
      'Rallye Game': 3,
      'Crawler': 4,
    };

    const sortedData = [...data].sort((a, b) => {
      const orderA = orderMap[a.name] ?? 99;
      const orderB = orderMap[b.name] ?? 99;
      return orderA - orderB;
    });

    return { data: sortedData, error: null };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erreur inattendue';
    return { data: [], error: message };
  }
}

/**
 * Met à jour l'état d'ouverture d'une piste (Réservé aux administrateurs)
 */
export async function updateTrackStatus(
  id: string,
  is_open: boolean
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
      .select('role')
      .eq('id', user.id)
      .single();

    if (memberProfile?.role !== 'admin') {
      return { success: false, error: 'Action réservée aux administrateurs.' };
    }

    const now = new Date().toISOString();
    const { data, error } = await supabase
      .from('tracks')
      .update({
        is_open,
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

    return { success: true, error: null, updated: data as TrackItem };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erreur inattendue';
    return { success: false, error: message };
  }
}
