'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { BarPaymentMethod } from '@/types/models';

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
