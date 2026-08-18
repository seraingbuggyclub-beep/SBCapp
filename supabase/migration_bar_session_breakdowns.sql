-- ==============================================================================
-- AJOUT DES DÉTAILS DE COMPTAGE (BREAKDOWN JSONB) DANS BAR_SESSIONS
-- ==============================================================================

ALTER TABLE public.bar_sessions
ADD COLUMN IF NOT EXISTS opening_breakdown jsonb DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS closing_breakdown jsonb DEFAULT '{}'::jsonb;
