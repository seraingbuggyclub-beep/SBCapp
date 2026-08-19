-- ==============================================================================
-- Migration : Refonte RBAC des Prérogatives des Référents (Matrice 1:1)
-- Date : 2026-08-19
-- Seraing Buggy Club (ASBL)
-- ==============================================================================

-- 1. Mise à jour du schéma par défaut de la colonne referent_permissions sur sbc_members
ALTER TABLE public.sbc_members
ALTER COLUMN referent_permissions SET DEFAULT '{
  "allowed_track_ids": [],
  "can_open_close_tracks": false,
  "can_manage_track_events": false,
  "can_create_edit_events": false,
  "can_manage_event_registrations": false,
  "allowed_event_track_ids": [],
  "can_view_members_registry": false,
  "can_view_member_contact_details": false,
  "can_view_attendance": true,
  "can_validate_attendance": false,
  "can_pos_bar": false,
  "can_manage_bar": false,
  "can_manage_pit_lane": false
}'::jsonb;

-- 2. Mise à jour des valeurs existantes
UPDATE public.sbc_members
SET referent_permissions = '{
  "allowed_track_ids": [],
  "can_open_close_tracks": false,
  "can_manage_track_events": false,
  "can_create_edit_events": false,
  "can_manage_event_registrations": false,
  "allowed_event_track_ids": [],
  "can_view_members_registry": false,
  "can_view_member_contact_details": false,
  "can_view_attendance": true,
  "can_validate_attendance": false,
  "can_pos_bar": false,
  "can_manage_bar": false,
  "can_manage_pit_lane": false
}'::jsonb
WHERE role = 'referent' AND (referent_permissions IS NULL OR referent_permissions = '{}'::jsonb);

COMMENT ON COLUMN public.sbc_members.referent_permissions IS 'Permissions granulaires RBAC matrice 1:1 déléguées aux Référents SBC';
