'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { BarCategory, BarItem, BarItemRow } from '@/types/models';
import { assertReferentOrAdmin } from '@/lib/auth/assert-role';

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
        .filter((item: BarItemRow) => item.is_active)
        .map((item: BarItemRow) => ({
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
 * Récupère tous les articles avec leurs catégories (pour la gestion des stocks & catalogue)
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
 * Création ou mise à jour d'un article buvette
 */
export async function upsertBarItem(
  item: Partial<BarItem>
): Promise<{ success: boolean; error: string | null }> {
  try {
    const supabase = await createClient();
    const authCheck = await assertReferentOrAdmin(supabase, null, 'can_manage_bar');
    if (!authCheck.authorized) {
      return { success: false, error: authCheck.error };
    }

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
    revalidatePath('/buvette');
    return { success: true, error: null };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erreur article';
    return { success: false, error: message };
  }
}
