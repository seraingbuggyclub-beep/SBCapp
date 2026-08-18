'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { BarSession, BarOrder } from '@/types/models';
import { assertReferentOrAdmin } from '@/lib/auth/assert-role';

/**
 * Récupère la session de caisse actuellement OUVERTE
 */
export async function getActiveBarSession(): Promise<{
  session: BarSession | null;
  error: string | null;
}> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('bar_sessions')
      .select(`
        *,
        opened_by_member:opened_by (first_name, last_name)
      `)
      .eq('status', 'OPEN')
      .maybeSingle();

    if (error) throw error;
    if (!data) return { session: null, error: null };

    return {
      session: {
        id: data.id,
        opened_by: data.opened_by,
        opened_at: data.opened_at,
        opening_cash: Number(data.opening_cash),
        opening_breakdown: data.opening_breakdown as Record<string, number> | null,
        closed_by: data.closed_by,
        closed_at: data.closed_at,
        closing_cash_counted: data.closing_cash_counted !== null ? Number(data.closing_cash_counted) : null,
        closing_cash_expected: data.closing_cash_expected !== null ? Number(data.closing_cash_expected) : null,
        closing_breakdown: data.closing_breakdown as Record<string, number> | null,
        cash_difference: data.cash_difference !== null ? Number(data.cash_difference) : null,
        status: data.status as 'OPEN' | 'CLOSED',
        notes: data.notes,
        opened_by_member: data.opened_by_member as { first_name: string; last_name: string } | null,
      },
      error: null,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erreur session';
    return { session: null, error: message };
  }
}

/**
 * Récupère le résumé financier des ventes en direct sur une session (pour le rapport Z)
 */
export async function getSessionCashSummary(sessionId: string): Promise<{
  openingCash: number;
  totalCashSales: number;
  totalPayconiqSales: number;
  totalWalletSales: number;
  totalTabSales: number;
  expectedCash: number;
  ordersCount: number;
  error: string | null;
}> {
  try {
    const supabase = await createClient();
    const { data: session, error: sessErr } = await supabase
      .from('bar_sessions')
      .select('opening_cash')
      .eq('id', sessionId)
      .single();

    if (sessErr || !session) throw sessErr || new Error('Session introuvable');

    const { data: orders, error: ordersErr } = await supabase
      .from('bar_orders')
      .select('total_amount, payment_method')
      .eq('session_id', sessionId);

    if (ordersErr) throw ordersErr;

    const openingCash = Number(session.opening_cash || 0);
    let totalCashSales = 0;
    let totalPayconiqSales = 0;
    let totalWalletSales = 0;
    let totalTabSales = 0;

    for (const o of orders || []) {
      const amt = Number(o.total_amount || 0);
      if (o.payment_method === 'CASH') totalCashSales += amt;
      else if (o.payment_method === 'PAYCONIQ') totalPayconiqSales += amt;
      else if (o.payment_method === 'WALLET') totalWalletSales += amt;
      else if (o.payment_method === 'TAB') totalTabSales += amt;
    }

    const expectedCash = openingCash + totalCashSales;

    return {
      openingCash,
      totalCashSales,
      totalPayconiqSales,
      totalWalletSales,
      totalTabSales,
      expectedCash,
      ordersCount: (orders || []).length,
      error: null,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erreur résumé session';
    return {
      openingCash: 0,
      totalCashSales: 0,
      totalPayconiqSales: 0,
      totalWalletSales: 0,
      totalTabSales: 0,
      expectedCash: 0,
      ordersCount: 0,
      error: message,
    };
  }
}

/**
 * Ouvre une nouvelle session de caisse POS avec décomposition des espèces
 */
export async function openBarSession(
  openingCash: number,
  notes?: string,
  breakdown?: Record<string, number>
): Promise<{ success: boolean; session?: BarSession; error: string | null }> {
  try {
    const supabase = await createClient();
    const authCheck = await assertReferentOrAdmin(supabase, null, 'can_manage_bar');
    if (!authCheck.authorized || !authCheck.user) {
      return { success: false, error: authCheck.error };
    }

    // Vérifier si une session est déjà ouverte
    const { session: existing } = await getActiveBarSession();
    if (existing) {
      return { success: false, error: 'Une session de caisse est déjà ouverte.' };
    }

    const { data, error } = await supabase
      .from('bar_sessions')
      .insert({
        opened_by: authCheck.user.id,
        opening_cash: Number(openingCash || 0),
        opening_breakdown: breakdown || {},
        status: 'OPEN',
        notes: notes?.trim() || null,
      })
      .select()
      .single();

    if (error) throw error;

    revalidatePath('/admin/buvette');
    revalidatePath('/buvette');
    return { success: true, error: null, session: data as unknown as BarSession };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erreur ouverture';
    return { success: false, error: message };
  }
}

/**
 * Clôture une session de caisse (Rapport Z de caisse avec calcul automatique d'écarts et écriture comptable)
 */
export async function closeBarSession(
  sessionId: string,
  closingCashCounted: number,
  notes?: string,
  breakdown?: Record<string, number>
): Promise<{
  success: boolean;
  expectedCash?: number;
  cashDifference?: number;
  totalSales?: number;
  error: string | null;
}> {
  try {
    const supabase = await createClient();
    const authCheck = await assertReferentOrAdmin(supabase, null, 'can_manage_bar');
    if (!authCheck.authorized || !authCheck.user) {
      return { success: false, error: authCheck.error };
    }

    // 1. Récupérer la session
    const { data: session, error: sessErr } = await supabase
      .from('bar_sessions')
      .select('*')
      .eq('id', sessionId)
      .single();

    if (sessErr || !session) return { success: false, error: 'Session introuvable' };

    // 2. Calculer le total des ventes en espèces (CASH) sur la session
    const { data: orders, error: ordersErr } = await supabase
      .from('bar_orders')
      .select('total_amount, payment_method')
      .eq('session_id', sessionId);

    if (ordersErr) throw ordersErr;

    const totalCashSales = (orders || [])
      .filter((o) => o.payment_method === 'CASH')
      .reduce((sum, o) => sum + Number(o.total_amount || 0), 0);

    const totalAllSales = (orders || []).reduce((sum, o) => sum + Number(o.total_amount || 0), 0);

    const openingCash = Number(session.opening_cash || 0);
    const expectedCash = openingCash + totalCashSales;
    const counted = Number(closingCashCounted || 0);
    const cashDifference = counted - expectedCash;

    // 3. Mettre à jour la session
    const now = new Date().toISOString();
    const { error: updateErr } = await supabase
      .from('bar_sessions')
      .update({
        status: 'CLOSED',
        closed_by: authCheck.user.id,
        closed_at: now,
        closing_cash_counted: counted,
        closing_cash_expected: expectedCash,
        closing_breakdown: breakdown || {},
        cash_difference: cashDifference,
        notes: notes?.trim() || session.notes,
      })
      .eq('id', sessionId);

    if (updateErr) throw updateErr;

    // 4. Synchronisation Comptable Automatique dans accounting_transactions
    // Insertion des ventes espèces réelles
    if (totalCashSales > 0) {
      await supabase.from('accounting_transactions').insert({
        date: now.split('T')[0],
        type: 'RECETTE',
        category: 'BUVETTE',
        payment_method: 'ESPECES',
        amount: totalCashSales,
        description: `Recette Buvette Espèces - Clôture Z #${sessionId.slice(0, 8)}`,
        source_type: 'BAR_SESSION',
        source_id: sessionId,
        author_id: authCheck.user.id,
      });
    }

    // Insertion des ventes Payconiq de la session si existantes
    const totalPayconiqSales = (orders || [])
      .filter((o) => o.payment_method === 'PAYCONIQ')
      .reduce((sum, o) => sum + Number(o.total_amount || 0), 0);

    if (totalPayconiqSales > 0) {
      await supabase.from('accounting_transactions').insert({
        date: now.split('T')[0],
        type: 'RECETTE',
        category: 'BUVETTE',
        payment_method: 'PAYCONIQ',
        amount: totalPayconiqSales,
        description: `Recette Buvette Payconiq - Clôture Z #${sessionId.slice(0, 8)}`,
        source_type: 'BAR_SESSION',
        source_id: sessionId,
        author_id: authCheck.user.id,
      });
    }

    revalidatePath('/admin/buvette');
    revalidatePath('/admin/comptabilite');
    return {
      success: true,
      expectedCash,
      cashDifference,
      totalSales: totalAllSales,
      error: null,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erreur clôture';
    return { success: false, error: message };
  }
}

/**
 * Récupère l'historique des sessions et dernières commandes
 */
export async function getBarSessionHistory(): Promise<{
  sessions: BarSession[];
  recentOrders: BarOrder[];
  error: string | null;
}> {
  try {
    const supabase = await createClient();

    const [sessRes, ordersRes] = await Promise.all([
      supabase
        .from('bar_sessions')
        .select(`
          *,
          opened_by_member:opened_by (first_name, last_name)
        `)
        .order('opened_at', { ascending: false })
        .limit(20),
      supabase
        .from('bar_orders')
        .select(`
          *,
          buyer:buyer_id (first_name, last_name, email),
          items:bar_order_items (
            id, item_id, quantity, unit_price, total_price,
            bar_items:item_id (name)
          )
        `)
        .order('created_at', { ascending: false })
        .limit(50),
    ]);

    return {
      sessions: (sessRes.data || []) as unknown as BarSession[],
      recentOrders: (ordersRes.data || []) as unknown as BarOrder[],
      error: null,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erreur historique';
    return { sessions: [], recentOrders: [], error: message };
  }
}
