-- ==============================================================================
-- Migration : Module Liste Noire Privée (Blacklist) & Blocage Légal
-- Date : 2026-08-18
-- Seraing Buggy Club (ASBL)
-- ==============================================================================

-- 1. Création de la table blacklist (Strictement confidentielle - Organe d'Administration)
CREATE TABLE IF NOT EXISTS public.blacklist (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT,
    first_name TEXT,
    last_name TEXT,
    license_number TEXT,
    internal_reason TEXT NOT NULL,
    rejection_message TEXT NOT NULL DEFAULT 'Votre demande d''inscription n''a pas été retenue par l''Organe d''Administration du Seraing Buggy Club (ASBL), conformément aux statuts du club.',
    blocked_by UUID REFERENCES public.sbc_members(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Index pour recherches rapides et insensibles à la casse
CREATE INDEX IF NOT EXISTS idx_blacklist_lower_email ON public.blacklist (lower(email));
CREATE INDEX IF NOT EXISTS idx_blacklist_license_number ON public.blacklist (license_number);
CREATE INDEX IF NOT EXISTS idx_blacklist_name ON public.blacklist (lower(last_name), lower(first_name));

-- 3. Activation de la sécurité RLS
ALTER TABLE public.blacklist ENABLE ROW LEVEL SECURITY;

-- 4. Politique RLS stricte réservée aux Administrateurs et Super-Admin
DROP POLICY IF EXISTS "blacklist_admin_all" ON public.blacklist;
CREATE POLICY "blacklist_admin_all" ON public.blacklist
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

-- 5. Fonction RPC sécurisée SECURITY DEFINER pour vérification avant inscription
CREATE OR REPLACE FUNCTION public.check_blacklist_status(
    check_email TEXT DEFAULT NULL,
    check_first_name TEXT DEFAULT NULL,
    check_last_name TEXT DEFAULT NULL,
    check_license_number TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    found_entry RECORD;
    clean_email TEXT := lower(trim(coalesce(check_email, '')));
    clean_fname TEXT := lower(trim(coalesce(check_first_name, '')));
    clean_lname TEXT := lower(trim(coalesce(check_last_name, '')));
    clean_lic   TEXT := trim(coalesce(check_license_number, ''));
BEGIN
    -- 1. Correspondance par Email
    IF clean_email <> '' THEN
        SELECT id, rejection_message INTO found_entry
        FROM public.blacklist
        WHERE lower(trim(email)) = clean_email
        LIMIT 1;

        IF found_entry.id IS NOT NULL THEN
            RETURN jsonb_build_object(
                'isBlacklisted', true,
                'message', found_entry.rejection_message
            );
        END IF;
    END IF;

    -- 2. Correspondance par Numéro de Licence FBA
    IF clean_lic <> '' THEN
        SELECT id, rejection_message INTO found_entry
        FROM public.blacklist
        WHERE upper(trim(license_number)) = upper(clean_lic)
        LIMIT 1;

        IF found_entry.id IS NOT NULL THEN
            RETURN jsonb_build_object(
                'isBlacklisted', true,
                'message', found_entry.rejection_message
            );
        END IF;
    END IF;

    -- 3. Correspondance par Nom + Prénom (si les deux sont renseignés)
    IF clean_fname <> '' AND clean_lname <> '' THEN
        SELECT id, rejection_message INTO found_entry
        FROM public.blacklist
        WHERE lower(trim(first_name)) = clean_fname
          AND lower(trim(last_name)) = clean_lname
        LIMIT 1;

        IF found_entry.id IS NOT NULL THEN
            RETURN jsonb_build_object(
                'isBlacklisted', true,
                'message', found_entry.rejection_message
            );
        END IF;
    END IF;

    RETURN jsonb_build_object(
        'isBlacklisted', false
    );
END;
$$;

-- 6. Permissions d'exécution de la RPC pour visiteurs (anon) et inscrits (authenticated)
GRANT EXECUTE ON FUNCTION public.check_blacklist_status(TEXT, TEXT, TEXT, TEXT) TO anon, authenticated;
