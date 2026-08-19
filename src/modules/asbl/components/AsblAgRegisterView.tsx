'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  GeneralAssemblyItem,
  GeneralAssemblyType,
  GeneralAssemblyStatus,
  getErrorMessage,
} from '@/types/models';
import { getGeneralAssemblies, deleteGeneralAssembly, updateAgStatus } from '../actions';
import AsblAgFormModal from './AsblAgFormModal';
import AsblAgSignatureModal from './AsblAgSignatureModal';
import AsblAgPvPrintModal from './AsblAgPvPrintModal';
import {
  Vote,
  Plus,
  Calendar,
  Clock,
  MapPin,
  FileSignature,
  Printer,
  FileText,
  Trash2,
  Edit,
  RefreshCw,
  Search,
  CheckCircle2,
  AlertTriangle,
  Award,
  Archive,
  Layers,
  Sparkles,
} from 'lucide-react';

export default function AsblAgRegisterView() {
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState<number | 'ALL'>('ALL');
  const [selectedType, setSelectedType] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const [assemblies, setAssemblies] = useState<GeneralAssemblyItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Modales
  const [formModalOpen, setFormModalOpen] = useState(false);
  const [editingAg, setEditingAg] = useState<GeneralAssemblyItem | null>(null);

  const [sigModalOpen, setSigModalOpen] = useState(false);
  const [signingAg, setSigningAg] = useState<GeneralAssemblyItem | null>(null);

  const [printModalOpen, setPrintModalOpen] = useState(false);
  const [printingAg, setPrintingAg] = useState<GeneralAssemblyItem | null>(null);

  const loadAssemblies = useCallback(async () => {
    setLoading(true);
    const yr = selectedYear === 'ALL' ? undefined : selectedYear;
    const res = await getGeneralAssemblies(yr, selectedType, selectedStatus);
    if (res.error) {
      setFeedbackMsg({ type: 'error', text: res.error });
    } else {
      setAssemblies(res.data);
    }
    setLoading(false);
  }, [selectedYear, selectedType, selectedStatus]);

  useEffect(() => {
    loadAssemblies();
  }, [loadAssemblies]);

  const showNotification = (type: 'success' | 'error', text: string) => {
    setFeedbackMsg({ type, text });
    setTimeout(() => setFeedbackMsg(null), 4000);
  };

  const handleDeleteAg = async (ag: GeneralAssemblyItem) => {
    if (!window.confirm(`Êtes-vous sûr de vouloir supprimer définitivement l'assemblée "${ag.title}" ?`)) {
      return;
    }
    try {
      const res = await deleteGeneralAssembly(ag.id);
      if (!res.success) throw new Error(res.error || 'Erreur lors de la suppression.');
      showNotification('success', 'Assemblée générale supprimée avec succès.');
      loadAssemblies();
    } catch (err: unknown) {
      showNotification('error', getErrorMessage(err));
    }
  };

  const handleToggleArchive = async (ag: GeneralAssemblyItem) => {
    const nextStatus: GeneralAssemblyStatus = ag.status === 'ARCHIVED' ? 'SIGNING' : 'ARCHIVED';
    try {
      const res = await updateAgStatus(ag.id, nextStatus);
      if (!res.success) throw new Error(res.error || 'Erreur changement de statut.');
      showNotification('success', `Statut mis à jour : ${nextStatus}`);
      loadAssemblies();
    } catch (err: unknown) {
      showNotification('error', getErrorMessage(err));
    }
  };

  const filteredAssemblies = useMemo(() => {
    return assemblies.filter((ag) => {
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      const matchTitle = ag.title.toLowerCase().includes(q);
      const matchLoc = ag.location.toLowerCase().includes(q);
      const matchNotes = (ag.content_notes || '').toLowerCase().includes(q);
      return matchTitle || matchLoc || matchNotes;
    });
  }, [assemblies, searchQuery]);

  // Statistiques synthétiques
  const stats = useMemo(() => {
    const total = assemblies.length;
    const ordinaires = assemblies.filter((a) => a.type === 'ORDINAIRE').length;
    const extraordinaires = assemblies.filter((a) => a.type === 'EXTRAORDINAIRE').length;
    const archived = assemblies.filter((a) => a.status === 'ARCHIVED').length;
    const totalSigs = assemblies.reduce((acc, a) => acc + (a.signatures?.length || 0), 0);
    return { total, ordinaires, extraordinaires, archived, totalSigs };
  }, [assemblies]);

  const getStatusBadge = (status: GeneralAssemblyStatus) => {
    switch (status) {
      case 'DRAFT':
        return {
          label: 'Brouillon',
          cls: 'bg-zinc-800 text-zinc-300 border-zinc-700',
        };
      case 'VOTING':
        return {
          label: 'Votes en cours',
          cls: 'bg-amber-500/20 text-amber-300 border-amber-500/40 animate-pulse',
        };
      case 'SIGNING':
        return {
          label: 'En signature',
          cls: 'bg-primary/20 text-primary border-primary/40',
        };
      case 'ARCHIVED':
        return {
          label: 'Archivé & Signé',
          cls: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
        };
      default:
        return {
          label: status,
          cls: 'bg-surface text-foreground/50 border-[#333]',
        };
    }
  };

  return (
    <div className="space-y-6 animate-fade-in font-mono">
      {/* Notifications */}
      {feedbackMsg && (
        <div
          className={`p-3 rounded-lg border text-xs flex items-center justify-between gap-2 animate-fade-in ${
            feedbackMsg.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
              : 'bg-secondary/10 border-secondary/30 text-secondary'
          }`}
        >
          <span>{feedbackMsg.text}</span>
          <button
            onClick={() => setFeedbackMsg(null)}
            className="text-foreground/40 hover:text-white cursor-pointer"
          >
            ×
          </button>
        </div>
      )}

      {/* KPI & Compteurs de la Vie ASBL */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3.5 rounded-xl bg-surface border border-[#303030] space-y-1">
          <span className="text-[10px] text-foreground/50 uppercase font-bold tracking-wider block">
            Assemblées Générales
          </span>
          <div className="text-xl sm:text-2xl font-black text-white font-anybody sport-skew">
            {stats.total}
          </div>
          <span className="text-[10px] text-foreground/40">Registre officiel</span>
        </div>

        <div className="p-3.5 rounded-xl bg-surface border border-[#303030] space-y-1">
          <span className="text-[10px] text-primary uppercase font-bold tracking-wider block">
            AG Ordinaires
          </span>
          <div className="text-xl sm:text-2xl font-black text-primary font-anybody sport-skew">
            {stats.ordinaires}
          </div>
          <span className="text-[10px] text-foreground/40">Bilan & décharge</span>
        </div>

        <div className="p-3.5 rounded-xl bg-surface border border-[#303030] space-y-1">
          <span className="text-[10px] text-secondary uppercase font-bold tracking-wider block">
            AG Extraordinaires
          </span>
          <div className="text-xl sm:text-2xl font-black text-secondary font-anybody sport-skew">
            {stats.extraordinaires}
          </div>
          <span className="text-[10px] text-foreground/40">Statuts & décisions</span>
        </div>

        <div className="p-3.5 rounded-xl bg-surface border border-[#303030] space-y-1">
          <span className="text-[10px] text-emerald-400 uppercase font-bold tracking-wider block">
            PV Signés & Archivés
          </span>
          <div className="text-xl sm:text-2xl font-black text-emerald-400 font-anybody sport-skew">
            {stats.archived}
          </div>
          <span className="text-[10px] text-foreground/40">{stats.totalSigs} signature(s) au total</span>
        </div>
      </div>

      {/* Barre de filtres & Actions */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 bg-[#151515] p-3.5 rounded-xl border border-[#2c2c2c]">
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          {/* Recherche */}
          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 text-foreground/40 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Rechercher par titre, lieu..."
              className="w-full bg-[#1c1c1c] border border-[#333] rounded pl-8 pr-3 py-1.5 text-xs text-white focus:outline-none focus:border-primary font-sans"
            />
          </div>

          {/* Filtre Année */}
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(e.target.value === 'ALL' ? 'ALL' : parseInt(e.target.value))}
            className="bg-[#1c1c1c] border border-[#333] rounded px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-primary cursor-pointer"
          >
            <option value="ALL">Toutes les années</option>
            <option value={currentYear}>{currentYear}</option>
            <option value={currentYear - 1}>{currentYear - 1}</option>
            <option value={currentYear - 2}>{currentYear - 2}</option>
          </select>

          {/* Filtre Type */}
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="bg-[#1c1c1c] border border-[#333] rounded px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-primary cursor-pointer"
          >
            <option value="ALL">Tous les types</option>
            <option value="ORDINAIRE">AG Ordinaire</option>
            <option value="EXTRAORDINAIRE">AG Extraordinaire</option>
          </select>

          {/* Filtre Statut */}
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="bg-[#1c1c1c] border border-[#333] rounded px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-primary cursor-pointer"
          >
            <option value="ALL">Tous les statuts</option>
            <option value="DRAFT">Brouillon</option>
            <option value="VOTING">Votes en cours</option>
            <option value="SIGNING">En signature</option>
            <option value="ARCHIVED">Archivé</option>
          </select>
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto justify-between md:justify-end">
          <button
            onClick={loadAssemblies}
            disabled={loading}
            className="p-2 rounded bg-[#1c1c1c] hover:bg-[#252525] border border-[#333] text-foreground/60 hover:text-white cursor-pointer transition-colors"
            title="Actualiser le registre"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>

          <button
            onClick={() => {
              setEditingAg(null);
              setFormModalOpen(true);
            }}
            className="px-4 py-2 rounded bg-primary hover:bg-primary-light text-black font-anybody font-black uppercase text-xs tracking-wider transition-all sport-skew shadow-[2px_2px_0px_#000] flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span className="transform skew-x-8">Nouvelle AG</span>
          </button>
        </div>
      </div>

      {/* Registre des Assemblées Générales (Liste / Cartes) */}
      {loading ? (
        <div className="py-16 text-center text-xs text-foreground/40 flex flex-col items-center gap-2">
          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <span>Chargement du registre officiel des AG...</span>
        </div>
      ) : filteredAssemblies.length === 0 ? (
        <div className="p-12 text-center rounded-2xl bg-surface border border-[#333] space-y-3">
          <Vote className="w-12 h-12 text-foreground/30 mx-auto" />
          <h3 className="font-anybody font-black text-lg uppercase text-white">
            Aucune Assemblée Générale Répertoriée
          </h3>
          <p className="text-xs text-foreground/50 max-w-md mx-auto">
            Créez votre première Assemblée Générale pour enregistrer l'ordre du jour, les votes des résolutions et recueillir les signatures électroniques du PV.
          </p>
          <button
            onClick={() => {
              setEditingAg(null);
              setFormModalOpen(true);
            }}
            className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 bg-primary text-black font-anybody font-black uppercase text-xs rounded sport-skew"
          >
            <Plus className="w-4 h-4" />
            <span className="transform skew-x-8">Créer une AG</span>
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredAssemblies.map((ag) => {
            const statusBadge = getStatusBadge(ag.status);
            const dateObj = new Date(ag.date);
            const formattedDate = dateObj.toLocaleDateString('fr-BE', {
              day: '2-digit',
              month: 'long',
              year: 'numeric',
            });
            const formattedTime = dateObj.toLocaleTimeString('fr-BE', {
              hour: '2-digit',
              minute: '2-digit',
            });

            const resolutionsCount = ag.resolutions?.length || 0;
            const adoptedCount = ag.resolutions?.filter((r) => r.is_adopted).length || 0;
            const signaturesCount = ag.signatures?.length || 0;

            return (
              <div
                key={ag.id}
                className="p-5 rounded-2xl bg-[#141414] border border-[#2a2a2a] hover:border-[#383838] transition-all space-y-4 shadow-lg"
              >
                {/* En-tête de Carte */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#252525] pb-3.5">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${
                          ag.type === 'ORDINAIRE'
                            ? 'bg-primary/10 text-primary border-primary/30'
                            : 'bg-secondary/10 text-secondary border-secondary/30'
                        }`}
                      >
                        {ag.type === 'ORDINAIRE' ? 'AG Ordinaire' : 'AG Extraordinaire'}
                      </span>

                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${statusBadge.cls}`}>
                        {statusBadge.label}
                      </span>
                    </div>

                    <h3 className="font-anybody font-black text-lg text-white uppercase tracking-tight sport-skew pt-0.5">
                      {ag.title}
                    </h3>
                  </div>

                  <div className="text-right text-xs text-foreground/60 space-y-0.5">
                    <div className="flex items-center sm:justify-end gap-1.5 text-white font-bold">
                      <Calendar className="w-3.5 h-3.5 text-primary" />
                      <span>{formattedDate} à {formattedTime}</span>
                    </div>
                    <div className="flex items-center sm:justify-end gap-1.5 text-[11px] text-foreground/50">
                      <MapPin className="w-3 h-3 text-foreground/40" />
                      <span>{ag.location}</span>
                    </div>
                  </div>
                </div>

                {/* Métriques & Détails de l'AG */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                  {/* Ordre du jour résumé */}
                  <div className="p-3 rounded-xl bg-[#181818] border border-[#2a2a2a] space-y-1.5">
                    <span className="text-[10px] text-foreground/40 uppercase font-bold tracking-wider block">
                      Ordre du Jour ({ag.agenda?.length || 0} points)
                    </span>
                    {Array.isArray(ag.agenda) && ag.agenda.length > 0 ? (
                      <ul className="space-y-1 text-[11px] text-foreground/80 font-sans list-disc list-inside">
                        {ag.agenda.slice(0, 3).map((pt, i) => (
                          <li key={i} className="truncate">{pt}</li>
                        ))}
                        {ag.agenda.length > 3 && (
                          <li className="text-foreground/40 italic">+{ag.agenda.length - 3} autre(s) point(s)...</li>
                        )}
                      </ul>
                    ) : (
                      <span className="text-[11px] text-foreground/40 italic">Non spécifié</span>
                    )}
                  </div>

                  {/* Résolutions votées */}
                  <div className="p-3 rounded-xl bg-[#181818] border border-[#2a2a2a] space-y-1.5">
                    <span className="text-[10px] text-foreground/40 uppercase font-bold tracking-wider block">
                      Résolutions & Votes
                    </span>
                    <div className="text-sm font-bold text-white flex items-center gap-2">
                      <span>{resolutionsCount} résolution(s)</span>
                      {resolutionsCount > 0 && (
                        <span className="text-[11px] text-emerald-400 font-mono">
                          ({adoptedCount} adoptée{adoptedCount > 1 ? 's' : ''})
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-foreground/50 leading-tight">
                      Enregistrement des voix Pour, Contre et Abstention.
                    </p>
                  </div>

                  {/* Signatures électroniques */}
                  <div className="p-3 rounded-xl bg-[#181818] border border-[#2a2a2a] space-y-1.5">
                    <span className="text-[10px] text-foreground/40 uppercase font-bold tracking-wider block">
                      Signatures Numériques
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-white font-mono">
                        {signaturesCount} signataire(s)
                      </span>
                      {signaturesCount > 0 && (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      )}
                    </div>
                    {ag.signatures && ag.signatures.length > 0 ? (
                      <div className="flex flex-wrap gap-1 pt-0.5">
                        {ag.signatures.map((sig) => (
                          <span
                            key={sig.id}
                            className="px-1.5 py-0.2 rounded bg-primary/10 border border-primary/20 text-primary text-[9px] font-bold"
                          >
                            {sig.signer_role}: {sig.signer_name}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-[10px] text-foreground/40 italic">En attente de signature</span>
                    )}
                  </div>
                </div>

                {/* Barre d'actions */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-[#252525]">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        setSigningAg(ag);
                        setSigModalOpen(true);
                      }}
                      className="px-3 py-1.5 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/40 text-emerald-300 text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors"
                      title="Apposer une signature numérique sur le PV"
                    >
                      <FileSignature className="w-3.5 h-3.5" />
                      <span>Signer le PV</span>
                    </button>

                    <button
                      onClick={() => {
                        setPrintingAg(ag);
                        setPrintModalOpen(true);
                      }}
                      className="px-3 py-1.5 rounded-lg bg-surface hover:bg-surface-high border border-[#353535] text-foreground/80 hover:text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors"
                      title="Aperçu et impression du Procès-Verbal officiel"
                    >
                      <Printer className="w-3.5 h-3.5 text-primary" />
                      <span>Imprimer / PDF</span>
                    </button>

                    <button
                      onClick={() => handleToggleArchive(ag)}
                      className="px-2.5 py-1.5 rounded-lg bg-surface hover:bg-surface-high border border-[#353535] text-foreground/60 hover:text-white text-xs flex items-center gap-1 cursor-pointer transition-colors"
                      title={ag.status === 'ARCHIVED' ? 'Désarchiver l’AG' : 'Archiver l’AG'}
                    >
                      <Archive className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">{ag.status === 'ARCHIVED' ? 'Désarchiver' : 'Archiver'}</span>
                    </button>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        setEditingAg(ag);
                        setFormModalOpen(true);
                      }}
                      className="px-3 py-1.5 rounded-lg bg-surface hover:bg-surface-high border border-[#353535] text-foreground/80 hover:text-white text-xs flex items-center gap-1.5 cursor-pointer transition-colors"
                    >
                      <Edit className="w-3.5 h-3.5" />
                      <span>Modifier</span>
                    </button>

                    <button
                      onClick={() => handleDeleteAg(ag)}
                      className="p-1.5 rounded-lg bg-surface hover:bg-secondary/20 border border-[#353535] hover:border-secondary/40 text-foreground/50 hover:text-secondary cursor-pointer transition-colors"
                      title="Supprimer définitivement l’AG"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modale d'Édition / Création */}
      <AsblAgFormModal
        ag={editingAg}
        isOpen={formModalOpen}
        onClose={() => setFormModalOpen(false)}
        onSuccess={() => {
          showNotification('success', 'Assemblée Générale enregistrée avec succès.');
          loadAssemblies();
        }}
      />

      {/* Modale de Signature */}
      <AsblAgSignatureModal
        ag={signingAg}
        isOpen={sigModalOpen}
        onClose={() => setSigModalOpen(false)}
        onSuccess={() => {
          showNotification('success', 'Signature numérique apposée avec succès sur le PV.');
          loadAssemblies();
        }}
      />

      {/* Modale d'Impression / PDF */}
      <AsblAgPvPrintModal
        ag={printingAg}
        isOpen={printModalOpen}
        onClose={() => setPrintModalOpen(false)}
      />
    </div>
  );
}
