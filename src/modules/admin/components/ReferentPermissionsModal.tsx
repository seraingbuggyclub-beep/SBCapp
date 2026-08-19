'use client';

import React, { useState, useEffect } from 'react';
import {
  Shield,
  Users,
  Flag,
  Trophy,
  ShieldCheck,
  Radio,
  X,
  AlertTriangle,
  Lock,
  Check,
} from 'lucide-react';
import { MemberProfile, ReferentPermissions, TrackItem, getErrorMessage } from '@/types/models';
import { getAvailableTracks, updateMemberRoleAndPermissions } from '../referent-actions';

interface ReferentPermissionsModalProps {
  member: MemberProfile | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function ReferentPermissionsModal({
  member,
  isOpen,
  onClose,
  onSuccess,
}: ReferentPermissionsModalProps) {
  const [tracks, setTracks] = useState<TrackItem[]>([]);
  const [loadingTracks, setLoadingTracks] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');

  const [perms, setPerms] = useState<ReferentPermissions>({
    allowed_track_ids: [],
    can_open_close_tracks: false,
    can_manage_track_events: false,
    can_create_edit_events: false,
    can_manage_event_registrations: false,
    allowed_event_track_ids: [],
    can_view_members_registry: false,
    can_view_member_contact_details: false,
    can_view_attendance: true,
    can_validate_attendance: false,
    can_pos_bar: false,
    can_manage_bar: false,
    can_manage_pit_lane: false,
  });

  useEffect(() => {
    if (isOpen) {
      setLoadingTracks(true);
      setErrorMsg('');
      getAvailableTracks().then((res) => {
        setTracks(res.data);
        setLoadingTracks(false);
      });

      if (member) {
        const rp = member.referent_permissions;
        const initialPerms: ReferentPermissions = {
          allowed_track_ids: rp?.allowed_track_ids || [],
          can_open_close_tracks: Boolean(rp?.can_open_close_tracks),
          can_manage_track_events: Boolean(rp?.can_manage_track_events),
          can_create_edit_events: Boolean(rp?.can_create_edit_events ?? rp?.can_manage_track_events),
          can_manage_event_registrations: Boolean(rp?.can_manage_event_registrations ?? rp?.can_manage_track_events),
          allowed_event_track_ids: rp?.allowed_event_track_ids || [],
          can_view_members_registry: Boolean(rp?.can_view_members_registry),
          can_view_member_contact_details: Boolean(rp?.can_view_member_contact_details),
          can_view_attendance: rp?.can_view_attendance ?? true,
          can_validate_attendance: Boolean(rp?.can_validate_attendance),
          can_pos_bar: Boolean(rp?.can_pos_bar || rp?.can_manage_bar),
          can_manage_bar: Boolean(rp?.can_pos_bar || rp?.can_manage_bar),
          can_manage_pit_lane: Boolean(rp?.can_manage_pit_lane),
        };
        setPerms(initialPerms);
      }
    }
  }, [isOpen, member]);

  if (!isOpen || !member) return null;

  const toggleTrack = (trackId: string) => {
    setPerms((prev) => {
      const exists = prev.allowed_track_ids.includes(trackId);
      const nextList = exists
        ? prev.allowed_track_ids.filter((id) => id !== trackId)
        : [...prev.allowed_track_ids, trackId];
      return {
        ...prev,
        allowed_track_ids: nextList,
        can_open_close_tracks: nextList.length > 0 ? prev.can_open_close_tracks : false,
      };
    });
  };

  const toggleEventTrack = (trackId: string) => {
    setPerms((prev) => {
      const exists = prev.allowed_event_track_ids.includes(trackId);
      const nextList = exists
        ? prev.allowed_event_track_ids.filter((id) => id !== trackId)
        : [...prev.allowed_event_track_ids, trackId];
      return {
        ...prev,
        allowed_event_track_ids: nextList,
      };
    });
  };

  const handleSave = async () => {
    setSaving(true);
    setErrorMsg('');
    try {
      const hasEventPerms = Boolean(
        perms.can_manage_track_events ||
        perms.can_create_edit_events ||
        perms.can_manage_event_registrations
      );

      const sanitizedPerms: ReferentPermissions = {
        ...perms,
        can_manage_track_events: hasEventPerms,
        can_manage_bar: Boolean(perms.can_pos_bar),
        can_view_attendance: Boolean(perms.can_view_attendance || perms.can_validate_attendance),
      };

      const { success, error } = await updateMemberRoleAndPermissions(
        member.id,
        'referent',
        null,
        sanitizedPerms
      );

      if (!success || error) {
        throw new Error(error || 'Erreur lors de l’enregistrement des permissions.');
      }

      onSuccess();
      onClose();
    } catch (err: unknown) {
      setErrorMsg(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-fade-in font-mono">
      <div className="w-full max-w-2xl bg-[#111] p-6 rounded-2xl border border-primary/40 shadow-2xl relative space-y-4 max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#2c2c2c] pb-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary/20 border border-primary/40 flex items-center justify-center text-primary">
              <Shield className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-anybody font-black text-base uppercase tracking-tight sport-skew text-white">
                  Matrice des Prérogatives Référent
                </h3>
                <span className="px-2 py-0.5 rounded bg-primary/20 text-primary border border-primary/30 text-[9px] uppercase font-bold">
                  RBAC 1:1
                </span>
              </div>
              <p className="text-[11px] text-foreground/60">
                Pilote : <strong className="text-white">{member.first_name} {member.last_name}</strong> ({member.email})
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-surface text-foreground/50 hover:text-white cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {errorMsg && (
          <div className="p-2.5 rounded bg-secondary/15 border border-secondary/30 text-secondary text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Matrice des Permissions Granulaire */}
        <div className="space-y-3">
          {/* Section 1 : Onglet Membres & Pilotes */}
          <div className="border border-[#2c2c2c] rounded-xl bg-[#161616] overflow-hidden">
            <div className="px-3.5 py-2 bg-[#1c1c1c] border-b border-[#2c2c2c] flex items-center gap-2 text-white">
              <Users className="w-3.5 h-3.5 text-primary" />
              <h4 className="font-bold text-xs uppercase tracking-wider">
                Onglet Membres & Pilotes
              </h4>
            </div>
            <div className="p-3 space-y-2">
              <label className="flex items-center gap-3 cursor-pointer select-none text-xs text-foreground/90 hover:text-white transition-colors">
                <input
                  type="checkbox"
                  checked={Boolean(perms.can_view_members_registry)}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    setPerms({
                      ...perms,
                      can_view_members_registry: checked,
                      can_view_member_contact_details: checked ? perms.can_view_member_contact_details : false,
                    });
                  }}
                  className="rounded bg-background border-[#444] text-primary focus:ring-0 w-4 h-4 cursor-pointer"
                />
                <span>Voir la liste des membres (lecture seule)</span>
              </label>

              <label className={`flex items-center gap-3 cursor-pointer select-none text-xs pl-6 transition-colors ${
                !perms.can_view_members_registry ? 'text-foreground/30 cursor-not-allowed' : 'text-foreground/80 hover:text-white'
              }`}>
                <input
                  type="checkbox"
                  disabled={!perms.can_view_members_registry}
                  checked={Boolean(perms.can_view_member_contact_details)}
                  onChange={(e) => setPerms({ ...perms, can_view_member_contact_details: e.target.checked })}
                  className="rounded bg-background border-[#444] text-primary focus:ring-0 w-4 h-4 cursor-pointer disabled:opacity-30"
                />
                <span>Voir les coordonnées & téléphones</span>
              </label>
            </div>
          </div>

          {/* Section 2 : Onglet Présences FBA */}
          <div className="border border-[#2c2c2c] rounded-xl bg-[#161616] overflow-hidden">
            <div className="px-3.5 py-2 bg-[#1c1c1c] border-b border-[#2c2c2c] flex items-center gap-2 text-white">
              <ShieldCheck className="w-3.5 h-3.5 text-primary" />
              <h4 className="font-bold text-xs uppercase tracking-wider">
                Onglet Présences FBA
              </h4>
            </div>
            <div className="p-3 space-y-2">
              <label className="flex items-center gap-3 cursor-pointer select-none text-xs text-foreground/90 hover:text-white transition-colors">
                <input
                  type="checkbox"
                  checked={Boolean(perms.can_view_attendance)}
                  onChange={(e) => setPerms({ ...perms, can_view_attendance: e.target.checked })}
                  className="rounded bg-background border-[#444] text-primary focus:ring-0 w-4 h-4 cursor-pointer"
                />
                <span>Consulter le registre des check-ins terrain</span>
              </label>

              <label className="flex items-center gap-3 cursor-pointer select-none text-xs text-foreground/90 hover:text-white transition-colors">
                <input
                  type="checkbox"
                  checked={Boolean(perms.can_validate_attendance)}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    setPerms({
                      ...perms,
                      can_validate_attendance: checked,
                      can_view_attendance: true,
                    });
                  }}
                  className="rounded bg-background border-[#444] text-primary focus:ring-0 w-4 h-4 cursor-pointer"
                />
                <span>Pointer / Valider manuellement une présence FBA</span>
              </label>
            </div>
          </div>

          {/* Section 3 : Onglet Gestion des Pistes */}
          <div className="border border-[#2c2c2c] rounded-xl bg-[#161616] overflow-hidden">
            <div className="px-3.5 py-2 bg-[#1c1c1c] border-b border-[#2c2c2c] flex items-center gap-2 text-white">
              <Flag className="w-3.5 h-3.5 text-primary" />
              <h4 className="font-bold text-xs uppercase tracking-wider">
                Onglet Gestion des Pistes
              </h4>
            </div>
            <div className="p-3 space-y-3">
              <div>
                <span className="text-[10px] text-foreground/50 uppercase block mb-1.5 font-bold">
                  Pistes autorisées :
                </span>
                {loadingTracks ? (
                  <span className="text-xs text-foreground/40">Chargement...</span>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {tracks.map((t) => {
                      const isSelected = perms.allowed_track_ids.includes(t.id);
                      return (
                        <button
                          type="button"
                          key={t.id}
                          onClick={() => toggleTrack(t.id)}
                          className={`px-2.5 py-1.5 rounded text-xs border flex items-center gap-1.5 transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-primary/20 border-primary text-primary font-bold'
                              : 'bg-[#202020] border-[#333] text-foreground/60 hover:text-white'
                          }`}
                        >
                          <div className={`w-3 h-3 rounded-sm border flex items-center justify-center ${
                            isSelected ? 'bg-primary border-primary text-black' : 'border-[#555]'
                          }`}>
                            {isSelected && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                          </div>
                          <span>{t.name}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              <label className={`flex items-center gap-3 cursor-pointer select-none text-xs transition-colors ${
                perms.allowed_track_ids.length === 0 ? 'text-foreground/30 cursor-not-allowed' : 'text-foreground/90 hover:text-white'
              }`}>
                <input
                  type="checkbox"
                  disabled={perms.allowed_track_ids.length === 0}
                  checked={Boolean(perms.can_open_close_tracks)}
                  onChange={(e) => setPerms({ ...perms, can_open_close_tracks: e.target.checked })}
                  className="rounded bg-background border-[#444] text-primary focus:ring-0 w-4 h-4 cursor-pointer disabled:opacity-30"
                />
                <span>Modifier le statut (Ouvert/Fermé) & Météo</span>
              </label>
            </div>
          </div>

          {/* Section 4 : Onglet Courses & Événements */}
          <div className="border border-[#2c2c2c] rounded-xl bg-[#161616] overflow-hidden">
            <div className="px-3.5 py-2 bg-[#1c1c1c] border-b border-[#2c2c2c] flex items-center gap-2 text-white">
              <Trophy className="w-3.5 h-3.5 text-primary" />
              <h4 className="font-bold text-xs uppercase tracking-wider">
                Onglet Courses & Événements
              </h4>
            </div>
            <div className="p-3 space-y-2.5">
              <label className="flex items-center gap-3 cursor-pointer select-none text-xs text-foreground/90 hover:text-white transition-colors">
                <input
                  type="checkbox"
                  checked={Boolean(perms.can_manage_track_events)}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    setPerms({
                      ...perms,
                      can_manage_track_events: checked,
                      can_create_edit_events: checked,
                      can_manage_event_registrations: checked,
                    });
                  }}
                  className="rounded bg-background border-[#444] text-primary focus:ring-0 w-4 h-4 cursor-pointer"
                />
                <span className="font-bold">Accès à la gestion des événements</span>
              </label>

              {perms.can_manage_track_events && (
                <div className="pl-6 space-y-2 border-l-2 border-primary/30 pt-0.5">
                  <label className="flex items-center gap-2.5 cursor-pointer select-none text-xs text-foreground/80 hover:text-white">
                    <input
                      type="checkbox"
                      checked={Boolean(perms.can_create_edit_events)}
                      onChange={(e) => setPerms({ ...perms, can_create_edit_events: e.target.checked })}
                      className="rounded bg-background border-[#444] text-primary focus:ring-0 w-3.5 h-3.5 cursor-pointer"
                    />
                    <span>Créer / Modifier un événement</span>
                  </label>

                  <label className="flex items-center gap-2.5 cursor-pointer select-none text-xs text-foreground/80 hover:text-white">
                    <input
                      type="checkbox"
                      checked={Boolean(perms.can_manage_event_registrations)}
                      onChange={(e) => setPerms({ ...perms, can_manage_event_registrations: e.target.checked })}
                      className="rounded bg-background border-[#444] text-primary focus:ring-0 w-3.5 h-3.5 cursor-pointer"
                    />
                    <span>Gérer les inscriptions & pointages</span>
                  </label>

                  <div className="pt-1">
                    <span className="text-[10px] text-foreground/50 uppercase block mb-1 font-bold">
                      Pistes autorisées pour événements :
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {tracks.map((t) => {
                        const checked = perms.allowed_event_track_ids.includes(t.id);
                        return (
                          <button
                            type="button"
                            key={t.id}
                            onClick={() => toggleEventTrack(t.id)}
                            className={`px-2 py-1 rounded text-[11px] border flex items-center gap-1.5 transition-all cursor-pointer ${
                              checked
                                ? 'bg-primary/20 border-primary text-primary font-bold'
                                : 'bg-[#202020] border-[#333] text-foreground/50 hover:text-white'
                            }`}
                          >
                            <div className={`w-2.5 h-2.5 rounded-sm border flex items-center justify-center ${
                              checked ? 'bg-primary border-primary text-black' : 'border-[#555]'
                            }`}>
                              {checked && <Check className="w-2 h-2 stroke-[3]" />}
                            </div>
                            <span>{t.name}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Section 5 : Outils Terrain & Communication */}
          <div className="border border-[#2c2c2c] rounded-xl bg-[#161616] overflow-hidden">
            <div className="px-3.5 py-2 bg-[#1c1c1c] border-b border-[#2c2c2c] flex items-center gap-2 text-white">
              <Radio className="w-3.5 h-3.5 text-primary" />
              <h4 className="font-bold text-xs uppercase tracking-wider">
                Outils Terrain & Communication
              </h4>
            </div>
            <div className="p-3 space-y-2">
              <label className="flex items-center gap-3 cursor-pointer select-none text-xs text-foreground/90 hover:text-white transition-colors">
                <input
                  type="checkbox"
                  checked={Boolean(perms.can_pos_bar)}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    setPerms({ ...perms, can_pos_bar: checked, can_manage_bar: checked });
                  }}
                  className="rounded bg-background border-[#444] text-primary focus:ring-0 w-4 h-4 cursor-pointer"
                />
                <span>Accès Caisse Buvette (/buvette - encaissement seul)</span>
              </label>

              <label className="flex items-center gap-3 cursor-pointer select-none text-xs text-foreground/90 hover:text-white transition-colors">
                <input
                  type="checkbox"
                  checked={Boolean(perms.can_manage_pit_lane)}
                  onChange={(e) => setPerms({ ...perms, can_manage_pit_lane: e.target.checked })}
                  className="rounded bg-background border-[#444] text-primary focus:ring-0 w-4 h-4 cursor-pointer"
                />
                <span>Publier dans le Brief Pit-Lane (flash infos)</span>
              </label>
            </div>
          </div>
        </div>

        {/* Encart fixe en bas : Rappel exclusif Admins */}
        <div className="p-2.5 rounded-lg bg-[#141414] border border-[#2a2a2a] flex items-center gap-2.5 text-[10px] text-foreground/50">
          <Lock className="w-3.5 h-3.5 text-secondary shrink-0" />
          <span className="leading-snug">
            <strong className="text-secondary uppercase">Exclusif Admin :</strong> Licences FBA, Blacklist, Trésorerie & Comptabilité, Paramètres buvette (tarifs & stocks), RGPD & APD, Simulateur.
          </span>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#2c2c2c]">
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-1.5 rounded bg-surface hover:bg-surface-high border border-[#353535] text-foreground/70 cursor-pointer text-xs"
          >
            Annuler
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-1.5 rounded bg-primary hover:bg-primary-light text-black font-anybody font-black uppercase text-xs tracking-wider transition-all sport-skew shadow-[2px_2px_0px_#000] cursor-pointer disabled:opacity-50"
          >
            <span className="transform skew-x-8">
              {saving ? 'Enregistrement...' : 'Enregistrer la matrice'}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
