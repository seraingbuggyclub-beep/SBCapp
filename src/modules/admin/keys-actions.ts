'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import {
  MemberAssignedKey,
  AssignKeyInput,
  getErrorMessage,
} from '@/types/models';
import { isSuperAdmin } from './permissions';

/**
 * 1. Récupère les clés et matériels attribués à un membre (Vue Admin)
 */
export async function getMemberAssignedKeys(
  memberId: string
): Promise<{ data: MemberAssignedKey[]; error: string | null }> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { data: [], error: 'Non authentifié.' };
    }

    const { data, error } = await supabase
      .from('member_assigned_keys')
      .select(`
        id,
        member_id,
        item_name,
        item_code,
        given_at,
        returned_at,
        given_by,
        notes,
        created_at,
        given_by_member:sbc_members!member_assigned_keys_given_by_fkey (
          first_name,
          last_name
        )
      `)
      .eq('member_id', memberId)
      .order('given_at', { ascending: false });

    if (error) {
      // Fallback sans join si la foreign key relationship n'est pas encore rechargée par postgrest
      const { data: rawData, error: rawErr } = await supabase
        .from('member_assigned_keys')
        .select('*')
        .eq('member_id', memberId)
        .order('given_at', { ascending: false });

      if (rawErr) throw rawErr;
      return { data: (rawData || []) as unknown as MemberAssignedKey[], error: null };
    }

    return { data: (data || []) as unknown as MemberAssignedKey[], error: null };
  } catch (err: unknown) {
    return { data: [], error: getErrorMessage(err) };
  }
}

/**
 * 2. Récupère les clés et matériels confiés à l'utilisateur connecté (Vue Pilote / Référent)
 */
export async function getMyAssignedKeys(): Promise<{ data: MemberAssignedKey[]; error: string | null }> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { data: [], error: 'Non authentifié.' };
    }

    const { data, error } = await supabase
      .from('member_assigned_keys')
      .select(`
        id,
        member_id,
        item_name,
        item_code,
        given_at,
        returned_at,
        given_by,
        notes,
        created_at,
        given_by_member:sbc_members!member_assigned_keys_given_by_fkey (
          first_name,
          last_name
        )
      `)
      .eq('member_id', user.id)
      .order('given_at', { ascending: false });

    if (error) {
      const { data: rawData, error: rawErr } = await supabase
        .from('member_assigned_keys')
        .select('*')
        .eq('member_id', user.id)
        .order('given_at', { ascending: false });

      if (rawErr) throw rawErr;
      return { data: (rawData || []) as unknown as MemberAssignedKey[], error: null };
    }

    return { data: (data || []) as unknown as MemberAssignedKey[], error: null };
  } catch (err: unknown) {
    return { data: [], error: getErrorMessage(err) };
  }
}

/**
 * 3. Assigne un matériel ou une clé à un membre (Action Admin)
 */
export async function assignKeyToMember(
  input: AssignKeyInput
): Promise<{ success: boolean; data?: MemberAssignedKey; error: string | null }> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: 'Non authentifié.' };
    }

    // Vérifier les droits admin
    const { data: caller } = await supabase
      .from('sbc_members')
      .select('role, email')
      .eq('id', user.id)
      .single();

    const isSuper = isSuperAdmin(caller?.email || user.email);
    if (!isSuper && caller?.role !== 'admin') {
      return { success: false, error: 'Action réservée aux administrateurs.' };
    }

    if (!input.member_id || !input.item_name?.trim()) {
      return { success: false, error: 'Le membre et la désignation du matériel sont obligatoires.' };
    }

    const { data, error } = await supabase
      .from('member_assigned_keys')
      .insert({
        member_id: input.member_id,
        item_name: input.item_name.trim(),
        item_code: input.item_code?.trim() || null,
        given_at: input.given_at || new Date().toISOString().split('T')[0],
        given_by: user.id,
        notes: input.notes?.trim() || null,
      })
      .select()
      .single();

    if (error) throw error;

    revalidatePath('/admin');
    revalidatePath('/dashboard');
    return { success: true, data: data as unknown as MemberAssignedKey, error: null };
  } catch (err: unknown) {
    return { success: false, error: getErrorMessage(err) };
  }
}

/**
 * 4. Marque un matériel/clé comme restitué (Action Admin)
 */
export async function markKeyAsReturned(
  keyId: string,
  returnedAt?: string
): Promise<{ success: boolean; error: string | null }> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: 'Non authentifié.' };
    }

    // Vérifier les droits admin
    const { data: caller } = await supabase
      .from('sbc_members')
      .select('role, email')
      .eq('id', user.id)
      .single();

    const isSuper = isSuperAdmin(caller?.email || user.email);
    if (!isSuper && caller?.role !== 'admin') {
      return { success: false, error: 'Action réservée aux administrateurs.' };
    }

    const dateToSet = returnedAt || new Date().toISOString().split('T')[0];

    const { error } = await supabase
      .from('member_assigned_keys')
      .update({ returned_at: dateToSet })
      .eq('id', keyId);

    if (error) throw error;

    revalidatePath('/admin');
    revalidatePath('/dashboard');
    return { success: true, error: null };
  } catch (err: unknown) {
    return { success: false, error: getErrorMessage(err) };
  }
}

/**
 * 5. Supprime définitivement une assignation de clé (Action Admin)
 */
export async function deleteKeyAssignment(
  keyId: string
): Promise<{ success: boolean; error: string | null }> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: 'Non authentifié.' };
    }

    // Vérifier les droits admin
    const { data: caller } = await supabase
      .from('sbc_members')
      .select('role, email')
      .eq('id', user.id)
      .single();

    const isSuper = isSuperAdmin(caller?.email || user.email);
    if (!isSuper && caller?.role !== 'admin') {
      return { success: false, error: 'Action réservée aux administrateurs.' };
    }

    const { error } = await supabase
      .from('member_assigned_keys')
      .delete()
      .eq('id', keyId);

    if (error) throw error;

    revalidatePath('/admin');
    revalidatePath('/dashboard');
    return { success: true, error: null };
  } catch (err: unknown) {
    return { success: false, error: getErrorMessage(err) };
  }
}
