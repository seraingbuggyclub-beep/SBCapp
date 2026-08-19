-- =========================================================================
-- MIGRATION : CLÔTURE AUTOMATIQUE DES PRÉSENCES À 22H00 (HEURE BELGE)
-- =========================================================================
-- La Belgique est en UTC+2 (été) / UTC+1 (hiver).
-- Pour cibler 22h00 heure locale (été) = 20h00 UTC.
-- Le cron pg_cron fonctionne en UTC.
-- =========================================================================

-- 1. Mettre à jour la fonction pour clôturer à la fois sbc_presence et fba_attendances
CREATE OR REPLACE FUNCTION sbc_reset_daily_presences()
RETURNS void SECURITY DEFINER AS $$
BEGIN
    -- Clôture des présences actives en direct
    UPDATE sbc_presence
    SET is_active = false,
        check_out_time = COALESCE(check_out_time, now())
    WHERE is_active = true;

    -- Clôture du registre officiel d'émargement FBA
    UPDATE fba_attendances
    SET check_out_at = COALESCE(check_out_at, now())
    WHERE check_out_at IS NULL;
END;
$$ LANGUAGE plpgsql;

-- 2. Supprimer les anciennes planifications de manière sécurisée (sans erreur si inexistantes)
DO $$
DECLARE
    job_rec RECORD;
BEGIN
    FOR job_rec IN 
        SELECT jobid FROM cron.job WHERE jobname IN ('sbc-daily-reset', 'sbc-daily-reset-22h')
    LOOP
        PERFORM cron.unschedule(job_rec.jobid);
    END LOOP;
END $$;

-- 3. Planifier la clôture à 20h00 UTC = 22h00 heure belge (été)
SELECT cron.schedule(
    'sbc-daily-reset-22h',
    '0 20 * * *',
    $$SELECT sbc_reset_daily_presences()$$
);
