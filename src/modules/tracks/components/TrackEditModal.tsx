'use client';

import React, { useState, useEffect } from 'react';
import { TrackItem, TrackClosureType } from '@/types/models';
import { createTrack, updateTrack } from '../actions';
import { Flag, X, Check, Loader2, AlertTriangle, Clock, Wrench, CloudRain, Hash } from 'lucide-react';

interface TrackEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: (track: TrackItem) => void;
  track?: TrackItem | null; // Si null -> Mode création, sinon Mode édition
}

export default function TrackEditModal({
  isOpen,
  onClose,
  onSaved,
  track,
}: TrackEditModalProps) {
  const isEditing = Boolean(track && track.id);

  const [name, setName] = useState('');
  const [orderIndex, setOrderIndex] = useState(0);
  const [isOpenTrack, setIsOpenTrack] = useState(true);
  const [closureType, setClosureType] = useState<TrackClosureType>('DURATION');
  const [statusMessage, setStatusMessage] = useState('');
  const [reopeningAt, setReopeningAt] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setError(null);
      if (track) {
        setName(track.name || '');
        setOrderIndex(track.order_index ?? 0);
        setIsOpenTrack(track.is_open ?? true);
        setClosureType(track.closure_type || 'DURATION');
        setStatusMessage(track.status_message || track.closure_reason || '');
        
        if (track.reopening_at) {
          try {
            const d = new Date(track.reopening_at);
            // Format ISO datetime-local (YYYY-MM-DDTHH:mm)
            const localIso = new Date(d.getTime() - d.getTimezoneOffset() * 60000)
              .toISOString()
              .slice(0, 16);
            setReopeningAt(localIso);
          } catch {
            setReopeningAt('');
          }
        } else {
          setReopeningAt('');
        }
      } else {
        // Reset pour création
        setName('');
        setOrderIndex(0);
        setIsOpenTrack(true);
        setClosureType('DURATION');
        setStatusMessage('');
        setReopeningAt('');
      }
    }
  }, [isOpen, track]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Le nom de la piste est obligatoire.');
      return;
    }

    setLoading(true);
    setError(null);

    const payload = {
      name: name.trim(),
      is_open: isOpenTrack,
      order_index: Number(orderIndex) || 0,
      status_message: statusMessage.trim() || null,
      closure_reason: !isOpenTrack ? (statusMessage.trim() || null) : null,
      closure_type: !isOpenTrack ? closureType : null,
      reopening_at: !isOpenTrack && reopeningAt ? new Date(reopeningAt).toISOString() : null,
    };

    if (isEditing && track?.id) {
      const res = await updateTrack(track.id, payload);
      setLoading(false);
      if (res.success && res.data) {
        onSaved(res.data);
        onClose();
      } else {
        setError(res.error || 'Erreur lors de la mise à jour de la piste.');
      }
    } else {
      const res = await createTrack(payload);
      setLoading(false);
      if (res.success && res.data) {
        onSaved(res.data);
        onClose();
      } else {
        setError(res.error || 'Erreur lors de la création de la piste.');
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-surface border border-[#353535] rounded-xl w-full max-w-lg overflow-hidden shadow-2xl animate-scale-up">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-[#353535] bg-surface-high">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-primary/10 border border-primary/30 text-primary">
              <Flag className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-anybody font-black text-lg text-white uppercase tracking-tight sport-skew">
                {isEditing ? 'Modifier la Piste' : 'Nouvelle Piste'}
              </h3>
              <p className="text-xs text-foreground/60 font-mono">
                {isEditing ? `Configuration de "${track?.name}"` : 'Ajout d\'un nouveau tracé au club'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={loading}
            className="p-1.5 rounded-lg text-foreground/40 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs font-mono">
          {error && (
            <div className="p-3 rounded-lg bg-secondary/15 border border-secondary/40 text-secondary flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Nom de la piste */}
          <div className="space-y-1.5">
            <label className="block text-foreground/80 font-bold uppercase tracking-wider text-[11px]">
              Nom de la Piste *
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="ex: Piste 1/10 Astro, Piste Multi 1/8, Piste Crawler..."
              className="w-full px-3.5 py-2.5 rounded-lg bg-background border border-[#353535] text-white focus:outline-none focus:border-primary transition-colors text-sm"
            />
          </div>

          {/* Ordre d'affichage */}
          <div className="space-y-1.5">
            <label className="block text-foreground/80 font-bold uppercase tracking-wider text-[11px] flex items-center gap-1.5">
              <Hash className="w-3.5 h-3.5 text-primary" />
              <span>Ordre d&apos;affichage (Position dans la liste)</span>
            </label>
            <input
              type="number"
              min="0"
              value={orderIndex}
              onChange={(e) => setOrderIndex(parseInt(e.target.value, 10) || 0)}
              className="w-full px-3.5 py-2 rounded-lg bg-background border border-[#353535] text-white focus:outline-none focus:border-primary transition-colors"
            />
          </div>

          {/* Statut : Ouverte ou Fermée */}
          <div className="space-y-1.5 pt-2 border-t border-[#353535]/60">
            <label className="block text-foreground/80 font-bold uppercase tracking-wider text-[11px]">
              État Actuel de la Piste
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setIsOpenTrack(true)}
                className={`py-2.5 px-3 rounded-lg border font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  isOpenTrack
                    ? 'bg-green-500/20 border-green-500 text-green-400 shadow-[0_0_10px_rgba(34,197,94,0.3)]'
                    : 'bg-background border-[#353535] text-foreground/50 hover:text-white'
                }`}
              >
                <span className="w-2.5 h-2.5 rounded-full bg-green-500" />
                <span>Ouverte</span>
              </button>

              <button
                type="button"
                onClick={() => setIsOpenTrack(false)}
                className={`py-2.5 px-3 rounded-lg border font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  !isOpenTrack
                    ? 'bg-red-500/20 border-red-500 text-red-400 shadow-[0_0_10px_rgba(239,68,68,0.3)]'
                    : 'bg-background border-[#353535] text-foreground/50 hover:text-white'
                }`}
              >
                <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
                <span>Fermée / Travaux</span>
              </button>
            </div>
          </div>

          {/* Détails si fermée */}
          {!isOpenTrack && (
            <div className="p-3.5 rounded-lg bg-surface-dim border border-red-500/30 space-y-3 animate-fade-in">
              <div className="space-y-1.5">
                <label className="block text-foreground/80 font-bold uppercase tracking-wider text-[10px]">
                  Type de fermeture
                </label>
                <div className="grid grid-cols-3 gap-1.5">
                  <button
                    type="button"
                    onClick={() => setClosureType('DURATION')}
                    className={`py-2 px-2 rounded border text-[10px] font-bold flex flex-col items-center gap-1 cursor-pointer transition-all ${
                      closureType === 'DURATION'
                        ? 'bg-red-500/20 border-red-500 text-red-300'
                        : 'bg-background border-[#353535] text-foreground/60'
                    }`}
                  >
                    <Clock className="w-3.5 h-3.5 text-primary" />
                    <span>Programmée</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setClosureType('INDEFINITE_WORKS')}
                    className={`py-2 px-2 rounded border text-[10px] font-bold flex flex-col items-center gap-1 cursor-pointer transition-all ${
                      closureType === 'INDEFINITE_WORKS'
                        ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                        : 'bg-background border-[#353535] text-foreground/60'
                    }`}
                  >
                    <Wrench className="w-3.5 h-3.5 text-amber-400" />
                    <span>Travaux</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setClosureType('WEATHER')}
                    className={`py-2 px-2 rounded border text-[10px] font-bold flex flex-col items-center gap-1 cursor-pointer transition-all ${
                      closureType === 'WEATHER'
                        ? 'bg-blue-500/20 border-blue-500 text-blue-300'
                        : 'bg-background border-[#353535] text-foreground/60'
                    }`}
                  >
                    <CloudRain className="w-3.5 h-3.5 text-blue-400" />
                    <span>Météo</span>
                  </button>
                </div>
              </div>

              {closureType !== 'INDEFINITE_WORKS' && (
                <div className="space-y-1">
                  <label className="block text-foreground/70 font-semibold text-[10px] uppercase">
                    Date & Heure estimée de réouverture
                  </label>
                  <input
                    type="datetime-local"
                    value={reopeningAt}
                    onChange={(e) => setReopeningAt(e.target.value)}
                    className="w-full px-3 py-2 rounded bg-background border border-[#353535] text-white text-xs focus:outline-none focus:border-primary"
                  />
                </div>
              )}

              <div className="space-y-1">
                <label className="block text-foreground/70 font-semibold text-[10px] uppercase">
                  Motif / Message d&apos;information public
                </label>
                <input
                  type="text"
                  value={statusMessage}
                  onChange={(e) => setStatusMessage(e.target.value)}
                  placeholder="ex: Réfection virage terre, pluie battante, tonte..."
                  className="w-full px-3 py-2 rounded bg-background border border-[#353535] text-white text-xs focus:outline-none focus:border-primary"
                />
              </div>
            </div>
          )}

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-[#353535]">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 rounded-lg bg-surface-high hover:bg-surface border border-[#353535] text-foreground/70 hover:text-white transition-colors cursor-pointer"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 rounded-lg bg-primary hover:bg-primary/90 text-black font-anybody font-black uppercase tracking-wider transition-all sport-skew flex items-center gap-1.5 cursor-pointer shadow-[2px_2px_0px_#000] disabled:opacity-50"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Check className="w-4 h-4" />
              )}
              <span>{isEditing ? 'Enregistrer' : 'Créer la piste'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
