'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import {
  AccountingTransaction,
  AccountingMetrics,
  AccountingFilters,
  CreateTransactionInput,
} from '@/types/models';

/**
 * Récupère le grand livre des écritures comptables avec filtres
 */
export async function getAccountingLedger(
  filters: AccountingFilters = {}
): Promise<{
  data: AccountingTransaction[];
  error: string | null;
}> {
  try {
    const supabase = await createClient();
    const currentYear = filters.year || new Date().getFullYear();

    let query = supabase
      .from('accounting_transactions')
      .select(`
        *,
        author:author_id (first_name, last_name)
      `)
      .order('date', { ascending: false })
      .order('created_at', { ascending: false });

    // Filtre par année ou par dates spécifiques
    if (filters.startDate && filters.endDate) {
      query = query.gte('date', filters.startDate).lte('date', filters.endDate);
    } else if (filters.year) {
      query = query.gte('date', `${currentYear}-01-01`).lte('date', `${currentYear}-12-31`);
    }

    if (filters.type && filters.type !== 'ALL') {
      query = query.eq('type', filters.type);
    }

    if (filters.category && filters.category !== 'ALL') {
      query = query.eq('category', filters.category);
    }

    if (filters.paymentMethod && filters.paymentMethod !== 'ALL') {
      query = query.eq('payment_method', filters.paymentMethod);
    }

    const { data, error } = await query;
    if (error) throw error;

    let result: AccountingTransaction[] = (data || []).map((t) => ({
      id: t.id,
      date: t.date,
      type: t.type as import('@/types/models').AccountingType,
      category: t.category as import('@/types/models').AccountingCategory,
      payment_method: t.payment_method as import('@/types/models').AccountingPaymentMethod,
      amount: Number(t.amount),
      description: t.description,
      receipt_url: t.receipt_url,
      source_type: t.source_type as import('@/types/models').AccountingSourceType,
      source_id: t.source_id,
      author_id: t.author_id,
      created_at: t.created_at,
      author: t.author as { first_name: string; last_name: string } | null,
    }));

    if (filters.search && filters.search.trim()) {
      const q = filters.search.toLowerCase().trim();
      result = result.filter(
        (t) =>
          t.description.toLowerCase().includes(q) ||
          t.category.toLowerCase().includes(q) ||
          `${t.author?.first_name || ''} ${t.author?.last_name || ''}`.toLowerCase().includes(q)
      );
    }

    return { data: result, error: null };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erreur grand livre';
    return { data: [], error: message };
  }
}

/**
 * Calcule les indicateurs financiers clés (KPIs) de la saison
 */
export async function getAccountingMetrics(
  year: number = new Date().getFullYear()
): Promise<{
  metrics: AccountingMetrics;
  error: string | null;
}> {
  const defaultMetrics: AccountingMetrics = {
    cashBalance: 0,
    bankBalance: 0,
    totalIncome: 0,
    totalExpense: 0,
    netResult: 0,
    incomeByMethod: { cash: 0, bank: 0, payconiq: 0 },
    expenseByMethod: { cash: 0, bank: 0, payconiq: 0 },
    categoryTotals: {},
  };

  try {
    const supabase = await createClient();

    // Récupérer toutes les transactions de l'année
    const { data: transactions, error } = await supabase
      .from('accounting_transactions')
      .select('*')
      .gte('date', `${year}-01-01`)
      .lte('date', `${year}-12-31`);

    if (error) throw error;

    let cashIncome = 0;
    let cashExpense = 0;
    let bankIncome = 0;
    let bankExpense = 0;
    let payconiqIncome = 0;
    let payconiqExpense = 0;

    let totalIncome = 0;
    let totalExpense = 0;
    const categoryTotals: { [category: string]: { income: number; expense: number } } = {};

    (transactions || []).forEach((t) => {
      const amount = Number(t.amount || 0);
      const isIncome = t.type === 'RECETTE';

      if (!categoryTotals[t.category]) {
        categoryTotals[t.category] = { income: 0, expense: 0 };
      }

      if (isIncome) {
        totalIncome += amount;
        categoryTotals[t.category].income += amount;

        if (t.payment_method === 'ESPECES') cashIncome += amount;
        else if (t.payment_method === 'BANQUE') bankIncome += amount;
        else if (t.payment_method === 'PAYCONIQ') payconiqIncome += amount;
      } else {
        totalExpense += amount;
        categoryTotals[t.category].expense += amount;

        if (t.payment_method === 'ESPECES') cashExpense += amount;
        else if (t.payment_method === 'BANQUE') bankExpense += amount;
        else if (t.payment_method === 'PAYCONIQ') payconiqExpense += amount;
      }
    });

    const cashBalance = cashIncome - cashExpense;
    // Compte bancaire regroupe virements bancaires et encaissements Payconiq
    const bankBalance = (bankIncome + payconiqIncome) - (bankExpense + payconiqExpense);
    const netResult = totalIncome - totalExpense;

    return {
      metrics: {
        cashBalance,
        bankBalance,
        totalIncome,
        totalExpense,
        netResult,
        incomeByMethod: {
          cash: cashIncome,
          bank: bankIncome,
          payconiq: payconiqIncome,
        },
        expenseByMethod: {
          cash: cashExpense,
          bank: bankExpense,
          payconiq: payconiqExpense,
        },
        categoryTotals,
      },
      error: null,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erreur calculs financiers';
    return { metrics: defaultMetrics, error: message };
  }
}

/**
 * Création manuelle d'une écriture comptable (Dépense ou Recette)
 */
export async function createAccountingTransaction(
  input: CreateTransactionInput
): Promise<{ success: boolean; id?: string; error: string | null }> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Non authentifié' };

    const { data: member } = await supabase
      .from('sbc_members')
      .select('role')
      .eq('id', user.id)
      .single();

    if (member?.role !== 'admin') {
      return { success: false, error: 'Action réservée aux administrateurs.' };
    }

    const payload = {
      date: input.date || new Date().toISOString().split('T')[0],
      type: input.type,
      category: input.category,
      payment_method: input.payment_method,
      amount: Number(input.amount),
      description: input.description.trim(),
      receipt_url: input.receipt_url?.trim() || null,
      source_type: input.source_type || 'MANUAL',
      source_id: input.source_id || null,
      author_id: user.id,
    };

    const { data, error } = await supabase
      .from('accounting_transactions')
      .insert(payload)
      .select('id')
      .single();

    if (error) throw error;

    revalidatePath('/admin/comptabilite');
    return { success: true, id: data.id, error: null };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erreur saisie écriture';
    return { success: false, error: message };
  }
}

/**
 * Modification d'une écriture comptable
 */
export async function updateAccountingTransaction(
  id: string,
  input: Partial<CreateTransactionInput>
): Promise<{ success: boolean; error: string | null }> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Non authentifié' };

    const payload: {
      date?: string;
      type?: string;
      category?: string;
      payment_method?: string;
      amount?: number;
      description?: string;
      receipt_url?: string | null;
    } = {};

    if (input.date) payload.date = input.date;
    if (input.type) payload.type = input.type;
    if (input.category) payload.category = input.category;
    if (input.payment_method) payload.payment_method = input.payment_method;
    if (input.amount) payload.amount = Number(input.amount);
    if (input.description) payload.description = input.description.trim();
    if (input.receipt_url !== undefined) payload.receipt_url = input.receipt_url?.trim() || null;

    const { error } = await supabase
      .from('accounting_transactions')
      .update(payload)
      .eq('id', id);

    if (error) throw error;

    revalidatePath('/admin/comptabilite');
    return { success: true, error: null };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erreur modification';
    return { success: false, error: message };
  }
}

/**
 * Suppression d'une écriture comptable
 */
export async function deleteAccountingTransaction(
  id: string
): Promise<{ success: boolean; error: string | null }> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Non authentifié' };

    const { error } = await supabase
      .from('accounting_transactions')
      .delete()
      .eq('id', id);

    if (error) throw error;

    revalidatePath('/admin/comptabilite');
    return { success: true, error: null };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erreur suppression';
    return { success: false, error: message };
  }
}

/**
 * Génère le contenu CSV formaté du grand livre comptable
 */
export async function generateAccountingExportData(
  year: number = new Date().getFullYear()
): Promise<{ csvContent: string; error: string | null }> {
  try {
    const { data: transactions, error } = await getAccountingLedger({ year });
    if (error) throw new Error(error);

    const headers = [
      'Date',
      'Type',
      'Catégorie',
      'Moyen de Paiement',
      'Description / Libellé',
      'Recette (€)',
      'Dépense (€)',
      'Justificatif',
    ];

    const rows = transactions.map((t) => [
      `"${t.date}"`,
      `"${t.type}"`,
      `"${t.category}"`,
      `"${t.payment_method}"`,
      `"${t.description.replace(/"/g, '""')}"`,
      t.type === 'RECETTE' ? t.amount.toFixed(2) : '0.00',
      t.type === 'DEPENSE' ? t.amount.toFixed(2) : '0.00',
      `"${t.receipt_url || ''}"`,
    ]);

    const csv = [headers.join(';'), ...rows.map((r) => r.join(';'))].join('\n');
    return { csvContent: csv, error: null };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erreur export CSV';
    return { csvContent: '', error: message };
  }
}
