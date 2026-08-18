'use client';

import React, { useEffect, useState } from 'react';
import { CheckSquare, Square, AlertCircle, RotateCcw } from 'lucide-react';

export const PRESET_BLACKLIST_REASONS = [
  "Non-respect du Règlement d'Ordre Intérieur (ROI)",
  "Comportement inapproprié / Agressivité",
  "Dégradation matérielle ou vol",
  "Impayés financiers (cotisation / buvette)",
] as const;

export const OTHER_REASON_LABEL = "Autre motif";
export const REJECTION_MESSAGE_STORAGE_KEY = 'sbc_admin_last_rejection_message';
export const DEFAULT_REJECTION_MESSAGE =
  "Votre demande d'inscription n'a pas été retenue par l'Organe d'Administration du Seraing Buggy Club (ASBL), conformément aux statuts du club.";

/**
 * Charge le dernier message de refus mémorisé ou le message légal par défaut.
 */
export function getSavedRejectionMessage(): string {
  if (typeof window !== 'undefined') {
    try {
      const saved = localStorage.getItem(REJECTION_MESSAGE_STORAGE_KEY);
      if (saved && saved.trim()) return saved;
    } catch {
      // Ignore localStorage errors
    }
  }
  return DEFAULT_REJECTION_MESSAGE;
}

/**
 * Mémorise le texte de refus dans le localStorage.
 */
export function saveRejectionMessage(message?: string): void {
  if (typeof window !== 'undefined' && message && message.trim()) {
    try {
      localStorage.setItem(REJECTION_MESSAGE_STORAGE_KEY, message.trim());
    } catch {
      // Ignore localStorage errors
    }
  }
}

/**
 * Concatène les motifs sélectionnés et l'éventuel texte libre.
 */
export function formatInternalReason(
  selectedPresets: string[],
  hasOther: boolean,
  otherText: string
): string {
  const parts: string[] = [...selectedPresets];
  if (hasOther && otherText.trim()) {
    parts.push(`Autre motif : ${otherText.trim()}`);
  } else if (hasOther) {
    parts.push(OTHER_REASON_LABEL);
  }
  return parts.join(' ; ');
}

/**
 * Parse une chaîne existante pour initialiser les cases à cocher et le texte libre.
 */
export function parseInternalReason(initialReason: string): {
  presets: string[];
  hasOther: boolean;
  otherText: string;
} {
  if (!initialReason || !initialReason.trim()) {
    return { presets: [], hasOther: false, otherText: '' };
  }

  const chunks = initialReason.split(' ; ').map((s) => s.trim()).filter(Boolean);
  const matchedPresets: string[] = [];
  let hasOther = false;
  const leftoverTexts: string[] = [];

  for (const chunk of chunks) {
    const isPreset = PRESET_BLACKLIST_REASONS.includes(chunk as any);
    if (isPreset) {
      matchedPresets.push(chunk);
    } else if (chunk.startsWith('Autre motif : ')) {
      hasOther = true;
      leftoverTexts.push(chunk.replace('Autre motif : ', '').trim());
    } else if (chunk === OTHER_REASON_LABEL) {
      hasOther = true;
    } else {
      hasOther = true;
      leftoverTexts.push(chunk);
    }
  }

  return {
    presets: matchedPresets,
    hasOther,
    otherText: leftoverTexts.join(' ; '),
  };
}

interface BlacklistReasonSelectorProps {
  initialReason?: string;
  initialRejectionMessage?: string;
  onChange: (data: { internalReason: string; rejectionMessage: string; isValid: boolean }) => void;
}

export default function BlacklistReasonSelector({
  initialReason = '',
  initialRejectionMessage,
  onChange,
}: BlacklistReasonSelectorProps) {
  const parsed = parseInternalReason(initialReason);
  const [selectedPresets, setSelectedPresets] = useState<string[]>(parsed.presets);
  const [hasOther, setHasOther] = useState<boolean>(parsed.hasOther);
  const [otherText, setOtherText] = useState<string>(parsed.otherText);

  const [rejectionMessage, setRejectionMessage] = useState<string>(() => {
    if (initialRejectionMessage && initialRejectionMessage.trim()) {
      return initialRejectionMessage;
    }
    return getSavedRejectionMessage();
  });

  const onChangeRef = React.useRef(onChange);
  onChangeRef.current = onChange;

  // Notifie le parent à chaque changement d'état local
  useEffect(() => {
    const formattedReason = formatInternalReason(selectedPresets, hasOther, otherText);
    const isReasonValid = selectedPresets.length > 0 || (hasOther && otherText.trim().length > 0);
    const isRejectionValid = rejectionMessage.trim().length > 0;

    onChangeRef.current({
      internalReason: formattedReason,
      rejectionMessage: rejectionMessage.trim() || DEFAULT_REJECTION_MESSAGE,
      isValid: isReasonValid && isRejectionValid,
    });
  }, [selectedPresets, hasOther, otherText, rejectionMessage]);

  const togglePreset = (reason: string) => {
    setSelectedPresets((prev) =>
      prev.includes(reason) ? prev.filter((r) => r !== reason) : [...prev, reason]
    );
  };

  const handleRejectionChange = (val: string) => {
    setRejectionMessage(val);
    saveRejectionMessage(val);
  };

  const handleResetRejection = () => {
    setRejectionMessage(DEFAULT_REJECTION_MESSAGE);
    saveRejectionMessage(DEFAULT_REJECTION_MESSAGE);
  };

  const isAnyReasonSelected = selectedPresets.length > 0 || hasOther;

  return (
    <div className="space-y-4 font-mono text-xs">
      {/* 1. Sélection des motifs internes (Cases à cocher) */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-[10px] uppercase tracking-wider text-secondary font-bold flex items-center gap-1.5">
            <span>Motif interne confidentiel (CA uniquement) *</span>
          </label>
          <span className="text-[10px] text-foreground/50">
            {selectedPresets.length + (hasOther ? 1 : 0)} sélectionné(s)
          </span>
        </div>

        <div className="grid grid-cols-1 gap-2 p-3 rounded bg-surface border border-secondary/30">
          {PRESET_BLACKLIST_REASONS.map((reason) => {
            const isSelected = selectedPresets.includes(reason);
            return (
              <label
                key={reason}
                onClick={() => togglePreset(reason)}
                className={`flex items-start gap-2.5 p-2 rounded cursor-pointer transition-colors select-none ${
                  isSelected
                    ? 'bg-secondary/15 border border-secondary/50 text-white'
                    : 'hover:bg-surface-high border border-transparent text-foreground/80'
                }`}
              >
                <div className="mt-0.5 shrink-0 text-secondary">
                  {isSelected ? (
                    <CheckSquare className="w-4 h-4 text-secondary fill-secondary/20" />
                  ) : (
                    <Square className="w-4 h-4 text-foreground/40" />
                  )}
                </div>
                <span className="text-xs leading-tight font-sans font-medium">{reason}</span>
              </label>
            );
          })}

          {/* Option Autre Motif */}
          <label
            onClick={() => setHasOther(!hasOther)}
            className={`flex items-start gap-2.5 p-2 rounded cursor-pointer transition-colors select-none ${
              hasOther
                ? 'bg-secondary/15 border border-secondary/50 text-white'
                : 'hover:bg-surface-high border border-transparent text-foreground/80'
            }`}
          >
            <div className="mt-0.5 shrink-0 text-secondary">
              {hasOther ? (
                <CheckSquare className="w-4 h-4 text-secondary fill-secondary/20" />
              ) : (
                <Square className="w-4 h-4 text-foreground/40" />
              )}
            </div>
            <span className="text-xs leading-tight font-sans font-medium">{OTHER_REASON_LABEL}</span>
          </label>

          {/* Champ libre si Autre motif coché */}
          {hasOther && (
            <div className="pt-1.5 pl-6 animate-fade-in space-y-1">
              <input
                type="text"
                value={otherText}
                onChange={(e) => setOtherText(e.target.value)}
                placeholder="Préciser le motif spécifique (ex: vol de matériel, non-restitution des clés)..."
                className="w-full bg-background border border-secondary/50 rounded px-3 py-2 text-white focus:outline-none focus:border-secondary text-xs placeholder:text-foreground/40"
                autoFocus
              />
              {!otherText.trim() && (
                <p className="text-[10px] text-secondary flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  Veuillez préciser la raison dans ce champ.
                </p>
              )}
            </div>
          )}
        </div>

        {!isAnyReasonSelected && (
          <p className="text-[10px] text-secondary flex items-center gap-1">
            <AlertCircle className="w-3 h-3" />
            Veuillez cocher au moins un motif de blocage.
          </p>
        )}
      </div>

      {/* 2. Message de Refus (Éditable & Mémorisé) */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <label className="text-[10px] uppercase tracking-wider text-foreground/60 font-bold flex items-center gap-1.5">
            <span>Message officiel de refus (visible par la personne bloquée)</span>
          </label>
          <button
            type="button"
            onClick={handleResetRejection}
            className="text-[10px] text-foreground/50 hover:text-white flex items-center gap-1 transition-colors cursor-pointer"
            title="Rétablir le texte légal standard"
          >
            <RotateCcw className="w-3 h-3 text-primary" />
            <span>Texte standard</span>
          </button>
        </div>

        <textarea
          rows={3}
          value={rejectionMessage}
          onChange={(e) => handleRejectionChange(e.target.value)}
          placeholder="Texte officiel de notification..."
          className="w-full bg-background border border-[#353535] focus:border-secondary rounded p-3 text-foreground/90 focus:outline-none text-xs leading-relaxed resize-y min-h-[75px]"
        />
        <p className="text-[10px] text-foreground/40 italic">
          💡 La dernière version saisie est automatiquement mémorisée pour les prochains blocages.
        </p>
      </div>
    </div>
  );
}
