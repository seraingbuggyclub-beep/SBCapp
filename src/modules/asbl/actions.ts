'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import {
  GeneralAssemblyItem,
  AgResolutionItem,
  AgSignatureItem,
  SaveGeneralAssemblyInput,
  GeneralAssemblyStatus,
  getErrorMessage,
} from '@/types/models';
import { assertAdmin } from '@/lib/auth/assert-role';

/**
 * 1. Récupère la liste des Assemblées Générales avec filtres optionnels
 */
export async function getGeneralAssemblies(
  year?: number,
  typeFilter?: string,
  statusFilter?: string
): Promise<{ data: GeneralAssemblyItem[]; error: string | null }> {
  try {
    const supabase = await createClient();
    const auth = await assertAdmin(supabase);
    if (!auth.authorized) {
      return { data: [], error: auth.error || 'Accès non autorisé.' };
    }

    let query = supabase
      .from('sbc_asbl_general_assemblies')
      .select(`
        *,
        resolutions:sbc_asbl_ag_resolutions(*),
        signatures:sbc_asbl_ag_signatures(*)
      `)
      .order('date', { ascending: false });

    if (year) {
      const startOfYear = `${year}-01-01T00:00:00.000Z`;
      const endOfYear = `${year}-12-31T23:59:59.999Z`;
      query = query.gte('date', startOfYear).lte('date', endOfYear);
    }

    if (typeFilter && typeFilter !== 'ALL') {
      query = query.eq('type', typeFilter);
    }

    if (statusFilter && statusFilter !== 'ALL') {
      query = query.eq('status', statusFilter);
    }

    const { data, error } = await query;
    if (error) throw error;

    return { data: (data as GeneralAssemblyItem[]) || [], error: null };
  } catch (err: unknown) {
    return { data: [], error: getErrorMessage(err) };
  }
}

/**
 * 2. Récupère une Assemblée Générale spécifique avec ses résolutions et signatures
 */
export async function getGeneralAssemblyById(
  agId: string
): Promise<{ data: GeneralAssemblyItem | null; error: string | null }> {
  try {
    const supabase = await createClient();
    const auth = await assertAdmin(supabase);
    if (!auth.authorized) {
      return { data: null, error: auth.error || 'Accès non autorisé.' };
    }

    const { data, error } = await supabase
      .from('sbc_asbl_general_assemblies')
      .select(`
        *,
        resolutions:sbc_asbl_ag_resolutions(*),
        signatures:sbc_asbl_ag_signatures(*)
      `)
      .eq('id', agId)
      .single();

    if (error) throw error;

    return { data: data as GeneralAssemblyItem, error: null };
  } catch (err: unknown) {
    return { data: null, error: getErrorMessage(err) };
  }
}

/**
 * 3. Crée ou met à jour une Assemblée Générale et ses résolutions
 */
export async function saveGeneralAssembly(
  input: SaveGeneralAssemblyInput
): Promise<{ success: boolean; data: GeneralAssemblyItem | null; error: string | null }> {
  try {
    const supabase = await createClient();
    const auth = await assertAdmin(supabase);
    if (!auth.authorized) {
      return { success: false, data: null, error: auth.error || 'Action réservée aux administrateurs.' };
    }

    const agPayload = {
      type: input.type,
      title: input.title,
      date: input.date,
      location: input.location,
      status: input.status,
      agenda: input.agenda || [],
      content_notes: input.content_notes || '',
      updated_at: new Date().toISOString(),
    };

    let agId = input.id;

    if (agId) {
      // Mise à jour de l'AG existante
      const { error: updateErr } = await supabase
        .from('sbc_asbl_general_assemblies')
        .update(agPayload)
        .eq('id', agId);

      if (updateErr) throw updateErr;
    } else {
      // Création d'une nouvelle AG
      const { data: newAg, error: insertErr } = await supabase
        .from('sbc_asbl_general_assemblies')
        .insert({
          ...agPayload,
          created_at: new Date().toISOString(),
        })
        .select('id')
        .single();

      if (insertErr || !newAg) throw insertErr || new Error('Erreur lors de la création de l’AG.');
      agId = newAg.id;
    }

    // Gestion des résolutions
    if (input.resolutions && agId) {
      // Récupérer les résolutions existantes pour supprimer celles qui ne sont plus dans la liste
      const { data: existingResolutions } = await supabase
        .from('sbc_asbl_ag_resolutions')
        .select('id')
        .eq('ag_id', agId);

      const existingIds = (existingResolutions || []).map((r) => r.id);
      const incomingIds = input.resolutions.filter((r) => r.id).map((r) => r.id as string);
      const idsToDelete = existingIds.filter((id) => !incomingIds.includes(id));

      if (idsToDelete.length > 0) {
        await supabase
          .from('sbc_asbl_ag_resolutions')
          .delete()
          .in('id', idsToDelete);
      }

      for (const res of input.resolutions) {
        const resPayload = {
          ag_id: agId,
          title: res.title,
          description: res.description || null,
          votes_for: Number(res.votes_for) || 0,
          votes_against: Number(res.votes_against) || 0,
          votes_abstain: Number(res.votes_abstain) || 0,
          is_adopted: Boolean(res.is_adopted),
        };

        if (res.id && existingIds.includes(res.id)) {
          await supabase
            .from('sbc_asbl_ag_resolutions')
            .update(resPayload)
            .eq('id', res.id);
        } else {
          await supabase
            .from('sbc_asbl_ag_resolutions')
            .insert(resPayload);
        }
      }
    }

    revalidatePath('/admin/asbl');

    const result = await getGeneralAssemblyById(agId!);
    return { success: true, data: result.data, error: null };
  } catch (err: unknown) {
    return { success: false, data: null, error: getErrorMessage(err) };
  }
}

/**
 * 4. Supprime une Assemblée Générale (cascade sur résolutions & signatures)
 */
export async function deleteGeneralAssembly(
  agId: string
): Promise<{ success: boolean; error: string | null }> {
  try {
    const supabase = await createClient();
    const auth = await assertAdmin(supabase);
    if (!auth.authorized) {
      return { success: false, error: auth.error || 'Action réservée aux administrateurs.' };
    }

    const { error } = await supabase
      .from('sbc_asbl_general_assemblies')
      .delete()
      .eq('id', agId);

    if (error) throw error;

    revalidatePath('/admin/asbl');
    return { success: true, error: null };
  } catch (err: unknown) {
    return { success: false, error: getErrorMessage(err) };
  }
}

/**
 * 5. Ajoute une signature numérique à une Assemblée Générale
 */
export async function addAgSignature(
  agId: string,
  payload: {
    signer_name: string;
    signer_role: string;
    signature_data: string;
  }
): Promise<{ success: boolean; data: AgSignatureItem | null; error: string | null }> {
  try {
    const supabase = await createClient();
    const auth = await assertAdmin(supabase);
    if (!auth.authorized) {
      return { success: false, data: null, error: auth.error || 'Action réservée aux administrateurs.' };
    }

    const { data: newSig, error } = await supabase
      .from('sbc_asbl_ag_signatures')
      .insert({
        ag_id: agId,
        member_id: auth.user?.id || null,
        signer_name: payload.signer_name.trim(),
        signer_role: payload.signer_role.trim(),
        signature_data: payload.signature_data,
        signed_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error || !newSig) throw error || new Error('Erreur lors de l’enregistrement de la signature.');

    // Si l'AG était en statut DRAFT ou VOTING, la faire passer en SIGNING si ce n'est pas déjà le cas
    await supabase
      .from('sbc_asbl_general_assemblies')
      .update({ status: 'SIGNING', updated_at: new Date().toISOString() })
      .eq('id', agId)
      .in('status', ['DRAFT', 'VOTING']);

    revalidatePath('/admin/asbl');
    return { success: true, data: newSig as AgSignatureItem, error: null };
  } catch (err: unknown) {
    return { success: false, data: null, error: getErrorMessage(err) };
  }
}

/**
 * 6. Supprime une signature spécifique
 */
export async function deleteAgSignature(
  signatureId: string,
  agId: string
): Promise<{ success: boolean; error: string | null }> {
  try {
    const supabase = await createClient();
    const auth = await assertAdmin(supabase);
    if (!auth.authorized) {
      return { success: false, error: auth.error || 'Action réservée aux administrateurs.' };
    }

    const { error } = await supabase
      .from('sbc_asbl_ag_signatures')
      .delete()
      .eq('id', signatureId)
      .eq('ag_id', agId);

    if (error) throw error;

    revalidatePath('/admin/asbl');
    return { success: true, error: null };
  } catch (err: unknown) {
    return { success: false, error: getErrorMessage(err) };
  }
}

/**
 * 7. Change directement le statut d'une AG (ex: ARCHIVED / SIGNING)
 */
export async function updateAgStatus(
  agId: string,
  status: GeneralAssemblyStatus
): Promise<{ success: boolean; error: string | null }> {
  try {
    const supabase = await createClient();
    const auth = await assertAdmin(supabase);
    if (!auth.authorized) {
      return { success: false, error: auth.error || 'Action réservée aux administrateurs.' };
    }

    const { error } = await supabase
      .from('sbc_asbl_general_assemblies')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', agId);

    if (error) throw error;

    revalidatePath('/admin/asbl');
    return { success: true, error: null };
  } catch (err: unknown) {
    return { success: false, error: getErrorMessage(err) };
  }
}
