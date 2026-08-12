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
    start_time time NOT NULL,
    end_time time NOT NULL,
    category text NOT NULL,                                  -- Ex: 'Ligue Buggy', 'Social', 'Crawler'
    location text NOT NULL DEFAULT 'Seraing Buggy Track, Belgium',
    registration_fee numeric(10, 2) NOT NULL DEFAULT 0.00,
    created_at timestamptz DEFAULT now()
);

-- Inscriptions aux événements par les pilotes
CREATE TABLE IF NOT EXISTS sbc_event_registrations (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id uuid NOT NULL REFERENCES sbc_events(id) ON DELETE CASCADE,
    member_id uuid NOT NULL REFERENCES sbc_members(id) ON DELETE CASCADE,
    race_category text NOT NULL,                             -- Ex: '1/10 Buggy 2WD', '1/8 Nitro Buggy'
    food_options text[] DEFAULT '{}',                       -- Ex: ['Lunch Pack', 'BBQ']
    transponder_id text,                                     -- N° de transpondeur AMB/MyLaps
    total_paid numeric(10, 2) NOT NULL DEFAULT 0.00,
    created_at timestamptz DEFAULT now(),
    UNIQUE(event_id, member_id)                              -- Inscription unique par événement
);

ALTER TABLE sbc_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE sbc_event_registrations ENABLE ROW LEVEL SECURITY;

-- Politiques de lecture publique pour les événements
DROP POLICY IF EXISTS "Lecture publique des evenements" ON sbc_events;
CREATE POLICY "Lecture publique des evenements" ON sbc_events
    FOR SELECT USING (true);

-- Politiques d'inscription
DROP POLICY IF EXISTS "Les membres peuvent lire leurs propres inscriptions" ON sbc_event_registrations;
CREATE POLICY "Les membres peuvent lire leurs propres inscriptions" ON sbc_event_registrations
    FOR SELECT USING (auth.uid() = member_id);

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

-- Seed pour le Super Admin (Stéphane)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$
DECLARE
    new_user_id uuid := gen_random_uuid();
END;
$$;
-- (Suite du seed gérée par le script de migration principal s'il est exécuté)
