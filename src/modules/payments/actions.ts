'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import {
  MembershipPricing,
  MembershipPaymentItem,
  MembershipChoiceInput,
  SpecialRateItem,
} from '@/types/models';

const DEFAULT_PRICING: Omit<MembershipPricing, 'id'> = {
  year: new Date().getFullYear(),
  price_with_fba: 85.0,
  price_without_fba: 55.0,
  belgian_championship_fee: 20.0,
  special_rates: [
    { id: 'youth', label: 'Tarif Jeune (-16 ans)', amount: 45.0, description: 'Pour les pilotes de moins de 16 ans révolus' },
    { id: 'family', label: 'Tarif Famille (2e pilote)', amount: 60.0, description: 'Deuxième membre du même foyer fiscal' },
    { id: 'volunteer', label: 'Bénévole / Commissaire actif', amount: 35.0, description: 'Membre bénévole actif aux travaux et organisation' },
  ],
  discount_enabled: false,
  discount_amount: 15.0,
  discount_label: 'Remise Spéciale Mi-Saison',
  discount_start_date: null,
  discount_end_date: null,
};

/**
 * Récupère la grille tarifaire des cotisations pour une année donnée
 */
export async function getClubMembershipPricing(
  year: number = new Date().getFullYear()
): Promise<{ data: MembershipPricing; error: string | null }> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('sbc_membership_pricing')
      .select('*')
      .eq('year', year)
      .maybeSingle();

    if (error || !data) {
      return {
        data: {
          id: 'default-pricing',
          ...DEFAULT_PRICING,
          year,
        },
        error: null,
      };
    }

    const specialRates = (Array.isArray(data.special_rates)
      ? data.special_rates
      : DEFAULT_PRICING.special_rates) as unknown as SpecialRateItem[];

    return {
      data: {
        id: data.id,
        year: data.year,
        price_with_fba: Number(data.price_with_fba),
        price_without_fba: Number(data.price_without_fba),
        belgian_championship_fee: Number(data.belgian_championship_fee),
        special_rates: specialRates,
        discount_enabled: Boolean(data.discount_enabled),
        discount_amount: Number(data.discount_amount || 0),
        discount_label: data.discount_label || 'Remise',
        discount_start_date: data.discount_start_date,
        discount_end_date: data.discount_end_date,
        updated_at: data.updated_at,
      },
      error: null,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erreur inattendue';
    return {
      data: { id: 'default-pricing', ...DEFAULT_PRICING, year },
      error: message,
    };
  }
}

/**
 * Met à jour la tarification du club (Admin uniquement)
 */
export async function updateClubMembershipPricing(
  pricing: Partial<MembershipPricing> & { year: number }
): Promise<{ success: boolean; error: string | null }> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Non authentifié' };

    const { data: profile } = await supabase
      .from('sbc_members')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profile?.role !== 'admin') {
      return { success: false, error: 'Action réservée aux administrateurs.' };
    }

    const now = new Date().toISOString();
    const payload = {
      year: pricing.year,
      price_with_fba: pricing.price_with_fba ?? DEFAULT_PRICING.price_with_fba,
      price_without_fba: pricing.price_without_fba ?? DEFAULT_PRICING.price_without_fba,
      belgian_championship_fee: pricing.belgian_championship_fee ?? DEFAULT_PRICING.belgian_championship_fee,
      special_rates: (pricing.special_rates || DEFAULT_PRICING.special_rates) as unknown as import('@/types/database.types').Json,
      discount_enabled: pricing.discount_enabled ?? false,
      discount_amount: pricing.discount_amount ?? 0,
      discount_label: pricing.discount_label ?? 'Remise',
      discount_start_date: pricing.discount_start_date ?? null,
      discount_end_date: pricing.discount_end_date ?? null,
      updated_at: now,
    };

    const { error } = await supabase
      .from('sbc_membership_pricing')
      .upsert(payload, { onConflict: 'year' });

    if (error) throw error;

    revalidatePath('/admin');
    revalidatePath('/dashboard');
    return { success: true, error: null };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erreur inattendue';
    return { success: false, error: message };
  }
}

/**
 * Récupère le choix de cotisation d'un membre pour une année donnée
 */
export async function getMemberMembershipPayment(
  userId: string,
  year: number = new Date().getFullYear()
): Promise<{ data: MembershipPaymentItem | null; error: string | null }> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('membership_payments')
      .select('*')
      .eq('user_id', userId)
      .eq('year', year)
      .maybeSingle();

    if (error) {
      return { data: null, error: error.message };
    }

    return { data: (data as unknown as MembershipPaymentItem) || null, error: null };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erreur inattendue';
    return { data: null, error: message };
  }
}

/**
 * Soumet ou met à jour le choix de cotisation d'un membre avec calcul précis du tarif
 */
export async function submitMembershipPaymentChoice(
  input: MembershipChoiceInput
): Promise<{ success: boolean; error: string | null; data?: MembershipPaymentItem }> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Non authentifié' };

    // 1. Récupération des tarifs de l'année
    const { data: pricing } = await getClubMembershipPricing(input.year);

    // 2. Validation stricte : si sans assurance FBA, numéro de licence FBA obligatoire !
    if (input.formula === 'without_fba' && (!input.license_number || !input.license_number.trim())) {
      return {
        success: false,
        error: 'Le numéro de licence FBA valide est obligatoire pour la formule sans assurance club.',
      };
    }

    // 3. Calcul du montant de base
    let baseAmount = pricing.price_with_fba;
    let includesFba = true;

    if (input.formula === 'without_fba') {
      baseAmount = pricing.price_without_fba;
      includesFba = false;
    } else if (input.formula === 'special' && input.special_rate_id) {
      const specialRate = pricing.special_rates.find((r) => r.id === input.special_rate_id);
      if (specialRate) {
        baseAmount = specialRate.amount;
      }
    }

    // 4. Supplément Championnat de Belgique
    if (input.includes_belgian_championship) {
      baseAmount += pricing.belgian_championship_fee;
    }

    // 5. Réduction saisonnière éventuelle
    let appliedDiscount = 0;
    if (pricing.discount_enabled && pricing.discount_amount > 0) {
      const today = new Date().toISOString().split('T')[0];
      const isInRange =
        (!pricing.discount_start_date || today >= pricing.discount_start_date) &&
        (!pricing.discount_end_date || today <= pricing.discount_end_date);

      if (isInRange) {
        appliedDiscount = pricing.discount_amount;
        baseAmount = Math.max(0, baseAmount - appliedDiscount);
      }
    }

    const payload = {
      user_id: input.user_id,
      year: input.year,
      formula: input.formula,
      special_rate_id: input.special_rate_id || null,
      includes_fba: includesFba,
      license_number: input.license_number?.trim() || null,
      includes_belgian_championship: input.includes_belgian_championship,
      applied_discount: appliedDiscount,
      amount: Number(baseAmount.toFixed(2)),
      status: 'pending',
      updated_at: new Date().toISOString(),
    };

    // Upsert dans membership_payments
    const { data, error } = await supabase
      .from('membership_payments')
      .upsert(payload, { onConflict: 'user_id,year' })
      .select()
      .single();

    if (error) throw error;

    // Si un numéro de licence a été fourni, mettre également à jour le profil membre
    if (input.license_number?.trim()) {
      await supabase
        .from('sbc_members')
        .update({ license_number: input.license_number.trim() })
        .eq('id', input.user_id);
    }

    revalidatePath('/dashboard');
    revalidatePath('/admin');

    return { success: true, error: null, data: data as unknown as MembershipPaymentItem };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erreur inattendue';
    return { success: false, error: message };
  }
}

/**
 * Récupère le grand livre de trésorerie (Admin uniquement)
 */
export async function getTreasuryPaymentsList(
  year: number = new Date().getFullYear(),
  statusFilter: string = 'all'
): Promise<{
  data: MembershipPaymentItem[];
  pricing: MembershipPricing;
  error: string | null;
}> {
  try {
    const supabase = await createClient();

    let query = supabase
      .from('membership_payments')
      .select(`
        *,
        sbc_members:user_id (
          first_name,
          last_name,
          email,
          phone,
          license_number
        )
      `)
      .eq('year', year)
      .order('created_at', { ascending: false });

    if (statusFilter !== 'all') {
      query = query.eq('status', statusFilter);
    }

    const { data: payments, error: paymentsErr } = await query;
    const { data: pricing } = await getClubMembershipPricing(year);

    if (paymentsErr) throw paymentsErr;

    return {
      data: (payments || []) as unknown as MembershipPaymentItem[],
      pricing,
      error: null,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erreur inattendue';
    const { data: pricing } = await getClubMembershipPricing(year);
    return { data: [], pricing, error: message };
  }
}

/**
 * Valide un paiement de cotisation (Passe le membre à 'paid' et le QR code en Blanc)
 */
export async function validateMembershipPayment(
  paymentId: string,
  payment_method: 'virement' | 'cash' | 'autre' = 'virement'
): Promise<{ success: boolean; error: string | null }> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Non authentifié' };

    const { data: adminProfile } = await supabase
      .from('sbc_members')
      .select('role')
      .eq('id', user.id)
      .single();

    if (adminProfile?.role !== 'admin') {
      return { success: false, error: 'Action réservée aux administrateurs.' };
    }

    const now = new Date().toISOString();

    const { data: payment, error: updateErr } = await supabase
      .from('membership_payments')
      .update({
        status: 'paid',
        payment_method,
        validated_by: user.id,
        validated_at: now,
        updated_at: now,
      })
      .eq('id', paymentId)
      .select('user_id, amount, year, license_number')
      .single();

    if (updateErr || !payment) throw updateErr;

    // 2. Mettre à jour le statut du membre
    const memberUpdate: { payment_status: string; license_number?: string } = {
      payment_status: 'paid',
    };
    if (payment.license_number) {
      memberUpdate.license_number = payment.license_number;
    }

    const { data: memberData } = await supabase
      .from('sbc_members')
      .update(memberUpdate)
      .eq('id', payment.user_id)
      .select('first_name, last_name')
      .single();

    // 3. Synchronisation Comptable Automatique dans accounting_transactions
    const accountingMethod = payment_method === 'cash' ? 'ESPECES' : 'BANQUE';
    const memberName = memberData ? `${memberData.last_name.toUpperCase()} ${memberData.first_name}` : 'Membre';

    await supabase.from('accounting_transactions').insert({
      date: now.split('T')[0],
      type: 'RECETTE',
      category: 'COTISATION',
      payment_method: accountingMethod,
      amount: Number(payment.amount || 0),
      description: `Cotisation ${payment.year} - ${memberName}`,
      source_type: 'MEMBERSHIP',
      source_id: paymentId,
      author_id: user.id,
    });

    revalidatePath('/');
    revalidatePath('/dashboard');
    revalidatePath('/admin');
    revalidatePath('/admin/comptabilite');
    revalidatePath('/check-in');

    return { success: true, error: null };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erreur inattendue';
    return { success: false, error: message };
  }
}

/**
 * Annule ou remet en attente un paiement de cotisation
 */
export async function revertMembershipPayment(
  paymentId: string
): Promise<{ success: boolean; error: string | null }> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Non authentifié' };

    const { data: adminProfile } = await supabase
      .from('sbc_members')
      .select('role')
      .eq('id', user.id)
      .single();

    if (adminProfile?.role !== 'admin') {
      return { success: false, error: 'Action réservée aux administrateurs.' };
    }

    const now = new Date().toISOString();

    // 1. Remettre le paiement en pending
    const { data: payment, error: updateErr } = await supabase
      .from('membership_payments')
      .update({
        status: 'pending',
        validated_by: null,
        validated_at: null,
        updated_at: now,
      })
      .eq('id', paymentId)
      .select('user_id')
      .single();

    if (updateErr || !payment) throw updateErr;

    // 2. Remettre le statut membre en pending
    const { error: memberErr } = await supabase
      .from('sbc_members')
      .update({ payment_status: 'pending' })
      .eq('id', payment.user_id);

    if (memberErr) throw memberErr;

    // 3. Supprimer l'écriture comptable liée
    await supabase
      .from('accounting_transactions')
      .delete()
      .eq('source_type', 'MEMBERSHIP')
      .eq('source_id', paymentId);

    revalidatePath('/');
    revalidatePath('/dashboard');
    revalidatePath('/admin');
    revalidatePath('/admin/comptabilite');
    revalidatePath('/check-in');

    return { success: true, error: null };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erreur inattendue';
    return { success: false, error: message };
  }
}

/**
 * Helpers pour le code cadenas
 */
export async function getMemberClubLockCode(): Promise<{ lockCode: string | null; error: string | null }> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { lockCode: null, error: 'Non authentifié' };

    const { data: member, error: memberErr } = await supabase
      .from('sbc_members')
      .select('payment_status, role, email')
      .eq('id', user.id)
      .single();

    if (memberErr || !member) return { lockCode: null, error: 'Membre introuvable' };

    const isPaid = member.payment_status === 'paid';
    const isAdmin = member.role === 'admin' || member.email === 'stefga1@gmail.com';

    if (!isPaid && !isAdmin) {
      return { lockCode: null, error: 'Cotisation non acquittée' };
    }

    const { data: config } = await supabase
      .from('sbc_club_config')
      .select('lock_code')
      .limit(1)
      .maybeSingle();

    return { lockCode: config?.lock_code || '4000', error: null };
  } catch {
    return { lockCode: '4000', error: null };
  }
}

/**
 * Vérification directe du cadenas par un membre
 */
export async function verifyAndUnlockAccess(
  userId: string,
  code: string
): Promise<{ success: boolean; error: string | null }> {
  try {
    const supabase = await createClient();

    const { data: isValid, error: rpcError } = await supabase.rpc('sbc_verify_lock_code', {
      input_code: code,
    });

    if (rpcError) {
      return { success: false, error: rpcError.message };
    }

    if (!isValid) {
      return { success: false, error: "Code cadenas incorrect. Veuillez contacter l'administrateur." };
    }

    const { error: updateError } = await supabase
      .from('sbc_members')
      .update({ payment_status: 'paid' })
      .eq('id', userId);

    if (updateError) {
      return { success: false, error: updateError.message };
    }

    revalidatePath('/dashboard');
    revalidatePath('/check-in');
    return { success: true, error: null };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erreur inattendue';
    return { success: false, error: message };
  }
}

