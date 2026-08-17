'use client';

import React, { useState, useMemo } from 'react';
import {
  X,
  Lock,
  Coins,
  AlertTriangle,
  CheckCircle2,
  FileSpreadsheet,
  ArrowRight,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import { BarSession } from '@/types/models';
import { closeBarSession } from '../actions';

interface BarCashRegisterCloseModalProps {
  session: BarSession;
  isOpen: boolean;
  onClose: () => void;
  onSessionClosed: () => void;
}

export default function BarCashRegisterCloseModal({
  session,
  isOpen,
  onClose,
  onSessionClosed,
}: BarCashRegisterCloseModalProps) {
  const [countedCash, setCountedCash] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const openingCash = session.opening_cash || 0;
  const countedNum = Number(countedCash || 0);

  const handleCloseRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!countedCash || isNaN(countedNum)) {
      setErrorMsg('Veuillez saisir le montant réel des espèces comptées dans le tiroir.');
      return;
    }

    setLoading(true);
    setErrorMsg(null);

    const res = await closeBarSession(session.id, countedNum, notes);
    setLoading(false);

    if (res.success) {
      onSessionClosed();
      onClose();
    } else {
      setErrorMsg(res.error || 'Erreur lors de la clôture de caisse.');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in">
      <div className="absolute inset-0" onClick={onClose} />

      <div className="relative z-10 w-full max-w-lg bg-[#0f0f0f] border border-[#353535] rounded-2xl shadow-[0_0_50px_rgba(0,0,0,0.9)] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-5 border-b border-[#292929] flex items-center justify-between bg-surface-dim">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-secondary/15 border border-secondary/30 flex items-center justify-center text-secondary">
              <Lock className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-anybody font-black text-lg uppercase tracking-tight text-white sport-skew">
                Clôture de Caisse (Z de Caisse)
              </h2>
              <p className="text-[11px] font-mono text-foreground/50">
                Session du {new Date(session.opened_at).toLocaleDateString('fr-FR')} • Ouverte avec {openingCash.toFixed(2)} €
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-surface text-foreground/50 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleCloseRegister} className="p-6 space-y-5 font-mono text-xs">
          {errorMsg && (
            <div className="p-3.5 rounded-xl bg-secondary/15 border border-secondary/40 text-secondary flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Rappel du fond de caisse */}
          <div className="p-4 rounded-xl bg-surface border border-[#353535] flex items-center justify-between">
            <span className="text-foreground/70">Fond de caisse initial :</span>
            <span className="font-bold text-white text-sm">{openingCash.toFixed(2)} €</span>
          </div>

          {/* Saisie Espèces Comptées */}
          <div className="space-y-2">
            <label className="block text-white font-bold uppercase tracking-wide">
              Montant total des espèces physiques comptées dans le tiroir (€) *
            </label>
            <div className="relative">
              <input
                type="number"
                step="0.01"
                min="0"
                value={countedCash}
                onChange={(e) => setCountedCash(e.target.value)}
                placeholder="0.00"
                className="w-full bg-background border border-[#353535] rounded-xl px-4 py-3 text-xl font-bold font-mono text-primary focus:outline-none focus:border-primary placeholder-foreground/30"
                required
                autoFocus
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-foreground/40 font-bold">
                EUR
              </span>
            </div>
            <p className="text-[10px] text-foreground/50">
              Comptez l'ensemble des pièces et billets présents dans le tiroir caisse avant de valider.
            </p>
          </div>

          {/* Justifications / Remarques */}
          <div className="space-y-2">
            <label className="block text-foreground/70">
              Observations / Justification d'écarts (optionnel) :
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ex: Fond de caisse recompté, petites pièces manquantes..."
              rows={3}
              className="w-full bg-background border border-[#353535] rounded-xl p-3 text-xs text-white focus:outline-none focus:border-primary placeholder-foreground/30"
            />
          </div>

          {/* Actions */}
          <div className="pt-3 border-t border-[#292929] flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-lg bg-surface hover:bg-surface-high border border-[#353535] text-foreground/70 hover:text-white transition-colors cursor-pointer"
            >
              Annuler
            </button>

            <button
              type="submit"
              disabled={loading || !countedCash}
              className="px-6 py-2.5 rounded-lg bg-secondary hover:bg-secondary/80 text-white font-anybody font-black uppercase tracking-wider text-xs flex items-center gap-2 transition-all sport-skew shadow-[3px_3px_0px_#000] cursor-pointer disabled:opacity-50"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span className="transform skew-x-8">
                {loading ? 'Clôture en cours...' : 'Confirmer le Z de caisse'}
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
