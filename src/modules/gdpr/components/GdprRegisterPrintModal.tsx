'use client';

import React from 'react';
import { GdprProcessingActivity } from '@/types/models';
import { X, Printer, ShieldCheck } from 'lucide-react';

interface GdprRegisterPrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  activities: GdprProcessingActivity[];
}

export default function GdprRegisterPrintModal({
  isOpen,
  onClose,
  activities,
}: GdprRegisterPrintModalProps) {
  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  const today = new Date().toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in print:p-0 print:bg-white">
      <div className="absolute inset-0 print:hidden" onClick={onClose} />

      <div className="relative z-10 w-full max-w-4xl bg-white text-black border border-zinc-300 rounded-2xl shadow-[0_0_50px_rgba(0,0,0,0.9)] overflow-hidden flex flex-col max-h-[92vh] print:max-h-none print:border-none print:shadow-none print:rounded-none">
        {/* Header non imprimé */}
        <div className="p-4 border-b border-zinc-200 flex items-center justify-between bg-zinc-50 print:hidden">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-zinc-700" />
            <h2 className="font-bold text-sm uppercase tracking-wide">
              Registre des Traitements APD (Article 30 RGPD)
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

        {/* Corps Imprimable */}
        <div className="p-8 overflow-y-auto space-y-6 font-sans text-xs flex-1 print:p-0">
          {/* Entête Officielle */}
          <div className="border-b-2 border-black pb-4 flex justify-between items-start">
            <div>
              <h1 className="text-2xl font-black uppercase tracking-tight text-black">
                Seraing Buggy Club ASBL
              </h1>
              <p className="text-zinc-600 text-xs">
                Registre des Activités de Traitement • Article 30 du RGPD
              </p>
              <p className="text-zinc-600 text-xs">
                Conformité Autorité de Protection des Données (APD Belgique)
              </p>
            </div>

            <div className="text-right">
              <span className="inline-block px-3 py-1 bg-zinc-100 border border-zinc-300 font-bold text-xs rounded">
                Édition du {today}
              </span>
              <p className="text-[11px] text-zinc-500 mt-1">
                Document certifié conforme pour l'APD
              </p>
            </div>
          </div>

          {/* Fiches de Traitement */}
          <div className="space-y-6">
            {activities.map((act, index) => (
              <div key={act.id} className="p-4 border border-zinc-300 rounded-lg space-y-2 bg-zinc-50/50">
                <div className="flex items-center justify-between border-b border-zinc-200 pb-1">
                  <h3 className="font-bold text-sm text-black">
                    {index + 1}. {act.activity_name}
                  </h3>
                  <span className="text-[10px] font-mono text-zinc-500 uppercase">
                    Base : {act.legal_basis}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                  <div>
                    <strong className="block text-[11px] text-zinc-700">Finalité du traitement :</strong>
                    <p className="text-zinc-600 text-[11px] leading-relaxed">{act.purpose}</p>
                  </div>

                  <div>
                    <strong className="block text-[11px] text-zinc-700">Catégories de données collectées :</strong>
                    <p className="text-zinc-600 text-[11px] leading-relaxed">{act.data_categories}</p>
                  </div>

                  <div>
                    <strong className="block text-[11px] text-zinc-700">Durée de conservation :</strong>
                    <p className="text-zinc-600 text-[11px] leading-relaxed">{act.retention_period}</p>
                  </div>

                  <div>
                    <strong className="block text-[11px] text-zinc-700">Destinataires & Transferts :</strong>
                    <p className="text-zinc-600 text-[11px] leading-relaxed">{act.recipients}</p>
                  </div>
                </div>

                <div className="pt-1 border-t border-zinc-200">
                  <strong className="block text-[10px] uppercase text-zinc-500">Mesures de sécurité techniques :</strong>
                  <p className="text-zinc-600 text-[10px]">{act.security_measures}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Cadre de certification DPO */}
          <div className="grid grid-cols-2 gap-6 pt-6 border-t-2 border-black">
            <div className="text-zinc-600 text-[11px] space-y-1">
              <strong className="block text-black">Coordonnées du Responsable de Traitement :</strong>
              <p>Seraing Buggy Club ASBL</p>
              <p>Email DPO : contact@seraingbuggyclub.be</p>
            </div>

            <div className="p-4 border border-zinc-300 rounded-lg space-y-10">
              <div>
                <strong className="block text-xs uppercase">Pour le Seraing Buggy Club ASBL :</strong>
                <span className="text-zinc-500 text-[11px]">Le Président & Le Secrétaire DPO</span>
              </div>
              <div className="text-zinc-400 text-[10px] italic">Signature :</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
