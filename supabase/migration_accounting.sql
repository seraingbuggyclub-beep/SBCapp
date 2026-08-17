-- =========================================================================
-- MODULE COMPTABILITÉ & GRAND LIVRE ASBL (CAISSE & BANQUE) - SBC
-- =========================================================================

CREATE TABLE IF NOT EXISTS accounting_transactions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    date date NOT NULL DEFAULT CURRENT_DATE,
    type text NOT NULL CHECK (type IN ('RECETTE', 'DEPENSE')),
    category text NOT NULL CHECK (category IN (
        'COTISATION',
        'BUVETTE',
        'ACHAT_MATERIEL',
        'TRAVAUX_PISTE',
        'ASSURANCE_FBA',
        'FRAIS_DIVERS',
        'DEPOT_BANQUE',
        'RETRAIT_CAISSE'
    )),
    payment_method text NOT NULL CHECK (payment_method IN ('ESPECES', 'BANQUE', 'PAYCONIQ')),
    amount numeric(10,2) NOT NULL CHECK (amount > 0),
    description text NOT NULL,
    receipt_url text,
    source_type text NOT NULL CHECK (source_type IN ('MANUAL', 'MEMBERSHIP', 'BAR_SESSION')) DEFAULT 'MANUAL',
    source_id uuid,
    author_id uuid REFERENCES sbc_members(id) ON DELETE SET NULL,
    created_at timestamptz NOT NULL DEFAULT now()
);

-- Index pour optimiser les calculs et filtres
CREATE INDEX IF NOT EXISTS idx_accounting_date ON accounting_transactions(date);
CREATE INDEX IF NOT EXISTS idx_accounting_type ON accounting_transactions(type);
CREATE INDEX IF NOT EXISTS idx_accounting_category ON accounting_transactions(category);
CREATE INDEX IF NOT EXISTS idx_accounting_method ON accounting_transactions(payment_method);
CREATE INDEX IF NOT EXISTS idx_accounting_source ON accounting_transactions(source_type, source_id);

-- Politiques RLS (Admins uniquement)
ALTER TABLE accounting_transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Gestion comptabilité par les admins" ON accounting_transactions;
CREATE POLICY "Gestion comptabilité par les admins" ON accounting_transactions FOR ALL USING (
    EXISTS (SELECT 1 FROM sbc_members WHERE sbc_members.id = auth.uid() AND sbc_members.role = 'admin')
);
