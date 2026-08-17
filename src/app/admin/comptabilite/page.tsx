'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { usePermissions } from '@/modules/admin/hooks/usePermissions';
import AdminNav from '@/components/admin/AdminNav';
import AccountingDashboard from '@/modules/accounting/components/AccountingDashboard';
import AccountingLedgerTable from '@/modules/accounting/components/AccountingLedgerTable';
import AccountingTransactionModal from '@/modules/accounting/components/AccountingTransactionModal';
import AccountingAgReportModal from '@/modules/accounting/components/AccountingAgReportModal';
import {
  AccountingTransaction,
  AccountingMetrics,
  AccountingType,
  AccountingCategory,
  AccountingPaymentMethod,
} from '@/types/models';
import {
  getAccountingLedger,
  getAccountingMetrics,
} from '@/modules/accounting/actions';
import {
  Scale,
  Plus,
  RefreshCw,
  Printer,
  ShieldAlert,
  ArrowLeft,
  Coins,
  FileSpreadsheet,
} from 'lucide-react';
import Link from 'next/link';

export default function AdminComptabilitePage() {
  const { user, profile } = useAuth();
  const permissions = usePermissions(profile);

  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState<number>(currentYear);
  const [typeFilter, setTypeFilter] = useState<'ALL' | AccountingType>('ALL');
  const [categoryFilter, setCategoryFilter] = useState<'ALL' | AccountingCategory>('ALL');
  const [methodFilter, setMethodFilter] = useState<'ALL' | AccountingPaymentMethod>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const [transactions, setTransactions] = useState<AccountingTransaction[]>([]);
  const [metrics, setMetrics] = useState<AccountingMetrics>({
    cashBalance: 0,
    bankBalance: 0,
    totalIncome: 0,
    totalExpense: 0,
    netResult: 0,
    incomeByMethod: { cash: 0, bank: 0, payconiq: 0 },
    expenseByMethod: { cash: 0, bank: 0, payconiq: 0 },
    categoryTotals: {},
  });
  const [loading, setLoading] = useState(true);

  // Modales
  const [transactionModalOpen, setTransactionModalOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<AccountingTransaction | null>(null);
  const [agReportOpen, setAgReportOpen] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    const [ledgerRes, metricsRes] = await Promise.all([
      getAccountingLedger({
        year: selectedYear,
        type: typeFilter,
        category: categoryFilter,
        paymentMethod: methodFilter,
        search: searchQuery,
      }),
      getAccountingMetrics(selectedYear),
    ]);

    setTransactions(ledgerRes.data || []);
    if (metricsRes.metrics) {
      setMetrics(metricsRes.metrics);
    }
    setLoading(false);
  }, [selectedYear, typeFilter, categoryFilter, methodFilter, searchQuery]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (!user || (!permissions.isAdmin && !permissions.isSuperAdmin)) {
    return (
      <div className="max-w-md mx-auto my-12 p-6 bg-surface border border-secondary/30 rounded-2xl text-center space-y-4 font-mono text-xs">
        <ShieldAlert className="w-10 h-10 text-secondary mx-auto" />
        <h2 className="font-anybody font-black text-lg uppercase text-white">
          Accès Restreint
        </h2>
        <p className="text-foreground/60">
          La comptabilité générale et le grand livre ASBL sont réservés aux administrateurs du Seraing Buggy Club.
        </p>
        <Link
          href="/dashboard"
          className="inline-block premium-btn text-xs px-6 py-2.5 sport-skew"
        >
          <span className="transform skew-x-8">Retour Cockpit</span>
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6 animate-fade-in">
      {/* Header Admin */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#353535] pb-4">
        <div className="flex items-center gap-3">
          <Link
            href="/admin"
            className="p-2 rounded-lg bg-surface hover:bg-surface-high border border-[#353535] text-foreground/60 hover:text-white transition-colors"
            title="Retour Administration"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>

          <div>
            <div className="flex items-center gap-2">
              <Scale className="w-5 h-5 text-primary" />
              <h1 className="font-anybody font-black text-xl sm:text-2xl uppercase tracking-tight text-white sport-skew">
                Comptabilité & Grand Livre <span className="text-primary">ASBL</span>
              </h1>
            </div>
            <p className="text-xs font-mono text-foreground/50">
              Livre de Caisse & Banque, suivi des recettes cotisations/buvette, dépenses et bilans pour l'AG.
            </p>
          </div>
        </div>

        {/* Boutons d'action rapides */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setEditingTransaction(null);
              setTransactionModalOpen(true);
            }}
            className="premium-btn text-xs px-4 py-2.5 flex items-center gap-2 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span className="transform skew-x-8">Nouvelle Écriture</span>
          </button>

          <button
            onClick={() => setAgReportOpen(true)}
            className="px-4 py-2.5 rounded-lg bg-surface hover:bg-surface-high border border-[#353535] text-foreground/70 hover:text-white text-xs font-anybody font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all sport-skew cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5 text-primary" />
            <span className="transform skew-x-8">Bilan AG</span>
          </button>

          <button
            onClick={loadData}
            disabled={loading}
            className="p-2.5 rounded-lg bg-surface hover:bg-surface-high border border-[#353535] text-foreground/70 hover:text-white transition-colors cursor-pointer"
            title="Actualiser"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* 1. KPIs Financiers */}
      <AccountingDashboard
        metrics={metrics}
        selectedYear={selectedYear}
      />

      {/* 2. Grand Livre Journal & Filtres */}
      <AccountingLedgerTable
        transactions={transactions}
        selectedYear={selectedYear}
        onYearChange={setSelectedYear}
        typeFilter={typeFilter}
        onTypeFilterChange={setTypeFilter}
        categoryFilter={categoryFilter}
        onCategoryFilterChange={setCategoryFilter}
        methodFilter={methodFilter}
        onMethodFilterChange={setMethodFilter}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onEdit={(t) => {
          setEditingTransaction(t);
          setTransactionModalOpen(true);
        }}
        onRefresh={loadData}
        onOpenAgReport={() => setAgReportOpen(true)}
      />

      {/* Modale de Saisie / Édition d'écriture */}
      <AccountingTransactionModal
        isOpen={transactionModalOpen}
        onClose={() => {
          setTransactionModalOpen(false);
          setEditingTransaction(null);
        }}
        onSuccess={loadData}
        transactionToEdit={editingTransaction}
      />

      {/* Modale Bilan AG & Réviseur aux comptes */}
      <AccountingAgReportModal
        isOpen={agReportOpen}
        onClose={() => setAgReportOpen(false)}
        metrics={metrics}
        transactions={transactions}
        selectedYear={selectedYear}
      />
    </div>
  );
}
