'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  Unlock,
  Coins,
  AlertTriangle,
  CheckCircle2,
  Bookmark,
  Target,
  Scale,
  Sparkles,
  RotateCcw,
} from 'lucide-react';
import { BarSession } from '@/types/models';
import { openBarSession } from '../actions';
import CashCounterGrid, { calculateCashTotal } from './CashCounterGrid';

interface BarCashRegisterOpenModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSessionOpened?: (session: BarSession) => void;
}

const STORAGE_KEY_PREPARATION = 'sbc_bar_cash_prep_draft';

export default function BarCashRegisterOpenModal({
  isOpen,
  onClose,
  onSessionOpened,
}: BarCashRegisterOpenModalProps) {
  const [breakdown, setBreakdown] = useState<Record<string, number>>({});
  const [targetAmount, setTargetAmount] = useState<number>(100);
  const [notes, setNotes] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [hasDraft, setHasDraft] = useState(false);

  // Charger le brouillon préparé si existant
  useEffect(() => {
    if (isOpen) {
      setErrorMsg(null);
      setSuccessMsg(null);
      try {
        const saved = localStorage.getItem(STORAGE_KEY_PREPARATION);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed.breakdown) setBreakdown(parsed.breakdown);
          if (parsed.targetAmount) setTargetAmount(Number(parsed.targetAmount));
          if (parsed.notes) setNotes(parsed.notes);
          setHasDraft(true);
        } else {
          setBreakdown({});
          setTargetAmount(100);
          setNotes('');
          setHasDraft(false);
        }
      } catch {
        setBreakdown({});
        setTargetAmount(100);
        setNotes('');
        setHasDraft(false);
      }
    }
  }, [isOpen]);

  const totalCounted = calculateCashTotal(breakdown);
  const targetDiff = totalCounted - targetAmount;

  // 1. Sauvegarder le brouillon de préparation
  const handleSaveDraft = () => {
    try {
      const payload = {
        breakdown,
        targetAmount,
        notes,
        savedAt: new Date().toISOString(),
      };
      localStorage.setItem(STORAGE_KEY_PREPARATION, JSON.stringify(payload));
      setHasDraft(true);
      setSuccessMsg('Préparation sauvegardée en brouillon. Vous pourrez reprendre ce comptage demain pour la course.');
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch {
      setErrorMsg('Impossible de sauvegarder le brouillon localement.');
    }
  };

  // Réinitialiser le brouillon
  const handleClearDraft = () => {
    try {
      localStorage.removeItem(STORAGE_KEY_PREPARATION);
      setBreakdown({});
      setNotes('');
      setHasDraft(false);
      setSuccessMsg('Brouillon de préparation réinitialisé.');
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch {
      // ignore
    }
  };

  // 2. Activer officiellement la session de caisse
  const handleActivateSession = async (e: React.FormEvent) => {
    e.preventDefault();
    if (totalCounted <= 0) {
      setErrorMsg('Veuillez compter au moins une pièce ou un billet pour le fond de caisse.');
      return;
    }

    setLoading(true);
    setErrorMsg(null);

    const res = await openBarSession(totalCounted, notes, breakdown);
    setLoading(false);

    if (res.success && res.session) {
      // Nettoyer le brouillon une fois la session ouverte
      localStorage.removeItem(STORAGE_KEY_PREPARATION);
      if (onSessionOpened) {
        onSessionOpened(res.session);
      }
      onClose();
    } else {
      setErrorMsg(res.error || "Erreur lors de l'ouverture de caisse.");
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-fade-in overflow-y-auto">
      <div className="fixed inset-0" onClick={onClose} />

      <div className="relative z-10 w-full max-w-2xl bg-[#0f0f0f] border border-[#353535] rounded-2xl shadow-[0_0_50px_rgba(0,0,0,0.9)] overflow-hidden flex flex-col my-6">
        {/* Header */}
        <div className="p-5 border-b border-[#292929] flex items-center justify-between bg-surface-dim">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/30 flex items-center justify-center text-primary">
              <Coins className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-anybody font-black text-lg uppercase tracking-tight text-white sport-skew">
                  Préparer / Ouvrir le fond de caisse
                </h2>
                {hasDraft && (
                  <span className="px-2 py-0.5 rounded bg-yellow-500/15 border border-yellow-500/30 text-yellow-400 text-[10px] font-mono font-bold uppercase">
                    Brouillon chargé
                  </span>
                )}
              </div>
              <p className="text-[11px] font-mono text-foreground/50">
                Comptage par dénominations pour la préparation de la veille ou ouverture jour J
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

        {/* Form Body */}
        <form onSubmit={handleActivateSession} className="p-5 sm:p-6 space-y-5 font-mono text-xs max-h-[80vh] overflow-y-auto">
          {errorMsg && (
            <div className="p-3.5 rounded-xl bg-secondary/15 border border-secondary/40 text-secondary flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3.5 rounded-xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Cible de fond de caisse & Jauge Dynamique */}
          <div className="p-4 rounded-xl bg-surface border border-[#353535] space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Target className="w-4 h-4 text-primary" />
                <label className="font-bold text-white uppercase text-[11px]">
                  Objectif de fond de caisse :
                </label>
              </div>

              <div className="flex items-center gap-2">
                {[50, 100, 150, 200].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setTargetAmount(preset)}
                    className={`px-2.5 py-1 rounded-lg border font-bold text-[11px] transition-all cursor-pointer ${
                      targetAmount === preset
                        ? 'bg-primary text-black border-primary'
                        : 'bg-surface-dim border-[#353535] text-foreground/70 hover:text-white'
                    }`}
                  >
                    {preset} €
                  </button>
                ))}

                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    min="10"
                    step="10"
                    value={targetAmount || ''}
                    onChange={(e) => setTargetAmount(Math.max(0, Number(e.target.value)))}
                    className="w-16 bg-background border border-[#353535] rounded-lg px-2 py-1 text-center font-bold text-primary focus:outline-none focus:border-primary text-xs"
                  />
                  <span className="text-[10px] text-foreground/50">€</span>
                </div>
              </div>
            </div>

            {/* Barre de comparaison / Statut par rapport à l'objectif */}
            <div
              className={`p-3 rounded-lg border flex items-center justify-between gap-2 text-[11px] ${
                Math.abs(targetDiff) < 0.01
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                  : targetDiff > 0
                  ? 'bg-blue-500/10 border-blue-500/30 text-blue-300'
                  : 'bg-amber-500/10 border-amber-500/30 text-amber-300'
              }`}
            >
              <div className="flex items-center gap-2">
                {Math.abs(targetDiff) < 0.01 ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                ) : targetDiff > 0 ? (
                  <Sparkles className="w-4 h-4 text-blue-400 shrink-0" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                )}
                <span>
                  {Math.abs(targetDiff) < 0.01
                    ? `Objectif exact de ${targetAmount.toFixed(2)} € atteint !`
                    : targetDiff > 0
                    ? `Excédent de +${targetDiff.toFixed(2)} € par rapport à l'objectif (${targetAmount} €)`
                    : `Manque ${Math.abs(targetDiff).toFixed(2)} € pour atteindre l'objectif de ${targetAmount} €`}
                </span>
              </div>

              <strong className="font-anybody font-black text-sm text-white">
                {totalCounted.toFixed(2)} / {targetAmount.toFixed(2)} €
              </strong>
            </div>
          </div>

          {/* Grille de Comptage des Pièces et Billets */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-white font-bold uppercase text-[11px] flex items-center gap-1.5">
                <Coins className="w-4 h-4 text-primary" />
                <span>Comptage détaillé des pièces et billets :</span>
              </label>
              {hasDraft && (
                <button
                  type="button"
                  onClick={handleClearDraft}
                  className="text-[10px] text-foreground/40 hover:text-secondary flex items-center gap-1 cursor-pointer"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Effacer brouillon</span>
                </button>
              )}
            </div>

            <CashCounterGrid
              breakdown={breakdown}
              onChange={(b) => setBreakdown(b)}
              disabled={loading}
            />
          </div>

          {/* Notes / Nom de la course */}
          <div className="space-y-1.5">
            <label className="block text-foreground/70">
              Nom de la course ou remarques de préparation (optionnel) :
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ex: Préparé par Stef pour la Manche 1 du Championnat..."
              className="w-full bg-background border border-[#353535] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-primary"
            />
          </div>

          {/* Actions : Sauvegarder Brouillon vs Activer Session */}
          <div className="pt-3 border-t border-[#292929] flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <button
              type="button"
              onClick={handleSaveDraft}
              className="px-4 py-2.5 rounded-xl bg-surface hover:bg-surface-high border border-[#353535] hover:border-yellow-500/50 text-yellow-300 font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <Bookmark className="w-3.5 h-3.5" />
              <span>Sauvegarder préparation (Brouillon)</span>
            </button>

            <div className="flex items-center gap-2 justify-end">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl bg-surface border border-[#353535] text-foreground/70 hover:text-white text-xs font-mono"
              >
                Fermer
              </button>

              <button
                type="submit"
                disabled={loading || totalCounted <= 0}
                className="premium-btn text-xs px-6 py-2.5 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 sport-skew"
              >
                <Unlock className="w-4 h-4" />
                <span className="transform skew-x-8">
                  {loading ? 'Activation...' : `Activer la Session (${totalCounted.toFixed(2)} €)`}
                </span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
