'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  KeyRound,
  Plus,
  CheckCircle2,
  Clock,
  RotateCcw,
  Trash2,
  AlertTriangle,
  FileSignature,
  ShieldCheck,
  Calendar,
  Tag,
  FileText,
  UserCheck,
  X,
} from 'lucide-react';
import { MemberProfile, MemberAssignedKey, getErrorMessage } from '@/types/models';
import {
  getMemberAssignedKeys,
  assignKeyToMember,
  markKeyAsReturned,
  deleteKeyAssignment,
} from '../keys-actions';
import { resetReferentContract } from '../contract-actions';

interface MemberKeysManagerProps {
  member: MemberProfile;
  canEdit: boolean;
  onRefreshParent?: () => void;
}

export default function MemberKeysManager({
  member,
  canEdit,
  onRefreshParent,
}: MemberKeysManagerProps) {
  const [keys, setKeys] = useState<MemberAssignedKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Formulaire d'ajout rapide
  const [showAddForm, setShowAddForm] = useState(false);
  const [itemName, setItemName] = useState('');
  const [itemCode, setItemCode] = useState('');
  const [givenAt, setGivenAt] = useState(() => new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Statut de contrat référent
  const isReferent = member.role === 'referent';
  const isContractSigned = Boolean(member.referent_contract_signed_at);

  const fetchKeys = useCallback(async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const { data, error } = await getMemberAssignedKeys(member.id);
      if (error) {
        setErrorMsg(error);
      } else {
        setKeys(data || []);
      }
    } catch (err: unknown) {
      setErrorMsg(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [member.id]);

  useEffect(() => {
    fetchKeys();
  }, [fetchKeys]);

  const handleAddKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemName.trim()) return;

    setSubmitting(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const res = await assignKeyToMember({
        member_id: member.id,
        item_name: itemName.trim(),
        item_code: itemCode.trim() || null,
        given_at: givenAt,
        notes: notes.trim() || null,
      });

      if (!res.success || res.error) {
        setErrorMsg(res.error || "Impossible d'attribuer ce matériel.");
      } else {
        setSuccessMsg(`Matériel "${itemName}" attribué avec succès.`);
        setItemName('');
        setItemCode('');
        setNotes('');
        setShowAddForm(false);
        await fetchKeys();
        if (onRefreshParent) onRefreshParent();
      }
    } catch (err: unknown) {
      setErrorMsg(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  const handleMarkReturned = async (keyId: string, keyName: string) => {
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      const res = await markKeyAsReturned(keyId);
      if (!res.success || res.error) {
        setErrorMsg(res.error || 'Erreur lors de la restitution.');
      } else {
        setSuccessMsg(`"${keyName}" a été marqué comme restitué.`);
        await fetchKeys();
        if (onRefreshParent) onRefreshParent();
      }
    } catch (err: unknown) {
      setErrorMsg(getErrorMessage(err));
    }
  };

  const handleDelete = async (keyId: string, keyName: string) => {
    if (!confirm(`Supprimer définitivement l'entrée pour "${keyName}" ?`)) return;

    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      const res = await deleteKeyAssignment(keyId);
      if (!res.success || res.error) {
        setErrorMsg(res.error || 'Erreur lors de la suppression.');
      } else {
        setSuccessMsg(`Entrée supprimée.`);
        await fetchKeys();
        if (onRefreshParent) onRefreshParent();
      }
    } catch (err: unknown) {
      setErrorMsg(getErrorMessage(err));
    }
  };

  const handleResetContract = async () => {
    if (!confirm(`Réinitialiser la convention de ${member.first_name} ${member.last_name} ? Une nouvelle signature sera requise.`)) return;

    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      const res = await resetReferentContract(member.id);
      if (!res.success || res.error) {
        setErrorMsg(res.error || 'Erreur lors de la réinitialisation.');
      } else {
        setSuccessMsg('Convention réinitialisée avec succès.');
        if (onRefreshParent) onRefreshParent();
      }
    } catch (err: unknown) {
      setErrorMsg(getErrorMessage(err));
    }
  };

  const activeKeysCount = keys.filter((k) => !k.returned_at).length;

  return (
    <div className="space-y-4 font-mono text-xs">
      {/* 1. Statut de la Convention Référent (si rôle référent) */}
      {isReferent && (
        <div className="p-3.5 rounded-lg border bg-surface/50 border-[#353535] space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileSignature className="w-4 h-4 text-cyan-400" />
              <span className="font-bold text-white text-xs uppercase tracking-wider">
                Convention Référent SBC
              </span>
            </div>

            {isContractSigned ? (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-success/15 border border-success/30 text-success">
                <ShieldCheck className="w-3 h-3" />
                <span>Signée numériquement</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-yellow-500/15 border border-yellow-500/30 text-yellow-400 animate-pulse">
                <AlertTriangle className="w-3 h-3" />
                <span>En attente de signature</span>
              </span>
            )}
          </div>

          {isContractSigned ? (
            <div className="flex items-center justify-between pt-1 border-t border-[#353535]/50 text-[10px] text-foreground/60">
              <div>
                <span>Horodatage : </span>
                <strong className="text-white">
                  {new Date(member.referent_contract_signed_at!).toLocaleString('fr-BE', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </strong>
                {member.referent_contract_ip && (
                  <span className="ml-2 text-foreground/40 font-mono">
                    (IP: {member.referent_contract_ip})
                  </span>
                )}
              </div>

              {canEdit && (
                <button
                  type="button"
                  onClick={handleResetContract}
                  className="text-foreground/40 hover:text-secondary underline transition-colors cursor-pointer text-[10px]"
                  title="Forcer une nouvelle signature"
                >
                  Demander resignature
                </button>
              )}
            </div>
          ) : (
            <p className="text-[10px] text-foreground/50">
              Le pilote verra une invitation bloquante à signer numériquement la convention d'engagement dès sa prochaine connexion.
            </p>
          )}
        </div>
      )}

      {/* 2. En-tête de la section Matériel & Clés */}
      <div className="flex items-center justify-between pt-1">
        <div className="flex items-center gap-2">
          <KeyRound className="w-4 h-4 text-primary" />
          <span className="font-bold text-white uppercase tracking-wider text-xs">
            Matériel & Clés confiés
          </span>
          <span className="text-[10px] px-1.5 py-0.2 rounded bg-primary/10 border border-primary/20 text-primary font-bold">
            {activeKeysCount} en possession
          </span>
        </div>

        {canEdit && !showAddForm && (
          <button
            type="button"
            onClick={() => setShowAddForm(true)}
            className="px-2.5 py-1 rounded bg-primary/10 hover:bg-primary/20 border border-primary/30 text-primary text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 transition-all cursor-pointer"
          >
            <Plus className="w-3 h-3" />
            <span>+ Confier un matériel</span>
          </button>
        )}
      </div>

      {/* Messages d'alerte / succès */}
      {errorMsg && (
        <div className="p-2.5 rounded bg-secondary/15 border border-secondary/30 text-secondary text-[11px] flex items-center gap-2">
          <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {successMsg && (
        <div className="p-2.5 rounded bg-success/15 border border-success/30 text-success text-[11px] flex items-center gap-2">
          <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Formulaire d'attribution rapide */}
      {showAddForm && canEdit && (
        <form
          onSubmit={handleAddKey}
          className="p-3.5 rounded-lg border border-primary/40 bg-primary/5 space-y-3 animate-fade-in"
        >
          <div className="flex items-center justify-between border-b border-primary/20 pb-2">
            <span className="font-bold text-primary text-xs uppercase tracking-wider flex items-center gap-1.5">
              <Plus className="w-3.5 h-3.5" />
              <span>Remise de matériel ou clé</span>
            </span>
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="p-1 rounded hover:bg-surface text-foreground/40 hover:text-white cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <div className="sm:col-span-2">
              <label className="block text-[9px] uppercase tracking-wider text-foreground/60 mb-0.5">
                Désignation de l'équipement *
              </label>
              <input
                type="text"
                required
                placeholder="Ex: Clé Cadenas Portail, Badge Buvette, Clé Conteneur..."
                value={itemName}
                onChange={(e) => setItemName(e.target.value)}
                className="w-full bg-background border border-[#353535] rounded px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-primary"
              />
            </div>

            <div>
              <label className="block text-[9px] uppercase tracking-wider text-foreground/60 mb-0.5">
                Numéro / Tag / Repère (Optionnel)
              </label>
              <input
                type="text"
                placeholder="Ex: N° 04, RFID-9"
                value={itemCode}
                onChange={(e) => setItemCode(e.target.value)}
                className="w-full bg-background border border-[#353535] rounded px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-primary"
              />
            </div>

            <div>
              <label className="block text-[9px] uppercase tracking-wider text-foreground/60 mb-0.5">
                Date de remise
              </label>
              <input
                type="date"
                required
                value={givenAt}
                onChange={(e) => setGivenAt(e.target.value)}
                className="w-full bg-background border border-[#353535] rounded px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-primary"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-[9px] uppercase tracking-wider text-foreground/60 mb-0.5">
                Notes ou observations
              </label>
              <input
                type="text"
                placeholder="Ex: Remis en main propre lors de la session d'ouverture"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full bg-background border border-[#353535] rounded px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-primary"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-primary/20">
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="px-3 py-1 rounded bg-surface hover:bg-surface-high border border-[#353535] text-foreground/70 cursor-pointer text-xs"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={submitting || !itemName.trim()}
              className="px-4 py-1.5 rounded bg-primary hover:bg-primary/80 text-background font-bold uppercase text-xs tracking-wider transition-all cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>{submitting ? 'Validation...' : 'Enregistrer la remise'}</span>
            </button>
          </div>
        </form>
      )}

      {/* Liste des matériels / tableau */}
      {loading ? (
        <div className="py-4 text-center text-foreground/40 text-xs">
          Chargement de l'inventaire...
        </div>
      ) : keys.length === 0 ? (
        <div className="p-4 rounded border border-dashed border-[#353535] text-center text-foreground/40 text-xs">
          Aucun matériel ni clé confié à ce membre.
        </div>
      ) : (
        <div className="overflow-x-auto rounded border border-[#353535]">
          <table className="w-full text-left text-[11px] border-collapse">
            <thead>
              <tr className="bg-surface/80 border-b border-[#353535] text-foreground/50 text-[9px] uppercase tracking-wider">
                <th className="px-3 py-2">Matériel / Clé</th>
                <th className="px-3 py-2">Remis le</th>
                <th className="px-3 py-2">Statut</th>
                <th className="px-3 py-2">Visa</th>
                {canEdit && <th className="px-3 py-2 text-right">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#353535]/50">
              {keys.map((k) => {
                const isReturned = Boolean(k.returned_at);

                return (
                  <tr
                    key={k.id}
                    className={`hover:bg-surface/40 transition-colors ${
                      isReturned ? 'opacity-60 bg-surface/10' : 'bg-surface/20'
                    }`}
                  >
                    <td className="px-3 py-2.5">
                      <div className="font-bold text-white flex items-center gap-1.5">
                        <KeyRound className="w-3 h-3 text-primary shrink-0" />
                        <span>{k.item_name}</span>
                        {k.item_code && (
                          <span className="px-1.5 py-0.2 rounded bg-[#252525] border border-[#404040] text-[9px] text-cyan-400 font-mono">
                            {k.item_code}
                          </span>
                        )}
                      </div>
                      {k.notes && (
                        <div className="text-[10px] text-foreground/40 mt-0.5 truncate max-w-[200px]" title={k.notes}>
                          {k.notes}
                        </div>
                      )}
                    </td>

                    <td className="px-3 py-2.5 text-foreground/70 whitespace-nowrap">
                      {new Date(k.given_at).toLocaleDateString('fr-BE')}
                    </td>

                    <td className="px-3 py-2.5 whitespace-nowrap">
                      {isReturned ? (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-surface border border-[#353535] text-foreground/50">
                          <RotateCcw className="w-2.5 h-2.5" />
                          <span>Restitué le {new Date(k.returned_at!).toLocaleDateString('fr-BE')}</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-success/15 border border-success/30 text-success">
                          <CheckCircle2 className="w-2.5 h-2.5" />
                          <span>En possession</span>
                        </span>
                      )}
                    </td>

                    <td className="px-3 py-2.5 text-[10px] text-foreground/50 whitespace-nowrap">
                      {k.given_by_member ? (
                        <span>
                          {k.given_by_member.first_name} {k.given_by_member.last_name[0]}.
                        </span>
                      ) : (
                        <span className="italic">Admin</span>
                      )}
                    </td>

                    {canEdit && (
                      <td className="px-3 py-2.5 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          {!isReturned && (
                            <button
                              type="button"
                              onClick={() => handleMarkReturned(k.id, k.item_name)}
                              className="px-2 py-0.5 rounded bg-surface hover:bg-surface-high border border-[#353535] hover:border-primary text-foreground/70 hover:text-white text-[10px] flex items-center gap-1 transition-all cursor-pointer"
                              title="Marquer comme restitué"
                            >
                              <RotateCcw className="w-3 h-3 text-cyan-400" />
                              <span className="hidden sm:inline">Restituer</span>
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => handleDelete(k.id, k.item_name)}
                            className="p-1 rounded hover:bg-secondary/20 text-foreground/40 hover:text-secondary transition-colors cursor-pointer"
                            title="Supprimer la ligne"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
