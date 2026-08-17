'use client';

import React, { useState } from 'react';
import { TrackItem, VisitorAttendanceInput } from '@/types/models';
import { registerVisitorAttendance } from '../actions';
import { X, UserPlus, Save, AlertCircle, ShieldCheck } from 'lucide-react';

interface VisitorAttendanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  tracks: TrackItem[];
}

export default function VisitorAttendanceModal({
  isOpen,
  onClose,
  onSuccess,
  tracks,
}: VisitorAttendanceModalProps) {
  const [name, setName] = useState('');
  const [licenseNumber, setLicenseNumber] = useState('');
  const [trackId, setTrackId] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !licenseNumber.trim()) {
      setErrorMsg('Veuillez renseigner le nom et le numéro de licence FBA du pilote.');
      return;
    }

    setLoading(true);
    setErrorMsg(null);

    const input: VisitorAttendanceInput = {
      name: name.trim(),
      licenseNumber: licenseNumber.trim(),
      trackId: trackId || null,
    };

    const res = await registerVisitorAttendance(input);
    setLoading(false);

    if (res.success) {
      setName('');
      setLicenseNumber('');
      onSuccess();
      onClose();
    } else {
      setErrorMsg(res.error || "Erreur lors de l'enregistrement du visiteur.");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in">
      <div className="absolute inset-0" onClick={onClose} />

      <div className="relative z-10 w-full max-w-md bg-[#0f0f0f] border border-[#353535] rounded-2xl shadow-[0_0_50px_rgba(0,0,0,0.9)] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-5 border-b border-[#292929] flex items-center justify-between bg-surface-dim">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary border border-primary/30 flex items-center justify-center">
              <UserPlus className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-anybody font-black text-base uppercase tracking-tight text-white sport-skew">
                Enregistrer un Visiteur FBA
              </h2>
              <p className="text-[11px] font-mono text-foreground/50">
                Couverture d'assurance pour pilote externe
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

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 font-mono text-xs">
          {errorMsg && (
            <div className="p-3 rounded-xl bg-secondary/15 border border-secondary/40 text-secondary flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-foreground/70 block uppercase text-[10px]">
              Nom & Prénom du Pilote * :
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Jean Dupont"
              className="w-full bg-background border border-[#353535] rounded-xl px-3 py-2 text-white focus:outline-none focus:border-primary"
              required
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-foreground/70 block uppercase text-[10px]">
              Numéro de Licence FBA * :
            </label>
            <input
              type="text"
              value={licenseNumber}
              onChange={(e) => setLicenseNumber(e.target.value)}
              placeholder="Ex: BEL-12345"
              className="w-full bg-background border border-[#353535] rounded-xl px-3 py-2 text-white focus:outline-none focus:border-primary uppercase"
              required
            />
            <p className="text-[10px] text-foreground/45">
              Obligatoire pour la couverture en responsabilité civile sur la piste.
            </p>
          </div>

          <div className="space-y-1.5">
            <label className="text-foreground/70 block uppercase text-[10px]">
              Piste Utilisée (optionnel) :
            </label>
            <select
              value={trackId}
              onChange={(e) => setTrackId(e.target.value)}
              className="w-full bg-background border border-[#353535] rounded-xl px-3 py-2 text-white focus:outline-none focus:border-primary cursor-pointer font-sans"
            >
              <option value="">Toutes / Non spécifié</option>
              {tracks.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>

          <div className="pt-3 border-t border-[#292929] flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg bg-surface border border-[#353535] text-foreground/70 hover:text-white"
            >
              Annuler
            </button>

            <button
              type="submit"
              disabled={loading}
              className="premium-btn text-xs px-5 py-2.5 flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span className="transform skew-x-8">
                {loading ? 'Enregistrement...' : 'Enregistrer au Registre'}
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
