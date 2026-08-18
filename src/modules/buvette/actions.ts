'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import {
  BarCategory,
  BarItem,
  BarSession,
  BarOrder,
  BarPaymentMethod,
  ShoppingListItem,
  MemberBalanceItem,
  BarStockMovement,
} from '@/types/models';

/**
 * Récupère le catalogue actif complet groupé par catégorie
 */
export async function getBarCatalogue(): Promise<{
  data: BarCategory[];
  error: string | null;
}> {
  try {
    const supabase = await createClient();

    const { data: categories, error: catErr } = await supabase
      .from('bar_categories')
      .select(`
        *,
        items:bar_items(*)
      `)
      .order('display_order', { ascending: true });

    if (catErr) throw catErr;

    const formatted: BarCategory[] = (categories || []).map((cat) => ({
      id: cat.id,
      name: cat.name,
      display_order: cat.display_order,
      items: (cat.items || [])
        .filter((item: import('@/types/models').BarItemRow) => item.is_active)
        .map((item: import('@/types/models').BarItemRow) => ({
          id: item.id,
          category_id: item.category_id,
          name: item.name,
          selling_price: Number(item.selling_price),
          cost_price: Number(item.cost_price),
          stock_quantity: Number(item.stock_quantity),
          alert_threshold: Number(item.alert_threshold),
          is_active: Boolean(item.is_active),
          image_url: item.image_url,
        })),
    }));

    return { data: formatted, error: null };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erreur catalogue';
    return { data: [], error: message };
  }
}

/**
 * Récupère tous les articles avec leurs catégories (pour la gestion des stocks)
 */
export async function getAllBarItemsWithStats(): Promise<{
  data: BarItem[];
  categories: { id: string; name: string }[];
  error: string | null;
}> {
  try {
    const supabase = await createClient();

    const [itemsRes, catRes] = await Promise.all([
      supabase
        .from('bar_items')
        .select(`
          *,
          category:category_id (id, name, display_order)
        `)
        .order('name', { ascending: true }),
      supabase
        .from('bar_categories')
        .select('id, name')
        .order('display_order', { ascending: true }),
    ]);

    if (itemsRes.error) throw itemsRes.error;

    const items: BarItem[] = (itemsRes.data || []).map((item) => ({
      id: item.id,
      category_id: item.category_id,
      name: item.name,
      selling_price: Number(item.selling_price),
      cost_price: Number(item.cost_price),
      stock_quantity: Number(item.stock_quantity),
      alert_threshold: Number(item.alert_threshold),
      is_active: Boolean(item.is_active),
      image_url: item.image_url,
      category: item.category ? {
        id: (item.category as { id: string; name: string; display_order: number }).id,
        name: (item.category as { id: string; name: string; display_order: number }).name,
        display_order: (item.category as { id: string; name: string; display_order: number }).display_order,
      } : null,
    }));

    return {
      data: items,
      categories: catRes.data || [],
      error: null,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erreur inventaire';
    return { data: [], categories: [], error: message };
  }
}

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
        closed_by: data.closed_by,
        closed_at: data.closed_at,
        closing_cash_counted: data.closing_cash_counted !== null ? Number(data.closing_cash_counted) : null,
        closing_cash_expected: data.closing_cash_expected !== null ? Number(data.closing_cash_expected) : null,
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
 * Ouvre une nouvelle session de caisse POS
 */
export async function openBarSession(
  openingCash: number,
  notes?: string
): Promise<{ success: boolean; session?: BarSession; error: string | null }> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Non authentifié' };

    // Vérifier si une session est déjà ouverte
    const { session: existing } = await getActiveBarSession();
    if (existing) {
      return { success: false, error: 'Une session de caisse est déjà ouverte.' };
    }

    const { data, error } = await supabase
      .from('bar_sessions')
      .insert({
        opened_by: user.id,
        opening_cash: Number(openingCash || 0),
        status: 'OPEN',
        notes: notes?.trim() || null,
      })
      .select()
      .single();

    if (error) throw error;

    revalidatePath('/admin/buvette');
    return { success: true, error: null, session: data as unknown as BarSession };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erreur ouverture';
    return { success: false, error: message };
  }
}

/**
 * Clôture une session de caisse (Rapport Z de caisse avec écarts)
 */
export async function closeBarSession(
  sessionId: string,
  closingCashCounted: number,
  notes?: string
): Promise<{
  success: boolean;
  expectedCash?: number;
  cashDifference?: number;
  totalSales?: number;
  error: string | null;
}> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Non authentifié' };

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

    const totalAllSales = (orders || [])
      .reduce((sum, o) => sum + Number(o.total_amount || 0), 0);

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
        closed_by: user.id,
        closed_at: now,
        closing_cash_counted: counted,
        closing_cash_expected: expectedCash,
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
        author_id: user.id,
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
        author_id: user.id,
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
 * Crée et encaisse une commande sur le POS tactile
 */
export async function createPosOrder(input: {
  sessionId: string;
  buyerId?: string | null;
  items: { itemId: string; quantity: number }[];
  paymentMethod: BarPaymentMethod;
  cashGiven?: number;
}): Promise<{
  success: boolean;
  orderId?: string;
  changeDue?: number;
  newBalance?: number;
  error: string | null;
}> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Non authentifié' };

    if (!input.items || input.items.length === 0) {
      return { success: false, error: 'Le panier est vide' };
    }

    // 1. Récupérer les articles et vérifier les prix & stocks
    const itemIds = input.items.map((i) => i.itemId);
    const { data: dbItems, error: itemsErr } = await supabase
      .from('bar_items')
      .select('*')
      .in('id', itemIds);

    if (itemsErr || !dbItems) throw itemsErr;

    let totalAmount = 0;
    const orderLines: {
      item_id: string;
      quantity: number;
      unit_price: number;
      total_price: number;
      cost_price: number;
    }[] = [];

    for (const line of input.items) {
      const dbItem = dbItems.find((i) => i.id === line.itemId);
      if (!dbItem) continue;

      const unitPrice = Number(dbItem.selling_price);
      const lineTotal = unitPrice * line.quantity;
      totalAmount += lineTotal;

      orderLines.push({
        item_id: line.itemId,
        quantity: line.quantity,
        unit_price: unitPrice,
        total_price: lineTotal,
        cost_price: Number(dbItem.cost_price),
      });
    }

    // 2. Gestion des règles selon le mode de paiement
    let paymentStatus: 'PAID' | 'PENDING_TAB' = 'PAID';
    let changeDue = 0;
    let newBalance = 0;

    if (input.paymentMethod === 'WALLET') {
      if (!input.buyerId) {
        return { success: false, error: 'Un compte membre est requis pour le paiement par portefeuille.' };
      }

      const { data: buyer, error: buyerErr } = await supabase
        .from('sbc_members')
        .select('wallet_balance')
        .eq('id', input.buyerId)
        .single();

      if (buyerErr || !buyer) return { success: false, error: 'Membre introuvable' };

      const currentWallet = Number(buyer.wallet_balance || 0);
      if (currentWallet < totalAmount) {
        return {
          success: false,
          error: `Solde portefeuille insuffisant (${currentWallet.toFixed(2)} € disponible pour un total de ${totalAmount.toFixed(2)} €).`,
        };
      }

      newBalance = currentWallet - totalAmount;
      await supabase
        .from('sbc_members')
        .update({ wallet_balance: newBalance })
        .eq('id', input.buyerId);
    } else if (input.paymentMethod === 'TAB') {
      if (!input.buyerId) {
        return { success: false, error: 'Un compte membre est requis pour mettre sur ardoise.' };
      }

      paymentStatus = 'PENDING_TAB';
      const { data: buyer } = await supabase
        .from('sbc_members')
        .select('tab_balance')
        .eq('id', input.buyerId)
        .single();

      const currentTab = Number(buyer?.tab_balance || 0);
      newBalance = currentTab + totalAmount;
      await supabase
        .from('sbc_members')
        .update({ tab_balance: newBalance })
        .eq('id', input.buyerId);
    } else if (input.paymentMethod === 'CASH') {
      if (input.cashGiven && input.cashGiven >= totalAmount) {
        changeDue = input.cashGiven - totalAmount;
      }
    }

    // 3. Enregistrer la commande
    const { data: order, error: orderErr } = await supabase
      .from('bar_orders')
      .insert({
        session_id: input.sessionId,
        buyer_id: input.buyerId || null,
        seller_id: user.id,
        channel: 'POS',
        total_amount: totalAmount,
        payment_method: input.paymentMethod,
        payment_status: paymentStatus,
      })
      .select()
      .single();

    if (orderErr || !order) throw orderErr;

    // 4. Enregistrer les lignes d'articles
    const linesToInsert = orderLines.map((l) => ({
      order_id: order.id,
      item_id: l.item_id,
      quantity: l.quantity,
      unit_price: l.unit_price,
      total_price: l.total_price,
    }));

    await supabase.from('bar_order_items').insert(linesToInsert);

    // 5. Décrémenter les stocks et enregistrer les mouvements
    for (const l of orderLines) {
      const dbItem = dbItems.find((i) => i.id === l.item_id);
      const newStock = Math.max(0, Number(dbItem?.stock_quantity || 0) - l.quantity);

      await Promise.all([
        supabase
          .from('bar_items')
          .update({ stock_quantity: newStock, updated_at: new Date().toISOString() })
          .eq('id', l.item_id),
        supabase.from('bar_stock_movements').insert({
          item_id: l.item_id,
          type: 'SALE_POS',
          quantity: -l.quantity,
          cost_price_at_time: l.cost_price,
          reason: `Vente POS #${order.id.slice(0, 8)}`,
          admin_id: user.id,
        }),
      ]);
    }

    revalidatePath('/admin/buvette');
    return {
      success: true,
      orderId: order.id,
      changeDue,
      newBalance,
      error: null,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erreur encaissement';
    return { success: false, error: message };
  }
}

/**
 * Commande Frigo Libre-service (Passée par le membre en direct sur son smartphone)
 * Décrémente le montant total du wallet_balance (autorise les soldes négatifs / ardoise)
 */
export async function submitSelfServiceOrder(
  items: { productId?: string; itemId?: string; quantity: number }[]
): Promise<{
  success: boolean;
  orderId?: string;
  newBalance?: number;
  error: string | null;
}> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Connexion requise pour valider une consommation' };

    if (!items || items.length === 0) {
      return { success: false, error: 'Sélectionnez au moins une boisson ou un snack' };
    }

    const itemIds = items.map((i) => (i.productId || i.itemId) as string);
    const { data: dbItems, error: itemsErr } = await supabase
      .from('bar_items')
      .select('*')
      .in('id', itemIds);

    if (itemsErr || !dbItems) throw itemsErr;

    let totalAmount = 0;
    const orderLines: {
      item_id: string;
      quantity: number;
      unit_price: number;
      total_price: number;
      cost_price: number;
    }[] = [];

    for (const line of items) {
      const targetId = line.productId || line.itemId;
      const dbItem = dbItems.find((i) => i.id === targetId);
      if (!dbItem) continue;

      const unitPrice = Number(dbItem.selling_price);
      const lineTotal = unitPrice * line.quantity;
      totalAmount += lineTotal;

      orderLines.push({
        item_id: targetId as string,
        quantity: line.quantity,
        unit_price: unitPrice,
        total_price: lineTotal,
        cost_price: Number(dbItem.cost_price),
      });
    }

    if (orderLines.length === 0) {
      return { success: false, error: 'Articles sélectionnés invalides ou introuvables' };
    }

    // Récupérer le solde actuel du membre
    const { data: buyer, error: buyerErr } = await supabase
      .from('sbc_members')
      .select('wallet_balance')
      .eq('id', user.id)
      .single();

    if (buyerErr || !buyer) {
      return { success: false, error: 'Compte membre introuvable' };
    }

    const currentWallet = Number(buyer.wallet_balance || 0);
    // Décrémentation autorisant les valeurs négatives
    const newBalance = Number((currentWallet - totalAmount).toFixed(2));

    // 1. Mise à jour du solde membre
    const { error: updateMemErr } = await supabase
      .from('sbc_members')
      .update({ wallet_balance: newBalance })
      .eq('id', user.id);

    if (updateMemErr) throw updateMemErr;

    // 2. Création de la commande
    const { data: order, error: orderErr } = await supabase
      .from('bar_orders')
      .insert({
        buyer_id: user.id,
        channel: 'SELF_SERVICE',
        total_amount: totalAmount,
        payment_method: 'WALLET',
        payment_status: 'PAID',
      })
      .select()
      .single();

    if (orderErr || !order) throw orderErr;

    // 3. Lignes de commande
    const linesToInsert = orderLines.map((l) => ({
      order_id: order.id,
      item_id: l.item_id,
      quantity: l.quantity,
      unit_price: l.unit_price,
      total_price: l.total_price,
    }));
    await supabase.from('bar_order_items').insert(linesToInsert);

    // 4. Mouvements de stock & décrémentation
    for (const l of orderLines) {
      const dbItem = dbItems.find((i) => i.id === l.item_id);
      const newStock = Math.max(0, Number(dbItem?.stock_quantity || 0) - l.quantity);

      await Promise.all([
        supabase
          .from('bar_items')
          .update({ stock_quantity: newStock, updated_at: new Date().toISOString() })
          .eq('id', l.item_id),
        supabase.from('bar_stock_movements').insert({
          item_id: l.item_id,
          type: 'SALE_SELF',
          quantity: -l.quantity,
          cost_price_at_time: l.cost_price,
          reason: `Frigo Libre-service #${order.id.slice(0, 8)}`,
        }),
      ]);
    }

    revalidatePath('/buvette/self-service');
    revalidatePath('/buvette');
    revalidatePath('/dashboard');
    revalidatePath('/admin/buvette');
    return { success: true, orderId: order.id, newBalance, error: null };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erreur libre-service';
    return { success: false, error: message };
  }
}

/**
 * Récupère les données à jour du membre connecté pour le libre-service
 */
export async function getMemberSelfServiceData(): Promise<{
  data: { id: string; first_name: string; last_name: string; wallet_balance: number; email: string } | null;
  error: string | null;
}> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { data: null, error: 'Non authentifié' };

    const { data: member, error } = await supabase
      .from('sbc_members')
      .select('id, first_name, last_name, email, wallet_balance')
      .eq('id', user.id)
      .single();

    if (error || !member) return { data: null, error: error?.message || 'Membre introuvable' };

    return {
      data: {
        id: member.id,
        first_name: member.first_name,
        last_name: member.last_name,
        email: member.email,
        wallet_balance: Number(member.wallet_balance || 0),
      },
      error: null,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erreur profil membre';
    return { data: null, error: message };
  }
}

/**
 * Commande Frigo Libre-service (Alias pour rétrocompatibilité)
 */
export async function createSelfServiceOrder(input: {
  buyerId: string;
  items: { itemId: string; quantity: number }[];
  paymentMethod: BarPaymentMethod;
}): Promise<{
  success: boolean;
  orderId?: string;
  newBalance?: number;
  error: string | null;
}> {
  return submitSelfServiceOrder(input.items);
}

/**
 * Entrée de stock (Réapprovisionnement / Achat)
 */
export async function addBarStockEntry(
  itemId: string,
  quantity: number,
  costPrice: number,
  reason?: string
): Promise<{ success: boolean; error: string | null }> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Non authentifié' };

    const { data: item, error: itemErr } = await supabase
      .from('bar_items')
      .select('stock_quantity')
      .eq('id', itemId)
      .single();

    if (itemErr || !item) return { success: false, error: 'Article introuvable' };

    const newStock = Number(item.stock_quantity || 0) + Number(quantity);

    await Promise.all([
      supabase
        .from('bar_items')
        .update({
          stock_quantity: newStock,
          cost_price: Number(costPrice),
          updated_at: new Date().toISOString(),
        })
        .eq('id', itemId),
      supabase.from('bar_stock_movements').insert({
        item_id: itemId,
        type: 'ENTRY',
        quantity: Number(quantity),
        cost_price_at_time: Number(costPrice),
        reason: reason?.trim() || 'Réapprovisionnement',
        admin_id: user.id,
      }),
    ]);

    revalidatePath('/admin/buvette');
    return { success: true, error: null };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erreur entrée stock';
    return { success: false, error: message };
  }
}

/**
 * Ajustement physique d'inventaire
 */
export async function adjustBarInventory(
  adjustments: { itemId: string; countedQuantity: number; reason?: string }[]
): Promise<{ success: boolean; error: string | null }> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Non authentifié' };

    for (const adj of adjustments) {
      const { data: item } = await supabase
        .from('bar_items')
        .select('stock_quantity, cost_price')
        .eq('id', adj.itemId)
        .single();

      if (!item) continue;

      const currentStock = Number(item.stock_quantity || 0);
      const counted = Number(adj.countedQuantity);
      const diff = counted - currentStock;

      if (diff !== 0) {
        const movementType = diff < 0 ? 'LOSS' : 'ADJUSTMENT';

        await Promise.all([
          supabase
            .from('bar_items')
            .update({ stock_quantity: counted, updated_at: new Date().toISOString() })
            .eq('id', adj.itemId),
          supabase.from('bar_stock_movements').insert({
            item_id: adj.itemId,
            type: movementType,
            quantity: diff,
            cost_price_at_time: Number(item.cost_price || 0),
            reason: adj.reason || `Ajustement inventaire (${diff > 0 ? '+' : ''}${diff})`,
            admin_id: user.id,
          }),
        ]);
      }
    }

    revalidatePath('/admin/buvette');
    return { success: true, error: null };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erreur inventaire';
    return { success: false, error: message };
  }
}

/**
 * Liste de courses mobile intelligente
 */
export async function getBarShoppingList(): Promise<{
  data: ShoppingListItem[];
  error: string | null;
}> {
  try {
    const supabase = await createClient();

    const { data: items, error } = await supabase
      .from('bar_items')
      .select(`
        *,
        category:category_id (id, name, display_order)
      `)
      .eq('is_active', true)
      .order('name', { ascending: true });

    if (error) throw error;

    const shoppingList: ShoppingListItem[] = (items || [])
      .filter((i) => Number(i.stock_quantity) <= Number(i.alert_threshold))
      .map((i) => {
        const currentStock = Number(i.stock_quantity);
        const threshold = Number(i.alert_threshold);
        const targetStock = threshold * 3; // Reconstitue 3x le seuil de sécurité
        const suggestedBuyQty = Math.max(1, targetStock - currentStock);

        return {
          item: {
            id: i.id,
            category_id: i.category_id,
            name: i.name,
            selling_price: Number(i.selling_price),
            cost_price: Number(i.cost_price),
            stock_quantity: currentStock,
            alert_threshold: threshold,
            is_active: Boolean(i.is_active),
            image_url: i.image_url,
            category: i.category ? {
              id: (i.category as { id: string; name: string; display_order: number }).id,
              name: (i.category as { id: string; name: string; display_order: number }).name,
              display_order: (i.category as { id: string; name: string; display_order: number }).display_order,
            } : null,
          },
          currentStock,
          threshold,
          suggestedBuyQty,
          isChecked: false,
        };
      });

    return { data: shoppingList, error: null };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erreur liste courses';
    return { data: [], error: message };
  }
}

/**
 * Création ou mise à jour d'un article
 */
export async function upsertBarItem(
  item: Partial<BarItem>
): Promise<{ success: boolean; error: string | null }> {
  try {
    const supabase = await createClient();

    const payload = {
      category_id: item.category_id,
      name: item.name?.trim(),
      selling_price: Number(item.selling_price || 0),
      cost_price: Number(item.cost_price || 0),
      stock_quantity: Number(item.stock_quantity || 0),
      alert_threshold: Number(item.alert_threshold || 10),
      is_active: item.is_active ?? true,
      image_url: item.image_url || null,
      updated_at: new Date().toISOString(),
    };

    if (item.id) {
      const { error } = await supabase
        .from('bar_items')
        .update(payload)
        .eq('id', item.id);
      if (error) throw error;
    } else {
      const { error } = await supabase.from('bar_items').insert(payload);
      if (error) throw error;
    }

    revalidatePath('/admin/buvette');
    return { success: true, error: null };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erreur article';
    return { success: false, error: message };
  }
}

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
 * Recharger le portefeuille d'un membre (Créditer de l'argent)
 */
export async function topUpMemberWallet(
  memberId: string,
  amount: number,
  method: string = 'Virement'
): Promise<{ success: boolean; newBalance?: number; error: string | null }> {
  try {
    const supabase = await createClient();

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
