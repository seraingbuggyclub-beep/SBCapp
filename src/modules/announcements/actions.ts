'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { ClubAnnouncement, AnnouncementFormData, getErrorMessage } from '@/types/models';
import { isSuperAdmin, hasPermission } from '@/modules/admin/permissions';

// Annonces initiales de secours (fallback si la table n'a pas encore été migrée dans Supabase)
const FALLBACK_ANNOUNCEMENTS: ClubAnnouncement[] = [
  {
    id: 'ann-1',
    title: 'Ouverture officielle de la saison & État de la piste',
    content: 'La piste tout-terrain est entièrement opérationnelle pour les entraînements libres. Le système de chronométrage MyLaps est sous tension lors des sessions de présence. Merci de respecter les zones de stands et le sens de circulation.',
    category: 'info_piste',
    is_pinned: true,
    author_name: 'Comité de Direction SBC',
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2).toISOString(),
  },
  {
    id: 'ann-2',
    title: 'Travaux de surfaçage & Nouveau virage relevé',
    content: 'Une session bénévole de compactage et d\'amélioration du drainage aura lieu ce samedi matin à 09h00. Les pilotes souhaitant donner un coup de main sont les bienvenus (café et croissants offerts par le club !).',
    category: 'travaux',
    is_pinned: false,
    author_name: 'Commission Piste',
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5).toISOString(),
  },
  {
    id: 'ann-3',
    title: 'Briefing Pilotes : Règlement FBA & Sécurité Cadenas',
    content: 'Rappel à tous les membres : n\'oubliez pas d\'effectuer votre check-in sur l\'application dès votre arrivée pour activer votre couverture d\'assurance FBA. Pensez également à toujours reverrouiller le cadenas à combinaison en quittant le terrain.',
    category: 'vie_du_club',
    is_pinned: false,
    author_name: 'Secrétariat ASBL',
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 8).toISOString(),
  },
];

// Récupérer toutes les annonces publiques (Brief Pit-Lane)
export async function getAnnouncements(): Promise<{ data: ClubAnnouncement[]; error: string | null }> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('sbc_announcements')
      .select('*')
      .order('is_pinned', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) {
      console.warn("Table sbc_announcements non trouvée ou erreur, utilisation du fallback:", error.message);
      return { data: FALLBACK_ANNOUNCEMENTS, error: null };
    }

    if (!data || data.length === 0) {
      return { data: FALLBACK_ANNOUNCEMENTS, error: null };
    }

    return { data: data as ClubAnnouncement[], error: null };
  } catch (err) {
    console.warn("Exception getAnnouncements, fallback:", err);
    return { data: FALLBACK_ANNOUNCEMENTS, error: null };
  }
}

// Récupérer l'annonce épinglée la plus récente pour la landing page
export async function getPinnedAnnouncement(): Promise<{ data: ClubAnnouncement | null; error: string | null }> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('sbc_announcements')
      .select('*')
      .eq('is_pinned', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      // Si la table n'existe pas encore ou erreur, chercher dans les fallbacks
      const fallbackPinned = FALLBACK_ANNOUNCEMENTS.find((a) => a.is_pinned) || null;
      return { data: fallbackPinned, error: null };
    }

    if (!data) {
      const fallbackPinned = FALLBACK_ANNOUNCEMENTS.find((a) => a.is_pinned) || null;
      return { data: fallbackPinned, error: null };
    }

    return { data: data as ClubAnnouncement, error: null };
  } catch (err) {
    const fallbackPinned = FALLBACK_ANNOUNCEMENTS.find((a) => a.is_pinned) || null;
    return { data: fallbackPinned, error: null };
  }
}

// Récupérer la date de la toute dernière annonce pour la notification Pit-Lane
export async function getLatestAnnouncementDate(): Promise<string | null> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('sbc_announcements')
      .select('created_at')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error || !data) {
      return FALLBACK_ANNOUNCEMENTS[0]?.created_at || null;
    }

    return data.created_at;
  } catch {
    return FALLBACK_ANNOUNCEMENTS[0]?.created_at || null;
  }
}

// Vérifier les droits d'administration pour la gestion des annonces
async function verifyAdminCaller() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { isAuthorized: false, error: 'Non authentifié.' };
  }

  const { data: callerProfile, error: callerError } = await supabase
    .from('sbc_members')
    .select('role, permissions, email')
    .eq('id', user.id)
    .single();

  if (callerError || !callerProfile) {
    return { isAuthorized: false, error: 'Impossible de vérifier vos droits.' };
  }

  const isSuper = isSuperAdmin(callerProfile.email);
  const isAdmin = callerProfile.role === 'admin';
  const hasNewsAccess = hasPermission(
    callerProfile.role,
    callerProfile.permissions as Record<string, string[]>,
    'news',
    'edit',
    callerProfile.email
  );

  if (!isSuper && !isAdmin && !hasNewsAccess) {
    return { isAuthorized: false, error: 'Accès refusé. Droits administrateur requis.' };
  }

  return { isAuthorized: true, error: null, user, callerProfile };
}

// Créer une nouvelle annonce (Admin)
export async function createAnnouncement(formData: AnnouncementFormData): Promise<{ data: ClubAnnouncement | null; error: string | null }> {
  const authCheck = await verifyAdminCaller();
  if (!authCheck.isAuthorized) {
    return { data: null, error: authCheck.error };
  }

  const supabase = await createClient();
  const payload = {
    title: formData.title.trim(),
    content: formData.content.trim(),
    category: formData.category,
    is_pinned: formData.is_pinned ?? false,
    author_name: formData.author_name?.trim() || 'Comité SBC',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from('sbc_announcements')
    .insert(payload)
    .select()
    .single();

  if (error) {
    return { data: null, error: error.message };
  }

  revalidatePath('/pit-lane');
  revalidatePath('/admin');
  revalidatePath('/');
  return { data: data as ClubAnnouncement, error: null };
}

// Mettre à jour une annonce existante (Admin)
export async function updateAnnouncement(id: string, formData: Partial<AnnouncementFormData>): Promise<{ data: ClubAnnouncement | null; error: string | null }> {
  const authCheck = await verifyAdminCaller();
  if (!authCheck.isAuthorized) {
    return { data: null, error: authCheck.error };
  }

  const supabase = await createClient();
  const updatePayload: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (formData.title !== undefined) updatePayload.title = formData.title.trim();
  if (formData.content !== undefined) updatePayload.content = formData.content.trim();
  if (formData.category !== undefined) updatePayload.category = formData.category;
  if (formData.is_pinned !== undefined) updatePayload.is_pinned = formData.is_pinned;
  if (formData.author_name !== undefined) updatePayload.author_name = formData.author_name.trim();

  const { data, error } = await supabase
    .from('sbc_announcements')
    .update(updatePayload)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    return { data: null, error: error.message };
  }

  revalidatePath('/pit-lane');
  revalidatePath('/admin');
  revalidatePath('/');
  return { data: data as ClubAnnouncement, error: null };
}

// Supprimer une annonce (Admin)
export async function deleteAnnouncement(id: string): Promise<{ success: boolean; error: string | null }> {
  const authCheck = await verifyAdminCaller();
  if (!authCheck.isAuthorized) {
    return { success: false, error: authCheck.error };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from('sbc_announcements')
    .delete()
    .eq('id', id);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath('/pit-lane');
  revalidatePath('/admin');
  revalidatePath('/');
  return { success: true, error: null };
}

// Épingler / Désépingler une annonce
export async function togglePinAnnouncement(id: string, isPinned: boolean): Promise<{ success: boolean; error: string | null }> {
  return updateAnnouncement(id, { is_pinned: isPinned }).then((res) => ({
    success: Boolean(res.data),
    error: res.error,
  }));
}
