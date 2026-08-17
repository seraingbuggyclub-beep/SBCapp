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

-- Index pour optimiser les requêtes et statistiques
CREATE INDEX IF NOT EXISTS idx_fba_attendance_user ON fba_attendances(user_id);
CREATE INDEX IF NOT EXISTS idx_fba_attendance_track ON fba_attendances(track_id);
CREATE INDEX IF NOT EXISTS idx_fba_attendance_checkin ON fba_attendances(check_in_at);

-- Politiques RLS (Row Level Security)
ALTER TABLE fba_attendances ENABLE ROW LEVEL SECURITY;

-- 1. Lecture : les membres peuvent voir leurs pointages du jour, les admins voient tout
DROP POLICY IF EXISTS "Lecture présences FBA" ON fba_attendances;
CREATE POLICY "Lecture présences FBA" ON fba_attendances FOR SELECT USING (
    user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM sbc_members WHERE sbc_members.id = auth.uid() AND sbc_members.role = 'admin')
);

-- 2. Insertion : les membres peuvent pointer pour eux-mêmes, les admins peuvent insérer tout
DROP POLICY IF EXISTS "Insertion présences FBA" ON fba_attendances;
CREATE POLICY "Insertion présences FBA" ON fba_attendances FOR INSERT WITH CHECK (
    user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM sbc_members WHERE sbc_members.id = auth.uid() AND sbc_members.role = 'admin')
);

-- 3. Mise à jour (Check-out) : le membre pour son pointage, ou admins
DROP POLICY IF EXISTS "Mise à jour présences FBA" ON fba_attendances;
CREATE POLICY "Mise à jour présences FBA" ON fba_attendances FOR UPDATE USING (
    user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM sbc_members WHERE sbc_members.id = auth.uid() AND sbc_members.role = 'admin')
);

-- 4. Suppression : Admins uniquement
DROP POLICY IF EXISTS "Suppression présences FBA" ON fba_attendances;
CREATE POLICY "Suppression présences FBA" ON fba_attendances FOR DELETE USING (
    EXISTS (SELECT 1 FROM sbc_members WHERE sbc_members.id = auth.uid() AND sbc_members.role = 'admin')
);
