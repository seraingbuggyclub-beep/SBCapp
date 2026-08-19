'use client';

import React from 'react';
import { GeneralAssemblyItem } from '@/types/models';
import { CLUB_CONFIG } from '@/config/club';
import {
  X,
  Printer,
  FileText,
  Building2,
  Award,
  CheckCircle2,
  XCircle,
  Clock,
  MapPin,
  Calendar,
} from 'lucide-react';

interface AsblAgPvPrintModalProps {
  ag: GeneralAssemblyItem | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function AsblAgPvPrintModal({
  ag,
  isOpen,
  onClose,
}: AsblAgPvPrintModalProps) {
  if (!isOpen || !ag) return null;

  const handlePrint = () => {
    window.print();
  };

  const formattedDate = new Date(ag.date).toLocaleDateString('fr-BE', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const formattedTime = new Date(ag.date).toLocaleTimeString('fr-BE', {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in print:p-0 print:bg-white font-mono">
      <div className="absolute inset-0 print:hidden" onClick={onClose} />

      <div className="relative z-10 w-full max-w-4xl bg-white text-black border border-zinc-300 rounded-2xl shadow-[0_0_50px_rgba(0,0,0,0.9)] overflow-hidden flex flex-col max-h-[92vh] print:max-h-none print:border-none print:shadow-none print:rounded-none">
        {/* Header non imprimé */}
        <div className="p-4 border-b border-zinc-200 flex items-center justify-between bg-zinc-50 print:hidden">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-zinc-700" />
            <h2 className="font-bold text-sm uppercase tracking-wide text-zinc-900 font-sans">
              Procès-Verbal Officiel de l'Assemblée Générale
            </h2>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-4 py-1.5 rounded-lg bg-zinc-900 text-white text-xs font-bold flex items-center gap-1.5 hover:bg-zinc-800 transition-colors cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Imprimer / Exporter PDF</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-zinc-200 text-zinc-500 hover:text-black transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Corps Imprimable du Procès-Verbal */}
        <div className="p-8 md:p-10 overflow-y-auto space-y-6 font-sans text-xs text-zinc-800 flex-1 print:p-0">
          {/* En-tête Officiel ASBL */}
          <div className="border-b-2 border-black pb-4 flex justify-between items-start">
            <div>
              <h1 className="text-2xl font-black uppercase tracking-tight text-black">
                {CLUB_CONFIG.name}
              </h1>
              <p className="text-xs font-bold text-zinc-600 uppercase tracking-widest mt-0.5">
                {CLUB_CONFIG.legalForm} • Fondée en {CLUB_CONFIG.foundationYear}
              </p>
              <p className="text-[11px] text-zinc-600 font-mono mt-1">
                Numéro d'Entreprise BCE : <strong>{CLUB_CONFIG.bce}</strong> • {CLUB_CONFIG.rpm}
              </p>
              <p className="text-[11px] text-zinc-600 font-mono">
                Siège Social : {CLUB_CONFIG.address.full}
              </p>
              <p className="text-[11px] text-zinc-500 font-mono">
                Contact Légal : {CLUB_CONFIG.contact.phone} • {CLUB_CONFIG.contact.email}
              </p>
            </div>

            <div className="text-right border-l-2 border-zinc-200 pl-4">
              <span className="inline-block px-3 py-1 bg-black text-white font-bold text-xs uppercase tracking-wider rounded">
                PV D'ASSEMBLÉE GÉNÉRALE
              </span>
              <p className="text-xs font-bold text-zinc-800 uppercase mt-2 font-mono">
                Type : {ag.type === 'ORDINAIRE' ? 'AG Ordinaire Annuelle' : 'AG Extraordinaire'}
              </p>
              <p className="text-[11px] text-zinc-500 font-mono">
                Statut : {ag.status}
              </p>
            </div>
          </div>

          {/* Titre & Modalités de la Réunion */}
          <div className="bg-zinc-50 p-4 rounded-lg border border-zinc-200 space-y-2">
            <h2 className="text-base font-black uppercase text-black">
              {ag.title}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs pt-1 font-mono text-zinc-700">
              <div className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                <span><strong>Date :</strong> {formattedDate}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                <span><strong>Heure :</strong> {formattedTime}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                <span><strong>Lieu :</strong> {ag.location}</span>
              </div>
            </div>
          </div>

          {/* Ordre du Jour */}
          <div className="space-y-2">
            <h3 className="font-black text-sm uppercase tracking-wider text-black border-b border-zinc-200 pb-1">
              1. Ordre du Jour (ODJ)
            </h3>
            {Array.isArray(ag.agenda) && ag.agenda.length > 0 ? (
              <ol className="list-decimal list-inside space-y-1 text-xs text-zinc-800 font-sans pl-1">
                {ag.agenda.map((point, idx) => (
                  <li key={idx} className="leading-relaxed">
                    <span className="font-medium">{point}</span>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="text-xs text-zinc-400 italic">Aucun ordre du jour renseigné.</p>
            )}
          </div>

          {/* Délibérations & Débats */}
          <div className="space-y-2">
            <h3 className="font-black text-sm uppercase tracking-wider text-black border-b border-zinc-200 pb-1">
              2. Déroulement de la Séance & Débats
            </h3>
            <div className="text-xs text-zinc-800 leading-relaxed font-sans whitespace-pre-line p-3 bg-zinc-50 rounded border border-zinc-200">
              {ag.content_notes || 'Les débats se sont tenus valablement selon les statuts de l\'association.'}
            </div>
          </div>

          {/* Résolutions et Votes */}
          <div className="space-y-3">
            <h3 className="font-black text-sm uppercase tracking-wider text-black border-b border-zinc-200 pb-1">
              3. Résolutions & Résultats des Votes
            </h3>
            {ag.resolutions && ag.resolutions.length > 0 ? (
              <div className="border border-zinc-200 rounded-lg overflow-hidden">
                <table className="w-full text-left text-xs border-collapse font-sans">
                  <thead>
                    <tr className="bg-zinc-100 border-b border-zinc-200 font-bold text-zinc-700">
                      <th className="p-2.5">Résolution soumise au vote</th>
                      <th className="p-2.5 text-center font-mono w-16">Pour</th>
                      <th className="p-2.5 text-center font-mono w-16">Contre</th>
                      <th className="p-2.5 text-center font-mono w-16">Abst.</th>
                      <th className="p-2.5 text-right w-24">Résultat</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-200">
                    {ag.resolutions.map((res, idx) => (
                      <tr key={res.id || idx}>
                        <td className="p-2.5">
                          <div className="font-bold text-zinc-900">
                            Résolution n°{idx + 1} : {res.title}
                          </div>
                          {res.description && (
                            <p className="text-[11px] text-zinc-500 mt-0.5">{res.description}</p>
                          )}
                        </td>
                        <td className="p-2.5 text-center font-mono font-bold text-emerald-700">{res.votes_for}</td>
                        <td className="p-2.5 text-center font-mono font-bold text-rose-700">{res.votes_against}</td>
                        <td className="p-2.5 text-center font-mono text-zinc-500">{res.votes_abstain}</td>
                        <td className="p-2.5 text-right font-bold font-mono">
                          {res.is_adopted ? (
                            <span className="text-emerald-700 uppercase text-[11px]">Adoptée ✓</span>
                          ) : (
                            <span className="text-rose-700 uppercase text-[11px]">Rejetée ✗</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-xs text-zinc-400 italic">Aucune résolution enregistrée.</p>
            )}
          </div>

          {/* Signatures officielles et Horodatage */}
          <div className="space-y-3 pt-2 page-break-inside-avoid">
            <h3 className="font-black text-sm uppercase tracking-wider text-black border-b border-zinc-200 pb-1">
              4. Signatures Électroniques & Horodatage du PV
            </h3>
            {ag.signatures && ag.signatures.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {ag.signatures.map((sig) => (
                  <div key={sig.id} className="p-3 rounded border border-zinc-300 bg-zinc-50 space-y-1.5 font-sans">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-black">{sig.signer_name}</span>
                      <span className="text-[9px] font-mono px-1.5 py-0.2 bg-zinc-200 text-zinc-700 rounded font-bold uppercase">
                        {sig.signer_role}
                      </span>
                    </div>

                    <div className="h-14 bg-white border border-zinc-200 rounded p-1 flex items-center justify-center overflow-hidden">
                      {sig.signature_data ? (
                        <img
                          src={sig.signature_data}
                          alt={`Signature de ${sig.signer_name}`}
                          className="max-h-full max-w-full object-contain"
                        />
                      ) : (
                        <span className="text-[10px] text-zinc-400 italic">Signature numérique</span>
                      )}
                    </div>

                    <p className="text-[9px] font-mono text-zinc-500">
                      Signé le {new Date(sig.signed_at).toLocaleDateString('fr-BE')} à {new Date(sig.signed_at).toLocaleTimeString('fr-BE', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-4 border-2 border-dashed border-zinc-300 rounded text-center text-xs text-zinc-400">
                Aucune signature numérique apposée à ce jour.
              </div>
            )}
          </div>

          {/* Mentions Légales Pied de Page CSA */}
          <div className="pt-6 border-t border-zinc-200 text-[10px] font-mono text-zinc-500 text-center space-y-1">
            <p className="font-bold text-zinc-700 uppercase">
              Procès-Verbal conforme au Code des Sociétés et des Associations (Belgique) • {CLUB_CONFIG.name}
            </p>
            <p>
              BCE : {CLUB_CONFIG.bce} ({CLUB_CONFIG.rpm}) • Siège social : {CLUB_CONFIG.address.full} • Tél : {CLUB_CONFIG.contact.phone}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
