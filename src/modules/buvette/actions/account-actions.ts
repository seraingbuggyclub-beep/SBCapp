'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { MemberBalanceItem } from '@/types/models';
import { assertReferentOrAdmin } from '@/lib/auth/assert-role';
import { isSuperAdmin } from '@/modules/admin/permissions';

/**
 * Récupère la liste des comptes membres ayant une ardoise ou un portefeuille
 */
export async function getMembersBalancesList(): Promise<{
  data: MemberBalanceItem[];
  error: string | null;
}> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('sbc_members')
      .select('id, first_name, last_name, email, phone, wallet_balance, tab_balance')
      .order('last_name', { ascending: true });

    if (error) throw error;

    const list: MemberBalanceItem[] = (data || []).map((m) => ({
      id: m.id,
      first_name: m.first_name,
      last_name: m.last_name,
      email: m.email,
      phone: m.phone,
      wallet_balance: Number(m.wallet_balance || 0),
      tab_balance: Number(m.tab_balance || 0),
    }));

    return { data: list, error: null };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erreur comptes';
    return { data: [], error: message };
  }
}

/**
 * Recharger le portefeuille d'un membre (Créditer un pack de 10 € min.)
 */
export async function topUpMemberWallet(
  memberId: string,
  amount: number,
  method: string = 'Virement'
): Promise<{ success: boolean; newBalance?: number; error: string | null }> {
  try {
    const supabase = await createClient();
    const authCheck = await assertReferentOrAdmin(supabase, null, 'can_manage_bar');
    if (!authCheck.authorized || !authCheck.profile) {
      return { success: false, error: authCheck.error };
    }

    const callerProfile = authCheck.profile;
    const isSuper = isSuperAdmin(callerProfile.email);
    const isAdmin = callerProfile.role === 'admin';
    const isBarReferent = callerProfile.role === 'referent';

    // Règle stricte : Les référents ne peuvent pas manipuler d'espèces
    if (isBarReferent && !isAdmin && !isSuper && method.toLowerCase().includes('espèce')) {
      return {
        success: false,
        error: "Manipulation d'espèces réservée aux Administrateurs. Utilisez le virement bancaire ou Payconiq.",
      };
    }

    if (!amount || amount <= 0) {
      return { success: false, error: 'Montant de recharge invalide' };
    }

    const { data: member, error: memErr } = await supabase
      .from('sbc_members')
      .select('wallet_balance')
      .eq('id', memberId)
      .single();

    if (memErr || !member) return { success: false, error: 'Membre introuvable' };

    const newBalance = Number(member.wallet_balance || 0) + Number(amount);
    const { error: updateErr } = await supabase
      .from('sbc_members')
      .update({ wallet_balance: newBalance })
      .eq('id', memberId);

    if (updateErr) throw updateErr;

    revalidatePath('/admin/buvette');
    return { success: true, newBalance, error: null };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erreur rechargement';
    return { success: false, error: message };
  }
}

/**
 * Régler / solder l'ardoise d'un membre
 */
export async function settleMemberTab(
  memberId: string,
  amount: number,
  method: string = 'Espèces'
): Promise<{ success: boolean; newTabBalance?: number; error: string | null }> {
  try {
    const supabase = await createClient();
    const authCheck = await assertReferentOrAdmin(supabase, null, 'can_manage_bar');
    if (!authCheck.authorized || !authCheck.profile) {
      return { success: false, error: authCheck.error };
    }

    const callerProfile = authCheck.profile;
    const isSuper = isSuperAdmin(callerProfile.email);
    const isAdmin = callerProfile.role === 'admin';
    const isBarReferent = callerProfile.role === 'referent';

    // Règle stricte : Les référents ne peuvent pas manipuler d'espèces
    if (isBarReferent && !isAdmin && !isSuper && method.toLowerCase().includes('espèce')) {
      return {
        success: false,
        error: "Manipulation d'espèces réservée aux Administrateurs. Utilisez le virement bancaire ou Payconiq.",
      };
    }

    const { data: member, error: memErr } = await supabase
      .from('sbc_members')
      .select('tab_balance')
      .eq('id', memberId)
      .single();

    if (memErr || !member) return { success: false, error: 'Membre introuvable' };

    const currentTab = Number(member.tab_balance || 0);
    const newTabBalance = Math.max(0, currentTab - Number(amount));

    const { error: updateErr } = await supabase
      .from('sbc_members')
      .update({ tab_balance: newTabBalance })
      .eq('id', memberId);

    if (updateErr) throw updateErr;

    revalidatePath('/admin/buvette');
    return { success: true, newTabBalance, error: null };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erreur règlement ardoise';
    return { success: false, error: message };
  }
}

/**
 * Recherche rapide d'un membre pour le POS ou scan QR
 */
export async function getMemberBarDetails(memberId: string): Promise<{
  data: MemberBalanceItem | null;
  error: string | null;
}> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('sbc_members')
      .select('id, first_name, last_name, email, phone, wallet_balance, tab_balance')
      .eq('id', memberId)
      .maybeSingle();

    if (error || !data) return { data: null, error: 'Membre non trouvé' };

    return {
      data: {
        id: data.id,
        first_name: data.first_name,
        last_name: data.last_name,
        email: data.email,
        phone: data.phone,
        wallet_balance: Number(data.wallet_balance || 0),
        tab_balance: Number(data.tab_balance || 0),
      },
      error: null,
    };
  } catch {
    return { data: null, error: 'Erreur recherche membre' };
  }
}
