'use client';

import React from 'react';
import { AccountingMetrics, AccountingTransaction } from '@/types/models';
import { CLUB_CONFIG } from '@/config/club';
import { X, Printer, Scale, Building2, Coins, CheckCircle2 } from 'lucide-react';

interface AccountingAgReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  metrics: AccountingMetrics;
  transactions: AccountingTransaction[];
  selectedYear: number;
}

export default function AccountingAgReportModal({
  isOpen,
  onClose,
  metrics,
  transactions,
  selectedYear,
}: AccountingAgReportModalProps) {
  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  const isPositiveNet = metrics.netResult >= 0;

  // Calcul des sous-totaux par catégorie pour l'AG
  const incomeCategories = [
    { key: 'COTISATION', label: 'Cotisations & Affiliations Membres' },
    { key: 'BUVETTE', label: 'Buvette, Restauration & Consommations' },
    { key: 'FRAIS_DIVERS', label: 'Autres Recettes & Événements' },
  ];

  const expenseCategories = [
    { key: 'ACHAT_MATERIEL', label: 'Achats Outillage & Matériel Stands' },
    { key: 'TRAVAUX_PISTE', label: 'Entretien Piste, Moquette, Drainage & Essence' },
    { key: 'ASSURANCE_FBA', label: 'Assurances RC & Affiliation FBA' },
    { key: 'FRAIS_DIVERS', label: 'Frais Divers & Administratifs' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in print:p-0 print:bg-white">
      <div className="absolute inset-0 print:hidden" onClick={onClose} />

      <div className="relative z-10 w-full max-w-4xl bg-white text-black border border-zinc-300 rounded-2xl shadow-[0_0_50px_rgba(0,0,0,0.9)] overflow-hidden flex flex-col max-h-[92vh] print:max-h-none print:border-none print:shadow-none print:rounded-none">
        {/* Header non imprimé */}
        <div className="p-4 border-b border-zinc-200 flex items-center justify-between bg-zinc-50 print:hidden">
          <div className="flex items-center gap-2">
            <Scale className="w-5 h-5 text-zinc-700" />
            <h2 className="font-bold text-sm uppercase tracking-wide">
              Bilan Financier Officiel pour l'AG ({selectedYear})
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

        {/* Corps Imprimable du Bilan */}
        <div className="p-8 overflow-y-auto space-y-6 font-sans text-xs flex-1 print:p-0">
          {/* Entête Officielle Club */}
          <div className="border-b-2 border-black pb-4 flex justify-between items-start">
            <div>
              <h1 className="text-2xl font-black uppercase tracking-tight text-black">
                {CLUB_CONFIG.name}
              </h1>
              <p className="text-zinc-600 text-xs font-mono">
                BCE : <strong>{CLUB_CONFIG.bce}</strong> • {CLUB_CONFIG.rpm}
              </p>
              <p className="text-zinc-600 text-xs">
                Siège Social : {CLUB_CONFIG.address.full} • Tél : {CLUB_CONFIG.contact.phone}
              </p>
            </div>

            <div className="text-right">
              <span className="inline-block px-3 py-1 bg-zinc-100 border border-zinc-300 font-bold text-xs rounded">
                Exercice Comptable {selectedYear}
              </span>
              <p className="text-[11px] text-zinc-500 mt-1">
                Document certifié pour l'Assemblée Générale
              </p>
            </div>
          </div>

          {/* Tableau Bilan Recettes vs Dépenses */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* RECETTES */}
            <div className="space-y-3">
              <h2 className="font-bold text-sm uppercase text-green-700 border-b pb-1">
                1. Recettes d'Exploitation (Entrées)
              </h2>
              <table className="w-full text-left border-collapse">
                <tbody>
                  {incomeCategories.map((cat) => {
                    const amount = metrics.categoryTotals[cat.key]?.income || 0;
                    return (
                      <tr key={cat.key} className="border-b border-zinc-100">
                        <td className="py-2 text-zinc-700">{cat.label}</td>
                        <td className="py-2 text-right font-bold text-black">
                          {amount.toFixed(2)} €
                        </td>
                      </tr>
                    );
                  })}
                  <tr className="border-t-2 border-black font-bold text-sm bg-green-50">
                    <td className="py-2 text-green-900">Total des Recettes</td>
                    <td className="py-2 text-right text-green-900">
                      +{metrics.totalIncome.toFixed(2)} €
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* DÉPENSES */}
            <div className="space-y-3">
              <h2 className="font-bold text-sm uppercase text-red-700 border-b pb-1">
                2. Dépenses d'Exploitation (Sorties)
              </h2>
              <table className="w-full text-left border-collapse">
                <tbody>
                  {expenseCategories.map((cat) => {
                    const amount = metrics.categoryTotals[cat.key]?.expense || 0;
                    return (
                      <tr key={cat.key} className="border-b border-zinc-100">
                        <td className="py-2 text-zinc-700">{cat.label}</td>
                        <td className="py-2 text-right font-bold text-black">
                          {amount.toFixed(2)} €
                        </td>
                      </tr>
                    );
                  })}
                  <tr className="border-t-2 border-black font-bold text-sm bg-red-50">
                    <td className="py-2 text-red-900">Total des Dépenses</td>
                    <td className="py-2 text-right text-red-900">
                      -{metrics.totalExpense.toFixed(2)} €
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Résultat Net de l'Exercice */}
          <div className="p-4 rounded-xl border-2 border-black bg-zinc-50 flex items-center justify-between">
            <div>
              <strong className="text-sm uppercase block">
                Résultat Net de la Saison {selectedYear} :
              </strong>
              <span className="text-zinc-600 text-xs">
                (Total des Recettes - Total des Dépenses)
              </span>
            </div>

            <div className="text-right">
              <span className={`text-2xl font-black ${isPositiveNet ? 'text-green-700' : 'text-red-700'}`}>
                {isPositiveNet ? '+' : ''}{metrics.netResult.toFixed(2)} €
              </span>
              <span className="block text-[11px] font-bold uppercase text-zinc-600">
                {isPositiveNet ? 'Bénéfice Net Réalisé' : 'Déficit d\'Exercice'}
              </span>
            </div>
          </div>

          {/* Rapprochement de Trésorerie (Caisse & Banque) */}
          <div className="space-y-3 pt-2">
            <h2 className="font-bold text-sm uppercase text-zinc-900 border-b pb-1">
              3. Rapprochement des Disponibilités Financières
            </h2>

            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 rounded-lg border border-zinc-200">
                <span className="text-zinc-500 uppercase text-[10px] block">Caisse Espèces (Tiroir)</span>
                <strong className="text-lg text-black">{metrics.cashBalance.toFixed(2)} €</strong>
              </div>

              <div className="p-3 rounded-lg border border-zinc-200">
                <span className="text-zinc-500 uppercase text-[10px] block">Compte Bancaire (Belfius / Payconiq)</span>
                <strong className="text-lg text-black">{metrics.bankBalance.toFixed(2)} €</strong>
              </div>
            </div>
          </div>

          {/* Cadre de Signature et Approbation des Réviseurs aux comptes */}
          <div className="grid grid-cols-2 gap-6 pt-6 border-t-2 border-black">
            <div className="p-4 border border-zinc-300 rounded-lg space-y-12">
              <div>
                <strong className="block text-xs uppercase">Pour le Comité de Gestion :</strong>
                <span className="text-zinc-500 text-[11px]">Le Président & Le Trésorier</span>
              </div>
              <div className="text-zinc-400 text-[10px] italic">Signature :</div>
            </div>

            <div className="p-4 border border-zinc-300 rounded-lg space-y-12">
              <div>
                <strong className="block text-xs uppercase">Pour les Réviseurs aux Comptes (AG) :</strong>
                <span className="text-zinc-500 text-[11px]">Vérification des pièces justificatives</span>
              </div>
              <div className="text-zinc-400 text-[10px] italic">Signature :</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
