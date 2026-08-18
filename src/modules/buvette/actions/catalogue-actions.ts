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

    // Filtrer les catégories valides
    const rawCategories = catRes.data || [];
    const hasInvalid = rawCategories.some(
      (c) => !c.name || !c.name.trim() || UUID_REGEX.test(c.name.trim())
    );

    // Si des catégories corrompues sont détectées, nettoyer en arrière-plan
    if (hasInvalid) {
      cleanInvalidBarCategories().catch((e) =>
        console.error('[getAllBarItemsWithStats] Erreur auto-clean:', e)
      );
    }

    const validCategories = rawCategories.filter(
      (c) => c.name && c.name.trim() && !UUID_REGEX.test(c.name.trim())
    );

    return {
      data: items,
      categories: validCategories,
      error: null,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erreur inventaire';
    return { data: [], categories: [], error: message };
  }
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Nettoyage automatique des catégories invalides/orphelines (ex: UUID en guise de nom)
 * et réassignation des articles vers 'Boissons'.
 */
export async function cleanInvalidBarCategories(): Promise<{
  success: boolean;
  cleanedCount: number;
  error: string | null;
}> {
  try {
    const supabase = await createClient();

    // 1. S'assurer que la catégorie de repli 'Boissons' existe
    let boissonsId: string | null = null;
    const { data: boissonsCat } = await supabase
      .from('bar_categories')
      .select('id')
      .ilike('name', 'Boissons')
      .maybeSingle();

    if (boissonsCat) {
      boissonsId = boissonsCat.id;
    } else {
      const { data: createdBoissons } = await supabase
        .from('bar_categories')
        .insert({ name: 'Boissons', display_order: 1 })
        .select('id')
        .single();
      boissonsId = createdBoissons?.id || null;
    }

    if (!boissonsId) {
      return { success: false, cleanedCount: 0, error: "Impossible de créer la catégorie 'Boissons'" };
    }

    // 2. Récupérer toutes les catégories
    const { data: allCategories, error: catErr } = await supabase
      .from('bar_categories')
      .select('id, name');

    if (catErr) throw catErr;

    const invalidCats = (allCategories || []).filter(
      (c) => !c.name || !c.name.trim() || UUID_REGEX.test(c.name.trim())
    );

    let cleaned = 0;

    for (const inv of invalidCats) {
      // Réassigner tous les articles de cette catégorie invalide vers 'Boissons'
      await supabase
        .from('bar_items')
        .update({ category_id: boissonsId })
        .eq('category_id', inv.id);

      // Supprimer la catégorie invalide
      const { error: delErr } = await supabase
        .from('bar_categories')
        .delete()
        .eq('id', inv.id);

      if (!delErr) cleaned++;
    }

    if (cleaned > 0) {
      revalidatePath('/admin/buvette');
      revalidatePath('/buvette');
      revalidatePath('/buvette/self-service');
    }

    return { success: true, cleanedCount: cleaned, error: null };
  } catch (err: unknown) {
    const errorDetails = err instanceof Error ? err.message : String(err);
    console.error('[cleanInvalidBarCategories] Erreur cleanup:', errorDetails);
    return { success: false, cleanedCount: 0, error: errorDetails };
  }
}

/**
 * Création ou récupération d'une catégorie de buvette par son nom
 */
export async function createOrGetBarCategory(
  name: string
): Promise<{ data: { id: string; name: string } | null; error: string | null }> {
  try {
    const trimmed = name.trim();
    if (!trimmed) {
      return { data: null, error: 'Le nom de la catégorie est obligatoire.' };
    }

    // Protection anti-bug : refuser qu'un UUID soit créé en tant que nom de catégorie
    if (UUID_REGEX.test(trimmed)) {
      console.error('[createOrGetBarCategory] Tentative de création avec un UUID au lieu d’un nom:', trimmed);
      return { data: null, error: 'Nom de catégorie invalide (UUID détecté).' };
    }

    const supabase = await createClient();
    const authCheck = await assertReferentOrAdmin(supabase, null, 'can_manage_bar');
    if (!authCheck.authorized) {
      console.warn('[createOrGetBarCategory] Accès non autorisé:', authCheck.error);
      return { data: null, error: authCheck.error || 'Non autorisé' };
    }

    // 1. Vérifier si la catégorie existe déjà (insensible à la casse)
    const { data: existing, error: findErr } = await supabase
      .from('bar_categories')
      .select('id, name')
      .ilike('name', trimmed)
      .maybeSingle();

    if (findErr) {
      console.error('[createOrGetBarCategory] Erreur recherche existant:', {
        message: findErr.message,
        details: findErr.details,
        hint: findErr.hint,
        code: findErr.code,
      });
      return {
        data: null,
        error: `Erreur DB recherche: ${findErr.message} (code: ${findErr.code})`,
      };
    }

    if (existing) {
      return { data: existing, error: null };
    }

    // 2. Récupérer le display_order max
    const { data: maxOrderData, error: maxOrderErr } = await supabase
      .from('bar_categories')
      .select('display_order')
      .order('display_order', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (maxOrderErr) {
      console.warn('[createOrGetBarCategory] Avertissement calcul display_order:', maxOrderErr.message);
    }

    const nextOrder = (maxOrderData?.display_order ?? 0) + 1;

    // 3. Insertion de la nouvelle catégorie
    const { data: created, error: insertErr } = await supabase
      .from('bar_categories')
      .insert({
        name: trimmed,
        display_order: nextOrder,
      })
      .select('id, name')
      .single();

    if (insertErr) {
      console.error('[createOrGetBarCategory] Erreur insertion catégorie Supabase:', {
        message: insertErr.message,
        details: insertErr.details,
        hint: insertErr.hint,
        code: insertErr.code,
      });

      // Si violation de contrainte unique (ex: concurrence ou trigger)
      if (insertErr.code === '23505') {
        const { data: fallback } = await supabase
          .from('bar_categories')
          .select('id, name')
          .ilike('name', trimmed)
          .maybeSingle();
        if (fallback) {
          return { data: fallback, error: null };
        }
      }

      // Si erreur de permission RLS
      if (insertErr.code === '42501') {
        return {
          data: null,
          error: `Permission RLS refusée sur bar_categories: ${insertErr.message} (code: ${insertErr.code})`,
        };
      }

      return {
        data: null,
        error: `Erreur création catégorie [${insertErr.code}]: ${insertErr.message} ${insertErr.details || ''}`,
      };
    }

    revalidatePath('/admin/buvette');
    revalidatePath('/buvette');
    revalidatePath('/buvette/self-service');

    return { data: created, error: null };
  } catch (err: unknown) {
    const errorDetails =
      err instanceof Error
        ? err.message
        : typeof err === 'object' && err !== null
        ? JSON.stringify(err)
        : String(err);

    console.error('[createOrGetBarCategory] Exception inattendue:', errorDetails);
    return { data: null, error: `Exception: ${errorDetails}` };
  }
}

/**
 * Suppression d'un article buvette
 */
export async function deleteBarItem(
  itemId: string
): Promise<{ success: boolean; error: string | null }> {
  try {
    const supabase = await createClient();
    const authCheck = await assertReferentOrAdmin(supabase, null, 'can_manage_bar');
    if (!authCheck.authorized) {
      console.warn('[deleteBarItem] Accès non autorisé:', authCheck.error);
      return { success: false, error: authCheck.error };
    }

    if (!itemId) {
      return { success: false, error: "Identifiant d'article invalide." };
    }

    const { error } = await supabase
      .from('bar_items')
      .delete()
      .eq('id', itemId);

    if (error) {
      console.error('[deleteBarItem] Erreur suppression:', error);
      return {
        success: false,
        error: `Erreur suppression article [${error.code}]: ${error.message}`,
      };
    }

    revalidatePath('/admin/buvette');
    revalidatePath('/buvette');
    revalidatePath('/buvette/self-service');
    return { success: true, error: null };
  } catch (err: unknown) {
    const errorDetails =
      err instanceof Error
        ? err.message
        : typeof err === 'object' && err !== null
        ? JSON.stringify(err)
        : String(err);

    console.error('[deleteBarItem] Exception inattendue:', errorDetails);
    return { success: false, error: `Exception: ${errorDetails}` };
  }
}

/**
 * Création ou mise à jour d'un article buvette
 */
export async function upsertBarItem(
  item: Partial<BarItem> & { category_name?: string }
): Promise<{ success: boolean; error: string | null }> {
  try {
    const supabase = await createClient();
    const authCheck = await assertReferentOrAdmin(supabase, null, 'can_manage_bar');
    if (!authCheck.authorized) {
      console.warn('[upsertBarItem] Accès non autorisé:', authCheck.error);
      return { success: false, error: authCheck.error };
    }

    let finalCategoryId = item.category_id;

    // 1. Si category_name est fourni, résoudre ou créer la catégorie correspondante
    if (item.category_name && item.category_name.trim() && !UUID_REGEX.test(item.category_name.trim())) {
      const catRes = await createOrGetBarCategory(item.category_name.trim());
      if (catRes.error || !catRes.data) {
        return {
          success: false,
          error: catRes.error || 'Impossible de créer ou trouver la catégorie',
        };
      }
      finalCategoryId = catRes.data.id;
    } else if (finalCategoryId && !UUID_REGEX.test(finalCategoryId)) {
      // Si finalCategoryId n'est pas un UUID valide, c'est un nom textuel
      const catRes = await createOrGetBarCategory(finalCategoryId);
      if (catRes.error || !catRes.data) {
        return {
          success: false,
          error: catRes.error || 'Impossible de créer la catégorie',
        };
      }
      finalCategoryId = catRes.data.id;
    }

    if (!finalCategoryId || !UUID_REGEX.test(finalCategoryId)) {
      return {
        success: false,
        error: 'Une catégorie valide est requise pour cet article.',
      };
    }

    const payload = {
      category_id: finalCategoryId,
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

      if (error) {
        console.error('[upsertBarItem] Erreur mise à jour:', error);
        return {
          success: false,
          error: `Erreur modification article [${error.code}]: ${error.message}`,
        };
      }
    } else {
      const { error } = await supabase.from('bar_items').insert(payload);
      if (error) {
        console.error('[upsertBarItem] Erreur insertion:', error);
        return {
          success: false,
          error: `Erreur création article [${error.code}]: ${error.message}`,
        };
      }
    }

    revalidatePath('/admin/buvette');
    revalidatePath('/buvette');
    revalidatePath('/buvette/self-service');
    return { success: true, error: null };
  } catch (err: unknown) {
    const errorDetails =
      err instanceof Error
        ? err.message
        : typeof err === 'object' && err !== null
        ? JSON.stringify(err)
        : String(err);

    console.error('[upsertBarItem] Exception inattendue:', errorDetails);
    return { success: false, error: `Exception: ${errorDetails}` };
  }
}
