'use client';

import React, { useState, useEffect } from 'react';
import { TrackItem } from '@/types/models';
import { getTracks, updateTrackStatus, deleteTrack } from '../actions';
import {
  Flag,
  Plus,
  Edit2,
  Trash2,
  RefreshCw,
  Clock,
  Lock,
  Wrench,
  AlertTriangle,
  Loader2,
  Hash,
} from 'lucide-react';
import { usePermissions } from '@/modules/admin/hooks/usePermissions';
import { useAuth } from '@/hooks/useAuth';
import TrackClosureModal from './TrackClosureModal';
import TrackEditModal from './TrackEditModal';

interface AdminTracksTabProps {
  canEdit?: boolean;
  isSimulated?: boolean;
}

export default function AdminTracksTab({ canEdit = true, isSimulated = false }: AdminTracksTabProps) {
  const [tracks, setTracks] = useState<TrackItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [closingTrack, setClosingTrack] = useState<TrackItem | null>(null);
  const [editingTrack, setEditingTrack] = useState<TrackItem | null | undefined>(undefined); // undefined: modal fermé, null: nouvelle piste, TrackItem: édition
  const [deletingTrack, setDeletingTrack] = useState<TrackItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const { user, profile } = useAuth();
  const permissions = usePermissions(user, profile);

  const isSuperOrAdmin = permissions.isSuperAdmin || permissions.isAdmin || profile?.role === 'admin' || canEdit;
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

  // Toggle rapide ouverture / fermeture
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

    // Si la piste est actuellement ouverte, ouvrir la modale de fermeture pour choisir motif/durée
    if (track.is_open) {
      setClosingTrack(track);
      return;
    }

    // Si la piste est fermée, réouverture immédiate
    setUpdatingId(track.id);

    // Optimistic update
    setTracks((prev) =>
      prev.map((t) =>
        t.id === track.id
          ? {
              ...t,
              is_open: true,
              status: 'OPEN',
              closure_reason: null,
              closure_type: null,
              reopening_at: null,
              status_message: null,
              updated_at: new Date().toISOString(),
            }
          : t
      )
    );

    const res = await updateTrackStatus(track.id, true);
    setUpdatingId(null);

    if (res.success) {
      setMessage({
        text: `Piste "${track.name}" rouverte avec succès.`,
        type: 'success',
      });
      setTimeout(() => setMessage(null), 3000);
    } else {
      fetchTracks();
      setMessage({ text: `Erreur : ${res.error}`, type: 'error' });
      setTimeout(() => setMessage(null), 4000);
    }
  };

  // Confirmation de fermeture avec durée/motif
  const handleConfirmClosure = async (
    trackId: string,
    options: {
      closure_type: import('@/types/models').TrackClosureType;
      reopening_at: string | null;
      closure_reason: string | null;
    }
  ) => {
    setUpdatingId(trackId);

    // Optimistic update
    setTracks((prev) =>
      prev.map((t) =>
        t.id === trackId
          ? {
              ...t,
              is_open: false,
              status: options.closure_type === 'INDEFINITE_WORKS' ? 'WORK' : 'CLOSED',
              closure_type: options.closure_type,
              reopening_at: options.reopening_at,
              closure_reason: options.closure_reason,
              status_message: options.closure_reason,
              updated_at: new Date().toISOString(),
            }
          : t
      )
    );

    const res = await updateTrackStatus(trackId, false, options);
    setUpdatingId(null);
    setClosingTrack(null);

    if (res.success) {
      setMessage({
        text: `Piste mise à l'arrêt avec succès.`,
        type: 'success',
      });
      setTimeout(() => setMessage(null), 3000);
    } else {
      fetchTracks();
      setMessage({ text: `Erreur : ${res.error}`, type: 'error' });
      setTimeout(() => setMessage(null), 4000);
    }
  };

  // Suppression d'une piste
  const handleDeleteTrack = async () => {
    if (!deletingTrack) return;
    setIsDeleting(true);

    const res = await deleteTrack(deletingTrack.id);
    setIsDeleting(false);
    setDeletingTrack(null);

    if (res.success) {
      setTracks((prev) => prev.filter((t) => t.id !== deletingTrack.id));
      setMessage({ text: `Piste "${deletingTrack.name}" supprimée avec succès.`, type: 'success' });
      setTimeout(() => setMessage(null), 3000);
    } else {
      setMessage({ text: `Erreur de suppression : ${res.error}`, type: 'error' });
      setTimeout(() => setMessage(null), 4000);
    }
  };

  const handleTrackSaved = (savedTrack: TrackItem) => {
    setTracks((prev) => {
      const exists = prev.some((t) => t.id === savedTrack.id);
      let updatedList: TrackItem[];
      if (exists) {
        updatedList = prev.map((t) => (t.id === savedTrack.id ? savedTrack : t));
      } else {
        updatedList = [...prev, savedTrack];
      }
      return updatedList.sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0));
    });
    setMessage({
      text: `Piste "${savedTrack.name}" enregistrée avec succès.`,
      type: 'success',
    });
    setTimeout(() => setMessage(null), 3000);
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
              Gestion de l&apos;État des Pistes
            </h2>
          </div>
          <p className="text-xs text-foreground/60 font-mono">
            Basculez instantanément l&apos;état des circuits, ajoutez et configurez tous les tracés du club.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {isSuperOrAdmin && (
            <button
              onClick={() => setEditingTrack(null)}
              className="px-3.5 py-2 rounded-lg bg-primary hover:bg-primary/90 text-black font-anybody font-black text-xs uppercase tracking-wider transition-all sport-skew flex items-center gap-1.5 cursor-pointer shadow-[2px_2px_0px_#000]"
            >
              <Plus className="w-4 h-4" />
              <span>Ajouter une piste</span>
            </button>
          )}

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
          <button onClick={() => setMessage(null)} className="text-foreground/40 hover:text-white cursor-pointer">
            ×
          </button>
        </div>
      )}

      {/* Loading state */}
      {loading && tracks.length === 0 && (
        <div className="p-12 flex flex-col items-center justify-center gap-3 border border-[#353535] rounded-xl bg-surface/50">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
          <span className="text-xs font-mono text-foreground/50 uppercase tracking-wider">
            Chargement des pistes du club...
          </span>
        </div>
      )}

      {/* Empty State */}
      {!loading && tracks.length === 0 && (
        <div className="p-12 text-center border border-[#353535] rounded-xl bg-surface/50 space-y-4">
          <Flag className="w-10 h-10 text-foreground/30 mx-auto" />
          <div className="space-y-1">
            <h3 className="text-white font-anybody font-black uppercase text-base">Aucune piste configurée</h3>
            <p className="text-xs font-mono text-foreground/50">
              Commencez par ajouter votre premier tracé à l&apos;aide du bouton ci-dessous.
            </p>
          </div>
          {isSuperOrAdmin && (
            <button
              onClick={() => setEditingTrack(null)}
              className="px-4 py-2 bg-primary text-black font-anybody font-black text-xs uppercase tracking-wider rounded-lg sport-skew inline-flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              <span>Ajouter une piste</span>
            </button>
          )}
        </div>
      )}

      {/* Grille Dynamique des Pistes */}
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
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-anybody font-black text-xl text-white tracking-tight uppercase">
                      {trackDisplayName}
                    </span>

                    {typeof track.order_index === 'number' && (
                      <span className="px-1.5 py-0.5 rounded bg-surface-dim border border-[#353535] text-[10px] font-mono text-foreground/50 flex items-center gap-0.5">
                        <Hash className="w-2.5 h-2.5" />
                        {track.order_index}
                      </span>
                    )}

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

                {/* Status Badge & Action Buttons */}
                <div className="flex items-center gap-2 shrink-0">
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

                  {/* Boutons d'édition et suppression */}
                  {isSuperOrAdmin && (
                    <div className="flex items-center gap-1 ml-1 pl-2 border-l border-[#353535]">
                      <button
                        onClick={() => setEditingTrack(track)}
                        title="Modifier cette piste"
                        className="p-1.5 rounded-lg bg-surface-dim hover:bg-surface-high text-foreground/70 hover:text-white border border-[#353535] transition-colors cursor-pointer"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={() => setDeletingTrack(track)}
                        title="Supprimer cette piste"
                        className="p-1.5 rounded-lg bg-surface-dim hover:bg-red-500/20 text-foreground/70 hover:text-red-400 border border-[#353535] hover:border-red-500/40 transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Si piste fermée : Détails du motif et réouverture */}
              {!isOpen && (
                <div className="bg-surface-dim/90 p-3 rounded-lg border border-red-500/20 text-xs font-mono space-y-1">
                  <div className="flex items-center gap-2 text-foreground/80 font-bold">
                    {track.closure_type === 'INDEFINITE_WORKS' ? (
                      <span className="text-amber-400 flex items-center gap-1.5">
                        <Wrench className="w-3.5 h-3.5" />
                        Travaux en cours (durée indéterminée)
                      </span>
                    ) : track.reopening_at ? (
                      <span className="text-red-300 flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-primary" />
                        Réouverture estimée : {new Date(track.reopening_at).toLocaleTimeString('fr-BE', { hour: '2-digit', minute: '2-digit' })} ({new Date(track.reopening_at).toLocaleDateString('fr-BE', { day: '2-digit', month: '2-digit' })})
                      </span>
                    ) : (
                      <span className="text-red-400">Fermeture programmée</span>
                    )}
                  </div>
                  {(track.status_message || track.closure_reason) && (
                    <p className="text-[11px] text-foreground/60 italic pl-5">
                      Motif : {track.status_message || track.closure_reason}
                    </p>
                  )}
                </div>
              )}

              {/* Toggle Switch Button */}
              <div className="pt-2 border-t border-[#353535] flex items-center justify-between gap-3">
                <span className="text-xs font-mono text-foreground/60">
                  {!isTrackManageable
                    ? 'Modification non autorisée (Réservée aux référents assignés)'
                    : isOpen
                    ? 'Mettre à l\'arrêt (Définir durée / travaux)'
                    : 'Réouvrir la piste immédiatement'}
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
                  <span className="sr-only">Modifier l&apos;état de {trackDisplayName}</span>
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

      {/* Modal de fermeture avec paramétrage durée / motif */}
      <TrackClosureModal
        track={closingTrack}
        isOpen={Boolean(closingTrack)}
        onClose={() => setClosingTrack(null)}
        onConfirm={handleConfirmClosure}
        loading={Boolean(updatingId)}
      />

      {/* Modal d'ajout / édition complète de piste */}
      {editingTrack !== undefined && (
        <TrackEditModal
          track={editingTrack}
          isOpen={editingTrack !== undefined}
          onClose={() => setEditingTrack(undefined)}
          onSaved={handleTrackSaved}
        />
      )}

      {/* Dialogue de confirmation de suppression */}
      {deletingTrack && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-surface border border-red-500/30 rounded-xl w-full max-w-md p-6 space-y-4 shadow-2xl animate-scale-up">
            <div className="flex items-center gap-3 text-red-400">
              <div className="p-2.5 rounded-lg bg-red-500/15 border border-red-500/30">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-anybody font-black text-lg text-white uppercase tracking-tight sport-skew">
                  Supprimer la Piste
                </h3>
                <p className="text-xs text-foreground/60 font-mono">Action irréversible</p>
              </div>
            </div>

            <p className="text-xs font-mono text-foreground/80 leading-relaxed">
              Êtes-vous sûr de vouloir supprimer définitivement la piste{' '}
              <strong className="text-white">&quot;{deletingTrack.name}&quot;</strong> ?
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                onClick={() => setDeletingTrack(null)}
                disabled={isDeleting}
                className="px-4 py-2 rounded-lg bg-surface-high hover:bg-surface border border-[#353535] text-xs font-mono text-foreground/70 hover:text-white transition-colors cursor-pointer"
              >
                Annuler
              </button>
              <button
                onClick={handleDeleteTrack}
                disabled={isDeleting}
                className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white font-anybody font-black text-xs uppercase tracking-wider transition-all sport-skew flex items-center gap-1.5 cursor-pointer shadow-lg disabled:opacity-50"
              >
                {isDeleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                <span>Confirmer la suppression</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
