-- =========================================================================
-- MIGRATION : PISTES DYNAMIQUES, NETTOYAGE & CONTRAINTE UUID (TRACKS)
-- =========================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. Nettoyage préventif des anciens IDs textuels / non-UUID si la table existait
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'tracks' 
          AND column_name = 'id' 
          AND data_type != 'uuid'
    ) THEN
        -- Remplacer les chaînes statiques (ex: 'track-crawler') par de véritables UUIDs
        UPDATE public.tracks 
        SET id = gen_random_uuid()::text 
        WHERE id !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';
        
        -- Conversion stricte de la colonne id en UUID avec valeur par défaut gen_random_uuid()
        ALTER TABLE public.tracks ALTER COLUMN id TYPE uuid USING id::uuid;
        ALTER TABLE public.tracks ALTER COLUMN id SET DEFAULT gen_random_uuid();
    END IF;
END $$;

-- 2. Structure définitive de la table tracks
CREATE TABLE IF NOT EXISTS public.tracks (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL UNIQUE,
    is_open boolean NOT NULL DEFAULT true,
    status_message text,
    closure_reason text,
    closure_type text DEFAULT 'DURATION',
    reopening_at timestamptz,
    order_index integer NOT NULL DEFAULT 0,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Colonnes additionnelles
ALTER TABLE public.tracks ADD COLUMN IF NOT EXISTS status_message TEXT;
ALTER TABLE public.tracks ADD COLUMN IF NOT EXISTS closure_reason TEXT;
ALTER TABLE public.tracks ADD COLUMN IF NOT EXISTS closure_type TEXT DEFAULT 'DURATION';
ALTER TABLE public.tracks ADD COLUMN IF NOT EXISTS reopening_at TIMESTAMPTZ;
ALTER TABLE public.tracks ADD COLUMN IF NOT EXISTS order_index INTEGER DEFAULT 0;
ALTER TABLE public.tracks ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE public.tracks ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- 3. Insertion des 4 pistes officielles avec véritables UUIDs générés
INSERT INTO public.tracks (id, name, is_open, order_index)
VALUES 
    (gen_random_uuid(), '1/10', true, 1),
    (gen_random_uuid(), '1/8', true, 2),
    (gen_random_uuid(), 'Rallye Game', true, 3),
    (gen_random_uuid(), 'Crawler', true, 4)
ON CONFLICT (name) DO UPDATE 
SET order_index = EXCLUDED.order_index
WHERE tracks.order_index IS NULL OR tracks.order_index = 0;

-- 4. Activation de la sécurité Row Level Security (RLS)
ALTER TABLE public.tracks ENABLE ROW LEVEL SECURITY;

-- Lecture publique de l'état des pistes
DROP POLICY IF EXISTS "Lecture publique de l'état des pistes" ON public.tracks;
CREATE POLICY "Lecture publique de l'état des pistes" ON public.tracks
    FOR SELECT USING (true);

-- Insertion des pistes par les administrateurs
DROP POLICY IF EXISTS "Insertion des pistes par les admins" ON public.tracks;
CREATE POLICY "Insertion des pistes par les admins" ON public.tracks
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.sbc_members
            WHERE public.sbc_members.id = auth.uid()
            AND public.sbc_members.role = 'admin'
        )
    );

-- Modification des pistes par les administrateurs et référents
DROP POLICY IF EXISTS "Modification des pistes par les admins" ON public.tracks;
CREATE POLICY "Modification des pistes par les admins" ON public.tracks
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.sbc_members
            WHERE public.sbc_members.id = auth.uid()
            AND (public.sbc_members.role = 'admin' OR public.sbc_members.role = 'referent')
        )
    );

-- Suppression des pistes par les administrateurs
DROP POLICY IF EXISTS "Suppression des pistes par les admins" ON public.tracks;
CREATE POLICY "Suppression des pistes par les admins" ON public.tracks
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM public.sbc_members
            WHERE public.sbc_members.id = auth.uid()
            AND public.sbc_members.role = 'admin'
        )
    );
