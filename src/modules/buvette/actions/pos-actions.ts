'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { BarPaymentMethod } from '@/types/models';
import { assertReferentOrAdmin } from '@/lib/auth/assert-role';

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
    const authCheck = await assertReferentOrAdmin(supabase, null, 'can_manage_bar');
    if (!authCheck.authorized || !authCheck.user) {
      return { success: false, error: authCheck.error };
    }

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
        seller_id: authCheck.user.id,
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
          admin_id: authCheck.user.id,
        }),
      ]);
    }

    revalidatePath('/admin/buvette');
    revalidatePath('/buvette');
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
