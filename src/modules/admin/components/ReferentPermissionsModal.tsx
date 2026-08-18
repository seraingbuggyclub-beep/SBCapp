'use client';

import React, { useState, useEffect } from 'react';
import {
  Shield,
  Flag,
  Trophy,
  Coffee,
  ShieldCheck,
  Radio,
  X,
  CheckCircle2,
  AlertTriangle,
  Lock,
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
    allowed_event_track_ids: [],
    can_manage_bar: false,
    can_view_attendance: true,
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
        const initialPerms = member.referent_permissions || {
          allowed_track_ids: [],
          can_open_close_tracks: false,
          can_manage_track_events: false,
          allowed_event_track_ids: [],
          can_manage_bar: false,
          can_view_attendance: true,
          can_manage_pit_lane: false,
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
        // Si aucune piste n'est assignée, désactiver l'ouverture automatique
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
      const { success, error } = await updateMemberRoleAndPermissions(
        member.id,
        'referent',
        null,
        perms
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
      <div className="w-full max-w-2xl premium-card p-6 rounded-2xl border border-primary/50 shadow-2xl relative space-y-5 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#353535] pb-3.5">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-primary/20 border border-primary/40 flex items-center justify-center text-primary">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-anybody font-black text-lg uppercase tracking-tight sport-skew text-white">
                  Prérogatives du Référent
                </h3>
                <span className="px-2 py-0.5 rounded bg-primary/20 text-primary border border-primary/30 text-[10px] uppercase font-bold">
                  Référent Club
                </span>
              </div>
              <p className="text-xs text-foreground/60">
                Pilote : <strong className="text-white">{member.first_name} {member.last_name}</strong> ({member.email})
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-surface text-foreground/50 hover:text-white cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {errorMsg && (
          <div className="p-3 rounded bg-secondary/15 border border-secondary/30 text-secondary text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Section 1 : Pistes sous sa responsabilité */}
        <div className="space-y-3 p-4 rounded-xl bg-surface border border-[#353535]">
          <div className="flex items-center gap-2 text-white">
            <Flag className="w-4 h-4 text-primary" />
            <h4 className="font-bold text-xs uppercase tracking-wider">
              1. Pistes sous sa responsabilité
            </h4>
          </div>
          <p className="text-[11px] text-foreground/60">
            Cochez les pistes que ce référent est autorisé à superviser au club :
          </p>

          {loadingTracks ? (
            <div className="text-xs text-foreground/40 py-2">Chargement des pistes...</div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
              {tracks.map((t) => {
                const isSelected = perms.allowed_track_ids.includes(t.id);
                return (
                  <button
                    type="button"
                    key={t.id}
                    onClick={() => toggleTrack(t.id)}
                    className={`p-3 rounded-lg border text-left flex items-start justify-between gap-2 transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-primary/15 border-primary/60 text-white shadow-[2px_2px_0px_#000]'
                        : 'bg-surface-dim border-[#353535] text-foreground/60 hover:text-white hover:border-[#454545]'
                    }`}
                  >
                    <div>
                      <div className="font-bold text-xs">{t.name}</div>
                      <div className="text-[10px] text-foreground/40">{t.type || 'Piste SBC'}</div>
                    </div>
                    <div
                      className={`w-4 h-4 rounded border mt-0.5 flex items-center justify-center ${
                        isSelected ? 'bg-primary border-primary text-black' : 'border-[#454545]'
                      }`}
                    >
                      {isSelected && <CheckCircle2 className="w-3 h-3 stroke-[3]" />}
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {/* Droit d'ouverture / fermeture */}
          <label className="flex items-center gap-3 pt-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={perms.can_open_close_tracks}
              onChange={(e) => setPerms({ ...perms, can_open_close_tracks: e.target.checked })}
              disabled={perms.allowed_track_ids.length === 0}
              className="rounded bg-background border-[#353535] text-primary focus:ring-0 w-4 h-4 cursor-pointer disabled:opacity-40"
            />
            <span className={`text-xs ${perms.allowed_track_ids.length === 0 ? 'text-foreground/30' : 'text-foreground/80'}`}>
              Autoriser l'ouverture / fermeture et statut météo de ses pistes assignées
            </span>
          </label>
        </div>

        {/* Section 2 : Événements & Courses */}
        <div className="space-y-3 p-4 rounded-xl bg-surface border border-[#353535]">
          <div className="flex items-center gap-2 text-white">
            <Trophy className="w-4 h-4 text-primary" />
            <h4 className="font-bold text-xs uppercase tracking-wider">
              2. Gestion des Courses & Événements
            </h4>
          </div>

          <label className="flex items-center gap-3 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={perms.can_manage_track_events}
              onChange={(e) => setPerms({ ...perms, can_manage_track_events: e.target.checked })}
              className="rounded bg-background border-[#353535] text-primary focus:ring-0 w-4 h-4 cursor-pointer"
            />
            <span className="text-xs text-foreground/80 font-bold">
              Autoriser la création et gestion d'événements/courses
            </span>
          </label>

          {perms.can_manage_track_events && (
            <div className="pl-7 space-y-2 pt-1 border-l-2 border-primary/30">
              <span className="text-[10px] text-foreground/50 uppercase block">
                Pistes autorisées pour ses événements :
              </span>
              <div className="flex flex-wrap gap-2">
                {tracks.map((t) => {
                  const checked = perms.allowed_event_track_ids.includes(t.id);
                  return (
                    <button
                      type="button"
                      key={t.id}
                      onClick={() => toggleEventTrack(t.id)}
                      className={`px-2.5 py-1 rounded text-[11px] border transition-all cursor-pointer ${
                        checked
                          ? 'bg-primary/20 border-primary text-primary font-bold'
                          : 'bg-surface-dim border-[#353535] text-foreground/50 hover:text-white'
                      }`}
                    >
                      {t.name}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Section 3 : Modules Annexes */}
        <div className="space-y-3 p-4 rounded-xl bg-surface border border-[#353535]">
          <div className="flex items-center gap-2 text-white">
            <ShieldCheck className="w-4 h-4 text-primary" />
            <h4 className="font-bold text-xs uppercase tracking-wider">
              3. Modules Annexes Autorisés
            </h4>
          </div>

          <div className="space-y-2 pt-1">
            <label className="flex items-center gap-3 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={perms.can_manage_bar}
                onChange={(e) => setPerms({ ...perms, can_manage_bar: e.target.checked })}
                className="rounded bg-background border-[#353535] text-primary focus:ring-0 w-4 h-4 cursor-pointer"
              />
              <span className="text-xs text-foreground/80 flex items-center gap-2">
                <Coffee className="w-3.5 h-3.5 text-primary" />
                Gestion Buvette & Point de Vente (POS)
              </span>
            </label>

            <label className="flex items-center gap-3 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={perms.can_view_attendance}
                onChange={(e) => setPerms({ ...perms, can_view_attendance: e.target.checked })}
                className="rounded bg-background border-[#353535] text-primary focus:ring-0 w-4 h-4 cursor-pointer"
              />
              <span className="text-xs text-foreground/80 flex items-center gap-2">
                <ShieldCheck className="w-3.5 h-3.5 text-primary" />
                Registre de Présence FBA (Consultation & Validation)
              </span>
            </label>

            <label className="flex items-center gap-3 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={perms.can_manage_pit_lane}
                onChange={(e) => setPerms({ ...perms, can_manage_pit_lane: e.target.checked })}
                className="rounded bg-background border-[#353535] text-primary focus:ring-0 w-4 h-4 cursor-pointer"
              />
              <span className="text-xs text-foreground/80 flex items-center gap-2">
                <Radio className="w-3.5 h-3.5 text-primary" />
                Brief Pit-Lane (Publication d'annonces de piste)
              </span>
            </label>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#353535]">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded bg-surface hover:bg-surface-high border border-[#353535] text-foreground/70 cursor-pointer text-xs"
          >
            Annuler
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="px-5 py-2 rounded bg-primary hover:bg-primary-light text-black font-anybody font-black uppercase text-xs tracking-wider transition-all sport-skew shadow-[2px_2px_0px_#000] cursor-pointer disabled:opacity-50"
          >
            <span className="transform skew-x-8">
              {saving ? 'Enregistrement...' : 'Valider les prérogatives'}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
