'use client';

import React from 'react';
import { FbaAttendanceItem } from '@/types/models';
import { X, Printer, ShieldCheck } from 'lucide-react';

interface AttendanceFbaPrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  attendances: FbaAttendanceItem[];
}

export default function AttendanceFbaPrintModal({
  isOpen,
  onClose,
  attendances,
}: AttendanceFbaPrintModalProps) {
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
        {/* Header (non imprimé) */}
        <div className="p-4 border-b border-zinc-200 flex items-center justify-between bg-zinc-50 print:hidden">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-zinc-700" />
            <h2 className="font-bold text-sm uppercase tracking-wide">
              Attestation Officielle du Registre de Présence FBA
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
                Registre Officiel d'Émargement & Couverture d'Assurance FBA
              </p>
              <p className="text-zinc-600 text-xs">
                Complexe RC de Seraing • Fédération Belge d'Automodélisme
              </p>
            </div>

            <div className="text-right">
              <span className="inline-block px-3 py-1 bg-zinc-100 border border-zinc-300 font-bold text-xs rounded">
                Édité le {today}
              </span>
              <p className="text-[11px] text-zinc-500 mt-1">
                Document certifié conforme
              </p>
            </div>
          </div>

          {/* Tableau des présences */}
          <div className="space-y-3">
            <h2 className="font-bold text-sm uppercase text-black border-b pb-1">
              Liste des Pilotes et Visiteurs Horodatés sur le Complexe ({attendances.length} enregistrements)
            </h2>

            <table className="w-full text-left border-collapse border border-zinc-300">
              <thead>
                <tr className="bg-zinc-100 text-zinc-700 font-bold border-b border-zinc-300 text-[11px]">
                  <th className="p-2 border-r border-zinc-300">Date</th>
                  <th className="p-2 border-r border-zinc-300">Arrivée</th>
                  <th className="p-2 border-r border-zinc-300">Départ</th>
                  <th className="p-2 border-r border-zinc-300">Pilote (Nom & Prénom)</th>
                  <th className="p-2 border-r border-zinc-300">Licence FBA</th>
                  <th className="p-2 border-r border-zinc-300">Statut</th>
                  <th className="p-2">Piste</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200">
                {attendances.map((item) => {
                  const isMember = Boolean(item.user_id);
                  const name = isMember
                    ? `${item.sbc_members?.last_name || ''} ${item.sbc_members?.first_name || ''}`.trim()
                    : item.visitor_name || 'Pilote Visiteur';
                  const license = isMember
                    ? item.sbc_members?.license_number || 'Affiliation SBC'
                    : item.visitor_license || 'Visiteur externe';
                  const checkIn = new Date(item.check_in_at).toLocaleTimeString('fr-FR', {
                    hour: '2-digit',
                    minute: '2-digit',
                  });
                  const checkOut = item.check_out_at
                    ? new Date(item.check_out_at).toLocaleTimeString('fr-FR', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })
                    : 'En cours';

                  return (
                    <tr key={item.id} className="text-zinc-800">
                      <td className="p-2 border-r border-zinc-300">{item.check_in_at.split('T')[0]}</td>
                      <td className="p-2 border-r border-zinc-300 font-bold">{checkIn}</td>
                      <td className="p-2 border-r border-zinc-300">{checkOut}</td>
                      <td className="p-2 border-r border-zinc-300 font-bold">{name}</td>
                      <td className="p-2 border-r border-zinc-300 font-mono">{license}</td>
                      <td className="p-2 border-r border-zinc-300">{isMember ? 'Membre SBC' : 'Visiteur 1j'}</td>
                      <td className="p-2">{item.tracks?.name || 'Général'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mentions Légales & Signature */}
          <div className="grid grid-cols-2 gap-6 pt-6 border-t-2 border-black">
            <div className="text-zinc-600 text-[11px] space-y-1">
              <strong className="block text-black">Mentions Assurance FBA :</strong>
              <p>
                Ce registre atteste de la présence physique des pilotes mentionnés ci-dessus sur les installations
                du Seraing Buggy Club, ouvrant droit à la couverture responsabilité civile et individuelle accident FBA
                pour les créneaux horaires stipulés.
              </p>
            </div>

            <div className="p-4 border border-zinc-300 rounded-lg space-y-12">
              <div>
                <strong className="block text-xs uppercase">Pour le Seraing Buggy Club ASBL :</strong>
                <span className="text-zinc-500 text-[11px]">Le Comité / Responsable de Piste</span>
              </div>
              <div className="text-zinc-400 text-[10px] italic">Cachet & Signature :</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
