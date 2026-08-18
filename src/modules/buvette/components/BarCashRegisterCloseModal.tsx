'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  X,
  Lock,
  Coins,
  AlertTriangle,
  CheckCircle2,
  TrendingDown,
  TrendingUp,
  Scale,
  DollarSign,
  Receipt,
} from 'lucide-react';
import { BarSession } from '@/types/models';
import { closeBarSession, getSessionCashSummary } from '../actions';
import CashCounterGrid from './CashCounterGrid';

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
  const [breakdown, setBreakdown] = useState<Record<string, number>>({});
  const [countedCash, setCountedCash] = useState<number>(0);
  const [notes, setNotes] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [summary, setSummary] = useState<{
    openingCash: number;
    totalCashSales: number;
    totalPayconiqSales: number;
    totalWalletSales: number;
    totalTabSales: number;
    expectedCash: number;
    ordersCount: number;
  }>({
    openingCash: session.opening_cash || 0,
    totalCashSales: 0,
    totalPayconiqSales: 0,
    totalWalletSales: 0,
    totalTabSales: 0,
    expectedCash: session.opening_cash || 0,
    ordersCount: 0,
  });

  const loadSummary = useCallback(async () => {
    setSummaryLoading(true);
    const res = await getSessionCashSummary(session.id);
    if (!res.error) {
      setSummary({
        openingCash: res.openingCash,
        totalCashSales: res.totalCashSales,
        totalPayconiqSales: res.totalPayconiqSales,
        totalWalletSales: res.totalWalletSales,
        totalTabSales: res.totalTabSales,
        expectedCash: res.expectedCash,
        ordersCount: res.ordersCount,
      });
    }
    setSummaryLoading(false);
  }, [session.id]);

  useEffect(() => {
    if (isOpen) {
      loadSummary();
      setBreakdown({});
      setCountedCash(0);
      setNotes('');
      setErrorMsg(null);
    }
  }, [isOpen, loadSummary]);

  const handleBreakdownChange = (newBreakdown: Record<string, number>, newTotal: number) => {
    setBreakdown(newBreakdown);
    setCountedCash(newTotal);
  };

  const cashDifference = countedCash - summary.expectedCash;

  const handleCloseRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);

    const res = await closeBarSession(session.id, countedCash, notes, breakdown);
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-fade-in overflow-y-auto">
      <div className="fixed inset-0" onClick={onClose} />

      <div className="relative z-10 w-full max-w-2xl bg-[#0f0f0f] border border-[#353535] rounded-2xl shadow-[0_0_50px_rgba(0,0,0,0.9)] overflow-hidden flex flex-col my-6">
        {/* Header */}
        <div className="p-5 border-b border-[#292929] flex items-center justify-between bg-surface-dim">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-secondary/15 border border-secondary/30 flex items-center justify-center text-secondary">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-anybody font-black text-lg uppercase tracking-tight text-white sport-skew">
                Clôture de Caisse & Rapport Z
              </h2>
              <p className="text-[11px] font-mono text-foreground/50">
                Session du {new Date(session.opened_at).toLocaleDateString('fr-FR')} • Ouverte par {session.opened_by_member?.first_name} {session.opened_by_member?.last_name}
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
        <form onSubmit={handleCloseRegister} className="p-5 sm:p-6 space-y-5 font-mono text-xs max-h-[80vh] overflow-y-auto">
          {errorMsg && (
            <div className="p-3.5 rounded-xl bg-secondary/15 border border-secondary/40 text-secondary flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Tableau Récapitulatif Théorique */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Fond de caisse initial */}
            <div className="p-3 rounded-xl bg-surface border border-[#353535] space-y-1">
              <span className="text-[10px] text-foreground/50 uppercase font-bold block">
                1. Fond initial
              </span>
              <div className="font-anybody font-black text-lg text-white">
                {summary.openingCash.toFixed(2)} €
              </div>
              <span className="text-[9px] text-foreground/40 block">Montant d&apos;ouverture</span>
            </div>

            {/* Ventes espèces enregistrées */}
            <div className="p-3 rounded-xl bg-surface border border-[#353535] space-y-1">
              <span className="text-[10px] text-primary uppercase font-bold block">
                2. Ventes Espèces
              </span>
              <div className="font-anybody font-black text-lg text-primary">
                +{summary.totalCashSales.toFixed(2)} €
              </div>
              <span className="text-[9px] text-foreground/40 block">Encaissements tiroir</span>
            </div>

            {/* Total Théorique Attendu */}
            <div className="p-3 rounded-xl bg-primary/10 border border-primary/30 space-y-1">
              <span className="text-[10px] text-primary uppercase font-bold block">
                = Montant Attendu
              </span>
              <div className="font-anybody font-black text-xl text-primary sport-skew">
                {summary.expectedCash.toFixed(2)} €
              </div>
              <span className="text-[9px] text-foreground/50 block">Fond + Ventes Espèces</span>
            </div>
          </div>

          {/* Autres canaux d'encaissement de la session (Info) */}
          <div className="p-3 rounded-xl bg-surface-dim border border-[#292929] flex flex-wrap items-center justify-between gap-3 text-[11px]">
            <div className="flex items-center gap-1.5 text-foreground/60">
              <Receipt className="w-3.5 h-3.5" />
              <span>Autres paiements :</span>
            </div>
            <div className="flex flex-wrap items-center gap-3 font-bold">
              <span className="text-pink-400">Payconiq : {summary.totalPayconiqSales.toFixed(2)} €</span>
              <span className="text-foreground/30">•</span>
              <span className="text-blue-400">Portefeuille : {summary.totalWalletSales.toFixed(2)} €</span>
              <span className="text-foreground/30">•</span>
              <span className="text-amber-400">Ardoises : {summary.totalTabSales.toFixed(2)} €</span>
            </div>
          </div>

          {/* Grille de Comptage Physique */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-white font-bold uppercase text-[11px] flex items-center gap-1.5">
                <Coins className="w-4 h-4 text-primary" />
                <span>Comptage Physique du Tiroir Caisse :</span>
              </label>
              <span className="text-[10px] text-foreground/50">
                Saisissez les quantités de pièces et billets
              </span>
            </div>

            <CashCounterGrid
              breakdown={breakdown}
              onChange={handleBreakdownChange}
              disabled={loading || summaryLoading}
            />
          </div>

          {/* Comparaison & Écart de Caisse en Direct */}
          <div
            className={`p-4 rounded-xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${
              Math.abs(cashDifference) < 0.01
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                : cashDifference > 0
                ? 'bg-blue-500/10 border-blue-500/30 text-blue-300'
                : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
            }`}
          >
            <div className="flex items-center gap-3">
              <div
                className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                  Math.abs(cashDifference) < 0.01
                    ? 'bg-emerald-500/20 text-emerald-400'
                    : cashDifference > 0
                    ? 'bg-blue-500/20 text-blue-400'
                    : 'bg-rose-500/20 text-rose-400'
                }`}
              >
                {Math.abs(cashDifference) < 0.01 ? (
                  <CheckCircle2 className="w-5 h-5" />
                ) : cashDifference > 0 ? (
                  <TrendingUp className="w-5 h-5" />
                ) : (
                  <TrendingDown className="w-5 h-5" />
                )}
              </div>

              <div>
                <strong className="block text-sm font-sans uppercase font-bold">
                  {Math.abs(cashDifference) < 0.01
                    ? 'Caisse Parfaite (Aucun Écart)'
                    : cashDifference > 0
                    ? 'Excédent de Caisse (Surplus)'
                    : 'Déficit de Caisse (Manquant)'}
                </strong>
                <span className="text-[11px] opacity-80 block">
                  Compté : <strong>{countedCash.toFixed(2)} €</strong> vs Attendu :{' '}
                  <strong>{summary.expectedCash.toFixed(2)} €</strong>
                </span>
              </div>
            </div>

            <div className="text-right self-end sm:self-center">
              <span className="text-[10px] uppercase font-bold opacity-75 block">Écart Calculé</span>
              <span className="font-anybody font-black text-2xl tracking-tight sport-skew">
                {cashDifference >= 0 ? `+${cashDifference.toFixed(2)} €` : `${cashDifference.toFixed(2)} €`}
              </span>
            </div>
          </div>

          {/* Observations / Notes */}
          <div className="space-y-1.5">
            <label className="block text-foreground/70">
              Observations / Justification d&apos;écarts (optionnel) :
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ex: Comptage effectué par Stef & Philippe, petite erreur rendu monnaie..."
              rows={2}
              className="w-full bg-background border border-[#353535] rounded-xl p-3 text-xs text-white focus:outline-none focus:border-primary placeholder-foreground/30"
            />
          </div>

          {/* Footer Actions */}
          <div className="pt-3 border-t border-[#292929] flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl bg-surface border border-[#353535] text-foreground/70 hover:text-white transition-colors"
            >
              Annuler
            </button>

            <button
              type="submit"
              disabled={loading || summaryLoading}
              className="premium-btn text-xs px-6 py-2.5 flex items-center gap-2 cursor-pointer disabled:opacity-50 sport-skew"
            >
              <Lock className="w-4 h-4" />
              <span className="transform skew-x-8">
                {loading ? 'Clôture en cours...' : 'Valider Clôture & Rapport Z'}
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
