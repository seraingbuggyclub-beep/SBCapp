'use client';

import React, { useState } from 'react';
import { verifyAndUnlockAccess } from '../actions';
import { Lock, Unlock, AlertTriangle, HelpCircle } from 'lucide-react';

interface CadenasLockProps {
  userId: string;
  onUnlocked: () => void;
}

export default function CadenasLock({ userId, onUnlocked }: CadenasLockProps) {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [isUnlocked, setIsUnlocked] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');

    try {
      const result = await verifyAndUnlockAccess(userId, code);
      if (result.success) {
        setIsUnlocked(true);
        setTimeout(() => {
          onUnlocked();
        }, 1500);
      } else {
        setErrorMsg(result.error || "Une erreur est survenue.");
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Impossible de communiquer avec le serveur.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto premium-card rounded-lg overflow-hidden border border-[#353535]">
      {/* Visual Header strip */}
      <div className={`h-2 w-full transition-colors duration-500 ${isUnlocked ? 'bg-success' : 'bg-secondary'}`} />

      <div className="p-6 md:p-8 flex flex-col items-center">
        {/* Animated padlock icon */}
        <div className={`w-16 h-16 rounded-full border-2 flex items-center justify-center mb-6 transition-all duration-500 ${
          isUnlocked 
            ? 'bg-success/15 border-success text-success scale-110 shadow-[0_0_20px_rgba(118,177,72,0.2)]' 
            : 'bg-secondary/15 border-secondary text-secondary animate-pulse'
        }`}>
          {isUnlocked ? (
            <Unlock className="w-8 h-8" />
          ) : (
            <Lock className="w-8 h-8" />
          )}
        </div>

        <h3 className="font-anybody font-black text-xl text-center uppercase tracking-tight sport-skew text-white mb-2">
          {isUnlocked ? 'Accès Déverrouillé' : 'Accès Verrouillé'}
        </h3>
        
        <p className="text-xs text-center text-foreground/60 max-w-sm mb-6 leading-relaxed">
          {isUnlocked 
            ? "Cotisation validée ! Chargement de votre tableau de bord..." 
            : "Votre cotisation SBC n'est pas à jour. Introduisez le code de cadenas du club pour débloquer votre accès."}
        </p>

        {errorMsg && (
          <div className="w-full p-3 mb-4 rounded bg-secondary/10 border border-secondary/20 text-secondary text-[11px] font-mono text-center">
            ⚠️ {errorMsg}
          </div>
        )}

        {!isUnlocked && (
          <form onSubmit={handleSubmit} className="w-full space-y-4">
            <div>
              <label className="block text-center text-[10px] font-mono uppercase tracking-widest text-foreground/50 mb-2">
                Code Cadenas du Club
              </label>
              <input
                type="password"
                required
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="••••"
                maxLength={8}
                className="w-full bg-background border border-[#353535] rounded px-4 py-2.5 text-center text-lg tracking-widest text-white focus:outline-none focus:border-primary font-mono"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full premium-btn text-xs flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <span className="transform skew-x-8 flex items-center gap-2">
                Valider le code
              </span>
            </button>
          </form>
        )}

        <div className="mt-6 pt-4 border-t border-[#353535]/50 w-full flex items-center justify-center gap-2 text-[10px] text-foreground/45 font-mono">
          <HelpCircle className="w-3.5 h-3.5" />
          <span>Le code est affiché au tableau du local pilote.</span>
        </div>
      </div>
    </div>
  );
}
