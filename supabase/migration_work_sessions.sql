-- =========================================================================
-- MODULE SESSIONS TRAVAUX & GESTION DES PACKS BÉNÉVOLES (SBC)
-- =========================================================================

-- 1. Table des sessions de travaux
CREATE TABLE IF NOT EXISTS work_sessions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    title text NOT NULL,
    description text,
    session_date date NOT NULL,
    start_time time NOT NULL,
    end_time time NOT NULL,
    max_participants integer NOT NULL DEFAULT 4,
    free_softs_quota integer NOT NULL DEFAULT 2,
    available_meals jsonb NOT NULL DEFAULT '["Pain Burger", "Pain Mexicanos", "Pain Saucisse", "Végétarien"]'::jsonb,
    status text NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'IN_PROGRESS', 'CLOSED')),
    closed_at timestamptz,
    closed_by uuid REFERENCES sbc_members(id) ON DELETE SET NULL,
    created_at timestamptz NOT NULL DEFAULT now()
);

-- Index pour optimiser les filtres et classements
CREATE INDEX IF NOT EXISTS idx_work_sessions_date ON work_sessions(session_date);
CREATE INDEX IF NOT EXISTS idx_work_sessions_status ON work_sessions(status);

-- 2. Table des inscriptions & avantages bénévoles
CREATE TABLE IF NOT EXISTS work_session_volunteers (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id uuid NOT NULL REFERENCES work_sessions(id) ON DELETE CASCADE,
    member_id uuid NOT NULL REFERENCES sbc_members(id) ON DELETE CASCADE,
    selected_meal text NOT NULL,
    meal_redeemed boolean NOT NULL DEFAULT false,
    softs_used integer NOT NULL DEFAULT 0,
    water_used integer NOT NULL DEFAULT 0,
    checkin_at timestamptz,
    checkin_by uuid REFERENCES sbc_members(id) ON DELETE SET NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT unique_volunteer_session UNIQUE (session_id, member_id)
);

-- Index pour les recherches par session et par membre
CREATE INDEX IF NOT EXISTS idx_work_session_volunteers_session ON work_session_volunteers(session_id);
CREATE INDEX IF NOT EXISTS idx_work_session_volunteers_member ON work_session_volunteers(member_id);

-- 3. Configuration Row Level Security (RLS)
ALTER TABLE work_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE work_session_volunteers ENABLE ROW LEVEL SECURITY;

-- Politiques work_sessions
DROP POLICY IF EXISTS "Lecture des sessions par tous les membres" ON work_sessions;
CREATE POLICY "Lecture des sessions par tous les membres" ON work_sessions
    FOR SELECT TO authenticated
    USING (true);

DROP POLICY IF EXISTS "Gestion des sessions par les admins et référents" ON work_sessions;
CREATE POLICY "Gestion des sessions par les admins et référents" ON work_sessions
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM sbc_members 
            WHERE sbc_members.id = auth.uid() 
            AND (sbc_members.role IN ('admin', 'referent'))
        )
    );

-- Politiques work_session_volunteers
DROP POLICY IF EXISTS "Lecture des inscriptions bénévoles" ON work_session_volunteers;
CREATE POLICY "Lecture des inscriptions bénévoles" ON work_session_volunteers
    FOR SELECT TO authenticated
    USING (
        member_id = auth.uid()
        OR EXISTS (
            SELECT 1 FROM sbc_members 
            WHERE sbc_members.id = auth.uid() 
            AND (sbc_members.role IN ('admin', 'referent'))
        )
    );

DROP POLICY IF EXISTS "Inscription autonome du membre" ON work_session_volunteers;
CREATE POLICY "Inscription autonome du membre" ON work_session_volunteers
    FOR INSERT TO authenticated
    WITH CHECK (
        member_id = auth.uid()
        AND EXISTS (
            SELECT 1 FROM work_sessions 
            WHERE work_sessions.id = session_id 
            AND work_sessions.status = 'OPEN'
        )
    );

DROP POLICY IF EXISTS "Désinscription autonome du membre" ON work_session_volunteers;
CREATE POLICY "Désinscription autonome du membre" ON work_session_volunteers
    FOR DELETE TO authenticated
    USING (
        member_id = auth.uid()
        AND EXISTS (
            SELECT 1 FROM work_sessions 
            WHERE work_sessions.id = session_id 
            AND work_sessions.status = 'OPEN'
        )
    );

DROP POLICY IF EXISTS "Gestion complète bénévoles par admins et référents" ON work_session_volunteers;
CREATE POLICY "Gestion complète bénévoles par admins et référents" ON work_session_volunteers
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM sbc_members 
            WHERE sbc_members.id = auth.uid() 
            AND (sbc_members.role IN ('admin', 'referent'))
        )
    );
