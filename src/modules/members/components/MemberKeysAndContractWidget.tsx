'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  KeyRound,
  FileSignature,
  ShieldCheck,
  CheckCircle2,
  Calendar,
  Tag,
  BookOpen,
  Award,
  FileText,
  Clock,
  ExternalLink,
  ChevronRight,
  X,
  AlertTriangle,
} from 'lucide-react';
import { MemberProfile, MemberAssignedKey, CURRENT_REFERENT_CONTRACT_VERSION, getErrorMessage } from '@/types/models';
import { getMyAssignedKeys } from '@/modules/admin/keys-actions';

interface MemberKeysAndContractWidgetProps {
  member: MemberProfile | null;
  onOpenDocModal?: (doc: 'roi' | 'charte') => void;
}

export default function MemberKeysAndContractWidget({
  member,
  onOpenDocModal,
}: MemberKeysAndContractWidgetProps) {
  const [keys, setKeys] = useState<MemberAssignedKey[]>([]);
  const [loading, setLoading] = useState(false);
  const [showContractModal, setShowContractModal] = useState(false);

  const isReferent = member?.role === 'referent';
  const isSigned = Boolean(member?.referent_contract_signed_at);

  const loadKeys = useCallback(async () => {
    if (!member) return;
    setLoading(true);
    try {
      const { data } = await getMyAssignedKeys();
      setKeys(data || []);
    } catch (err: unknown) {
      console.error('Erreur chargement clés:', getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [member]);

  useEffect(() => {
    loadKeys();
  }, [loadKeys]);

  if (!member) return null;

  const activeKeys = keys.filter((k) => !k.returned_at);
  const returnedKeys = keys.filter((k) => Boolean(k.returned_at));

  return (
    <div className="premium-card p-6 md:p-7 rounded-2xl border border-[#353535] space-y-6">
      {/* En-tête de section */}
      <div className="flex items-center justify-between border-b border-[#353535] pb-4">
        <div className="flex items-center gap-2.5">
          <KeyRound className="w-5 h-5 text-primary" />
          <h3 className="font-anybody font-black text-lg uppercase tracking-tight sport-skew text-white">
            Mes Clés, Matériel & Engagements Officiels
          </h3>
        </div>
        <span className="text-[10px] font-mono text-foreground/45 uppercase tracking-wider hidden sm:inline">
          Inventaire & Responsabilités
        </span>
      </div>

      {/* 1. Statut de Convention Référent (si profil référent) */}
      {isReferent && (
        <div className="p-4 rounded-xl border bg-cyan-500/5 border-cyan-500/30 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-cyan-400">
              <FileSignature className="w-5 h-5 shrink-0" />
              <div>
                <span className="font-bold text-white text-xs uppercase tracking-wider">
                  Convention d'Engagement Référent ({member.referent_contract_version || CURRENT_REFERENT_CONTRACT_VERSION})
                </span>
                <p className="text-[10px] text-cyan-300/80 font-mono">
                  Seraing Buggy Club ASBL • Mandat Officiel de Surveillance
                </p>
              </div>
            </div>

            {isSigned ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-success/15 border border-success/30 text-success self-start sm:self-auto">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Certifiée & Signée</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-yellow-500/15 border border-yellow-500/30 text-yellow-400 self-start sm:self-auto">
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>Signature requise</span>
              </span>
            )}
          </div>

          {isSigned && (
            <div className="pt-2 border-t border-cyan-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px] font-mono text-foreground/70">
              <div>
                <span>Horodatage numérique : </span>
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
                    (Visa IP: {member.referent_contract_ip})
                  </span>
                )}
              </div>

              <button
                type="button"
                onClick={() => setShowContractModal(true)}
                className="text-cyan-400 hover:text-cyan-300 font-bold flex items-center gap-1 text-[11px] cursor-pointer transition-colors"
              >
                <span>Consulter la convention</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      )}

      {/* 2. Liste des Clés & Matériels confiés au membre */}
      <div className="space-y-3 font-mono text-xs">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold uppercase tracking-wider text-foreground/70 flex items-center gap-1.5">
            <KeyRound className="w-3.5 h-3.5 text-primary" />
            <span>Matériels & Clés sous ma responsabilité</span>
          </span>
          <span className="text-[10px] px-2 py-0.5 rounded bg-surface border border-[#353535] text-foreground/60">
            {activeKeys.length} actif{activeKeys.length > 1 ? 's' : ''}
          </span>
        </div>

        {loading ? (
          <div className="py-4 text-center text-foreground/40 text-xs">
            Vérification de l'inventaire...
          </div>
        ) : keys.length === 0 ? (
          <div className="p-4 rounded-xl border border-dashed border-[#353535] text-center text-foreground/40 text-xs">
            Aucun matériel spécifique ni clé club confié actuellement à votre nom.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {keys.map((k) => {
              const isReturned = Boolean(k.returned_at);

              return (
                <div
                  key={k.id}
                  className={`p-3.5 rounded-xl border transition-all ${
                    isReturned
                      ? 'bg-surface/30 border-[#353535] opacity-60'
                      : 'bg-surface border-primary/30 shadow-[0_0_15px_rgba(255,102,0,0.05)]'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-1.5">
                    <div className="font-bold text-white flex items-center gap-1.5">
                      <KeyRound className={`w-3.5 h-3.5 ${isReturned ? 'text-foreground/40' : 'text-primary'}`} />
                      <span>{k.item_name}</span>
                    </div>

                    {isReturned ? (
                      <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded bg-surface border border-[#353535] text-foreground/50">
                        Restitué
                      </span>
                    ) : (
                      <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded bg-success/15 border border-success/30 text-success">
                        En main
                      </span>
                    )}
                  </div>

                  <div className="space-y-1 text-[10px] text-foreground/60">
                    {k.item_code && (
                      <div className="flex items-center gap-1">
                        <Tag className="w-3 h-3 text-cyan-400" />
                        <span>Référence : <strong className="text-white font-mono">{k.item_code}</strong></span>
                      </div>
                    )}
                    <div className="flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-foreground/40" />
                      <span>
                        Remis le {new Date(k.given_at).toLocaleDateString('fr-BE')}
                        {k.returned_at && ` • Restitué le ${new Date(k.returned_at).toLocaleDateString('fr-BE')}`}
                      </span>
                    </div>
                    {k.notes && (
                      <p className="text-[10px] text-foreground/50 italic pt-0.5 border-t border-[#353535]/40 mt-1">
                        {k.notes}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 3. Accès Rapide aux Documents Officiels */}
      <div className="pt-2 border-t border-[#353535]/60 flex flex-col sm:flex-row items-center justify-between gap-3">
        <span className="text-[11px] font-mono text-foreground/50">
          Règlements statutaires du Seraing Buggy Club ASBL
        </span>

        <div className="flex items-center gap-2">
          {onOpenDocModal && (
            <>
              <button
                type="button"
                onClick={() => onOpenDocModal('roi')}
                className="px-3 py-1.5 rounded-lg bg-surface hover:bg-surface-high border border-[#353535] hover:border-primary text-[11px] font-mono text-foreground/80 hover:text-white flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <FileText className="w-3.5 h-3.5 text-primary" />
                <span>Consulter ROI</span>
              </button>

              <button
                type="button"
                onClick={() => onOpenDocModal('charte')}
                className="px-3 py-1.5 rounded-lg bg-surface hover:bg-surface-high border border-[#353535] hover:border-primary text-[11px] font-mono text-foreground/80 hover:text-white flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Award className="w-3.5 h-3.5 text-primary" />
                <span>Charte Club</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Modale de Consultation de la Convention Signée */}
      {showContractModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-2xl max-h-[85vh] overflow-y-auto premium-card p-6 md:p-8 rounded-2xl border border-cyan-500/40 relative shadow-2xl space-y-4 font-mono text-xs">
            <button
              onClick={() => setShowContractModal(false)}
              className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-surface border border-transparent hover:border-[#353535] text-foreground/50 hover:text-white transition-all cursor-pointer"
              title="Fermer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="border-b border-[#353535] pb-3">
              <div className="flex items-center gap-2 text-cyan-400 mb-1">
                <ShieldCheck className="w-5 h-5" />
                <span className="font-bold text-xs uppercase tracking-wider">Certificat d'Engagement Officiel</span>
              </div>
              <h3 className="font-anybody font-black text-xl uppercase tracking-tight sport-skew text-white">
                Convention d'Engagement Référent SBC
              </h3>
              <p className="text-[10px] text-cyan-400 mt-0.5">
                Version {member.referent_contract_version || CURRENT_REFERENT_CONTRACT_VERSION} • Seraing Buggy Club ASBL
              </p>
            </div>

            <div className="p-3 rounded bg-cyan-500/10 border border-cyan-500/30 text-[11px] text-cyan-200 space-y-1">
              <div className="flex items-center justify-between">
                <span>Signataire : <strong>{member.first_name} {member.last_name}</strong></span>
                <span className="text-success font-bold">✓ Validée</span>
              </div>
              <div>
                Horodatage : {new Date(member.referent_contract_signed_at!).toLocaleString('fr-BE')}
              </div>
              {member.referent_contract_ip && (
                <div>Empreinte Session / IP : {member.referent_contract_ip}</div>
              )}
            </div>

            <div className="space-y-3 leading-relaxed text-[11px] text-foreground/80 pt-2 border-t border-[#353535]/50">
              <p><strong>Article 1 - Mission Référent :</strong> Surveillance, ouverture et fermeture des installations, encadrement bienveillant des séances de roulage et contrôle de check-in obligatoire.</p>
              <p><strong>Article 2 - Matériel & Clés :</strong> Les clés et matériels confiés sont strictement personnels, incessibles et ne peuvent faire l'objet d'aucun double.</p>
              <p><strong>Article 3 - Fermeture :</strong> Extinction obligatoire de l'éclairage/courant et reverrouillage du cadenas de l'entrée principale en quittant le complexe.</p>
              <p><strong>Article 4 - Exemplarité & Discrétion :</strong> Respect scrupuleux des statuts de l'ASBL, du ROI et de la Charte de bonne conduite.</p>
            </div>

            <div className="pt-3 border-t border-[#353535] flex justify-end">
              <button
                type="button"
                onClick={() => setShowContractModal(false)}
                className="premium-btn text-xs px-6 py-2"
              >
                <span className="transform skew-x-8">Fermer</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
