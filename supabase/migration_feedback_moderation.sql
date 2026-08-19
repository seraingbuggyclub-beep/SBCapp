-- =========================================================================
-- MIGRATION : MODÉRATION ET SUPPRESSION DU MODULE IDÉES & SIGNALEMENTS
-- =========================================================================

-- 1. Extension de l'enum feedback_status pour supporter APPROVED et DONE
ALTER TYPE public.feedback_status ADD VALUE IF NOT EXISTS 'APPROVED';
ALTER TYPE public.feedback_status ADD VALUE IF NOT EXISTS 'DONE';

-- 2. Sécurité RLS : Suppression stricte par admin ou auteur
DROP POLICY IF EXISTS "Suppression des feedbacks" ON public.sbc_feedbacks;
CREATE POLICY "Suppression des feedbacks" ON public.sbc_feedbacks
    FOR DELETE USING (
        author_id = auth.uid()
        OR EXISTS (
            SELECT 1 FROM public.sbc_members
            WHERE public.sbc_members.id = auth.uid()
            AND public.sbc_members.role = 'admin'
        )
    );

-- 3. Mise à jour de la politique de lecture publique des idées :
-- Note : L'utilisation de status::text évite l'erreur PostgreSQL 55P04 (nouvelle valeur enum dans la même transaction)
DROP POLICY IF EXISTS "Lecture des feedbacks autorisés" ON public.sbc_feedbacks;
CREATE POLICY "Lecture des feedbacks autorisés" ON public.sbc_feedbacks
    FOR SELECT USING (
        (
            type = 'IDEA' 
            AND auth.uid() IS NOT NULL 
            AND status::text IN ('APPROVED', 'IN_PROGRESS', 'RESOLVED', 'DONE')
        )
        OR (author_id = auth.uid())
        OR EXISTS (
            SELECT 1 FROM public.sbc_members
            WHERE public.sbc_members.id = auth.uid()
            AND public.sbc_members.role IN ('admin', 'referent')
        )
    );
