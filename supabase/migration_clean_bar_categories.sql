-- ==============================================================================
-- NETTOYAGE DES CATÉGORIES INVALIDES / UUID & RÉASSIGNATION DES ARTICLES BUVETTE
-- ==============================================================================

-- 1. S'assurer que la catégorie par défaut 'Boissons' existe
INSERT INTO public.bar_categories (name, display_order)
VALUES ('Boissons', 1)
ON CONFLICT (name) DO NOTHING;

-- 2. Réassigner tous les articles pointant vers des catégories UUID ou orphelines vers 'Boissons'
WITH target_cat AS (
    SELECT id FROM public.bar_categories WHERE LOWER(name) = 'boissons' LIMIT 1
)
UPDATE public.bar_items
SET category_id = (SELECT id FROM target_cat)
WHERE category_id IN (
    SELECT id FROM public.bar_categories
    WHERE name ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
       OR TRIM(name) = ''
       OR name IS NULL
);

-- 3. Réassigner les articles dont le category_id ne pointe vers aucune catégorie existante
WITH target_cat AS (
    SELECT id FROM public.bar_categories WHERE LOWER(name) = 'boissons' LIMIT 1
)
UPDATE public.bar_items
SET category_id = (SELECT id FROM target_cat)
WHERE category_id NOT IN (SELECT id FROM public.bar_categories);

-- 4. Supprimer les catégories invalides dont le nom correspond à un format UUID
DELETE FROM public.bar_categories
WHERE name ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
   OR TRIM(name) = ''
   OR name IS NULL;

-- 5. S'assurer de la présence des 4 catégories par défaut
INSERT INTO public.bar_categories (name, display_order)
VALUES
    ('Boissons', 1),
    ('Snacks', 2),
    ('Restauration', 3),
    ('Divers', 4)
ON CONFLICT (name) DO NOTHING;
