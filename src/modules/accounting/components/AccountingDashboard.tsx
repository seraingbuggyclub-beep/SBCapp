'use client';

import React from 'react';
import { AccountingMetrics } from '@/types/models';
import {
  Coins,
  Building2,
  TrendingUp,
  TrendingDown,
  Scale,
  Wallet,
  PiggyBank,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';

interface AccountingDashboardProps {
  metrics: AccountingMetrics;
  selectedYear: number;
}

export default function AccountingDashboard({
  metrics,
  selectedYear,
}: AccountingDashboardProps) {
  const isPositiveNet = metrics.netResult >= 0;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
      {/* 1. Solde Caisse Espèces */}
      <div className="p-4 rounded-xl bg-surface border border-green-500/30 flex flex-col justify-between space-y-2 shadow-[3px_3px_0px_#000]">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-mono text-green-400 uppercase font-bold tracking-wider">
            Solde Caisse Espèces
          </span>
          <div className="p-1.5 rounded-lg bg-green-500/10 text-green-400">
            <Coins className="w-4 h-4" />
          </div>
        </div>

        <div>
          <span className="font-anybody font-black text-2xl text-white">
            {metrics.cashBalance.toFixed(2)} €
          </span>
          <p className="text-[10px] font-mono text-foreground/45 mt-0.5">
            Argent physique disponible
          </p>
        </div>
      </div>

      {/* 2. Solde Compte Bancaire */}
      <div className="p-4 rounded-xl bg-surface border border-blue-500/30 flex flex-col justify-between space-y-2 shadow-[3px_3px_0px_#000]">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-mono text-blue-400 uppercase font-bold tracking-wider">
            Solde Compte Bancaire
          </span>
          <div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-400">
            <Building2 className="w-4 h-4" />
          </div>
        </div>

        <div>
          <span className="font-anybody font-black text-2xl text-white">
            {metrics.bankBalance.toFixed(2)} €
          </span>
          <p className="text-[10px] font-mono text-foreground/45 mt-0.5">
            Belfius + Payconiq
          </p>
        </div>
      </div>

      {/* 3. Total Recettes */}
      <div className="p-4 rounded-xl bg-surface border border-primary/30 flex flex-col justify-between space-y-2 shadow-[3px_3px_0px_#000]">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-mono text-primary uppercase font-bold tracking-wider">
            Total Recettes ({selectedYear})
          </span>
          <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
            <TrendingUp className="w-4 h-4" />
          </div>
        </div>

        <div>
          <span className="font-anybody font-black text-2xl text-primary">
            +{metrics.totalIncome.toFixed(2)} €
          </span>
          <p className="text-[10px] font-mono text-foreground/45 mt-0.5">
            Cotisations, Buvette, etc.
          </p>
        </div>
      </div>

      {/* 4. Total Dépenses */}
      <div className="p-4 rounded-xl bg-surface border border-secondary/30 flex flex-col justify-between space-y-2 shadow-[3px_3px_0px_#000]">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-mono text-secondary uppercase font-bold tracking-wider">
            Total Dépenses ({selectedYear})
          </span>
          <div className="p-1.5 rounded-lg bg-secondary/10 text-secondary">
            <TrendingDown className="w-4 h-4" />
          </div>
        </div>

        <div>
          <span className="font-anybody font-black text-2xl text-secondary">
            -{metrics.totalExpense.toFixed(2)} €
          </span>
          <p className="text-[10px] font-mono text-foreground/45 mt-0.5">
            Matériel, travaux, assurance
          </p>
        </div>
      </div>

      {/* 5. Résultat Net d'Exercice */}
      <div className={`p-4 rounded-xl bg-surface border ${isPositiveNet ? 'border-green-500/40' : 'border-secondary/40'} flex flex-col justify-between space-y-2 shadow-[3px_3px_0px_#000]`}>
        <div className="flex items-center justify-between">
          <span className={`text-[10px] font-mono uppercase font-bold tracking-wider ${isPositiveNet ? 'text-green-400' : 'text-secondary'}`}>
            Résultat Net ({selectedYear})
          </span>
          <div className={`p-1.5 rounded-lg ${isPositiveNet ? 'bg-green-500/10 text-green-400' : 'bg-secondary/10 text-secondary'}`}>
            <Scale className="w-4 h-4" />
          </div>
        </div>

        <div>
          <span className={`font-anybody font-black text-2xl ${isPositiveNet ? 'text-green-400' : 'text-secondary'}`}>
            {isPositiveNet ? '+' : ''}{metrics.netResult.toFixed(2)} €
          </span>
          <p className="text-[10px] font-mono text-foreground/45 mt-0.5">
            {isPositiveNet ? 'Bénéfice saisonnier' : 'Déficit saisonnier'}
          </p>
        </div>
      </div>
    </div>
  );
}
