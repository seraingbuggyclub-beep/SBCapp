-- ==============================================================================
-- Migration : Module Vie ASBL & Assemblées Générales (AG)
-- Date : 2026-08-19
-- Seraing Buggy Club (ASBL)
-- ==============================================================================

-- 1. Table des Assemblées Générales (AG)
CREATE TABLE IF NOT EXISTS public.sbc_asbl_general_assemblies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type TEXT NOT NULL CHECK (type IN ('ORDINAIRE', 'EXTRAORDINAIRE')) DEFAULT 'ORDINAIRE',
    title TEXT NOT NULL,
    date TIMESTAMPTZ NOT NULL,
    location TEXT NOT NULL DEFAULT 'Seraing Buggy Club ASBL (Rue Bigaye 60, 4101 Seraing)',
    status TEXT NOT NULL CHECK (status IN ('DRAFT', 'VOTING', 'SIGNING', 'ARCHIVED')) DEFAULT 'DRAFT',
    agenda JSONB NOT NULL DEFAULT '[]'::jsonb,
    content_notes TEXT DEFAULT '',
    pdf_url TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Table des Résolutions soumises aux votes lors des AG
CREATE TABLE IF NOT EXISTS public.sbc_asbl_ag_resolutions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ag_id UUID NOT NULL REFERENCES public.sbc_asbl_general_assemblies(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    votes_for INTEGER NOT NULL DEFAULT 0,
    votes_against INTEGER NOT NULL DEFAULT 0,
    votes_abstain INTEGER NOT NULL DEFAULT 0,
    is_adopted BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Table des Signatures électroniques des membres du CA / PV d'AG
CREATE TABLE IF NOT EXISTS public.sbc_asbl_ag_signatures (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ag_id UUID NOT NULL REFERENCES public.sbc_asbl_general_assemblies(id) ON DELETE CASCADE,
    member_id UUID REFERENCES public.sbc_members(id) ON DELETE SET NULL,
    signer_name TEXT NOT NULL,
    signer_role TEXT NOT NULL DEFAULT 'Administrateur',
    signature_data TEXT NOT NULL, -- Base64 SVG / PNG
    signed_at TIMESTAMPTZ DEFAULT now()
);

-- Index pour les recherches rapides
CREATE INDEX IF NOT EXISTS idx_sbc_asbl_ag_date ON public.sbc_asbl_general_assemblies(date DESC);
CREATE INDEX IF NOT EXISTS idx_sbc_asbl_ag_resolutions_ag_id ON public.sbc_asbl_ag_resolutions(ag_id);
CREATE INDEX IF NOT EXISTS idx_sbc_asbl_ag_signatures_ag_id ON public.sbc_asbl_ag_signatures(ag_id);

-- Activation du Row Level Security (RLS)
ALTER TABLE public.sbc_asbl_general_assemblies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sbc_asbl_ag_resolutions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sbc_asbl_ag_signatures ENABLE ROW LEVEL SECURITY;

-- Politiques RLS : Strictement réservé aux Administrateurs ASBL
DROP POLICY IF EXISTS "ag_admin_all" ON public.sbc_asbl_general_assemblies;
CREATE POLICY "ag_admin_all" ON public.sbc_asbl_general_assemblies
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.sbc_members
            WHERE sbc_members.id = auth.uid()
            AND (sbc_members.role = 'admin' OR sbc_members.email = 'stefga1@gmail.com')
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.sbc_members
            WHERE sbc_members.id = auth.uid()
            AND (sbc_members.role = 'admin' OR sbc_members.email = 'stefga1@gmail.com')
        )
    );

DROP POLICY IF EXISTS "ag_resolutions_admin_all" ON public.sbc_asbl_ag_resolutions;
CREATE POLICY "ag_resolutions_admin_all" ON public.sbc_asbl_ag_resolutions
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.sbc_members
            WHERE sbc_members.id = auth.uid()
            AND (sbc_members.role = 'admin' OR sbc_members.email = 'stefga1@gmail.com')
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.sbc_members
            WHERE sbc_members.id = auth.uid()
            AND (sbc_members.role = 'admin' OR sbc_members.email = 'stefga1@gmail.com')
        )
    );

DROP POLICY IF EXISTS "ag_signatures_admin_all" ON public.sbc_asbl_ag_signatures;
CREATE POLICY "ag_signatures_admin_all" ON public.sbc_asbl_ag_signatures
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.sbc_members
            WHERE sbc_members.id = auth.uid()
            AND (sbc_members.role = 'admin' OR sbc_members.email = 'stefga1@gmail.com')
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.sbc_members
            WHERE sbc_members.id = auth.uid()
            AND (sbc_members.role = 'admin' OR sbc_members.email = 'stefga1@gmail.com')
        )
    );

-- Données initiales d'exemple si la table est vide
INSERT INTO public.sbc_asbl_general_assemblies (type, title, date, location, status, agenda, content_notes)
SELECT 
    'ORDINAIRE',
    'Assemblée Générale Annuelle Ordinaire 2026',
    '2026-03-15 14:00:00+01',
    'Seraing Buggy Club ASBL (Rue Bigaye 60, 4101 Seraing)',
    'ARCHIVED',
    '["Approbation du Procès-Verbal de l''AG 2025", "Rapport moral du Président pour l''exercice 2025", "Présentation et approbation des comptes annuels 2025", "Décharge aux administrateurs pour leur gestion", "Vote du budget prévisionnel 2026 et maintien des cotisations", "Planning des travaux piste Astro et Vintage 2026", "Divers et questions des membres"]'::jsonb,
    'L''Assemblée Générale s''est réunie valablement sous la présidence de Stéphane. L''ensemble des points à l''ordre du jour ont été débattus dans un climat constructif. Quorum de présence vérifié et atteint avec 24 membres effectifs présents ou représentés.'
WHERE NOT EXISTS (SELECT 1 FROM public.sbc_asbl_general_assemblies LIMIT 1);
