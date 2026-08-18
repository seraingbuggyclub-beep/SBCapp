-- ==============================================================================
-- Migration : Inventaire Matériel / Clés Confiés & Signature Convention Référent
-- Date : 2026-08-18
-- Seraing Buggy Club (ASBL)
-- ==============================================================================

-- 1. Table member_assigned_keys (Inventaire matériel & clés confiés)
CREATE TABLE IF NOT EXISTS public.member_assigned_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    member_id UUID NOT NULL REFERENCES public.sbc_members(id) ON DELETE CASCADE,
    item_name TEXT NOT NULL,
    item_code TEXT,
    given_at DATE NOT NULL DEFAULT CURRENT_DATE,
    returned_at DATE,
    given_by UUID REFERENCES public.sbc_members(id) ON DELETE SET NULL,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index pour les recherches rapides
CREATE INDEX IF NOT EXISTS idx_member_assigned_keys_member_id ON public.member_assigned_keys(member_id);
CREATE INDEX IF NOT EXISTS idx_member_assigned_keys_returned ON public.member_assigned_keys(returned_at);

-- 2. Ajout des colonnes de signature convention référent sur sbc_members
ALTER TABLE public.sbc_members
ADD COLUMN IF NOT EXISTS referent_contract_signed_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS referent_contract_ip TEXT,
ADD COLUMN IF NOT EXISTS referent_contract_version TEXT DEFAULT '2026-V1';

-- 3. Activation de la sécurité RLS sur member_assigned_keys
ALTER TABLE public.member_assigned_keys ENABLE ROW LEVEL SECURITY;

-- Politiques RLS pour member_assigned_keys
DROP POLICY IF EXISTS "member_assigned_keys_admin_all" ON public.member_assigned_keys;
CREATE POLICY "member_assigned_keys_admin_all" ON public.member_assigned_keys
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.sbc_members
            WHERE sbc_members.id = auth.uid()
            AND (sbc_members.role::text = 'admin' OR sbc_members.email = 'stefga1@gmail.com')
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.sbc_members
            WHERE sbc_members.id = auth.uid()
            AND (sbc_members.role::text = 'admin' OR sbc_members.email = 'stefga1@gmail.com')
        )
    );

DROP POLICY IF EXISTS "member_assigned_keys_member_read_own" ON public.member_assigned_keys;
CREATE POLICY "member_assigned_keys_member_read_own" ON public.member_assigned_keys
    FOR SELECT
    TO authenticated
    USING (
        member_id = auth.uid()
    );
