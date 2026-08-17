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

