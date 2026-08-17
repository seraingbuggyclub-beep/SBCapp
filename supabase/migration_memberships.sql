-- =========================================================================
-- MODULE TRÉSORERIE, TARIFICATION & COTISATIONS SBC
-- =========================================================================

-- 1. Configuration des Tarifs de Cotisation
CREATE TABLE IF NOT EXISTS sbc_membership_pricing (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    year integer NOT NULL UNIQUE,
    price_with_fba numeric(10,2) NOT NULL DEFAULT 85.00,
    price_without_fba numeric(10,2) NOT NULL DEFAULT 55.00,
    belgian_championship_fee numeric(10,2) NOT NULL DEFAULT 20.00,
    special_rates jsonb DEFAULT '[]'::jsonb,
    discount_enabled boolean DEFAULT false,
    discount_amount numeric(10,2) DEFAULT 0.00,
    discount_label text DEFAULT 'Réduction mi-saison',
    discount_start_date date,
    discount_end_date date,
    updated_at timestamptz DEFAULT now()
);

-- Insertion des tarifs par défaut pour l'année courante si inexistants
INSERT INTO sbc_membership_pricing (
    year,
    price_with_fba,
    price_without_fba,
    belgian_championship_fee,
    special_rates,
    discount_enabled,
    discount_amount,
    discount_label
)
VALUES (
    EXTRACT(YEAR FROM CURRENT_DATE)::integer,
    85.00,
    55.00,
    20.00,
    '[
        {"id": "youth", "label": "Tarif Jeune (-16 ans)", "amount": 45.00, "description": "Pour les pilotes de moins de 16 ans révolus"},
        {"id": "family", "label": "Tarif Famille (2e pilote)", "amount": 60.00, "description": "Deuxième membre du même foyer fiscal"},
        {"id": "volunteer", "label": "Bénévole / Commissaire actif", "amount": 35.00, "description": "Membre bénévole actif aux travaux et organisation"}
    ]'::jsonb,
    false,
    15.00,
    'Remise Spéciale Mi-Saison'
)
ON CONFLICT (year) DO NOTHING;

-- 2. Table des Paiements et Règlements de Cotisation
CREATE TABLE IF NOT EXISTS membership_payments (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES sbc_members(id) ON DELETE CASCADE,
    year integer NOT NULL DEFAULT (EXTRACT(YEAR FROM CURRENT_DATE)::integer),
    formula text NOT NULL DEFAULT 'with_fba' CHECK (formula IN ('with_fba', 'without_fba', 'special')),
    special_rate_id text,
    includes_fba boolean NOT NULL DEFAULT true,
    license_number text,
    includes_belgian_championship boolean NOT NULL DEFAULT false,
    applied_discount numeric(10,2) NOT NULL DEFAULT 0.00,
    amount numeric(10,2) NOT NULL DEFAULT 85.00,
    status text NOT NULL CHECK (status IN ('pending', 'paid')) DEFAULT 'pending',
    payment_method text CHECK (payment_method IN ('virement', 'cash', 'autre')) DEFAULT 'virement',
    validated_by uuid REFERENCES sbc_members(id) ON DELETE SET NULL,
    validated_at timestamptz,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    UNIQUE(user_id, year)
);

-- Index pour optimiser les filtres admin et dashboards
CREATE INDEX IF NOT EXISTS idx_membership_payments_user_year ON membership_payments(user_id, year);
CREATE INDEX IF NOT EXISTS idx_membership_payments_status_year ON membership_payments(status, year);

-- 3. Politiques RLS (Row Level Security)
ALTER TABLE sbc_membership_pricing ENABLE ROW LEVEL SECURITY;
ALTER TABLE membership_payments ENABLE ROW LEVEL SECURITY;

-- sbc_membership_pricing RLS
DROP POLICY IF EXISTS "Lecture publique des tarifs de cotisation" ON sbc_membership_pricing;
CREATE POLICY "Lecture publique des tarifs de cotisation" ON sbc_membership_pricing
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Modification des tarifs par les administrateurs" ON sbc_membership_pricing;
CREATE POLICY "Modification des tarifs par les administrateurs" ON sbc_membership_pricing
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM sbc_members
            WHERE sbc_members.id = auth.uid()
            AND sbc_members.role = 'admin'
        )
    );

-- membership_payments RLS
DROP POLICY IF EXISTS "Les membres peuvent voir leur propre historique de cotisation" ON membership_payments;
CREATE POLICY "Les membres peuvent voir leur propre historique de cotisation" ON membership_payments
    FOR SELECT USING (
        user_id = auth.uid()
        OR EXISTS (
            SELECT 1 FROM sbc_members
            WHERE sbc_members.id = auth.uid()
            AND sbc_members.role = 'admin'
        )
    );

DROP POLICY IF EXISTS "Les membres peuvent soumettre leur choix de cotisation" ON membership_payments;
CREATE POLICY "Les membres peuvent soumettre leur choix de cotisation" ON membership_payments
    FOR INSERT WITH CHECK (
        user_id = auth.uid()
        OR EXISTS (
            SELECT 1 FROM sbc_members
            WHERE sbc_members.id = auth.uid()
            AND sbc_members.role = 'admin'
        )
    );

DROP POLICY IF EXISTS "Les membres peuvent modifier leur demande en attente" ON membership_payments;
CREATE POLICY "Les membres peuvent modifier leur demande en attente" ON membership_payments
    FOR UPDATE USING (
        (user_id = auth.uid() AND status = 'pending')
        OR EXISTS (
            SELECT 1 FROM sbc_members
            WHERE sbc_members.id = auth.uid()
            AND sbc_members.role = 'admin'
        )
    );

DROP POLICY IF EXISTS "Les admins peuvent gérer tous les paiements" ON membership_payments;
CREATE POLICY "Les admins peuvent gérer tous les paiements" ON membership_payments
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM sbc_members
            WHERE sbc_members.id = auth.uid()
            AND sbc_members.role = 'admin'
        )
    );
