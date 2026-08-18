-- Migration: Synchronisation FBA (Numéro de licence et date de synchronisation)
-- Table: sbc_members

ALTER TABLE sbc_members
  ADD COLUMN IF NOT EXISTS fba_license_number TEXT,
  ADD COLUMN IF NOT EXISTS fba_synced_at TIMESTAMPTZ;

-- Commentaire descriptif
COMMENT ON COLUMN sbc_members.fba_license_number IS 'Numéro de licence / affiliation officiel récupéré depuis le registre FBA (fba-rc.be)';
COMMENT ON COLUMN sbc_members.fba_synced_at IS 'Date et heure de la dernière synchronisation avec le registre FBA';
