import React from 'react';
import { ShieldAlert } from 'lucide-react';

export default function FbaDisclaimer() {
  return (
    <div className="w-full p-4 rounded bg-secondary/15 border-2 border-secondary/30 flex items-start gap-3 shadow-[0_4px_15px_rgba(230,33,23,0.15)] animate-pulse">
      <ShieldAlert className="w-5 h-5 text-secondary shrink-0 mt-0.5" />
      <div>
        <h4 className="font-anybody font-black text-sm uppercase tracking-wide text-white sport-skew">
          Avertissement Important — Assurance FBA
        </h4>
        <p className="text-xs text-secondary/95 mt-1 font-mono leading-relaxed font-bold">
          Attention : Si vous n'êtes pas dans la liste de présence, vous n'êtes pas assuré par la FBA.
        </p>
      </div>
    </div>
  );
}
