-- ==============================================================================
-- Migration : Rôle Référent & Permissions Modulaires par Piste
-- Date : 2026-08-18
-- Seraing Buggy Club (ASBL)
-- ==============================================================================

-- 1. Ajout sécurisé de la valeur 'referent' dans le type ENUM sbc_role
DO $$
BEGIN
    ALTER TYPE public.sbc_role ADD VALUE IF NOT EXISTS 'referent';
EXCEPTION
    WHEN duplicate_object THEN null;
    WHEN undefined_object THEN null;
END $$;

-- 2. Ajout de la colonne referent_permissions (JSONB) sur sbc_members
ALTER TABLE public.sbc_members
ADD COLUMN IF NOT EXISTS referent_permissions JSONB DEFAULT '{
  "allowed_track_ids": [],
  "can_open_close_tracks": false,
  "can_manage_track_events": false,
  "allowed_event_track_ids": [],
  "can_manage_bar": false,
  "can_view_attendance": true,
  "can_manage_pit_lane": false
}'::jsonb;

-- 3. Évolution des colonnes sur la table tracks existante
ALTER TABLE public.tracks ADD COLUMN IF NOT EXISTS slug TEXT;
ALTER TABLE public.tracks ADD COLUMN IF NOT EXISTS type TEXT;
ALTER TABLE public.tracks ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'OPEN';
ALTER TABLE public.tracks ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE public.tracks ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();

-- Mise à jour / Consolidation des 4 pistes officielles
UPDATE public.tracks
SET 
    name = 'Piste Astro 1/10',
    slug = 'astro-1-10',
    type = '1/10 Electric',
    status = 'OPEN',
    description = 'Tracé synthétique AstroTurf haute adhérence pour buggies et trucks 1/10 électriques.',
    updated_at = now()
WHERE name = '1/10' OR slug = 'astro-1-10';

UPDATE public.tracks
SET 
    name = 'Piste Multi 1/8',
    slug = 'multi-1-8',
    type = '1/8 Nitro & Elec',
    status = 'OPEN',
    description = 'Grand circuit technique mixte pour buggies et truggies 1/8 thermiques et électriques.',
    updated_at = now()
WHERE name = '1/8' OR slug = 'multi-1-8';

UPDATE public.tracks
SET 
    name = 'Piste Terre Vintage / Rallye Game',
    slug = 'terre-vintage-rallye',
    type = 'Vintage & Rallye',
    status = 'OPEN',
    description = 'Piste en terre naturelle compactée pour modèles vintage et rallye game 1/10.',
    updated_at = now()
WHERE name = 'Rallye Game' OR slug = 'terre-vintage-rallye';

UPDATE public.tracks
SET 
    name = 'Piste Crawler / Scale',
    slug = 'crawler-scale',
    type = 'Crawler & Scale',
    status = 'OPEN',
    description = 'Zone d''évolution d''obstacles rocheux et ponts de franchissement pour crawlers et scale.',
    updated_at = now()
WHERE name = 'Crawler' OR slug = 'crawler-scale';

-- Insertion des pistes si elles n'existaient pas du tout
INSERT INTO public.tracks (name, slug, type, status, is_open, description)
SELECT 'Piste Astro 1/10', 'astro-1-10', '1/10 Electric', 'OPEN', true, 'Tracé synthétique AstroTurf haute adhérence pour buggies et trucks 1/10 électriques.'
WHERE NOT EXISTS (SELECT 1 FROM public.tracks WHERE slug = 'astro-1-10' OR name = 'Piste Astro 1/10');

INSERT INTO public.tracks (name, slug, type, status, is_open, description)
SELECT 'Piste Multi 1/8', 'multi-1-8', '1/8 Nitro & Elec', 'OPEN', true, 'Grand circuit technique mixte pour buggies et truggies 1/8 thermiques et électriques.'
WHERE NOT EXISTS (SELECT 1 FROM public.tracks WHERE slug = 'multi-1-8' OR name = 'Piste Multi 1/8');

INSERT INTO public.tracks (name, slug, type, status, is_open, description)
SELECT 'Piste Terre Vintage / Rallye Game', 'terre-vintage-rallye', 'Vintage & Rallye', 'OPEN', true, 'Piste en terre naturelle compactée pour modèles vintage et rallye game 1/10.'
WHERE NOT EXISTS (SELECT 1 FROM public.tracks WHERE slug = 'terre-vintage-rallye' OR name = 'Piste Terre Vintage / Rallye Game');

INSERT INTO public.tracks (name, slug, type, status, is_open, description)
SELECT 'Piste Crawler / Scale', 'crawler-scale', 'Crawler & Scale', 'OPEN', true, 'Zone d''évolution d''obstacles rocheux et ponts de franchissement pour crawlers et scale.'
WHERE NOT EXISTS (SELECT 1 FROM public.tracks WHERE slug = 'crawler-scale' OR name = 'Piste Crawler / Scale');

-- 4. Enable RLS sur tracks
ALTER TABLE public.tracks ENABLE ROW LEVEL SECURITY;

-- Lecture publique de l'état des pistes
DROP POLICY IF EXISTS "tracks_read_public" ON public.tracks;
DROP POLICY IF EXISTS "Lecture publique de l'état des pistes" ON public.tracks;
CREATE POLICY "tracks_read_public" ON public.tracks
    FOR SELECT
    USING (true);

-- Modification réservée aux Admins et Référents assignés
DROP POLICY IF EXISTS "tracks_admin_and_referents_update" ON public.tracks;
DROP POLICY IF EXISTS "Modification des pistes par les admins" ON public.tracks;
CREATE POLICY "tracks_admin_and_referents_update" ON public.tracks
    FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.sbc_members
            WHERE sbc_members.id = auth.uid()
            AND (
                sbc_members.role::text = 'admin'
                OR sbc_members.email = 'stefga1@gmail.com'
                OR (
                    sbc_members.role::text = 'referent'
                    AND (sbc_members.referent_permissions->>'can_open_close_tracks')::boolean = true
                    AND (
                        sbc_members.referent_permissions->'allowed_track_ids' ? tracks.id::text
                        OR sbc_members.referent_permissions->'allowed_track_ids' ? tracks.slug
                        OR sbc_members.referent_permissions->'allowed_track_ids' ? tracks.name
                    )
                )
            )
        )
    );
