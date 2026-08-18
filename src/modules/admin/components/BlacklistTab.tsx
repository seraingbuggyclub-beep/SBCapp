'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  ShieldAlert,
  Plus,
  Trash2,
  Edit2,
  Search,
  Lock,
  Calendar,
  Mail,
  User,
  AlertTriangle,
  CheckCircle2,
  X,
  RefreshCw,
  Eye,
  Info,
} from 'lucide-react';
import {
  getBlacklistEntries,
  addToBlacklist,
  updateBlacklistEntry,
  removeFromBlacklist,
} from '../blacklist-actions';
import { BlacklistEntry, CreateBlacklistInput, getErrorMessage } from '@/types/models';

export default function BlacklistTab() {
  const [entries, setEntries] = useState<BlacklistEntry[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [successMsg, setSuccessMsg] = useState<string>('');

  // Modale d'ajout / modification
  const [modalOpen, setModalOpen] = useState<boolean>(false);
  const [editingEntry, setEditingEntry] = useState<BlacklistEntry | null>(null);
  const [formData, setFormData] = useState<CreateBlacklistInput>({
    email: '',
    first_name: '',
    last_name: '',
    license_number: '',
    internal_reason: '',
    rejection_message:
      "Votre demande d'inscription n'a pas été retenue par l'Organe d'Administration du Seraing Buggy Club (ASBL), conformément aux statuts du club.",
  });
  const [saving, setSaving] = useState<boolean>(false);

  // Modale de confirmation de déblocage / réhabilitation
  const [rehabEntry, setRehabEntry] = useState<BlacklistEntry | null>(null);
  const [rehabilitating, setRehabilitating] = useState<boolean>(false);

  // Modale de détails
  const [detailEntry, setDetailEntry] = useState<BlacklistEntry | null>(null);

  const fetchEntries = useCallback(async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const { data, error } = await getBlacklistEntries();
      if (error) throw new Error(error);
      setEntries(data || []);
    } catch (err: unknown) {
      setErrorMsg(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEntries();
  }, [fetchEntries]);

  const filteredEntries = useMemo(() => {
    return entries.filter((e) => {
      const q = searchQuery.toLowerCase();
      const matchName = `${e.first_name || ''} ${e.last_name || ''}`.toLowerCase().includes(q);
      const matchEmail = (e.email || '').toLowerCase().includes(q);
      const matchLic = (e.license_number || '').toLowerCase().includes(q);
      const matchReason = (e.internal_reason || '').toLowerCase().includes(q);
      return matchName || matchEmail || matchLic || matchReason;
    });
  }, [entries, searchQuery]);

  const handleOpenAdd = () => {
    setEditingEntry(null);
    setFormData({
      email: '',
      first_name: '',
      last_name: '',
      license_number: '',
      internal_reason: '',
      rejection_message:
        "Votre demande d'inscription n'a pas été retenue par l'Organe d'Administration du Seraing Buggy Club (ASBL), conformément aux statuts du club.",
    });
    setModalOpen(true);
  };

  const handleOpenEdit = (entry: BlacklistEntry) => {
    setEditingEntry(entry);
    setFormData({
      email: entry.email || '',
      first_name: entry.first_name || '',
      last_name: entry.last_name || '',
      license_number: entry.license_number || '',
      internal_reason: entry.internal_reason,
      rejection_message: entry.rejection_message,
    });
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.internal_reason.trim()) {
      setErrorMsg('Le motif interne privé est obligatoire.');
      return;
    }

    setSaving(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      if (editingEntry) {
        const { success, error } = await updateBlacklistEntry(editingEntry.id, formData);
        if (!success || error) throw new Error(error || 'Erreur lors de la mise à jour.');
        setSuccessMsg('Entrée mise à jour avec succès.');
      } else {
        const { success, error } = await addToBlacklist(formData);
        if (!success || error) throw new Error(error || "Erreur lors de l'ajout.");
        setSuccessMsg('Personne ajoutée à la liste noire avec succès.');
      }

      setModalOpen(false);
      await fetchEntries();
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err: unknown) {
      setErrorMsg(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const handleRehabilitate = async () => {
    if (!rehabEntry) return;
    setRehabilitating(true);
    setErrorMsg('');
    try {
      const { success, error } = await removeFromBlacklist(rehabEntry.id);
      if (!success || error) throw new Error(error || 'Erreur lors de la suppression.');
      setSuccessMsg('Personne retirée de la liste noire (accès réhabilité).');
      setRehabEntry(null);
      await fetchEntries();
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err: unknown) {
      setErrorMsg(getErrorMessage(err));
    } finally {
      setRehabilitating(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Bannière de Confidentialité & Header */}
      <div className="premium-card p-6 rounded-lg border border-secondary/40 bg-secondary/10 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start md:items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-secondary/20 border border-secondary/40 flex items-center justify-center text-secondary shrink-0">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-anybody font-black text-lg uppercase tracking-tight sport-skew text-white">
                Liste Noire Privée & Blocage Légal
              </h2>
              <span className="px-2 py-0.5 rounded bg-secondary/30 border border-secondary/50 text-secondary text-[10px] font-mono font-bold uppercase tracking-wider">
                Confidentiel CA
              </span>
            </div>
            <p className="text-xs text-foreground/70 font-mono mt-0.5">
              Toute personne figurant sur cette liste verra son inscription bloquée automatiquement avec le motif statutaire officiel.
            </p>
          </div>
        </div>

        <button
          onClick={handleOpenAdd}
          className="px-4 py-2.5 rounded bg-secondary hover:bg-secondary/80 text-white font-anybody font-black uppercase text-xs tracking-wider transition-all sport-skew shadow-[3px_3px_0px_#000] flex items-center gap-2 cursor-pointer shrink-0 self-start md:self-center"
        >
          <Plus className="w-4 h-4" />
          <span className="transform skew-x-8">Bloquer une personne</span>
        </button>
      </div>

      {/* Messages d'alerte et de succès */}
      {errorMsg && (
        <div className="p-3.5 rounded bg-secondary/20 border border-secondary/40 text-secondary text-xs font-mono flex items-center gap-2 animate-fade-in">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {successMsg && (
        <div className="p-3.5 rounded bg-success/20 border border-success/40 text-success text-xs font-mono flex items-center gap-2 animate-fade-in">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Barre de Recherche et Compteur */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-foreground/40 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Rechercher par nom, email, licence ou motif..."
            className="w-full bg-surface border border-[#353535] rounded pl-9 pr-3 py-2 text-xs text-white placeholder-foreground/40 focus:outline-none focus:border-secondary font-mono"
          />
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs font-mono text-foreground/50">
            Total bloqués : <strong className="text-white">{entries.length}</strong>
          </span>
          <button
            onClick={fetchEntries}
            disabled={loading}
            className="p-2 rounded bg-surface hover:bg-surface-high border border-[#353535] text-foreground/70 hover:text-white transition-colors cursor-pointer"
            title="Rafraîchir"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Tableau des Entrées Blacklist */}
      <div className="premium-card rounded-lg border border-[#353535] overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-xs font-mono text-foreground/50 flex flex-col items-center gap-3">
            <div className="w-6 h-6 rounded-full border-2 border-secondary border-t-transparent animate-spin" />
            <span>Chargement des personnes bloquées...</span>
          </div>
        ) : filteredEntries.length === 0 ? (
          <div className="p-12 text-center text-xs font-mono text-foreground/50 space-y-2">
            <ShieldAlert className="w-8 h-8 text-foreground/30 mx-auto" />
            <p className="text-white font-bold">Aucune personne sur la liste noire</p>
            <p className="text-[11px]">
              {searchQuery ? 'Aucun résultat pour cette recherche.' : 'Le club ne compte aucun individu banni actuellement.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-surface border-b border-[#353535] text-[10px] uppercase tracking-wider text-foreground/50">
                <tr>
                  <th className="p-3.5">Identité</th>
                  <th className="p-3.5">Licence FBA</th>
                  <th className="p-3.5">Motif Interne (Privé)</th>
                  <th className="p-3.5">Date Inscription</th>
                  <th className="p-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#353535]/50 text-foreground/80">
                {filteredEntries.map((entry) => (
                  <tr key={entry.id} className="hover:bg-surface/50 transition-colors">
                    <td className="p-3.5">
                      <div className="font-bold text-white font-sans text-sm">
                        {entry.first_name || entry.last_name ? (
                          `${entry.first_name || ''} ${entry.last_name || ''}`.trim()
                        ) : (
                          <span className="text-foreground/40 italic">Nom non renseigné</span>
                        )}
                      </div>
                      <div className="text-[11px] text-foreground/60 flex items-center gap-1.5 mt-0.5">
                        <Mail className="w-3 h-3 text-secondary" />
                        <span>{entry.email || 'Pas d\'email spécifié'}</span>
                      </div>
                    </td>

                    <td className="p-3.5">
                      {entry.license_number ? (
                        <span className="px-2 py-0.5 rounded bg-surface border border-[#353535] font-bold text-white text-[11px]">
                          {entry.license_number}
                        </span>
                      ) : (
                        <span className="text-foreground/40 italic text-[11px]">Aucune</span>
                      )}
                    </td>

                    <td className="p-3.5 max-w-xs">
                      <div className="p-2 rounded bg-secondary/15 border border-secondary/30 text-secondary text-[11px] leading-relaxed line-clamp-2">
                        {entry.internal_reason}
                      </div>
                    </td>

                    <td className="p-3.5 text-[11px] text-foreground/60">
                      <div>{new Date(entry.created_at).toLocaleDateString('fr-BE')}</div>
                      {entry.blocked_by_member && (
                        <div className="text-[10px] text-foreground/40">
                          Par: {entry.blocked_by_member.first_name} {entry.blocked_by_member.last_name}
                        </div>
                      )}
                    </td>

                    <td className="p-3.5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => setDetailEntry(entry)}
                          className="p-1.5 rounded hover:bg-surface border border-transparent hover:border-[#353535] text-foreground/60 hover:text-white transition-colors cursor-pointer"
                          title="Détails complets"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleOpenEdit(entry)}
                          className="p-1.5 rounded hover:bg-surface border border-transparent hover:border-[#353535] text-foreground/60 hover:text-primary transition-colors cursor-pointer"
                          title="Modifier"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setRehabEntry(entry)}
                          className="p-1.5 rounded hover:bg-success/20 border border-transparent hover:border-success/40 text-foreground/60 hover:text-success transition-colors cursor-pointer"
                          title="Réhabiliter (Supprimer de la liste noire)"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modale d'Ajout / Modification */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-lg premium-card p-6 rounded-lg border border-secondary/50 shadow-2xl relative space-y-4">
            <div className="flex items-center justify-between border-b border-[#353535] pb-3">
              <div className="flex items-center gap-2 text-secondary">
                <ShieldAlert className="w-5 h-5" />
                <h3 className="font-anybody font-black text-lg uppercase tracking-tight sport-skew text-white">
                  {editingEntry ? 'Modifier le blocage' : 'Bloquer une personne'}
                </h3>
              </div>
              <button
                onClick={() => setModalOpen(false)}
                className="p-1 rounded hover:bg-surface text-foreground/50 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-3 font-mono text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] uppercase tracking-wider text-foreground/50 mb-1">
                    Prénom
                  </label>
                  <input
                    type="text"
                    value={formData.first_name || ''}
                    onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                    placeholder="Jean"
                    className="w-full bg-background border border-[#353535] rounded px-3 py-2 text-white focus:outline-none focus:border-secondary"
                  />
                </div>
                <div>
                  <label className="block text-[10px] uppercase tracking-wider text-foreground/50 mb-1">
                    Nom
                  </label>
                  <input
                    type="text"
                    value={formData.last_name || ''}
                    onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                    placeholder="Dupont"
                    className="w-full bg-background border border-[#353535] rounded px-3 py-2 text-white focus:outline-none focus:border-secondary"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] uppercase tracking-wider text-foreground/50 mb-1">
                    Adresse Email
                  </label>
                  <input
                    type="email"
                    value={formData.email || ''}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="pilote@example.com"
                    className="w-full bg-background border border-[#353535] rounded px-3 py-2 text-white focus:outline-none focus:border-secondary"
                  />
                </div>
                <div>
                  <label className="block text-[10px] uppercase tracking-wider text-foreground/50 mb-1">
                    N° Licence FBA
                  </label>
                  <input
                    type="text"
                    value={formData.license_number || ''}
                    onChange={(e) => setFormData({ ...formData, license_number: e.target.value })}
                    placeholder="BEL-1234"
                    className="w-full bg-background border border-[#353535] rounded px-3 py-2 text-white focus:outline-none focus:border-secondary"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] uppercase tracking-wider text-secondary font-bold mb-1">
                  Motif interne privé (Obligatoire - CA uniquement) *
                </label>
                <textarea
                  required
                  rows={2}
                  value={formData.internal_reason}
                  onChange={(e) => setFormData({ ...formData, internal_reason: e.target.value })}
                  placeholder="Ex: Bagarre en tribune, non-respect récurrent du ROI, impayés buvette..."
                  className="w-full bg-background border border-secondary/40 rounded px-3 py-2 text-white focus:outline-none focus:border-secondary text-xs"
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase tracking-wider text-foreground/50 mb-1">
                  Message de refus affiché à la personne
                </label>
                <textarea
                  rows={2}
                  value={formData.rejection_message}
                  onChange={(e) => setFormData({ ...formData, rejection_message: e.target.value })}
                  className="w-full bg-background border border-[#353535] rounded px-3 py-2 text-foreground/80 focus:outline-none focus:border-secondary text-xs"
                />
              </div>

              <div className="pt-3 border-t border-[#353535] flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 rounded bg-surface hover:bg-surface-high border border-[#353535] text-foreground/70 cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 rounded bg-secondary hover:bg-secondary/80 text-white font-anybody font-black uppercase text-xs tracking-wider transition-all sport-skew shadow-[2px_2px_0px_#000] cursor-pointer disabled:opacity-50"
                >
                  <span className="transform skew-x-8">
                    {saving ? 'Enregistrement...' : editingEntry ? 'Mettre à jour' : 'Confirmer le blocage'}
                  </span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modale de Détails Complète */}
      {detailEntry && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md premium-card p-6 rounded-lg border border-[#353535] shadow-2xl relative space-y-4 font-mono text-xs">
            <div className="flex items-center justify-between border-b border-[#353535] pb-3">
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-secondary" />
                <h3 className="font-anybody font-black text-lg uppercase tracking-tight sport-skew text-white">
                  Détails du Blocage
                </h3>
              </div>
              <button
                onClick={() => setDetailEntry(null)}
                className="p-1 rounded hover:bg-surface text-foreground/50 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <span className="text-[10px] text-foreground/45 uppercase block">Identité ciblée</span>
                <div className="text-white font-bold text-sm">
                  {detailEntry.first_name || detailEntry.last_name ? (
                    `${detailEntry.first_name || ''} ${detailEntry.last_name || ''}`.trim()
                  ) : (
                    'Nom non renseigné'
                  )}
                </div>
                <div className="text-foreground/70">{detailEntry.email || 'Email non renseigné'}</div>
                <div className="text-foreground/70">Licence : {detailEntry.license_number || 'Non renseignée'}</div>
              </div>

              <div>
                <span className="text-[10px] text-secondary uppercase font-bold block">
                  Motif interne confidentiel (CA)
                </span>
                <div className="p-3 rounded bg-secondary/15 border border-secondary/30 text-secondary text-xs mt-1 leading-relaxed">
                  {detailEntry.internal_reason}
                </div>
              </div>

              <div>
                <span className="text-[10px] text-foreground/45 uppercase block">
                  Message officiel de refus
                </span>
                <div className="p-3 rounded bg-surface border border-[#353535] text-foreground/80 text-xs mt-1 leading-relaxed">
                  {detailEntry.rejection_message}
                </div>
              </div>

              <div className="text-[10px] text-foreground/40 pt-2 border-t border-[#353535]">
                Inscrit le {new Date(detailEntry.created_at).toLocaleString('fr-BE')}
                {detailEntry.blocked_by_member && (
                  <span> par {detailEntry.blocked_by_member.first_name} {detailEntry.blocked_by_member.last_name}</span>
                )}
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setDetailEntry(null)}
                className="px-4 py-2 rounded bg-surface hover:bg-surface-high border border-[#353535] text-white text-xs cursor-pointer"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modale de Confirmation Réhabilitation */}
      {rehabEntry && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-sm premium-card p-6 rounded-lg border border-success/40 shadow-2xl relative space-y-4 text-center font-mono text-xs">
            <div className="w-12 h-12 rounded-full bg-success/20 border border-success/40 flex items-center justify-center text-success mx-auto">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-anybody font-black text-lg uppercase tracking-tight sport-skew text-white">
                Réhabiliter cette personne ?
              </h3>
              <p className="text-foreground/70 text-[11px] mt-1">
                La suppression de la liste noire permettra à nouveau à cette personne de créer un compte et d'accéder au club.
              </p>
            </div>

            <div className="p-2.5 rounded bg-surface border border-[#353535] text-white font-bold">
              {rehabEntry.first_name || rehabEntry.last_name ? (
                `${rehabEntry.first_name || ''} ${rehabEntry.last_name || ''}`.trim()
              ) : (
                rehabEntry.email
              )}
            </div>

            <div className="flex items-center justify-center gap-2 pt-2">
              <button
                onClick={() => setRehabEntry(null)}
                className="px-4 py-2 rounded bg-surface hover:bg-surface-high border border-[#353535] text-foreground/70 cursor-pointer"
              >
                Annuler
              </button>
              <button
                onClick={handleRehabilitate}
                disabled={rehabilitating}
                className="px-5 py-2 rounded bg-success hover:bg-success/80 text-black font-anybody font-black uppercase text-xs tracking-wider transition-all sport-skew shadow-[2px_2px_0px_#000] cursor-pointer disabled:opacity-50"
              >
                <span className="transform skew-x-8">
                  {rehabilitating ? 'Réhabilitation...' : 'Confirmer la réhabilitation'}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
