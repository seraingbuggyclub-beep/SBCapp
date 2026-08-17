'use client';

import React from 'react';
import { Lock, Save, AlertTriangle, ShieldCheck, HelpCircle } from 'lucide-react';

interface AccessCodeTabProps {
  lockCode: string;
  configMsg: string;
  canEditConfig: boolean;
  isSimulated: boolean;
  onLockCodeChange: (code: string) => void;
  onSaveLockCode: (e: React.FormEvent) => void;
}

export default function AccessCodeTab({
  lockCode,
  configMsg,
  canEditConfig,
  isSimulated,
  onLockCodeChange,
  onSaveLockCode,
}: AccessCodeTabProps) {
  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="premium-card p-6 md:p-8 rounded-lg border border-[#353535] space-y-6">
        <div className="flex items-center gap-3 border-b border-[#353535] pb-4">
          <div className="w-10 h-10 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center text-primary">
            <Lock className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-anybody font-black text-xl uppercase tracking-tight sport-skew text-white">
              Code Cadenas du Club
            </h3>
            <p className="text-xs text-foreground/50 font-mono">
              Gestion de la combinaison d'accès aux pistes et infrastructures
            </p>
          </div>
        </div>

        {configMsg && (
          <div
            className={`p-3.5 rounded font-mono text-xs flex items-center gap-2 ${
              configMsg.startsWith('Erreur') || configMsg.startsWith('Simulation')
                ? 'bg-secondary/15 border border-secondary/30 text-secondary'
                : 'bg-success/15 border border-success/30 text-success'
            }`}
          >
            {configMsg.startsWith('Erreur') ? (
              <AlertTriangle className="w-4 h-4 shrink-0" />
            ) : (
              <ShieldCheck className="w-4 h-4 shrink-0" />
            )}
            <span>{configMsg}</span>
          </div>
        )}

        <form onSubmit={onSaveLockCode} className="space-y-4">
          <div className="space-y-2">
            <label className="block text-xs font-mono uppercase tracking-wider text-foreground/60">
              Combinaison active (4 à 8 chiffres ou lettres)
            </label>
            <div className="flex items-center gap-3">
              <input
                type="text"
                value={lockCode}
                disabled={!canEditConfig || isSimulated}
                onChange={(e) => onLockCodeChange(e.target.value)}
                placeholder="Ex: 4821"
                className="w-full bg-background border border-[#353535] rounded px-4 py-3 text-lg font-mono text-white tracking-widest focus:outline-none focus:border-primary disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={!canEditConfig || isSimulated}
                className="premium-btn text-xs px-6 py-3 shrink-0 flex items-center gap-2 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Save className="w-4 h-4" />
                <span className="transform skew-x-8">Sauvegarder</span>
              </button>
            </div>
          </div>

          <div className="p-4 bg-surface-dim rounded border border-[#353535]/60 space-y-2 text-xs font-mono text-foreground/60">
            <div className="flex items-center gap-1.5 text-white font-bold">
              <HelpCircle className="w-3.5 h-3.5 text-primary" />
              <span>Règle de visibilité :</span>
            </div>
            <p className="leading-relaxed text-[11px]">
              Le code est révélé <strong>exclusivement aux membres connectés en règle de cotisation</strong> (statut « En ordre ») sur la page d'accueil et dans leur espace pilote. Tout membre non cotisant ou visiteur voit une icône de cadenas verrouillé.
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}
