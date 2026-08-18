-- =========================================================================
-- MODULE FEEDBACKS, BOÎTE À IDÉES & SIGNALEMENT D'ANOMALIES
-- =========================================================================

-- Types d'entrées, statuts et gravités
DO $$ BEGIN
    CREATE TYPE feedback_type AS ENUM ('BUG_APP', 'INCIDENT_TRACK', 'IDEA');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE feedback_status AS ENUM ('PENDING', 'IN_PROGRESS', 'RESOLVED', 'REJECTED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE feedback_severity AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Table principale des retours
CREATE TABLE IF NOT EXISTS public.sbc_feedbacks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    author_id UUID NOT NULL REFERENCES public.sbc_members(id) ON DELETE CASCADE,
    type feedback_type NOT NULL,
    category TEXT NOT NULL, -- Ex: 'Infrastructure', 'Animations/Courses', 'Buvette', 'App UI', 'Piste Astro', etc.
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    severity feedback_severity DEFAULT 'LOW', -- Utilisé pour les bugs/incidents
    status feedback_status NOT NULL DEFAULT 'PENDING',
    admin_response TEXT,
    responded_by UUID REFERENCES public.sbc_members(id),
    responded_at TIMESTAMPTZ,
    votes_count INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Table des votes sur les idées (1 vote unique par membre)
CREATE TABLE IF NOT EXISTS public.sbc_feedback_votes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    feedback_id UUID NOT NULL REFERENCES public.sbc_feedbacks(id) ON DELETE CASCADE,
    member_id UUID NOT NULL REFERENCES public.sbc_members(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT unique_member_feedback_vote UNIQUE (feedback_id, member_id)
);

-- Déclencheur pour mettre à jour automatiquement le compteur votes_count
CREATE OR REPLACE FUNCTION update_feedback_votes_count()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'INSERT') THEN
        UPDATE public.sbc_feedbacks
        SET votes_count = votes_count + 1,
            updated_at = now()
        WHERE id = NEW.feedback_id;
    ELSIF (TG_OP = 'DELETE') THEN
        UPDATE public.sbc_feedbacks
        SET votes_count = GREATEST(0, votes_count - 1),
            updated_at = now()
        WHERE id = OLD.feedback_id;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_update_feedback_votes_count ON public.sbc_feedback_votes;
CREATE TRIGGER trigger_update_feedback_votes_count
AFTER INSERT OR DELETE ON public.sbc_feedback_votes
FOR EACH ROW EXECUTE FUNCTION update_feedback_votes_count();

-- RLS & Sécurité
ALTER TABLE public.sbc_feedbacks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sbc_feedback_votes ENABLE ROW LEVEL SECURITY;

-- 1. SELECT sur sbc_feedbacks
-- Idées : visible par tous les membres inscrits
-- Bugs & Incidents : visible uniquement par l'auteur et les admins/référents
DROP POLICY IF EXISTS "Lecture des feedbacks autorisés" ON public.sbc_feedbacks;
CREATE POLICY "Lecture des feedbacks autorisés" ON public.sbc_feedbacks
    FOR SELECT USING (
        (type = 'IDEA' AND auth.uid() IS NOT NULL)
        OR (author_id = auth.uid())
        OR EXISTS (
            SELECT 1 FROM public.sbc_members
            WHERE public.sbc_members.id = auth.uid()
            AND public.sbc_members.role IN ('admin', 'referent')
        )
    );

-- 2. INSERT sur sbc_feedbacks
-- Tout membre inscrit peut insérer un feedback / idée / bug
DROP POLICY IF EXISTS "Création de feedbacks par les membres" ON public.sbc_feedbacks;
CREATE POLICY "Création de feedbacks par les membres" ON public.sbc_feedbacks
    FOR INSERT WITH CHECK (
        auth.uid() IS NOT NULL 
        AND author_id = auth.uid()
    );

-- 3. UPDATE sur sbc_feedbacks
-- Réservé aux administrateurs (changement de statut, réponse admin)
DROP POLICY IF EXISTS "Modification des feedbacks par les admins" ON public.sbc_feedbacks;
CREATE POLICY "Modification des feedbacks par les admins" ON public.sbc_feedbacks
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.sbc_members
            WHERE public.sbc_members.id = auth.uid()
            AND public.sbc_members.role = 'admin'
        )
    );

-- 4. DELETE sur sbc_feedbacks
-- L'auteur peut supprimer son ticket ou un admin
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

-- 5. RLS sur sbc_feedback_votes
-- SELECT : Membres connectés
DROP POLICY IF EXISTS "Lecture des votes" ON public.sbc_feedback_votes;
CREATE POLICY "Lecture des votes" ON public.sbc_feedback_votes
    FOR SELECT USING (auth.uid() IS NOT NULL);

-- INSERT : Un membre peut voter en son propre nom
DROP POLICY IF EXISTS "Ajout d'un vote par le membre" ON public.sbc_feedback_votes;
CREATE POLICY "Ajout d'un vote par le membre" ON public.sbc_feedback_votes
    FOR INSERT WITH CHECK (
        auth.uid() IS NOT NULL 
        AND member_id = auth.uid()
    );

-- DELETE : Un membre peut retirer son propre vote
DROP POLICY IF EXISTS "Retrait de son propre vote" ON public.sbc_feedback_votes;
CREATE POLICY "Retrait de son propre vote" ON public.sbc_feedback_votes
    FOR DELETE USING (
        auth.uid() IS NOT NULL 
        AND member_id = auth.uid()
    );
