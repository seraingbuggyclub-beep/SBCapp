'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { unsubscribeByToken } from '@/modules/gdpr/actions';
import {
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  MailX,
  ArrowLeft,
  BellOff,
} from 'lucide-react';
import Link from 'next/link';

function UnsubscribeContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token') || '';

  const [inputToken, setInputToken] = useState(token);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ success: boolean; name?: string; msg?: string } | null>(null);

  const handleUnsubscribe = async (category: 'all' | 'events' | 'news') => {
    const activeToken = token || inputToken;
    if (!activeToken.trim()) {
      setResult({ success: false, msg: 'Veuillez renseigner un token de désinscription valide.' });
      return;
    }

    setLoading(true);
    setResult(null);

    const res = await unsubscribeByToken(activeToken.trim(), category);
    setLoading(false);

    if (res.success) {
      setResult({
        success: true,
        name: res.memberName,
        msg: category === 'all'
          ? 'Vous avez été désinscrit de toutes les communications email du Seraing Buggy Club.'
          : 'Vos préférences de notification ont été mises à jour avec succès.',
      });
    } else {
      setResult({
        success: false,
        msg: res.error || 'Lien de désinscription invalide ou expiré.',
      });
    }
  };

  return (
    <div className="max-w-lg mx-auto py-12 px-4 space-y-6 font-mono text-xs animate-fade-in">
      <div className="premium-card p-6 md:p-8 rounded-2xl border border-[#353535] space-y-6 text-center shadow-2xl">
        {/* Icon */}
        <div className="w-14 h-14 rounded-2xl bg-surface border border-[#353535] text-primary flex items-center justify-center mx-auto shadow-lg">
          <MailX className="w-7 h-7" />
        </div>

        <div>
          <h1 className="font-anybody font-black text-xl uppercase tracking-tight text-white sport-skew">
            Désinscription des Emails SBC
          </h1>
          <p className="text-foreground/50 text-[11px] mt-1">
            Conformité RGPD & Autorité de Protection des Données (APD Belgique)
          </p>
        </div>

        {/* Résultat */}
        {result ? (
          <div
            className={`p-4 rounded-xl border text-left space-y-2 ${
              result.success
                ? 'bg-primary/10 border-primary/40 text-primary'
                : 'bg-secondary/15 border-secondary/40 text-secondary'
            }`}
          >
            <div className="flex items-center gap-2">
              {result.success ? <CheckCircle2 className="w-5 h-5 shrink-0" /> : <AlertCircle className="w-5 h-5 shrink-0" />}
              <strong className="text-sm font-sans font-bold">
                {result.success ? `Confirmation pour ${result.name || 'votre compte'}` : 'Erreur'}
              </strong>
            </div>
            <p className="text-xs text-foreground/80">{result.msg}</p>
          </div>
        ) : (
          <div className="space-y-4 text-left">
            {!token && (
              <div className="space-y-1.5">
                <label className="text-foreground/70 block uppercase text-[10px]">
                  Token de désinscription (issu du footer de l'email) :
                </label>
                <input
                  type="text"
                  value={inputToken}
                  onChange={(e) => setInputToken(e.target.value)}
                  placeholder="Collez votre code unique..."
                  className="w-full bg-background border border-[#353535] rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-primary font-mono"
                />
              </div>
            )}

            <p className="text-foreground/70 text-xs leading-relaxed">
              Choisissez les communications que vous ne souhaitez plus recevoir :
            </p>

            <div className="space-y-2.5">
              <button
                type="button"
                onClick={() => handleUnsubscribe('events')}
                disabled={loading}
                className="w-full p-3 rounded-xl bg-surface hover:bg-surface-high border border-[#353535] hover:border-primary text-white flex items-center justify-between transition-all cursor-pointer disabled:opacity-50"
              >
                <span>Désinscription des courses & événements uniquement</span>
                <BellOff className="w-4 h-4 text-primary" />
              </button>

              <button
                type="button"
                onClick={() => handleUnsubscribe('all')}
                disabled={loading}
                className="w-full p-3 rounded-xl bg-secondary/15 hover:bg-secondary/25 border border-secondary/40 text-secondary flex items-center justify-between transition-all cursor-pointer font-bold disabled:opacity-50"
              >
                <span>Désinscription totale de tous les emails du club</span>
                <MailX className="w-4 h-4 text-secondary" />
              </button>
            </div>
          </div>
        )}

        <div className="pt-4 border-t border-[#353535] flex items-center justify-center">
          <Link
            href="/"
            className="text-foreground/60 hover:text-white flex items-center gap-1.5 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Retour à l'accueil du Seraing Buggy Club</span>
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function UnsubscribePage() {
  return (
    <Suspense fallback={<div className="p-12 text-center font-mono text-xs text-foreground/40">Chargement...</div>}>
      <UnsubscribeContent />
    </Suspense>
  );
}
