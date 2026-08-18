'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import {
  BlacklistEntry,
  CreateBlacklistInput,
  BlacklistCheckResult,
  getErrorMessage,
} from '@/types/models';

const DEFAULT_REJECTION_MESSAGE =
  "Votre demande d'inscription n'a pas été retenue par l'Organe d'Administration du Seraing Buggy Club (ASBL), conformément aux statuts du club.";

/**
 * 1. Vérifie si une personne correspond à une entrée de la liste noire avant inscription.
 * Compatible appel anonyme via RPC SECURITY DEFINER avec repli direct.
 */
export async function checkBlacklistStatus(
  email: string,
  firstName?: string,
  lastName?: string,
  licenseNumber?: string
): Promise<BlacklistCheckResult> {
  try {
    const supabase = await createClient();

    const cleanEmail = email ? email.trim().toLowerCase() : null;
    const cleanFirstName = firstName ? firstName.trim() : null;
    const cleanLastName = lastName ? lastName.trim() : null;
    const cleanLicense = licenseNumber ? licenseNumber.trim() : null;

    // 1. Tente d'utiliser la fonction RPC sécurisée
    const { data: rpcData, error: rpcError } = await supabase.rpc('check_blacklist_status', {
      check_email: cleanEmail,
      check_first_name: cleanFirstName,
      check_last_name: cleanLastName,
      check_license_number: cleanLicense,
    });

    if (!rpcError && rpcData) {
      return {
        isBlacklisted: Boolean(rpcData.isBlacklisted),
        message: rpcData.message || DEFAULT_REJECTION_MESSAGE,
      };
    }

    // 2. Repli par requête directe (si RPC non encore migrée)
    if (cleanEmail) {
      const { data: byEmail } = await supabase
        .from('blacklist')
        .select('id, rejection_message')
        .ilike('email', cleanEmail)
        .maybeSingle();

      if (byEmail) {
        return {
          isBlacklisted: true,
          message: byEmail.rejection_message || DEFAULT_REJECTION_MESSAGE,
        };
      }
    }

    if (cleanLicense) {
      const { data: byLicense } = await supabase
        .from('blacklist')
        .select('id, rejection_message')
        .eq('license_number', cleanLicense)
        .maybeSingle();

      if (byLicense) {
        return {
          isBlacklisted: true,
          message: byLicense.rejection_message || DEFAULT_REJECTION_MESSAGE,
        };
      }
    }

    if (cleanFirstName && cleanLastName) {
      const { data: byName } = await supabase
        .from('blacklist')
        .select('id, rejection_message')
        .ilike('first_name', cleanFirstName)
        .ilike('last_name', cleanLastName)
        .maybeSingle();

      if (byName) {
        return {
          isBlacklisted: true,
          message: byName.rejection_message || DEFAULT_REJECTION_MESSAGE,
        };
      }
    }

    return { isBlacklisted: false };
  } catch (err: unknown) {
    console.error('Erreur checkBlacklistStatus:', getErrorMessage(err));
    // En cas d'erreur de vérification, ne pas bloquer un utilisateur légitime par défaut
    return { isBlacklisted: false };
  }
}

/**
 * 2. Récupère la liste complète des entrées blacklist (réservé aux admins).
 */
export async function getBlacklistEntries(): Promise<{
  data: BlacklistEntry[] | null;
  error: string | null;
}> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { data: null, error: 'Non authentifié.' };
    }

    const { data, error } = await supabase
      .from('blacklist')
      .select(`
        id,
        email,
        first_name,
        last_name,
        license_number,
        internal_reason,
        rejection_message,
        blocked_by,
        created_at,
        blocked_by_member:sbc_members!blacklist_blocked_by_fkey (
          first_name,
          last_name
        )
      `)
      .order('created_at', { ascending: false });

    if (error) {
      // Si la relation fkey échoue, tentative sans jointure
      const { data: rawData, error: rawError } = await supabase
        .from('blacklist')
        .select('*')
        .order('created_at', { ascending: false });

      if (rawError) throw rawError;
      return { data: (rawData as unknown as BlacklistEntry[]) || [], error: null };
    }

    return { data: (data as unknown as BlacklistEntry[]) || [], error: null };
  } catch (err: unknown) {
    return { data: null, error: getErrorMessage(err) };
  }
}

/**
 * 3. Ajoute une entrée dans la liste noire (Admins uniquement).
 */
export async function addToBlacklist(
  input: CreateBlacklistInput
): Promise<{ success: boolean; data?: BlacklistEntry; error: string | null }> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: 'Non authentifié.' };
    }

    if (!input.internal_reason?.trim()) {
      return { success: false, error: 'Le motif interne privé est obligatoire.' };
    }

    const { data, error } = await supabase
      .from('blacklist')
      .insert({
        email: input.email ? input.email.trim().toLowerCase() : null,
        first_name: input.first_name ? input.first_name.trim() : null,
        last_name: input.last_name ? input.last_name.trim() : null,
        license_number: input.license_number ? input.license_number.trim() : null,
        internal_reason: input.internal_reason.trim(),
        rejection_message: input.rejection_message?.trim() || DEFAULT_REJECTION_MESSAGE,
        blocked_by: user.id,
      })
      .select()
      .single();

    if (error) throw error;

    revalidatePath('/admin');
    return { success: true, data: data as unknown as BlacklistEntry, error: null };
  } catch (err: unknown) {
    return { success: false, error: getErrorMessage(err) };
  }
}

/**
 * 4. Modifie une entrée existante dans la liste noire.
 */
export async function updateBlacklistEntry(
  id: string,
  input: Partial<CreateBlacklistInput>
): Promise<{ success: boolean; error: string | null }> {
  try {
    const supabase = await createClient();

    const updatePayload: Record<string, string | null> = {};
    if (input.email !== undefined) updatePayload.email = input.email ? input.email.trim().toLowerCase() : null;
    if (input.first_name !== undefined) updatePayload.first_name = input.first_name ? input.first_name.trim() : null;
    if (input.last_name !== undefined) updatePayload.last_name = input.last_name ? input.last_name.trim() : null;
    if (input.license_number !== undefined) updatePayload.license_number = input.license_number ? input.license_number.trim() : null;
    if (input.internal_reason !== undefined) updatePayload.internal_reason = input.internal_reason.trim();
    if (input.rejection_message !== undefined) updatePayload.rejection_message = input.rejection_message.trim() || DEFAULT_REJECTION_MESSAGE;

    const { error } = await supabase
      .from('blacklist')
      .update(updatePayload)
      .eq('id', id);

    if (error) throw error;

    revalidatePath('/admin');
    return { success: true, error: null };
  } catch (err: unknown) {
    return { success: false, error: getErrorMessage(err) };
  }
}

/**
 * 5. Supprime une entrée de la liste noire (Réhabilitation).
 */
export async function removeFromBlacklist(
  id: string
): Promise<{ success: boolean; error: string | null }> {
  try {
    const supabase = await createClient();

    const { error } = await supabase
      .from('blacklist')
      .delete()
      .eq('id', id);

    if (error) throw error;

    revalidatePath('/admin');
    return { success: true, error: null };
  } catch (err: unknown) {
    return { success: false, error: getErrorMessage(err) };
  }
}

/**
 * 6. Révoque immédiatement un membre existant et l'inscrit sur la liste noire.
 */
export async function blacklistAndRevokeMember(
  memberId: string,
  internalReason: string,
  rejectionMessage?: string
): Promise<{ success: boolean; error: string | null }> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: 'Non authentifié.' };
    }

    if (!internalReason?.trim()) {
      return { success: false, error: 'Le motif interne privé est obligatoire.' };
    }

    // 1. Récupération des informations du membre
    const { data: member, error: memberErr } = await supabase
      .from('sbc_members')
      .select('email, first_name, last_name, license_number')
      .eq('id', memberId)
      .single();

    if (memberErr || !member) {
      return { success: false, error: 'Membre introuvable.' };
    }

    // 2. Inscription dans la table blacklist
    const { error: blacklistErr } = await supabase.from('blacklist').insert({
      email: member.email ? member.email.trim().toLowerCase() : null,
      first_name: member.first_name ? member.first_name.trim() : null,
      last_name: member.last_name ? member.last_name.trim() : null,
      license_number: member.license_number ? member.license_number.trim() : null,
      internal_reason: internalReason.trim(),
      rejection_message: rejectionMessage?.trim() || DEFAULT_REJECTION_MESSAGE,
      blocked_by: user.id,
    });

    if (blacklistErr) throw blacklistErr;

    // 3. Révocation immédiate des droits et accès du membre
    const { error: updateErr } = await supabase
      .from('sbc_members')
      .update({
        payment_status: 'expired',
        role: 'visitor',
        permissions: {},
        updated_at: new Date().toISOString(),
      })
      .eq('id', memberId);

    if (updateErr) throw updateErr;

    revalidatePath('/admin');
    revalidatePath('/dashboard');
    return { success: true, error: null };
  } catch (err: unknown) {
    return { success: false, error: getErrorMessage(err) };
  }
}
