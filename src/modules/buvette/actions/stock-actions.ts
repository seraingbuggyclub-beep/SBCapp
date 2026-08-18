'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { ShoppingListItem } from '@/types/models';
import { assertReferentOrAdmin } from '@/lib/auth/assert-role';

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
    const authCheck = await assertReferentOrAdmin(supabase, null, 'can_manage_bar');
    if (!authCheck.authorized || !authCheck.user) {
      return { success: false, error: authCheck.error };
    }

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
        admin_id: authCheck.user.id,
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
    const authCheck = await assertReferentOrAdmin(supabase, null, 'can_manage_bar');
    if (!authCheck.authorized || !authCheck.user) {
      return { success: false, error: authCheck.error };
    }

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
            admin_id: authCheck.user.id,
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
 * Liste de courses mobile intelligente (générée selon seuils d'alerte)
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
