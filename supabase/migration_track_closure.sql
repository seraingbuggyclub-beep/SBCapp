-- Migration : Durée et motif de fermeture des pistes
ALTER TABLE public.tracks ADD COLUMN IF NOT EXISTS closure_reason TEXT;
ALTER TABLE public.tracks ADD COLUMN IF NOT EXISTS closure_type TEXT DEFAULT 'DURATION';
ALTER TABLE public.tracks ADD COLUMN IF NOT EXISTS reopening_at TIMESTAMPTZ;

-- Commentaires de colonnes
COMMENT ON COLUMN public.tracks.closure_reason IS 'Motif textuel court de la fermeture (ex: Travaux, Météo, Entretien)';
COMMENT ON COLUMN public.tracks.closure_type IS 'Type de fermeture : DURATION, INDEFINITE_WORKS, WEATHER';
COMMENT ON COLUMN public.tracks.reopening_at IS 'Date et heure estimées de réouverture de la piste';
