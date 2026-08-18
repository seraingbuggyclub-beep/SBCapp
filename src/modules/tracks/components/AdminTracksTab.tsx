'use client';

import React, { useState, useEffect } from 'react';
import { TrackItem } from '@/types/models';
import { getTracks, updateTrackStatus } from '../actions';
import { Flag, CheckCircle2, AlertTriangle, RefreshCw, Clock, ShieldCheck, Zap, Lock } from 'lucide-react';
import { usePermissions } from '@/modules/admin/hooks/usePermissions';
import { useAuth } from '@/hooks/useAuth';

interface AdminTracksTabProps {
  canEdit?: boolean;
  isSimulated?: boolean;
}

export default function AdminTracksTab({ canEdit = true, isSimulated = false }: AdminTracksTabProps) {
  const [tracks, setTracks] = useState<TrackItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  
  const { user, profile } = useAuth();
  const permissions = usePermissions(user, profile);

  const isSuperOrAdmin = permissions.isSuperAdmin || permissions.isAdmin || profile?.role === 'admin' || profile?.role === 'super_admin' || canEdit;
  const canEditTrack = (trackId: string): boolean => {
    if (isSuperOrAdmin) return true;
    return permissions.canManageTrack(trackId);
  };

  const fetchTracks = async () => {
    setLoading(true);
    const res = await getTracks();
    if (res.data) {
      setTracks(res.data);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchTracks();
  }, []);

  const handleToggle = async (track: TrackItem) => {
    if (isSimulated) {
      setMessage({ text: 'Simulation active : modification bloquée.', type: 'error' });
      setTimeout(() => setMessage(null), 3000);
      return;
    }

    if (!canEditTrack(track.id)) {
      setMessage({ text: 'Action non autorisée : vous n\'êtes pas référent pour cette piste.', type: 'error' });
      setTimeout(() => setMessage(null), 3000);
      return;
    }

    const nextState = !track.is_open;
    setUpdatingId(track.id);

    // Optimistic update
    setTracks((prev) =>
      prev.map((t) =>
        t.id === track.id
          ? { ...t, is_open: nextState, updated_at: new Date().toISOString() }
          : t
      )
    );

    const res = await updateTrackStatus(track.id, nextState);
    setUpdatingId(null);

    if (res.success) {
      setMessage({
        text: `Piste "${track.name}" ${nextState ? 'ouverte' : 'fermée / en travaux'} avec succès.`,
        type: 'success',
      });
      setTimeout(() => setMessage(null), 3000);
    } else {
      // Revert in case of error
      setTracks((prev) =>
        prev.map((t) => (t.id === track.id ? { ...t, is_open: track.is_open } : t))
      );
      setMessage({ text: `Erreur : ${res.error}`, type: 'error' });
      setTimeout(() => setMessage(null), 4000);
    }
  };

  const formatDate = (dateStr?: string | null) => {
    if (!dateStr) return 'Non renseigné';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('fr-BE', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="space-y-6">
      {/* Tab Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-surface border border-[#353535] p-5 rounded-xl">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Flag className="w-5 h-5 text-primary" />
            <h2 className="font-anybody font-black text-lg uppercase tracking-tight text-white sport-skew">
              Gestion de l'État des Pistes
            </h2>
          </div>
          <p className="text-xs text-foreground/60 font-mono">
            Basculez instantanément l'état des circuits (1 clic = mise à jour immédiate sur la Landing Page et l'application).
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchTracks}
            disabled={loading}
            className="px-3 py-2 rounded-lg bg-surface-high hover:bg-surface border border-[#353535] text-xs font-mono text-foreground/80 hover:text-white flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-40"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Actualiser</span>
          </button>
        </div>
      </div>

      {/* Message notification */}
      {message && (
        <div
          className={`p-3 rounded-lg border text-xs font-mono flex items-center justify-between animate-fade-in ${
            message.type === 'success'
              ? 'bg-primary/10 border-primary/30 text-primary'
              : 'bg-secondary/15 border-secondary/40 text-secondary'
          }`}
        >
          <span>{message.text}</span>
          <button onClick={() => setMessage(null)} className="text-foreground/40 hover:text-white">
            ×
          </button>
        </div>
      )}

      {/* Grid of 4 Track Controls */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {tracks.map((track) => {
          const isUpdating = updatingId === track.id;
          const isOpen = track.is_open;
          const isTrackManageable = canEditTrack(track.id);
          const trackDisplayName = track.name?.toLowerCase().startsWith('piste')
            ? track.name
            : `Piste ${track.name}`;

          return (
            <div
              key={track.id || track.name}
              className={`p-5 rounded-xl border transition-all duration-300 flex flex-col justify-between gap-4 shadow-[3px_3px_0px_#000] relative overflow-hidden ${
                isOpen
                  ? 'bg-surface border-green-500/30'
                  : 'bg-surface border-red-500/30'
              }`}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-anybody font-black text-xl text-white tracking-tight uppercase">
                      {trackDisplayName}
                    </span>
                    {!isSuperOrAdmin && permissions.isReferent && isTrackManageable && (
                      <span className="px-2 py-0.5 rounded bg-primary/20 border border-primary/40 text-primary text-[9px] font-mono font-bold uppercase">
                        Assignée
                      </span>
                    )}
                    {!isSuperOrAdmin && permissions.isReferent && !isTrackManageable && (
                      <span className="px-2 py-0.5 rounded bg-secondary/20 border border-secondary/40 text-secondary text-[9px] font-mono font-bold uppercase flex items-center gap-1">
                        <Lock className="w-2.5 h-2.5" />
                        Lecture Seule
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 text-[11px] font-mono text-foreground/50">
                    <Clock className="w-3 h-3" />
                    <span>Mis à jour : {formatDate(track.updated_at)}</span>
                  </div>
                </div>

                {/* Status Badge Visual */}
                <div className="flex items-center gap-2">
                  {isOpen ? (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-green-500/15 border border-green-500/40 text-green-400 text-xs font-mono font-bold">
                      <span className="w-2 h-2 rounded-full bg-green-500" />
                      Ouverte
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-500/15 border border-red-500/40 text-red-400 text-xs font-mono font-bold animate-pulse">
                      <span className="w-2 h-2 rounded-full bg-red-500" />
                      Fermée
                    </span>
                  )}
                </div>
              </div>

              {/* Toggle Switch Button */}
              <div className="pt-2 border-t border-[#353535] flex items-center justify-between gap-3">
                <span className="text-xs font-mono text-foreground/60">
                  {!isTrackManageable
                    ? 'Modification non autorisée (Réservée aux référents assignés)'
                    : isOpen
                    ? 'Basculer vers Fermée / Travaux'
                    : 'Basculer vers Piste Ouverte'}
                </span>

                <button
                  type="button"
                  onClick={() => handleToggle(track)}
                  disabled={isUpdating || !isTrackManageable}
                  className={`relative inline-flex h-8 w-16 shrink-0 cursor-pointer rounded-full border-2 transition-colors duration-200 ease-in-out focus:outline-none disabled:opacity-40 disabled:cursor-not-allowed ${
                    isOpen
                      ? 'bg-green-500 border-green-400'
                      : 'bg-zinc-800 border-red-500/60'
                  }`}
                  role="switch"
                  aria-checked={isOpen}
                >
                  <span className="sr-only">Modifier l'état de {trackDisplayName}</span>
                  <span
                    aria-hidden="true"
                    className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out mt-0.5 ${
                      isOpen ? 'translate-x-8' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
