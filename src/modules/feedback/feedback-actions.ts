'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import {
  FeedbackItem,
  FeedbackStatus,
  CreateFeedbackInput,
  FeedbackType,
} from '@/types/feedback.types';
import { isSuperAdmin } from '../admin/permissions';

/**
 * Récupère les idées publiques avec le statut de vote du membre connecté
 */
export async function getPublicIdeas(
  sortBy: 'top' | 'recent' = 'top'
): Promise<{ data: FeedbackItem[]; error: string | null }> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    let query = supabase
      .from('sbc_feedbacks')
      .select(`
        *,
        author:sbc_members!sbc_feedbacks_author_id_fkey(id, first_name, last_name),
        responder:sbc_members!sbc_feedbacks_responded_by_fkey(id, first_name, last_name)
      `)
      .eq('type', 'IDEA');

    if (sortBy === 'top') {
      query = query.order('votes_count', { ascending: false }).order('created_at', { ascending: false });
    } else {
      query = query.order('created_at', { ascending: false });
    }

    const { data, error } = await query;

    if (error) {
      console.warn('Erreur récupération idées:', error.message);
      return { data: [], error: error.message };
    }

    if (!data) {
      return { data: [], error: null };
    }

    let userVotesSet = new Set<string>();
    if (user) {
      const { data: userVotes } = await supabase
        .from('sbc_feedback_votes')
        .select('feedback_id')
        .eq('member_id', user.id);

      if (userVotes) {
        userVotesSet = new Set(userVotes.map((v) => v.feedback_id));
      }
    }

    const formattedData: FeedbackItem[] = data.map((item: any) => ({
      ...item,
      has_voted_by_user: userVotesSet.has(item.id),
      author: Array.isArray(item.author) ? item.author[0] : item.author,
      responder: Array.isArray(item.responder) ? item.responder[0] : item.responder,
    }));

    return { data: formattedData, error: null };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erreur inattendue';
    return { data: [], error: message };
  }
}

/**
 * Récupère les signalements (bugs / incidents) de l'utilisateur connecté
 */
export async function getMyAnomalies(): Promise<{ data: FeedbackItem[]; error: string | null }> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { data: [], error: 'Utilisateur non authentifié' };
    }

    const { data, error } = await supabase
      .from('sbc_feedbacks')
      .select(`
        *,
        responder:sbc_members!sbc_feedbacks_responded_by_fkey(id, first_name, last_name)
      `)
      .eq('author_id', user.id)
      .in('type', ['BUG_APP', 'INCIDENT_TRACK'])
      .order('created_at', { ascending: false });

    if (error) {
      console.warn('Erreur récupération anomalies:', error.message);
      return { data: [], error: error.message };
    }

    const formattedData: FeedbackItem[] = (data || []).map((item: any) => ({
      ...item,
      responder: Array.isArray(item.responder) ? item.responder[0] : item.responder,
    }));

    return { data: formattedData, error: null };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erreur inattendue';
    return { data: [], error: message };
  }
}

/**
 * Enregistre un nouveau feedback (Idée ou Signalement)
 */
export async function submitFeedback(
  input: CreateFeedbackInput
): Promise<{ success: boolean; data?: FeedbackItem; error: string | null }> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: 'Vous devez être connecté pour soumettre un retour.' };
    }

    if (!input.title?.trim() || !input.description?.trim() || !input.category?.trim()) {
      return { success: false, error: 'Veuillez remplir tous les champs obligatoires.' };
    }

    const { data, error } = await supabase
      .from('sbc_feedbacks')
      .insert({
        author_id: user.id,
        type: input.type,
        category: input.category.trim(),
        title: input.title.trim(),
        description: input.description.trim(),
        severity: input.severity || 'LOW',
        status: 'PENDING',
      })
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath('/dashboard');
    revalidatePath('/admin');

    return { success: true, data: data as FeedbackItem, error: null };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erreur inattendue';
    return { success: false, error: message };
  }
}

/**
 * Ajoute ou retire un vote sur une idée
 */
export async function toggleIdeaVote(
  feedbackId: string
): Promise<{ success: boolean; hasVoted?: boolean; newVotesCount?: number; error: string | null }> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: 'Vous devez être connecté pour voter.' };
    }

    // Vérifier si le vote existe déjà
    const { data: existingVote, error: fetchErr } = await supabase
      .from('sbc_feedback_votes')
      .select('id')
      .eq('feedback_id', feedbackId)
      .eq('member_id', user.id)
      .maybeSingle();

    if (fetchErr) {
      return { success: false, error: fetchErr.message };
    }

    let hasVoted = false;

    if (existingVote) {
      // Supprimer le vote existant
      const { error: delErr } = await supabase
        .from('sbc_feedback_votes')
        .delete()
        .eq('id', existingVote.id);

      if (delErr) return { success: false, error: delErr.message };
      hasVoted = false;
    } else {
      // Créer le nouveau vote
      const { error: insErr } = await supabase
        .from('sbc_feedback_votes')
        .insert({
          feedback_id: feedbackId,
          member_id: user.id,
        });

      if (insErr) return { success: false, error: insErr.message };
      hasVoted = true;
    }

    // Récupérer le compteur à jour
    const { data: updatedFeedback } = await supabase
      .from('sbc_feedbacks')
      .select('votes_count')
      .eq('id', feedbackId)
      .single();

    revalidatePath('/dashboard');

    return {
      success: true,
      hasVoted,
      newVotesCount: updatedFeedback?.votes_count ?? 0,
      error: null,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erreur inattendue';
    return { success: false, error: message };
  }
}

/**
 * Récupère l'ensemble des tickets pour l'administration
 */
export async function getAllFeedbacksAdmin(
  filterType?: FeedbackType | 'ALL',
  filterStatus?: FeedbackStatus | 'ALL'
): Promise<{ data: FeedbackItem[]; error: string | null }> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { data: [], error: 'Non authentifié' };
    }

    // Vérifier rôle admin
    const { data: memberProfile } = await supabase
      .from('sbc_members')
      .select('role, email')
      .eq('id', user.id)
      .single();

    const isSuper = isSuperAdmin(memberProfile?.email || user.email);
    const isAdmin = memberProfile?.role === 'admin' || memberProfile?.role === 'referent';

    if (!isSuper && !isAdmin) {
      return { data: [], error: 'Accès administrateur requis.' };
    }

    let query = supabase
      .from('sbc_feedbacks')
      .select(`
        *,
        author:sbc_members!sbc_feedbacks_author_id_fkey(id, first_name, last_name, email),
        responder:sbc_members!sbc_feedbacks_responded_by_fkey(id, first_name, last_name, email)
      `)
      .order('created_at', { ascending: false });

    if (filterType && filterType !== 'ALL') {
      query = query.eq('type', filterType);
    }

    if (filterStatus && filterStatus !== 'ALL') {
      query = query.eq('status', filterStatus);
    }

    const { data, error } = await query;

    if (error) {
      console.warn('Erreur admin feedbacks:', error.message);
      return { data: [], error: error.message };
    }

    const formattedData: FeedbackItem[] = (data || []).map((item: any) => ({
      ...item,
      author: Array.isArray(item.author) ? item.author[0] : item.author,
      responder: Array.isArray(item.responder) ? item.responder[0] : item.responder,
    }));

    return { data: formattedData, error: null };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erreur inattendue';
    return { data: [], error: message };
  }
}

/**
 * Met à jour le statut et la réponse officielle du comité
 */
export async function updateFeedbackAdminStatus(
  feedbackId: string,
  status: FeedbackStatus,
  adminResponse?: string | null
): Promise<{ success: boolean; error: string | null }> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: 'Non authentifié' };
    }

    // Vérifier rôle admin
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

    const now = new Date().toISOString();

    const { error } = await supabase
      .from('sbc_feedbacks')
      .update({
        status,
        admin_response: adminResponse !== undefined ? adminResponse : null,
        responded_by: user.id,
        responded_at: now,
        updated_at: now,
      })
      .eq('id', feedbackId);

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath('/dashboard');
    revalidatePath('/admin');

    return { success: true, error: null };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erreur inattendue';
    return { success: false, error: message };
  }
}
