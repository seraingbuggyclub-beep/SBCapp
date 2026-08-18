'use client';

import React from 'react';
import { X } from 'lucide-react';

interface OfficialDocumentsModalProps {
  activeDoc: 'roi' | 'charte' | null;
  onClose: () => void;
}

export default function OfficialDocumentsModal({ activeDoc, onClose }: OfficialDocumentsModalProps) {
  if (!activeDoc) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-2xl max-h-[85vh] overflow-y-auto premium-card p-6 md:p-8 rounded-lg border border-[#353535] relative shadow-2xl space-y-5">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-surface border border-transparent hover:border-[#353535] text-foreground/50 hover:text-white transition-all cursor-pointer"
          title="Fermer"
        >
          <X className="w-5 h-5" />
        </button>

        {activeDoc === 'roi' ? (
          <div className="space-y-4 font-mono text-xs text-foreground/80">
            <div className="border-b border-[#353535] pb-3">
              <h3 className="font-anybody font-black text-xl uppercase tracking-tight sport-skew text-white">
                Règlement d&apos;Ordre Intérieur (ROI)
              </h3>
              <p className="text-[10px] text-primary mt-0.5">Seraing Buggy Club ASBL • Affilié FBA</p>
            </div>

            <div className="space-y-3 leading-relaxed text-[11px]">
              <p><strong>Article 1 - Accès aux infrastructures :</strong> L&apos;accès aux pistes et aux stands est réservé aux membres en règle de cotisation et aux pilotes munis d&apos;un pass journalier validé.</p>
              <p><strong>Article 2 - Sécurité & Assurance :</strong> Tout pilote présent sur le complexe doit impérativement activer son check-in sur l&apos;application officielle afin de garantir sa couverture d&apos;assurance FBA.</p>
              <p><strong>Article 3 - Matériel & Motorisation :</strong> Sont admis les buggies et truggies 1/8ème et 1/10ème électriques et thermiques conformes aux normes sonores et de sécurité FBA.</p>
              <p><strong>Article 4 - Sens de circulation & Ramassage :</strong> Le sens de circulation balisé sur la piste doit être strictement respecté. Le ramassage s&apos;effectue avec gilet de sécurité dans les zones prévues.</p>
              <p><strong>Article 5 - Fermeture & Cadenas :</strong> Le dernier membre quittant les installations est tenu de vérifier la mise hors tension des stands et le reverrouillage strict du cadenas d&apos;entrée.</p>
            </div>
          </div>
        ) : (
          <div className="space-y-4 font-mono text-xs text-foreground/80">
            <div className="border-b border-[#353535] pb-3">
              <h3 className="font-anybody font-black text-xl uppercase tracking-tight sport-skew text-white">
                Charte Sportive & Convivialité
              </h3>
              <p className="text-[10px] text-primary mt-0.5">Seraing Buggy Club ASBL</p>
            </div>

            <div className="space-y-3 leading-relaxed text-[11px]">
              <p><strong>Esprit de Club :</strong> Le SBC est une association de passionnés où règnent le respect mutuel, la bienveillance et le partage des connaissances mécaniques et de pilotage.</p>
              <p><strong>Fair-Play en Piste :</strong> Laisser passer les pilotes plus rapides lors des entraînements libres, éviter les contacts volontaires et préserver le matériel de chacun.</p>
              <p><strong>Entraide aux Stands :</strong> Faciliter l&apos;intégration des nouveaux pilotes et participer activement aux sessions bénévoles de maintenance du tracé.</p>
              <p><strong>Propreté :</strong> Ne rien jeter au sol, évacuer ses déchets et maintenir les tables de stands propres.</p>
            </div>
          </div>
        )}

        <div className="pt-3 border-t border-[#353535] flex justify-end">
          <button
            onClick={onClose}
            className="premium-btn text-xs px-6 py-2"
          >
            <span className="transform skew-x-8">Fermer la lecture</span>
          </button>
        </div>
      </div>
    </div>
  );
}
