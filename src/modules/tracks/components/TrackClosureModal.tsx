'use client';

import React, { useState, useEffect } from 'react';
import { TrackItem, TrackClosureType } from '@/types/models';
import { AlertTriangle, Clock, Wrench, X, Check, Calendar, CloudRain } from 'lucide-react';

interface TrackClosureModalProps {
  track: TrackItem | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (trackId: string, options: {
    closure_type: TrackClosureType;
    reopening_at: string | null;
    closure_reason: string | null;
  }) => Promise<void>;
  loading?: boolean;
}

export default function TrackClosureModal({
  track,
  isOpen,
  onClose,
  onConfirm,
  loading = false,
}: TrackClosureModalProps) {
  const [isIndefinite, setIsIndefinite] = useState(false);
  const [reopeningAt, setReopeningAt] = useState('');
  const [reason, setReason] = useState('');

  // Initialisation à l'ouverture de la modale
  useEffect(() => {
    if (isOpen && track) {
      // Par défaut : +2h à partir de maintenant
      const defaultDate = new Date();
      defaultDate.setHours(defaultDate.getHours() + 2);
      // Format YYYY-MM-DDTHH:mm pour l'input datetime-local
      const formatted = new Date(defaultDate.getTime() - defaultDate.getTimezoneOffset() * 60000)
        .toISOString()
        .slice(0, 16);

      setReopeningAt(formatted);
      setIsIndefinite(false);
      setReason('');
    }
  }, [isOpen, track]);

  if (!isOpen || !track) return null;

  const trackDisplayName = track.name?.toLowerCase().startsWith('piste')
    ? track.name
    : `Piste ${track.name}`;

  // Raccourcis de durée
  const setQuickDuration = (hoursToAdd: number) => {
    setIsIndefinite(false);
    const date = new Date();
    date.setHours(date.getHours() + hoursToAdd);
    const formatted = new Date(date.getTime() - date.getTimezoneOffset() * 60000)
      .toISOString()
      .slice(0, 16);
    setReopeningAt(formatted);
  };

  const setEndOfDay = () => {
    setIsIndefinite(false);
    const date = new Date();
    // Si on est déjà après 19h, on met 21h ou demain 19h
    if (date.getHours() >= 19) {
      date.setHours(date.getHours() + 3);
    } else {
      date.setHours(19, 0, 0, 0);
    }
    const formatted = new Date(date.getTime() - date.getTimezoneOffset() * 60000)
      .toISOString()
      .slice(0, 16);
    setReopeningAt(formatted);
  };

  const quickReasons = [
    'Travaux d\'entretien',
    'Piste impraticable / Pluie',
    'Réparation balisage & vibreurs',
    'Préparation course / Tonte',
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const closure_type: TrackClosureType = isIndefinite ? 'INDEFINITE_WORKS' : 'DURATION';
    let finalReopeningAt: string | null = null;

    if (!isIndefinite && reopeningAt) {
      finalReopeningAt = new Date(reopeningAt).toISOString();
    }

    await onConfirm(track.id, {
      closure_type,
      reopening_at: finalReopeningAt,
      closure_reason: reason.trim() || null,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-fade-in">
      <div 
        className="relative w-full max-w-lg bg-surface border border-red-500/40 rounded-2xl shadow-[0_0_35px_rgba(239,68,68,0.2)] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header Bar */}
        <div className="bg-red-950/40 px-6 py-4 border-b border-red-500/30 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-red-500/20 text-red-400 border border-red-500/40">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-anybody font-black text-base uppercase tracking-tight text-white sport-skew">
                Mettre la piste à l'arrêt
              </h3>
              <p className="text-xs font-mono text-red-300/80">
                {trackDisplayName}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            disabled={loading}
            className="p-1.5 rounded-lg text-foreground/50 hover:text-white hover:bg-surface-high transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Option 1 & 2 : Choix Type de Fermeture */}
          <div className="space-y-3">
            <label className="text-xs font-mono font-bold uppercase text-foreground/80 tracking-wider flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-primary" />
              Mode d'arrêt du circuit
            </label>

            {/* Checkbox Indéterminé */}
            <div
              onClick={() => setIsIndefinite(!isIndefinite)}
              className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                isIndefinite
                  ? 'bg-amber-500/10 border-amber-500/50 shadow-[0_0_15px_rgba(245,158,11,0.15)]'
                  : 'bg-surface-dim border-[#353535] hover:border-[#454545]'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${isIndefinite ? 'bg-amber-500/20 text-amber-400' : 'bg-surface text-foreground/40'}`}>
                  <Wrench className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-xs font-bold text-white block">
                    Fermée jusqu'à la fin des travaux
                  </span>
                  <span className="text-[10px] font-mono text-foreground/50">
                    Durée non définie — Réouverture manuelle requise
                  </span>
                </div>
              </div>

              <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${
                isIndefinite ? 'bg-amber-500 border-amber-400 text-black' : 'border-[#454545] bg-surface'
              }`}>
                {isIndefinite && <Check className="w-3.5 h-3.5 stroke-[3]" />}
              </div>
            </div>

            {/* Section Durée Programmée (si pas indéterminé) */}
            {!isIndefinite && (
              <div className="p-4 rounded-xl bg-surface-dim border border-[#353535] space-y-3 animate-fade-in">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-mono text-foreground/70 font-bold">
                    Durée estimée / Raccourcis rapides :
                  </span>
                </div>

                <div className="grid grid-cols-4 gap-2">
                  <button
                    type="button"
                    onClick={() => setQuickDuration(1)}
                    className="px-2.5 py-1.5 rounded-lg bg-surface hover:bg-surface-high border border-[#353535] hover:border-primary text-xs font-mono text-white transition-all cursor-pointer font-bold"
                  >
                    +1h
                  </button>
                  <button
                    type="button"
                    onClick={() => setQuickDuration(2)}
                    className="px-2.5 py-1.5 rounded-lg bg-surface hover:bg-surface-high border border-[#353535] hover:border-primary text-xs font-mono text-white transition-all cursor-pointer font-bold"
                  >
                    +2h
                  </button>
                  <button
                    type="button"
                    onClick={() => setQuickDuration(4)}
                    className="px-2.5 py-1.5 rounded-lg bg-surface hover:bg-surface-high border border-[#353535] hover:border-primary text-xs font-mono text-white transition-all cursor-pointer font-bold"
                  >
                    +4h
                  </button>
                  <button
                    type="button"
                    onClick={setEndOfDay}
                    className="px-2.5 py-1.5 rounded-lg bg-surface hover:bg-surface-high border border-[#353535] hover:border-primary text-xs font-mono text-white transition-all cursor-pointer font-bold"
                  >
                    Fin journée
                  </button>
                </div>

                <div className="pt-2 border-t border-[#353535]/60 space-y-1">
                  <label className="text-[10px] font-mono text-foreground/60 flex items-center gap-1">
                    <Calendar className="w-3 h-3 text-primary" />
                    Date et heure précise de réouverture :
                  </label>
                  <input
                    type="datetime-local"
                    value={reopeningAt}
                    onChange={(e) => setReopeningAt(e.target.value)}
                    required={!isIndefinite}
                    className="w-full bg-background border border-[#353535] rounded-lg px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-primary"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Motif facultatif */}
          <div className="space-y-2">
            <label className="text-xs font-mono font-bold uppercase text-foreground/80 tracking-wider flex items-center justify-between">
              <span>Motif de fermeture <span className="text-foreground/40 font-normal">(facultatif)</span></span>
            </label>
            
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Ex: Travaux de drainage, Roulage interdit..."
              className="w-full bg-background border border-[#353535] rounded-lg px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-primary"
            />

            {/* Suggestions rapides de motif */}
            <div className="flex flex-wrap gap-1.5 pt-1">
              {quickReasons.map((qr) => (
                <button
                  key={qr}
                  type="button"
                  onClick={() => setReason(qr)}
                  className="px-2 py-0.5 rounded bg-surface hover:bg-surface-high border border-[#353535] text-[10px] font-mono text-foreground/60 hover:text-white transition-colors cursor-pointer"
                >
                  {qr}
                </button>
              ))}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-3 border-t border-[#353535] flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 rounded-lg bg-surface hover:bg-surface-high border border-[#353535] text-xs font-mono text-foreground/80 hover:text-white transition-colors cursor-pointer"
            >
              Annuler
            </button>

            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2.5 rounded-lg bg-red-600 hover:bg-red-500 text-white font-anybody font-black uppercase text-xs tracking-wider shadow-[3px_3px_0px_#000] sport-skew flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50"
            >
              <AlertTriangle className="w-4 h-4" />
              <span className="transform skew-x-8">
                {loading ? 'Fermeture en cours...' : 'Confirmer la fermeture'}
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
