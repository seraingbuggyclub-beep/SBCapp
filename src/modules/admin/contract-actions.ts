'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { CURRENT_REFERENT_CONTRACT_VERSION, getErrorMessage } from '@/types/models';
import { isSuperAdmin } from './permissions';

/**
 * 1. Signature numérique de la convention référent par le membre concerné
 */
export async function signReferentContract(
  memberId: string,
  clientIp?: string
): Promise<{ success: boolean; signedAt?: string; error: string | null }> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: 'Non authentifié.' };
    }

    // Le membre peut signer sa propre convention, ou un admin peut valider
    if (user.id !== memberId) {
      const { data: caller } = await supabase
        .from('sbc_members')
        .select('role, email')
        .eq('id', user.id)
        .single();

      const isSuper = isSuperAdmin(caller?.email || user.email);
      if (!isSuper && caller?.role !== 'admin') {
        return { success: false, error: 'Vous ne pouvez signer la convention que pour votre propre compte.' };
      }
    }

    const nowIso = new Date().toISOString();

    const { error } = await supabase
      .from('sbc_members')
      .update({
        referent_contract_signed_at: nowIso,
        referent_contract_ip: clientIp || 'App-Session-Cert',
        referent_contract_version: CURRENT_REFERENT_CONTRACT_VERSION,
        updated_at: nowIso,
      })
      .eq('id', memberId);

    if (error) throw error;

    revalidatePath('/dashboard');
    revalidatePath('/admin');
    return { success: true, signedAt: nowIso, error: null };
  } catch (err: unknown) {
    return { success: false, error: getErrorMessage(err) };
  }
}

/**
 * 2. Récupère le statut de signature de la convention référent d'un membre
 */
export async function getReferentContractStatus(
  memberId: string
): Promise<{
  isSigned: boolean;
  signedAt: string | null;
  ip: string | null;
  version: string | null;
  error: string | null;
}> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('sbc_members')
      .select('referent_contract_signed_at, referent_contract_ip, referent_contract_version')
      .eq('id', memberId)
      .single();

    if (error) throw error;

    return {
      isSigned: Boolean(data?.referent_contract_signed_at),
      signedAt: data?.referent_contract_signed_at || null,
      ip: data?.referent_contract_ip || null,
      version: data?.referent_contract_version || null,
      error: null,
    };
  } catch (err: unknown) {
    return {
      isSigned: false,
      signedAt: null,
      ip: null,
      version: null,
      error: getErrorMessage(err),
    };
  }
}

/**
 * 3. Réinitialisation de la convention référent (Action Admin)
 */
export async function resetReferentContract(
  memberId: string
): Promise<{ success: boolean; error: string | null }> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: 'Non authentifié.' };
    }

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
      .from('sbc_members')
      .update({
        referent_contract_signed_at: null,
        referent_contract_ip: null,
        referent_contract_version: CURRENT_REFERENT_CONTRACT_VERSION,
        updated_at: new Date().toISOString(),
      })
      .eq('id', memberId);

    if (error) throw error;

    revalidatePath('/admin');
    revalidatePath('/dashboard');
    return { success: true, error: null };
  } catch (err: unknown) {
    return { success: false, error: getErrorMessage(err) };
  }
}
