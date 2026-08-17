-- =========================================================================
-- SCHEMA INITIAL POUR SERAING BUGGY CLUB (SBC)
-- =========================================================================

-- Configuration générale du club (Code cadenas, coordonnées géofence)
CREATE TABLE IF NOT EXISTS sbc_club_config (
    id integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    lock_code text NOT NULL,                                 -- Code cadenas partagé
    geofence_lat numeric(9, 6) NOT NULL DEFAULT 50.599627,
    geofence_lng numeric(9, 6) NOT NULL DEFAULT 5.529321,
    geofence_radius_meters numeric NOT NULL DEFAULT 150.0,
    updated_at timestamptz DEFAULT now()
);

-- Profils des membres SBC
CREATE TABLE IF NOT EXISTS sbc_members (
    id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email text NOT NULL,
    first_name text NOT NULL,
    last_name text NOT NULL,
    phone text,
    license_number text,                                     -- Numéro de licence FBA
    payment_status text NOT NULL DEFAULT 'pending' 
        CHECK (payment_status IN ('pending', 'paid', 'expired')),
    street_number text,
    zip_code text,
    city text,
    birth_date date,
    membership_choice text,
    transponder_number text,
    roi_accepted boolean DEFAULT false,
    insurance_ack boolean DEFAULT false,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Assurer que les colonnes existent sur les bases de données existantes
ALTER TABLE sbc_members ADD COLUMN IF NOT EXISTS street_number text;
ALTER TABLE sbc_members ADD COLUMN IF NOT EXISTS zip_code text;
ALTER TABLE sbc_members ADD COLUMN IF NOT EXISTS city text;
ALTER TABLE sbc_members ADD COLUMN IF NOT EXISTS birth_date date;
ALTER TABLE sbc_members ADD COLUMN IF NOT EXISTS membership_choice text;
ALTER TABLE sbc_members ADD COLUMN IF NOT EXISTS transponder_number text;
ALTER TABLE sbc_members ADD COLUMN IF NOT EXISTS roi_accepted boolean DEFAULT false;
ALTER TABLE sbc_members ADD COLUMN IF NOT EXISTS insurance_ack boolean DEFAULT false;


-- Table des présences (Assurance FBA)
CREATE TABLE IF NOT EXISTS sbc_presence (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    member_id uuid NOT NULL REFERENCES sbc_members(id) ON DELETE CASCADE,
    check_in_time timestamptz NOT NULL DEFAULT now(),
    check_out_time timestamptz,
    is_active boolean NOT NULL DEFAULT true,                -- Remplacé à false à minuit
    is_public boolean NOT NULL DEFAULT true,                -- Visibilité sur la Landing Page
    check_in_type text NOT NULL CHECK (check_in_type IN ('manual', 'auto')),
    latitude numeric(9, 6),
    longitude numeric(9, 6),
    created_at timestamptz DEFAULT now()
);

-- Index pour optimiser les requêtes fréquentes
CREATE INDEX IF NOT EXISTS idx_presence_is_active ON sbc_presence(is_active);
CREATE INDEX IF NOT EXISTS idx_presence_member_id ON sbc_presence(member_id);

-- Insertion de la configuration par défaut (code cadenas initial)
INSERT INTO sbc_club_config (lock_code, geofence_lat, geofence_lng, geofence_radius_meters)
SELECT '4000', 50.599627, 5.529321, 150.0
WHERE NOT EXISTS (SELECT 1 FROM sbc_club_config);

-- =========================================================================
-- FONCTIONS DE SECURITE & VERIFICATION
-- =========================================================================

-- Fonction pour vérifier si le code cadenas fourni par l'utilisateur est correct
CREATE OR REPLACE FUNCTION sbc_verify_lock_code(input_code text)
RETURNS boolean SECURITY DEFINER AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM sbc_club_config
        WHERE lock_code = input_code
    );
END;
$$ LANGUAGE plpgsql;

-- =========================================================================
-- POLITIQUES DE SECURITE (RLS)
-- =========================================================================

ALTER TABLE sbc_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE sbc_presence ENABLE ROW LEVEL SECURITY;
ALTER TABLE sbc_club_config ENABLE ROW LEVEL SECURITY;

-- Politiques pour sbc_club_config
DROP POLICY IF EXISTS "Lecture publique de la configuration du club" ON sbc_club_config;
CREATE POLICY "Lecture publique de la configuration du club" ON sbc_club_config
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Les admins peuvent modifier la configuration du club" ON sbc_club_config;
CREATE POLICY "Les admins peuvent modifier la configuration du club" ON sbc_club_config
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM sbc_members 
            WHERE id = auth.uid() AND email = 'stefga1@gmail.com'
        )
    );

-- Politiques pour sbc_members
DROP POLICY IF EXISTS "Les membres peuvent lire leur propre profil" ON sbc_members;
CREATE POLICY "Les membres peuvent lire leur propre profil" ON sbc_members
    FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Les membres peuvent modifier leur propre profil" ON sbc_members;
CREATE POLICY "Les membres peuvent modifier leur propre profil" ON sbc_members
    FOR UPDATE USING (auth.uid() = id);

DROP POLICY IF EXISTS "Les membres peuvent inserer leur propre profil" ON sbc_members;
CREATE POLICY "Les membres peuvent inserer leur propre profil" ON sbc_members
    FOR INSERT WITH CHECK (auth.uid() = id);

-- Politiques pour sbc_presence
DROP POLICY IF EXISTS "Lecture publique des presences actives et publiques" ON sbc_presence;
CREATE POLICY "Lecture publique des presences actives et publiques" ON sbc_presence
    FOR SELECT USING (is_public = true AND is_active = true);

DROP POLICY IF EXISTS "Lecture complete des presences pour les membres payants" ON sbc_presence;
CREATE POLICY "Lecture complete des presences pour les membres payants" ON sbc_presence
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM sbc_members
            WHERE sbc_members.id = auth.uid() 
              AND sbc_members.payment_status = 'paid'
        )
    );

DROP POLICY IF EXISTS "Les membres peuvent lire leur propre historique de presence" ON sbc_presence;
CREATE POLICY "Les membres peuvent lire leur propre historique de presence" ON sbc_presence
    FOR SELECT USING (auth.uid() = member_id);

DROP POLICY IF EXISTS "Insertion de presence pour les membres payants" ON sbc_presence;
CREATE POLICY "Insertion de presence pour les membres payants" ON sbc_presence
    FOR INSERT WITH CHECK (
        auth.uid() = member_id AND
        EXISTS (
            SELECT 1 FROM sbc_members
            WHERE sbc_members.id = auth.uid() 
              AND sbc_members.payment_status = 'paid'
        )
    );

DROP POLICY IF EXISTS "Mise a jour de son propre check-out" ON sbc_presence;
CREATE POLICY "Mise a jour de son propre check-out" ON sbc_presence
    FOR UPDATE USING (auth.uid() = member_id);

-- =========================================================================
-- PURGE ET RAZ DE MINUIT (DAILY CLEANUP)
-- =========================================================================

CREATE OR REPLACE FUNCTION sbc_reset_daily_presences()
RETURNS void SECURITY DEFINER AS $$
BEGIN
    UPDATE sbc_presence
    SET is_active = false,
        check_out_time = COALESCE(check_out_time, now())
    WHERE is_active = true;
END;
$$ LANGUAGE plpgsql;

-- Activation de l'extension pg_cron si elle n'est pas activée (nécessite superuser)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Planification de la purge automatique à minuit tous les jours (fuseau horaire UTC)
SELECT cron.schedule(
    'sbc-daily-reset',
    '0 0 * * *',
    'SELECT sbc_reset_daily_presences()'
);

-- =========================================================================
-- 5. TABLES POUR EVENEMENTS & INSCRIPTIONS (SERAING MASTERS CUP)
-- =========================================================================

-- Table des événements du club
CREATE TABLE IF NOT EXISTS sbc_events (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    title text NOT NULL,
    description text,
    event_date date NOT NULL,
    start_time time NOT NULL DEFAULT '09:00:00',
    end_time time NOT NULL DEFAULT '18:00:00',
    category text NOT NULL DEFAULT 'Compétition',          -- Ex: 'Ligue Buggy', 'Social', 'Course Nocturne'
    location text NOT NULL DEFAULT 'Seraing Buggy Track, Belgium',
    registration_fee numeric(10, 2) NOT NULL DEFAULT 0.00,
    status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed', 'draft')),
    event_type text NOT NULL DEFAULT 'sbc_race' CHECK (event_type IN ('sbc_race', 'belgian_championship', 'holiday', 'club_meeting')),
    has_registration boolean NOT NULL DEFAULT true,
    external_link text,
    categories jsonb DEFAULT '[{"name": "1/10 Buggy 2WD", "fee": 25, "type": "Electric"}, {"name": "1/8 E-Buggy", "fee": 30, "type": "Electric"}, {"name": "1/8 Nitro Buggy", "fee": 35, "type": "Nitro"}, {"name": "Crawler Meet", "fee": 15, "type": "Social"}]'::jsonb,
    meal_options jsonb DEFAULT '[{"name": "Lunch Pack", "price": 12, "desc": "Sandwich, boisson & snack"}, {"name": "Barbecue Samedi Soir", "price": 22, "desc": "3 viandes, buffet salade & 1 boisson"}]'::jsonb,
    max_participants integer,
    created_at timestamptz DEFAULT now()
);

-- Assurer que les colonnes existent sur les bases de données existantes
ALTER TABLE sbc_events ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'open';
ALTER TABLE sbc_events ADD COLUMN IF NOT EXISTS event_type text NOT NULL DEFAULT 'sbc_race';
ALTER TABLE sbc_events ADD COLUMN IF NOT EXISTS has_registration boolean NOT NULL DEFAULT true;
ALTER TABLE sbc_events ADD COLUMN IF NOT EXISTS external_link text;
ALTER TABLE sbc_events ADD COLUMN IF NOT EXISTS categories jsonb DEFAULT '[]'::jsonb;
ALTER TABLE sbc_events ADD COLUMN IF NOT EXISTS meal_options jsonb DEFAULT '[]'::jsonb;
ALTER TABLE sbc_events ADD COLUMN IF NOT EXISTS max_participants integer;

-- Inscriptions aux événements par les pilotes
CREATE TABLE IF NOT EXISTS sbc_event_registrations (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id uuid NOT NULL REFERENCES sbc_events(id) ON DELETE CASCADE,
    member_id uuid NOT NULL REFERENCES sbc_members(id) ON DELETE CASCADE,
    race_category text NOT NULL,                             -- Ex: '1/10 Buggy 2WD, 1/8 Nitro Buggy'
    food_options text[] DEFAULT '{}',                       -- Ex: ['Lunch Pack x2', 'BBQ x1']
    selected_meals jsonb DEFAULT '[]'::jsonb,               -- Ex: [{"name": "Lunch Pack", "quantity": 2, "unit_price": 12}]
    selected_categories jsonb DEFAULT '[]'::jsonb,          -- Ex: [{"name": "1/10 Buggy 2WD", "fee": 25}]
    transponder_id text,                                     -- N° de transpondeur AMB/MyLaps
    total_paid numeric(10, 2) NOT NULL DEFAULT 0.00,
    created_at timestamptz DEFAULT now(),
    UNIQUE(event_id, member_id)                              -- Inscription unique par événement
);

ALTER TABLE sbc_event_registrations ADD COLUMN IF NOT EXISTS selected_meals jsonb DEFAULT '[]'::jsonb;
ALTER TABLE sbc_event_registrations ADD COLUMN IF NOT EXISTS selected_categories jsonb DEFAULT '[]'::jsonb;

ALTER TABLE sbc_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE sbc_event_registrations ENABLE ROW LEVEL SECURITY;

-- Politiques de lecture publique pour les événements
DROP POLICY IF EXISTS "Lecture publique des evenements" ON sbc_events;
CREATE POLICY "Lecture publique des evenements" ON sbc_events
    FOR SELECT USING (true);

-- Politiques de gestion admin pour les événements
DROP POLICY IF EXISTS "Les admins peuvent gerer les evenements" ON sbc_events;
CREATE POLICY "Les admins peuvent gerer les evenements" ON sbc_events
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM sbc_members 
            WHERE sbc_members.id = auth.uid() 
              AND (sbc_members.role = 'admin' OR sbc_members.email = 'stefga1@gmail.com')
        )
    );

-- Politiques d'inscription
DROP POLICY IF EXISTS "Les membres peuvent lire leurs propres inscriptions" ON sbc_event_registrations;
CREATE POLICY "Les membres peuvent lire leurs propres inscriptions" ON sbc_event_registrations
    FOR SELECT USING (
        auth.uid() = member_id OR
        EXISTS (
            SELECT 1 FROM sbc_members 
            WHERE sbc_members.id = auth.uid() 
              AND (sbc_members.role = 'admin' OR sbc_members.email = 'stefga1@gmail.com')
        )
    );

DROP POLICY IF EXISTS "Les membres peuvent s'inscrire aux evenements" ON sbc_event_registrations;
CREATE POLICY "Les membres peuvent s'inscrire aux evenements" ON sbc_event_registrations
    FOR INSERT WITH CHECK (
        auth.uid() = member_id AND
        EXISTS (
            SELECT 1 FROM sbc_members
            WHERE sbc_members.id = auth.uid() 
              AND sbc_members.payment_status = 'paid'
        )
    );

DROP POLICY IF EXISTS "Les pilotes peuvent modifier leur propre inscription" ON sbc_event_registrations;
CREATE POLICY "Les pilotes peuvent modifier leur propre inscription" 
ON sbc_event_registrations 
FOR UPDATE 
USING (
    auth.uid() = member_id OR
    EXISTS (
        SELECT 1 FROM sbc_members 
        WHERE sbc_members.id = auth.uid() 
          AND (sbc_members.role = 'admin' OR sbc_members.email = 'stefga1@gmail.com')
    )
)
WITH CHECK (
    auth.uid() = member_id OR
    EXISTS (
        SELECT 1 FROM sbc_members 
        WHERE sbc_members.id = auth.uid() 
          AND (sbc_members.role = 'admin' OR sbc_members.email = 'stefga1@gmail.com')
    )
);

-- Seed de démonstration pour l'événement principal
INSERT INTO sbc_events (title, description, event_date, start_time, end_time, category, registration_fee)
VALUES (
    'Seraing Masters Cup 2024',
    'Compétition officielle 1/8 Thermique & Électrique. Contrôle technique dès 08h30.',
    '2024-10-26',
    '09:00:00',
    '17:00:00',
    'Ligue Buggy',
    25.00
) ON CONFLICT DO NOTHING;

-- =========================================================================
-- 6. TABLES POUR LE BABILLARD PIT-LANE (COMMUNICATIONS DU COMITÉ)
-- =========================================================================

CREATE TABLE IF NOT EXISTS sbc_announcements (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    title text NOT NULL,
    content text NOT NULL,
    category text NOT NULL DEFAULT 'info_piste' CHECK (category IN ('info_piste', 'travaux', 'briefing_course', 'vie_du_club')),
    is_pinned boolean NOT NULL DEFAULT false,
    author_name text NOT NULL DEFAULT 'Comité SBC',
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

ALTER TABLE sbc_announcements ENABLE ROW LEVEL SECURITY;

-- Lecture publique de tous les messages du babillard
DROP POLICY IF EXISTS "Lecture publique des annonces" ON sbc_announcements;
CREATE POLICY "Lecture publique des annonces" ON sbc_announcements
    FOR SELECT USING (true);

-- Gestion réservée aux administrateurs
DROP POLICY IF EXISTS "Les admins peuvent gerer les annonces" ON sbc_announcements;
CREATE POLICY "Les admins peuvent gerer les annonces" ON sbc_announcements
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM sbc_members 
            WHERE sbc_members.id = auth.uid() 
              AND (sbc_members.role = 'admin' OR sbc_members.email = 'stefga1@gmail.com')
        )
    );

-- Insertion d'annonces initiales de démonstration
INSERT INTO sbc_announcements (title, content, category, is_pinned, author_name)
VALUES 
    (
        'Ouverture officielle de la saison & État de la piste',
        'La piste tout-terrain est entièrement opérationnelle pour les entraînements libres. Le système de chronométrage MyLaps est sous tension lors des sessions de présence. Merci de respecter les zones de stands et le sens de circulation.',
        'info_piste',
        true,
        'Comité de Direction SBC'
    ),
    (
        'Travaux de surfaçage & Nouveau virage relevé',
        'Une session bénévole de compactage et d''amélioration du drainage aura lieu ce samedi matin à 09h00. Les pilotes souhaitant donner un coup de main sont les bienvenus (café et croissants offerts par le club !).',
        'travaux',
        false,
        'Commission Piste'
    ),
    (
        'Briefing Pilotes : Règlement FBA & Sécurité Cadenas',
        'Rappel à tous les membres : n''oubliez pas d''effectuer votre check-in sur l''application dès votre arrivée pour activer votre couverture d''assurance FBA. Pensez également à toujours reverrouiller le cadenas à combinaison en quittant le terrain.',
        'vie_du_club',
        false,
        'Secrétariat ASBL'
    )
ON CONFLICT DO NOTHING;

-- =========================================================================
-- MODULE TRACKS (PISTES SBC)
-- =========================================================================

CREATE TABLE IF NOT EXISTS tracks (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL UNIQUE,
    is_open boolean NOT NULL DEFAULT true,
    updated_at timestamptz DEFAULT now()
);

-- Insertion des 4 pistes par défaut si inexistantes
INSERT INTO tracks (name, is_open)
VALUES 
    ('1/10', true),
    ('1/8', true),
    ('Rallye Game', true),
    ('Crawler', true)
ON CONFLICT (name) DO NOTHING;

-- RLS
ALTER TABLE tracks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Lecture publique de l'état des pistes" ON tracks;
CREATE POLICY "Lecture publique de l'état des pistes" ON tracks
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Modification des pistes par les admins" ON tracks;
CREATE POLICY "Modification des pistes par les admins" ON tracks
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM sbc_members
            WHERE sbc_members.id = auth.uid()
            AND sbc_members.role = 'admin'
        )
    );

-- =========================================================================
-- MODULE TRÉSORERIE, TARIFICATION & COTISATIONS SBC
-- =========================================================================

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

CREATE INDEX IF NOT EXISTS idx_membership_payments_user_year ON membership_payments(user_id, year);
CREATE INDEX IF NOT EXISTS idx_membership_payments_status_year ON membership_payments(status, year);

ALTER TABLE sbc_membership_pricing ENABLE ROW LEVEL SECURITY;
ALTER TABLE membership_payments ENABLE ROW LEVEL SECURITY;

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

-- =========================================================================
-- MODULE BUVETTE, POS TACTILE & GESTION DE STOCKS (SBC)
-- =========================================================================

ALTER TABLE sbc_members ADD COLUMN IF NOT EXISTS wallet_balance numeric(10,2) NOT NULL DEFAULT 0.00;
ALTER TABLE sbc_members ADD COLUMN IF NOT EXISTS tab_balance numeric(10,2) NOT NULL DEFAULT 0.00;

CREATE TABLE IF NOT EXISTS bar_categories (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL UNIQUE,
    display_order integer NOT NULL DEFAULT 0,
    created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS bar_items (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    category_id uuid NOT NULL REFERENCES bar_categories(id) ON DELETE CASCADE,
    name text NOT NULL,
    selling_price numeric(10,2) NOT NULL,
    cost_price numeric(10,2) NOT NULL DEFAULT 0.00,
    stock_quantity integer NOT NULL DEFAULT 0,
    alert_threshold integer NOT NULL DEFAULT 10,
    is_active boolean NOT NULL DEFAULT true,
    image_url text,
    updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_bar_items_category ON bar_items(category_id);
CREATE INDEX IF NOT EXISTS idx_bar_items_is_active ON bar_items(is_active);

CREATE TABLE IF NOT EXISTS bar_sessions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    opened_by uuid NOT NULL REFERENCES sbc_members(id),
    opened_at timestamptz NOT NULL DEFAULT now(),
    opening_cash numeric(10,2) NOT NULL DEFAULT 0.00,
    closed_by uuid REFERENCES sbc_members(id),
    closed_at timestamptz,
    closing_cash_counted numeric(10,2),
    closing_cash_expected numeric(10,2),
    cash_difference numeric(10,2),
    status text NOT NULL CHECK (status IN ('OPEN', 'CLOSED')) DEFAULT 'OPEN',
    notes text
);

CREATE TABLE IF NOT EXISTS bar_orders (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id uuid REFERENCES bar_sessions(id) ON DELETE SET NULL,
    buyer_id uuid REFERENCES sbc_members(id) ON DELETE SET NULL,
    seller_id uuid REFERENCES sbc_members(id) ON DELETE SET NULL,
    channel text NOT NULL CHECK (channel IN ('POS', 'SELF_SERVICE')) DEFAULT 'POS',
    total_amount numeric(10,2) NOT NULL DEFAULT 0.00,
    payment_method text NOT NULL CHECK (payment_method IN ('CASH', 'PAYCONIQ', 'WALLET', 'TAB')),
    payment_status text NOT NULL CHECK (payment_status IN ('PAID', 'PENDING_TAB')) DEFAULT 'PAID',
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_bar_orders_session ON bar_orders(session_id);
CREATE INDEX IF NOT EXISTS idx_bar_orders_buyer ON bar_orders(buyer_id);
CREATE INDEX IF NOT EXISTS idx_bar_orders_created ON bar_orders(created_at);

CREATE TABLE IF NOT EXISTS bar_order_items (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id uuid NOT NULL REFERENCES bar_orders(id) ON DELETE CASCADE,
    item_id uuid NOT NULL REFERENCES bar_items(id),
    quantity integer NOT NULL CHECK (quantity > 0),
    unit_price numeric(10,2) NOT NULL,
    total_price numeric(10,2) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_bar_order_items_order ON bar_order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_bar_order_items_item ON bar_order_items(item_id);

CREATE TABLE IF NOT EXISTS bar_stock_movements (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    item_id uuid NOT NULL REFERENCES bar_items(id) ON DELETE CASCADE,
    type text NOT NULL CHECK (type IN ('ENTRY', 'SALE_POS', 'SALE_SELF', 'LOSS', 'ADJUSTMENT')),
    quantity integer NOT NULL,
    cost_price_at_time numeric(10,2) NOT NULL DEFAULT 0.00,
    reason text,
    admin_id uuid REFERENCES sbc_members(id) ON DELETE SET NULL,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_bar_stock_movements_item ON bar_stock_movements(item_id);

ALTER TABLE bar_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE bar_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE bar_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE bar_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE bar_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE bar_stock_movements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Lecture publique des catégories bar" ON bar_categories;
CREATE POLICY "Lecture publique des catégories bar" ON bar_categories FOR SELECT USING (true);

DROP POLICY IF EXISTS "Gestion catégories par les admins" ON bar_categories;
CREATE POLICY "Gestion catégories par les admins" ON bar_categories FOR ALL USING (
    EXISTS (SELECT 1 FROM sbc_members WHERE sbc_members.id = auth.uid() AND sbc_members.role = 'admin')
);

DROP POLICY IF EXISTS "Lecture publique des articles bar" ON bar_items;
CREATE POLICY "Lecture publique des articles bar" ON bar_items FOR SELECT USING (true);

DROP POLICY IF EXISTS "Gestion articles par les admins" ON bar_items;
CREATE POLICY "Gestion articles par les admins" ON bar_items FOR ALL USING (
    EXISTS (SELECT 1 FROM sbc_members WHERE sbc_members.id = auth.uid() AND sbc_members.role = 'admin')
);

DROP POLICY IF EXISTS "Gestion sessions bar par les admins" ON bar_sessions;
CREATE POLICY "Gestion sessions bar par les admins" ON bar_sessions FOR ALL USING (
    EXISTS (SELECT 1 FROM sbc_members WHERE sbc_members.id = auth.uid() AND sbc_members.role = 'admin')
);

DROP POLICY IF EXISTS "Lecture commandes bar" ON bar_orders;
CREATE POLICY "Lecture commandes bar" ON bar_orders FOR SELECT USING (
    buyer_id = auth.uid()
    OR EXISTS (SELECT 1 FROM sbc_members WHERE sbc_members.id = auth.uid() AND sbc_members.role = 'admin')
);

DROP POLICY IF EXISTS "Création commandes bar" ON bar_orders;
CREATE POLICY "Création commandes bar" ON bar_orders FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL
    OR EXISTS (SELECT 1 FROM sbc_members WHERE sbc_members.id = auth.uid() AND sbc_members.role = 'admin')
);

DROP POLICY IF EXISTS "Gestion commandes par les admins" ON bar_orders;
CREATE POLICY "Gestion commandes par les admins" ON bar_orders FOR ALL USING (
    EXISTS (SELECT 1 FROM sbc_members WHERE sbc_members.id = auth.uid() AND sbc_members.role = 'admin')
);

DROP POLICY IF EXISTS "Lecture lignes commandes bar" ON bar_order_items;
CREATE POLICY "Lecture lignes commandes bar" ON bar_order_items FOR SELECT USING (true);

DROP POLICY IF EXISTS "Insertion lignes commandes bar" ON bar_order_items;
CREATE POLICY "Insertion lignes commandes bar" ON bar_order_items FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Gestion mouvements stock bar par admins" ON bar_stock_movements;
CREATE POLICY "Gestion mouvements stock bar par admins" ON bar_stock_movements FOR ALL USING (
    EXISTS (SELECT 1 FROM sbc_members WHERE sbc_members.id = auth.uid() AND sbc_members.role = 'admin')
);

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

CREATE INDEX IF NOT EXISTS idx_accounting_date ON accounting_transactions(date);
CREATE INDEX IF NOT EXISTS idx_accounting_type ON accounting_transactions(type);
CREATE INDEX IF NOT EXISTS idx_accounting_category ON accounting_transactions(category);
CREATE INDEX IF NOT EXISTS idx_accounting_method ON accounting_transactions(payment_method);
CREATE INDEX IF NOT EXISTS idx_accounting_source ON accounting_transactions(source_type, source_id);

ALTER TABLE accounting_transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Gestion comptabilité par les admins" ON accounting_transactions;
CREATE POLICY "Gestion comptabilité par les admins" ON accounting_transactions FOR ALL USING (
    EXISTS (SELECT 1 FROM sbc_members WHERE sbc_members.id = auth.uid() AND sbc_members.role = 'admin')
);

-- =========================================================================
-- MODULE REGISTRE DE PRÉSENCE FBA & ANALYSE DE FRÉQUENTATION (SBC)
-- =========================================================================

CREATE TABLE IF NOT EXISTS fba_attendances (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES sbc_members(id) ON DELETE SET NULL,
    visitor_name text,
    visitor_license text,
    track_id uuid REFERENCES tracks(id) ON DELETE SET NULL,
    check_in_at timestamptz NOT NULL DEFAULT now(),
    check_out_at timestamptz,
    source text NOT NULL CHECK (source IN ('SELF_DASHBOARD', 'QR_SCAN', 'ADMIN_MANUAL')) DEFAULT 'SELF_DASHBOARD',
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_fba_attendance_user ON fba_attendances(user_id);
CREATE INDEX IF NOT EXISTS idx_fba_attendance_track ON fba_attendances(track_id);
CREATE INDEX IF NOT EXISTS idx_fba_attendance_checkin ON fba_attendances(check_in_at);

ALTER TABLE fba_attendances ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Lecture présences FBA" ON fba_attendances;
CREATE POLICY "Lecture présences FBA" ON fba_attendances FOR SELECT USING (
    user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM sbc_members WHERE sbc_members.id = auth.uid() AND sbc_members.role = 'admin')
);

DROP POLICY IF EXISTS "Insertion présences FBA" ON fba_attendances;
CREATE POLICY "Insertion présences FBA" ON fba_attendances FOR INSERT WITH CHECK (
    user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM sbc_members WHERE sbc_members.id = auth.uid() AND sbc_members.role = 'admin')
);

DROP POLICY IF EXISTS "Mise à jour présences FBA" ON fba_attendances;
CREATE POLICY "Mise à jour présences FBA" ON fba_attendances FOR UPDATE USING (
    user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM sbc_members WHERE sbc_members.id = auth.uid() AND sbc_members.role = 'admin')
);

DROP POLICY IF EXISTS "Suppression présences FBA" ON fba_attendances;
CREATE POLICY "Suppression présences FBA" ON fba_attendances FOR DELETE USING (
    EXISTS (SELECT 1 FROM sbc_members WHERE sbc_members.id = auth.uid() AND sbc_members.role = 'admin')
);

-- =========================================================================
-- MODULE RGPD & CONFORMITÉ APD (BELGIQUE) - SBC
-- =========================================================================

ALTER TABLE sbc_members
    ADD COLUMN IF NOT EXISTS consent_email_club_news boolean NOT NULL DEFAULT true,
    ADD COLUMN IF NOT EXISTS consent_email_events boolean NOT NULL DEFAULT true,
    ADD COLUMN IF NOT EXISTS consent_image_rights boolean NOT NULL DEFAULT true,
    ADD COLUMN IF NOT EXISTS consent_whatsapp_group boolean NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS consent_updated_at timestamptz NOT NULL DEFAULT now(),
    ADD COLUMN IF NOT EXISTS unsubscribe_token uuid NOT NULL DEFAULT gen_random_uuid();

CREATE INDEX IF NOT EXISTS idx_members_unsub_token ON sbc_members(unsubscribe_token);

CREATE TABLE IF NOT EXISTS gdpr_processing_register (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    activity_name text NOT NULL,
    purpose text NOT NULL,
    legal_basis text NOT NULL,
    data_categories text NOT NULL,
    retention_period text NOT NULL,
    recipients text NOT NULL,
    security_measures text NOT NULL,
    updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE gdpr_processing_register ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Lecture registre traitements par tous ou admins" ON gdpr_processing_register;
CREATE POLICY "Lecture registre traitements par tous ou admins" ON gdpr_processing_register FOR SELECT USING (true);

DROP POLICY IF EXISTS "Gestion registre traitements par admins" ON gdpr_processing_register;
CREATE POLICY "Gestion registre traitements par admins" ON gdpr_processing_register FOR ALL USING (
    EXISTS (SELECT 1 FROM sbc_members WHERE sbc_members.id = auth.uid() AND sbc_members.role = 'admin')
);

CREATE TABLE IF NOT EXISTS email_logs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    sender_id uuid REFERENCES sbc_members(id) ON DELETE SET NULL,
    subject text NOT NULL,
    category text NOT NULL CHECK (category IN ('CLUB_NEWS', 'EVENTS', 'URGENT_INFO')),
    recipients_count int NOT NULL DEFAULT 0,
    sent_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE email_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Gestion journaux emails par admins" ON email_logs;
CREATE POLICY "Gestion journaux emails par admins" ON email_logs FOR ALL USING (
    EXISTS (SELECT 1 FROM sbc_members WHERE sbc_members.id = auth.uid() AND sbc_members.role = 'admin')
);







