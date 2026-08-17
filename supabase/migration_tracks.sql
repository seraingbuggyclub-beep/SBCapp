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

-- Tout le monde (public et membres) peut voir l'état des pistes
DROP POLICY IF EXISTS "Lecture publique de l'état des pistes" ON tracks;
CREATE POLICY "Lecture publique de l'état des pistes" ON tracks
    FOR SELECT USING (true);

-- Seuls les administrateurs peuvent modifier l'état des pistes
DROP POLICY IF EXISTS "Modification des pistes par les admins" ON tracks;
CREATE POLICY "Modification des pistes par les admins" ON tracks
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM sbc_members
            WHERE sbc_members.id = auth.uid()
            AND sbc_members.role = 'admin'
        )
    );

-- Seuls les administrateurs peuvent insérer des pistes
DROP POLICY IF EXISTS "Insertion des pistes par les admins" ON tracks;
CREATE POLICY "Insertion des pistes par les admins" ON tracks
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM sbc_members
            WHERE sbc_members.id = auth.uid()
            AND sbc_members.role = 'admin'
        )
    );
