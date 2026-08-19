'use client';

import React, { useState, useEffect } from 'react';
import {
  GeneralAssemblyItem,
  GeneralAssemblyType,
  GeneralAssemblyStatus,
  SaveGeneralAssemblyInput,
  getErrorMessage,
} from '@/types/models';
import { saveGeneralAssembly } from '../actions';
import {
  X,
  Plus,
  Trash2,
  Calendar,
  Clock,
  MapPin,
  ListOrdered,
  Vote,
  FileText,
  AlertTriangle,
  CheckCircle2,
  Sliders,
} from 'lucide-react';

interface AsblAgFormModalProps {
  ag: GeneralAssemblyItem | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (savedAg?: GeneralAssemblyItem) => void;
}

export default function AsblAgFormModal({
  ag,
  isOpen,
  onClose,
  onSuccess,
}: AsblAgFormModalProps) {
  const [type, setType] = useState<GeneralAssemblyType>('ORDINAIRE');
  const [title, setTitle] = useState('');
  const [dateTime, setDateTime] = useState('');
  const [location, setLocation] = useState('Seraing Buggy Club ASBL (Rue Bigaye 60, 4101 Seraing)');
  const [status, setStatus] = useState<GeneralAssemblyStatus>('DRAFT');
  const [agenda, setAgenda] = useState<string[]>([]);
  const [newAgendaPoint, setNewAgendaPoint] = useState('');
  const [contentNotes, setContentNotes] = useState('');
  
  const [resolutions, setResolutions] = useState<
    Array<{
      id?: string;
      title: string;
      description?: string | null;
      votes_for: number;
      votes_against: number;
      votes_abstain: number;
      is_adopted: boolean;
    }>
  >([]);

  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (isOpen) {
      setErrorMsg('');
      if (ag) {
        setType(ag.type || 'ORDINAIRE');
        setTitle(ag.title || '');
        // Format ISO string to datetime-local (YYYY-MM-DDTHH:mm)
        if (ag.date) {
          const d = new Date(ag.date);
          const localIso = new Date(d.getTime() - d.getTimezoneOffset() * 60000)
            .toISOString()
            .slice(0, 16);
          setDateTime(localIso);
        } else {
          setDateTime('');
        }
        setLocation(ag.location || 'Seraing Buggy Club ASBL (Rue Bigaye 60, 4101 Seraing)');
        setStatus(ag.status || 'DRAFT');
        setAgenda(Array.isArray(ag.agenda) ? [...ag.agenda] : []);
        setContentNotes(ag.content_notes || '');
        setResolutions(
          ag.resolutions
            ? ag.resolutions.map((r) => ({
                id: r.id,
                title: r.title,
                description: r.description,
                votes_for: r.votes_for || 0,
                votes_against: r.votes_against || 0,
                votes_abstain: r.votes_abstain || 0,
                is_adopted: r.is_adopted ?? true,
              }))
            : []
        );
      } else {
        // Initial values for a new AG
        const defaultYear = new Date().getFullYear();
        setType('ORDINAIRE');
        setTitle(`Assemblée Générale Annuelle Ordinaire ${defaultYear}`);
        const now = new Date();
        now.setHours(14, 0, 0, 0);
        const localIso = new Date(now.getTime() - now.getTimezoneOffset() * 60000)
          .toISOString()
          .slice(0, 16);
        setDateTime(localIso);
        setLocation('Seraing Buggy Club ASBL (Rue Bigaye 60, 4101 Seraing)');
        setStatus('DRAFT');
        setAgenda([
          'Approbation du Procès-Verbal de la précédente AG',
          'Rapport moral et sportif du Conseil d’Administration',
          'Présentation et approbation des comptes annuels',
          'Décharge aux administrateurs',
          'Vote du budget prévisionnel et cotisations',
          'Questions diverses & perspectives',
        ]);
        setContentNotes('');
        setResolutions([
          {
            title: 'Approbation des comptes annuels et du bilan financier',
            description: 'Approbation du bilan financier présenté par le trésorier.',
            votes_for: 0,
            votes_against: 0,
            votes_abstain: 0,
            is_adopted: true,
          },
          {
            title: 'Décharge pleine et entière aux administrateurs',
            description: 'Pour l’exercice écoulé.',
            votes_for: 0,
            votes_against: 0,
            votes_abstain: 0,
            is_adopted: true,
          },
        ]);
      }
    }
  }, [isOpen, ag]);

  if (!isOpen) return null;

  // Gestion de l'ordre du jour
  const handleAddAgendaPoint = () => {
    if (!newAgendaPoint.trim()) return;
    setAgenda([...agenda, newAgendaPoint.trim()]);
    setNewAgendaPoint('');
  };

  const handleRemoveAgendaPoint = (index: number) => {
    setAgenda(agenda.filter((_, idx) => idx !== index));
  };

  // Gestion des résolutions
  const handleAddResolution = () => {
    setResolutions([
      ...resolutions,
      {
        title: `Résolution n°${resolutions.length + 1}`,
        description: '',
        votes_for: 0,
        votes_against: 0,
        votes_abstain: 0,
        is_adopted: true,
      },
    ]);
  };

  const handleUpdateResolution = (index: number, fields: Partial<typeof resolutions[0]>) => {
    const updated = [...resolutions];
    updated[index] = { ...updated[index], ...fields };
    setResolutions(updated);
  };

  const handleRemoveResolution = (index: number) => {
    setResolutions(resolutions.filter((_, idx) => idx !== index));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !dateTime) {
      setErrorMsg('Veuillez renseigner le titre et la date de l’assemblée générale.');
      return;
    }

    setSaving(true);
    setErrorMsg('');

    try {
      const payload: SaveGeneralAssemblyInput = {
        id: ag?.id,
        type,
        title: title.trim(),
        date: new Date(dateTime).toISOString(),
        location: location.trim(),
        status,
        agenda,
        content_notes: contentNotes,
        resolutions,
      };

      const res = await saveGeneralAssembly(payload);
      if (!res.success || res.error) {
        throw new Error(res.error || 'Erreur lors de l’enregistrement.');
      }

      onSuccess(res.data || undefined);
      onClose();
    } catch (err: unknown) {
      setErrorMsg(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-fade-in font-mono">
      <div className="w-full max-w-3xl bg-[#111] p-6 rounded-2xl border border-primary/40 shadow-2xl relative space-y-4 max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#2c2c2c] pb-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary/20 border border-primary/40 flex items-center justify-center text-primary">
              <Vote className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-anybody font-black text-base uppercase tracking-tight sport-skew text-white">
                {ag ? 'Éditer l’Assemblée Générale' : 'Nouvelle Assemblée Générale (AG)'}
              </h3>
              <p className="text-[10px] text-foreground/60">
                Administration ASBL • Registre & Procès-Verbal
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-surface text-foreground/50 hover:text-white cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {errorMsg && (
          <div className="p-2.5 rounded bg-secondary/15 border border-secondary/30 text-secondary text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-4">
          {/* Informations Générales */}
          <div className="p-4 rounded-xl bg-[#161616] border border-[#2c2c2c] space-y-3">
            <h4 className="font-bold text-xs uppercase text-white flex items-center gap-2">
              <Calendar className="w-3.5 h-3.5 text-primary" />
              1. Informations Générales
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2">
                <label className="block text-[10px] uppercase font-bold text-foreground/60 mb-1">
                  Titre de l’AG *
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Ex: Assemblée Générale Ordinaire 2026"
                  className="w-full bg-[#181818] border border-[#333] rounded px-3 py-2 text-xs text-white focus:outline-none focus:border-primary font-sans"
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase font-bold text-foreground/60 mb-1">
                  Type d’AG *
                </label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value as GeneralAssemblyType)}
                  className="w-full bg-[#181818] border border-[#333] rounded px-2.5 py-2 text-xs text-white focus:outline-none focus:border-primary font-mono cursor-pointer"
                >
                  <option value="ORDINAIRE">AG Ordinaire</option>
                  <option value="EXTRAORDINAIRE">AG Extraordinaire (AGE)</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[10px] uppercase font-bold text-foreground/60 mb-1">
                  Date & Heure *
                </label>
                <input
                  type="datetime-local"
                  required
                  value={dateTime}
                  onChange={(e) => setDateTime(e.target.value)}
                  className="w-full bg-[#181818] border border-[#333] rounded px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-primary font-mono"
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase font-bold text-foreground/60 mb-1">
                  Lieu de la réunion
                </label>
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="Ex: Club-House SBC"
                  className="w-full bg-[#181818] border border-[#333] rounded px-3 py-1.5 text-xs text-white focus:outline-none focus:border-primary font-sans"
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase font-bold text-foreground/60 mb-1">
                  Statut du PV
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as GeneralAssemblyStatus)}
                  className="w-full bg-[#181818] border border-[#333] rounded px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-primary font-mono cursor-pointer"
                >
                  <option value="DRAFT">Brouillon (DRAFT)</option>
                  <option value="VOTING">Votes en cours (VOTING)</option>
                  <option value="SIGNING">En signature (SIGNING)</option>
                  <option value="ARCHIVED">Archivé & Clôturé (ARCHIVED)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Ordre du Jour Dynamique */}
          <div className="p-4 rounded-xl bg-[#161616] border border-[#2c2c2c] space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-xs uppercase text-white flex items-center gap-2">
                <ListOrdered className="w-3.5 h-3.5 text-primary" />
                2. Ordre du Jour (ODJ)
              </h4>
              <span className="text-[10px] text-foreground/40">{agenda.length} point(s)</span>
            </div>

            <div className="space-y-2">
              {agenda.map((pt, idx) => (
                <div key={idx} className="flex items-center gap-2 bg-[#1c1c1c] p-2 rounded-lg border border-[#2c2c2c]">
                  <span className="w-5 h-5 rounded bg-primary/20 text-primary text-[10px] font-bold flex items-center justify-center shrink-0">
                    {idx + 1}
                  </span>
                  <span className="text-xs text-white flex-1 font-sans">{pt}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveAgendaPoint(idx)}
                    className="p-1 text-foreground/40 hover:text-secondary cursor-pointer transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>

            <div className="flex gap-2 pt-1">
              <input
                type="text"
                value={newAgendaPoint}
                onChange={(e) => setNewAgendaPoint(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddAgendaPoint();
                  }
                }}
                placeholder="Ajouter un point à l'ordre du jour..."
                className="flex-1 bg-[#181818] border border-[#333] rounded px-3 py-1.5 text-xs text-white focus:outline-none focus:border-primary font-sans"
              />
              <button
                type="button"
                onClick={handleAddAgendaPoint}
                className="px-3 py-1.5 rounded bg-surface hover:bg-surface-high border border-[#353535] text-primary text-xs font-bold flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Ajouter</span>
              </button>
            </div>
          </div>

          {/* Résolutions soumises aux votes */}
          <div className="p-4 rounded-xl bg-[#161616] border border-[#2c2c2c] space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-xs uppercase text-white flex items-center gap-2">
                <Vote className="w-3.5 h-3.5 text-primary" />
                3. Résolutions & Votes
              </h4>
              <button
                type="button"
                onClick={handleAddResolution}
                className="px-2.5 py-1 rounded bg-primary/15 hover:bg-primary/25 border border-primary/40 text-primary text-[10px] font-bold uppercase flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3 h-3" />
                <span>Ajouter une résolution</span>
              </button>
            </div>

            <div className="space-y-3">
              {resolutions.map((res, idx) => (
                <div key={idx} className="p-3 rounded-lg bg-[#1a1a1a] border border-[#303030] space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <input
                      type="text"
                      required
                      value={res.title}
                      onChange={(e) => handleUpdateResolution(idx, { title: e.target.value })}
                      placeholder={`Titre de la résolution n°${idx + 1}`}
                      className="flex-1 bg-[#141414] border border-[#333] rounded px-2.5 py-1.5 text-xs font-bold text-white focus:outline-none focus:border-primary font-sans"
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveResolution(idx)}
                      className="p-1.5 text-foreground/40 hover:text-secondary cursor-pointer transition-colors"
                      title="Supprimer la résolution"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <input
                    type="text"
                    value={res.description || ''}
                    onChange={(e) => handleUpdateResolution(idx, { description: e.target.value })}
                    placeholder="Description / détails de la résolution (facultatif)..."
                    className="w-full bg-[#141414] border border-[#333] rounded px-2.5 py-1 text-[11px] text-foreground/80 focus:outline-none focus:border-primary font-sans"
                  />

                  <div className="flex flex-wrap items-center justify-between gap-3 pt-1 border-t border-[#2a2a2a] text-xs">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] text-emerald-400 font-bold">Pour :</span>
                        <input
                          type="number"
                          min="0"
                          value={res.votes_for}
                          onChange={(e) => handleUpdateResolution(idx, { votes_for: parseInt(e.target.value) || 0 })}
                          className="w-14 bg-[#141414] border border-[#333] rounded px-1.5 py-0.5 text-xs text-white font-mono text-center"
                        />
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] text-rose-400 font-bold">Contre :</span>
                        <input
                          type="number"
                          min="0"
                          value={res.votes_against}
                          onChange={(e) => handleUpdateResolution(idx, { votes_against: parseInt(e.target.value) || 0 })}
                          className="w-14 bg-[#141414] border border-[#333] rounded px-1.5 py-0.5 text-xs text-white font-mono text-center"
                        />
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] text-foreground/50 font-bold">Abst. :</span>
                        <input
                          type="number"
                          min="0"
                          value={res.votes_abstain}
                          onChange={(e) => handleUpdateResolution(idx, { votes_abstain: parseInt(e.target.value) || 0 })}
                          className="w-14 bg-[#141414] border border-[#333] rounded px-1.5 py-0.5 text-xs text-white font-mono text-center"
                        />
                      </div>
                    </div>

                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={res.is_adopted}
                        onChange={(e) => handleUpdateResolution(idx, { is_adopted: e.target.checked })}
                        className="rounded bg-background border-[#444] text-emerald-500 focus:ring-0 w-3.5 h-3.5 cursor-pointer"
                      />
                      <span className={`text-[11px] font-bold ${res.is_adopted ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {res.is_adopted ? 'Résolution Adoptée' : 'Résolution Rejetée'}
                      </span>
                    </label>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Notes et Débats pour le PV */}
          <div className="p-4 rounded-xl bg-[#161616] border border-[#2c2c2c] space-y-2">
            <h4 className="font-bold text-xs uppercase text-white flex items-center gap-2">
              <FileText className="w-3.5 h-3.5 text-primary" />
              4. Compte-Rendu & Débats de Séance (PV)
            </h4>
            <textarea
              rows={4}
              value={contentNotes}
              onChange={(e) => setContentNotes(e.target.value)}
              placeholder="Saisissez ici les notes de séances, débats, interventions des membres et remarques importantes du PV..."
              className="w-full bg-[#181818] border border-[#333] rounded p-3 text-xs text-white focus:outline-none focus:border-primary font-sans leading-relaxed resize-y"
            />
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#2c2c2c]">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 rounded bg-surface hover:bg-surface-high border border-[#353535] text-foreground/70 cursor-pointer text-xs"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-1.5 rounded bg-primary hover:bg-primary-light text-black font-anybody font-black uppercase text-xs tracking-wider transition-all sport-skew shadow-[2px_2px_0px_#000] cursor-pointer disabled:opacity-50"
            >
              <span className="transform skew-x-8">
                {saving ? 'Enregistrement...' : 'Enregistrer l’AG'}
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
