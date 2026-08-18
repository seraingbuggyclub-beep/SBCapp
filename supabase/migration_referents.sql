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

-- 2. Ajout de la colonne referent_permissions (JSONB)
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

-- 3. Structure dynamique et consolidation de la table tracks
CREATE TABLE IF NOT EXISTS public.tracks (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    type TEXT,
    status TEXT NOT NULL DEFAULT 'OPEN', -- 'OPEN', 'CLOSED', 'WORK'
    is_open BOOLEAN NOT NULL DEFAULT true,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Insertion / Mise à jour des pistes officielles du club
INSERT INTO public.tracks (id, name, slug, type, status, is_open, description)
VALUES
    ('track-1-10', 'Piste Astro 1/10', 'astro-1-10', '1/10 Electric', 'OPEN', true, 'Tracé synthétique AstroTurf haute adhérence pour buggies et trucks 1/10 électriques.'),
    ('track-1-8', 'Piste Multi 1/8', 'multi-1-8', '1/8 Nitro & Elec', 'OPEN', true, 'Grand circuit technique mixte pour buggies et truggies 1/8 thermiques et électriques.'),
    ('track-vintage-rallye', 'Piste Terre Vintage / Rallye Game', 'terre-vintage-rallye', 'Vintage & Rallye', 'OPEN', true, 'Piste en terre naturelle compactée pour modèles vintage et rallye game 1/10.'),
    ('track-crawler-scale', 'Piste Crawler / Scale', 'crawler-scale', 'Crawler & Scale', 'OPEN', true, 'Zone d''évolution d''obstacles rocheux et ponts de franchissement pour crawlers et scale.')
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    slug = EXCLUDED.slug,
    type = EXCLUDED.type,
    description = EXCLUDED.description,
    updated_at = now();

-- 4. Enable RLS sur tracks
ALTER TABLE public.tracks ENABLE ROW LEVEL SECURITY;

-- Lecture publique de l'état des pistes
DROP POLICY IF EXISTS "tracks_read_public" ON public.tracks;
CREATE POLICY "tracks_read_public" ON public.tracks
    FOR SELECT
    USING (true);

-- Modification réservée aux Admins et Référents assignés
DROP POLICY IF EXISTS "tracks_admin_and_referents_update" ON public.tracks;
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
                    AND sbc_members.referent_permissions->'allowed_track_ids' ? tracks.id
                )
            )
        )
    );
