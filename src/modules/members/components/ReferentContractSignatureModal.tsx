'use client';

import React, { useState } from 'react';
import {
  FileSignature,
  ShieldCheck,
  AlertTriangle,
  Lock,
  CheckCircle2,
  KeyRound,
  FileText,
  Award,
} from 'lucide-react';
import { MemberProfile, CURRENT_REFERENT_CONTRACT_VERSION, getErrorMessage } from '@/types/models';
import { signReferentContract } from '@/modules/admin/contract-actions';

interface ReferentContractSignatureModalProps {
  member: MemberProfile | null;
  isOpen: boolean;
  onSigned: () => void;
}

export default function ReferentContractSignatureModal({
  member,
  isOpen,
  onSigned,
}: ReferentContractSignatureModalProps) {
  const [hasScrolledBottom, setHasScrolledBottom] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [signing, setSigning] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen || !member || member.role !== 'referent' || member.referent_contract_signed_at) {
    return null;
  }

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    if (scrollTop + clientHeight >= scrollHeight - 30) {
      setHasScrolledBottom(true);
    }
  };

  const handleSignContract = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!agreed) return;

    setSigning(true);
    setErrorMsg(null);

    try {
      // Récupération de l'IP du client si disponible via WebRTC / header API
      const res = await signReferentContract(member.id);

      if (!res.success || res.error) {
        setErrorMsg(res.error || 'Erreur lors de la signature numérique.');
      } else {
        onSigned();
      }
    } catch (err: unknown) {
      setErrorMsg(getErrorMessage(err));
    } finally {
      setSigning(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-fade-in">
      <div className="w-full max-w-2xl max-h-[92vh] flex flex-col premium-card p-6 md:p-8 rounded-2xl border-2 border-cyan-500/50 relative shadow-[0_0_60px_rgba(6,182,212,0.25)] space-y-4">
        {/* En-tête officiel */}
        <div className="border-b border-[#353535] pb-4 shrink-0">
          <div className="flex items-center gap-2.5 text-cyan-400">
            <ShieldCheck className="w-6 h-6 shrink-0" />
            <div>
              <h2 className="font-anybody font-black text-xl uppercase tracking-tight sport-skew text-white">
                Convention d'Engagement Référent SBC
              </h2>
              <p className="text-[11px] font-mono text-cyan-400 font-bold uppercase tracking-wider">
                Seraing Buggy Club ASBL • Version {CURRENT_REFERENT_CONTRACT_VERSION}
              </p>
            </div>
          </div>
        </div>

        {/* Alerte bloquante */}
        <div className="p-3.5 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-200 text-xs font-mono shrink-0 flex items-start gap-2.5">
          <AlertTriangle className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
          <div>
            <p className="font-bold text-white">
              Désignation au statut officiel de Référent de Circuit
            </p>
            <p className="text-[11px] text-cyan-300/80 leading-relaxed mt-0.5">
              Félicitations <strong>{member.first_name} {member.last_name}</strong>. L'Organe d'Administration vous a confié des prérogatives de référent. Veuillez lire attentivement et signer numériquement la présente convention pour activer vos accès.
            </p>
          </div>
        </div>

        {/* Corps du Contrat défilable */}
        <div
          onScroll={handleScroll}
          className="flex-1 overflow-y-auto pr-2 space-y-4 text-xs font-mono text-foreground/80 border border-[#353535] rounded-lg p-4 bg-black/50 leading-relaxed max-h-[42vh]"
        >
          <div className="space-y-1 pb-2 border-b border-[#353535]/50">
            <h4 className="font-bold text-white uppercase text-xs">
              Entre les soussignés :
            </h4>
            <p>
              1. <strong>Seraing Buggy Club ASBL</strong> (SBC), représenté par son Organe d'Administration,
            </p>
            <p>
              2. <strong>{member.first_name} {member.last_name}</strong> (Membre ID: {member.id.substring(0, 8)}...), désigné(e) ci-après "Le Référent".
            </p>
          </div>

          <div className="space-y-2">
            <h4 className="font-bold text-cyan-400 uppercase text-xs">
              Article 1 — Objet de la mission & Délégation
            </h4>
            <p>
              Le Référent est mandaté par l'ASBL pour assurer l'accueil, l'ouverture et la fermeture des pistes qui lui sont attribuées, la vérification du check-in réglementaire des pilotes présents et le respect des normes de sécurité FBA.
            </p>
          </div>

          <div className="space-y-2">
            <h4 className="font-bold text-cyan-400 uppercase text-xs">
              Article 2 — Clés, Cadenas & Matériels confiés
            </h4>
            <p>
              Les clés, télécommandes, codes d'accès cadenas et équipements du club remis au Référent restent la propriété exclusive du Seraing Buggy Club. Le Référent s'engage formellement à :
            </p>
            <ul className="list-disc pl-5 space-y-1 text-foreground/70">
              <li>Ne procéder à aucun double ni reproduction de clé sous peine de poursuites.</li>
              <li>Ne prêter, céder ou transmettre les clés ou codes à aucun tiers, même membre du club.</li>
              <li>Conserver le matériel en lieu sûr et signaler immédiatement toute perte ou détérioration.</li>
              <li>Restituer l'ensemble des clés et badges sur simple demande de l'Organe d'Administration.</li>
            </ul>
          </div>

          <div className="space-y-2">
            <h4 className="font-bold text-cyan-400 uppercase text-xs">
              Article 3 — Procédure de Fermeture & Sécurité du Site
            </h4>
            <p>
              Le Référent présent qui quitte le site est tenu de s'assurer de la mise hors tension des installations électriques (stands, compresseur, buvette), de la fermeture des conteneurs et du verrouillage strict du cadenas d'entrée principale.
            </p>
          </div>

          <div className="space-y-2">
            <h4 className="font-bold text-cyan-400 uppercase text-xs">
              Article 4 — Exemplarité, Discrétion & Fair-Play
            </h4>
            <p>
              En tant que représentant de l'image de l'ASBL, le Référent fait preuve d'une conduite irréprochable, veille à l'application courtoise mais stricte du ROI, de la Charte de bonne conduite et de l'interdiction de rouler sans check-in d'assurance.
            </p>
          </div>

          <div className="space-y-2">
            <h4 className="font-bold text-cyan-400 uppercase text-xs">
              Article 5 — Signature électronique & Validité
            </h4>
            <p>
              La validation électronique du présent formulaire constitue une signature numérique certifiée (horodatée avec identifiant unique et adresse IP), ayant valeur d'engagement juridique formel conformément aux statuts du club.
            </p>
          </div>
        </div>

        {/* Message d'erreur */}
        {errorMsg && (
          <div className="p-3 rounded bg-secondary/15 border border-secondary/30 text-secondary text-xs font-mono flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Formulaire de signature & Consentement */}
        <form onSubmit={handleSignContract} className="space-y-4 shrink-0 pt-2 border-t border-[#353535]">
          <label className="flex items-start gap-3 p-3 rounded-lg border border-cyan-500/30 bg-cyan-500/5 hover:bg-cyan-500/10 transition-colors cursor-pointer select-none">
            <input
              type="checkbox"
              required
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
              className="mt-0.5 rounded border-[#353535] text-cyan-500 focus:ring-cyan-500 h-4 w-4 shrink-0"
            />
            <span className="text-xs font-mono text-white leading-relaxed">
              Je déclare avoir lu, compris et accepté sans réserve les termes de la <strong>Convention d'Engagement Référent</strong>, du <strong>Règlement d'Ordre Intérieur (ROI)</strong> et de la <strong>Charte de bonne conduite</strong> du Seraing Buggy Club ASBL. *
            </span>
          </label>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <span className="text-[10px] font-mono text-foreground/40">
              Certifié pour : {member.email}
            </span>

            <button
              type="submit"
              disabled={!agreed || signing}
              className="w-full sm:w-auto px-6 py-3 rounded bg-cyan-500 hover:bg-cyan-400 text-black font-anybody font-black uppercase text-xs tracking-wider transition-all sport-skew shadow-[0_0_20px_rgba(6,182,212,0.4)] cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <FileSignature className="w-4 h-4" />
              <span className="transform skew-x-8">
                {signing ? 'Signature en cours...' : '✍️ Signer numériquement et valider'}
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
