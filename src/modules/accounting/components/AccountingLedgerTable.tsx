'use client';

import React, { useState } from 'react';
import {
  AccountingTransaction,
  AccountingType,
  AccountingCategory,
  AccountingPaymentMethod,
} from '@/types/models';
import { deleteAccountingTransaction, generateAccountingExportData } from '../actions';
import {
  Search,
  Filter,
  Download,
  ExternalLink,
  Edit2,
  Trash2,
  Receipt,
  ArrowDownRight,
  ArrowUpRight,
  FileSpreadsheet,
  CheckCircle2,
  Printer,
} from 'lucide-react';

interface AccountingLedgerTableProps {
  transactions: AccountingTransaction[];
  selectedYear: number;
  onYearChange: (year: number) => void;
  typeFilter: 'ALL' | AccountingType;
  onTypeFilterChange: (type: 'ALL' | AccountingType) => void;
  categoryFilter: 'ALL' | AccountingCategory;
  onCategoryFilterChange: (cat: 'ALL' | AccountingCategory) => void;
  methodFilter: 'ALL' | AccountingPaymentMethod;
  onMethodFilterChange: (method: 'ALL' | AccountingPaymentMethod) => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onEdit: (transaction: AccountingTransaction) => void;
  onRefresh: () => void;
  onOpenAgReport: () => void;
}

export default function AccountingLedgerTable({
  transactions,
  selectedYear,
  onYearChange,
  typeFilter,
  onTypeFilterChange,
  categoryFilter,
  onCategoryFilterChange,
  methodFilter,
  onMethodFilterChange,
  searchQuery,
  onSearchChange,
  onEdit,
  onRefresh,
  onOpenAgReport,
}: AccountingLedgerTableProps) {
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [downloadingCsv, setDownloadingCsv] = useState(false);

  const currentYear = new Date().getFullYear();

  const handleDelete = async (id: string) => {
    if (!confirm('Confirmez-vous la suppression de cette écriture comptable ?')) return;

    setDeletingId(id);
    await deleteAccountingTransaction(id);
    setDeletingId(null);
    onRefresh();
  };

  const handleExportCsv = async () => {
    setDownloadingCsv(true);
    const res = await generateAccountingExportData(selectedYear);
    setDownloadingCsv(false);

    if (res.csvContent) {
      const blob = new Blob([res.csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `SBC_Grand_Livre_Comptable_${selectedYear}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const getCategoryLabel = (cat: AccountingCategory): string => {
    const map: { [k in AccountingCategory]: string } = {
      COTISATION: 'Cotisations',
      BUVETTE: 'Buvette',
      ACHAT_MATERIEL: 'Achat Matériel',
      TRAVAUX_PISTE: 'Travaux Piste',
      ASSURANCE_FBA: 'Assurance FBA',
      FRAIS_DIVERS: 'Frais Divers',
      DEPOT_BANQUE: 'Dépôt Banque',
      RETRAIT_CAISSE: 'Retrait Caisse',
    };
    return map[cat] || cat;
  };

  return (
    <div className="space-y-4 font-mono text-xs">
      {/* Barre de Filtres & Recherche */}
      <div className="p-4 rounded-xl bg-surface border border-[#353535] flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Recherche */}
        <div className="relative w-full md:w-64">
          <Search className="w-4 h-4 text-foreground/40 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Rechercher libellé, auteur..."
            className="w-full bg-background border border-[#353535] rounded-lg pl-9 pr-3 py-1.5 text-xs text-white placeholder-foreground/40 focus:outline-none focus:border-primary"
          />
        </div>

        {/* Filtres déroulants */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Année */}
          <select
            value={selectedYear}
            onChange={(e) => onYearChange(Number(e.target.value))}
            className="bg-background border border-[#353535] rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-primary cursor-pointer"
          >
            <option value={currentYear}>Exercice {currentYear}</option>
            <option value={currentYear - 1}>Exercice {currentYear - 1}</option>
            <option value={currentYear + 1}>Exercice {currentYear + 1}</option>
          </select>

          {/* Type */}
          <select
            value={typeFilter}
            onChange={(e) => onTypeFilterChange(e.target.value as 'ALL' | AccountingType)}
            className="bg-background border border-[#353535] rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-primary cursor-pointer"
          >
            <option value="ALL">Tous les types</option>
            <option value="RECETTE">Recettes uniquement</option>
            <option value="DEPENSE">Dépenses uniquement</option>
          </select>

          {/* Catégorie */}
          <select
            value={categoryFilter}
            onChange={(e) => onCategoryFilterChange(e.target.value as 'ALL' | AccountingCategory)}
            className="bg-background border border-[#353535] rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-primary cursor-pointer"
          >
            <option value="ALL">Toutes les catégories</option>
            <option value="COTISATION">Cotisations</option>
            <option value="BUVETTE">Buvette</option>
            <option value="ACHAT_MATERIEL">Achat Matériel</option>
            <option value="TRAVAUX_PISTE">Travaux Piste</option>
            <option value="ASSURANCE_FBA">Assurance FBA</option>
            <option value="DEPOT_BANQUE">Dépôt Banque</option>
            <option value="FRAIS_DIVERS">Frais Divers</option>
          </select>

          {/* Moyen de Paiement */}
          <select
            value={methodFilter}
            onChange={(e) => onMethodFilterChange(e.target.value as 'ALL' | AccountingPaymentMethod)}
            className="bg-background border border-[#353535] rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-primary cursor-pointer"
          >
            <option value="ALL">Tous les modes</option>
            <option value="BANQUE">Compte Bancaire</option>
            <option value="ESPECES">Espèces (Caisse)</option>
            <option value="PAYCONIQ">Payconiq</option>
          </select>

          {/* Boutons d'export */}
          <button
            type="button"
            onClick={handleExportCsv}
            disabled={downloadingCsv}
            className="px-3 py-1.5 rounded-lg bg-surface-high hover:bg-surface border border-[#353535] text-foreground/80 hover:text-white flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Exporter en CSV"
          >
            <Download className="w-3.5 h-3.5 text-primary" />
            <span className="hidden sm:inline">Export CSV</span>
          </button>

          <button
            type="button"
            onClick={onOpenAgReport}
            className="px-3 py-1.5 rounded-lg bg-surface-high hover:bg-surface border border-primary/30 text-primary hover:text-white flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Générer le Bilan pour l'AG"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Bilan AG</span>
          </button>
        </div>
      </div>

      {/* Tableau Journal */}
      <div className="bg-surface rounded-xl border border-[#353535] overflow-hidden shadow-[4px_4px_0px_#000]">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#353535] bg-surface-dim text-[10px] font-anybody font-bold text-foreground/50 uppercase tracking-wider">
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Catégorie</th>
                <th className="px-4 py-3">Libellé & Auteur</th>
                <th className="px-4 py-3 text-center">Mode</th>
                <th className="px-4 py-3 text-right">Recette (+)</th>
                <th className="px-4 py-3 text-right">Dépense (-)</th>
                <th className="px-4 py-3 text-center">Justif.</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#353535]/50">
              {transactions.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center py-10 text-foreground/40">
                    Aucune écriture comptable trouvée pour cette sélection.
                  </td>
                </tr>
              ) : (
                transactions.map((t) => {
                  const isIncome = t.type === 'RECETTE';

                  return (
                    <tr key={t.id} className="hover:bg-surface-high/30 transition-colors">
                      {/* Date */}
                      <td className="px-4 py-3 text-foreground/80 whitespace-nowrap">
                        {t.date}
                      </td>

                      {/* Type */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        {isIncome ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-green-500/15 border border-green-500/30 text-green-400">
                            <ArrowDownRight className="w-3 h-3" />
                            Recette
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-secondary/15 border border-secondary/30 text-secondary">
                            <ArrowUpRight className="w-3 h-3" />
                            Dépense
                          </span>
                        )}
                      </td>

                      {/* Catégorie */}
                      <td className="px-4 py-3 text-foreground/70 whitespace-nowrap">
                        {getCategoryLabel(t.category)}
                      </td>

                      {/* Libellé & Auteur */}
                      <td className="px-4 py-3">
                        <div className="font-bold text-white font-sans text-xs">
                          {t.description}
                        </div>
                        <div className="text-[10px] text-foreground/45 mt-0.5">
                          {t.source_type !== 'MANUAL' ? (
                            <span className="text-primary font-mono font-bold uppercase tracking-wider text-[9px]">
                              Auto ({t.source_type})
                            </span>
                          ) : t.author ? (
                            <span>Saisi par {t.author.first_name} {t.author.last_name}</span>
                          ) : null}
                        </div>
                      </td>

                      {/* Mode de Paiement */}
                      <td className="px-4 py-3 text-center text-foreground/60 text-[10px] uppercase whitespace-nowrap">
                        {t.payment_method}
                      </td>

                      {/* Recette (+) */}
                      <td className="px-4 py-3 text-right font-bold text-green-400 whitespace-nowrap">
                        {isIncome ? `+${t.amount.toFixed(2)} €` : '-'}
                      </td>

                      {/* Dépense (-) */}
                      <td className="px-4 py-3 text-right font-bold text-secondary whitespace-nowrap">
                        {!isIncome ? `-${t.amount.toFixed(2)} €` : '-'}
                      </td>

                      {/* Justificatif */}
                      <td className="px-4 py-3 text-center">
                        {t.receipt_url ? (
                          <a
                            href={t.receipt_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex p-1 rounded bg-surface hover:bg-surface-high text-primary hover:text-white transition-colors"
                            title="Voir le justificatif"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        ) : (
                          <span className="text-foreground/30">-</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => onEdit(t)}
                            className="p-1.5 rounded bg-surface hover:bg-surface-high border border-[#353535] text-foreground/60 hover:text-white transition-colors cursor-pointer"
                            title="Modifier"
                          >
                            <Edit2 className="w-3 h-3" />
                          </button>

                          <button
                            onClick={() => handleDelete(t.id)}
                            disabled={deletingId === t.id}
                            className="p-1.5 rounded bg-surface hover:bg-secondary/20 border border-[#353535] text-foreground/40 hover:text-secondary transition-colors cursor-pointer disabled:opacity-40"
                            title="Supprimer"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
