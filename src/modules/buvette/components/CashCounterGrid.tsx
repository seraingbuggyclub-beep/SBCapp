'use client';

import React, { useMemo } from 'react';
import { Coins, Banknote, RotateCcw, Plus, Minus } from 'lucide-react';

export interface DenominationItem {
  key: string;
  value: number;
  label: string;
  type: 'COIN' | 'BILL';
}

export const CASH_DENOMINATIONS: DenominationItem[] = [
  // Pièces
  { key: '0.10', value: 0.10, label: '0.10 €', type: 'COIN' },
  { key: '0.20', value: 0.20, label: '0.20 €', type: 'COIN' },
  { key: '0.50', value: 0.50, label: '0.50 €', type: 'COIN' },
  { key: '1.00', value: 1.00, label: '1.00 €', type: 'COIN' },
  { key: '2.00', value: 2.00, label: '2.00 €', type: 'COIN' },
  // Billets
  { key: '5.00', value: 5.00, label: '5.00 €', type: 'BILL' },
  { key: '10.00', value: 10.00, label: '10.00 €', type: 'BILL' },
  { key: '20.00', value: 20.00, label: '20.00 €', type: 'BILL' },
  { key: '50.00', value: 50.00, label: '50.00 €', type: 'BILL' },
];

export function calculateCashTotal(breakdown: Record<string, number>): number {
  return CASH_DENOMINATIONS.reduce((sum, denom) => {
    const count = Number(breakdown[denom.key] || 0);
    return sum + count * denom.value;
  }, 0);
}

interface CashCounterGridProps {
  breakdown: Record<string, number>;
  onChange: (breakdown: Record<string, number>, total: number) => void;
  disabled?: boolean;
}

export default function CashCounterGrid({
  breakdown,
  onChange,
  disabled = false,
}: CashCounterGridProps) {
  const coins = useMemo(
    () => CASH_DENOMINATIONS.filter((d) => d.type === 'COIN'),
    []
  );
  const bills = useMemo(
    () => CASH_DENOMINATIONS.filter((d) => d.type === 'BILL'),
    []
  );

  const handleCountChange = (key: string, rawVal: string | number) => {
    const count = Math.max(0, Math.floor(Number(rawVal) || 0));
    const nextBreakdown = { ...breakdown, [key]: count };
    const nextTotal = calculateCashTotal(nextBreakdown);
    onChange(nextBreakdown, nextTotal);
  };

  const handleStep = (key: string, delta: number) => {
    const current = Number(breakdown[key] || 0);
    handleCountChange(key, Math.max(0, current + delta));
  };

  const handleReset = () => {
    const emptyBreakdown: Record<string, number> = {};
    CASH_DENOMINATIONS.forEach((d) => {
      emptyBreakdown[d.key] = 0;
    });
    onChange(emptyBreakdown, 0);
  };

  const totalCoins = useMemo(() => {
    return coins.reduce((sum, d) => sum + (Number(breakdown[d.key] || 0) * d.value), 0);
  }, [coins, breakdown]);

  const totalBills = useMemo(() => {
    return bills.reduce((sum, d) => sum + (Number(breakdown[d.key] || 0) * d.value), 0);
  }, [bills, breakdown]);

  const grandTotal = totalCoins + totalBills;

  return (
    <div className="space-y-4 font-mono text-xs">
      {/* Grille deux colonnes Pièces / Billets */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Colonne 1 : Pièces */}
        <div className="p-3.5 rounded-xl bg-surface border border-[#353535] space-y-3">
          <div className="flex items-center justify-between border-b border-[#292929] pb-2">
            <div className="flex items-center gap-2 text-primary font-bold">
              <Coins className="w-4 h-4" />
              <span className="uppercase text-[11px] tracking-wider">Pièces de monnaie</span>
            </div>
            <span className="text-white font-bold text-xs">{totalCoins.toFixed(2)} €</span>
          </div>

          <div className="space-y-2">
            {coins.map((coin) => {
              const count = breakdown[coin.key] || 0;
              const subtotal = count * coin.value;

              return (
                <div
                  key={coin.key}
                  className="flex items-center justify-between gap-2 p-2 rounded-lg bg-surface-dim hover:bg-surface-high border border-[#2a2a2a] transition-colors"
                >
                  <div className="w-16 font-bold text-white text-xs">{coin.label}</div>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      disabled={disabled || count <= 0}
                      onClick={() => handleStep(coin.key, -1)}
                      className="p-1.5 rounded bg-surface hover:bg-surface-high text-foreground/60 hover:text-white disabled:opacity-30 cursor-pointer"
                    >
                      <Minus className="w-3 h-3" />
                    </button>

                    <input
                      type="number"
                      min="0"
                      step="1"
                      disabled={disabled}
                      value={count === 0 ? '' : count}
                      onChange={(e) => handleCountChange(coin.key, e.target.value)}
                      placeholder="0"
                      className="w-14 bg-background border border-[#353535] rounded px-2 py-1 text-center font-bold text-primary focus:outline-none focus:border-primary text-xs"
                    />

                    <button
                      type="button"
                      disabled={disabled}
                      onClick={() => handleStep(coin.key, 1)}
                      className="p-1.5 rounded bg-surface hover:bg-surface-high text-foreground/60 hover:text-white disabled:opacity-30 cursor-pointer"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>

                  <div className="w-16 text-right font-bold text-foreground/80 text-xs">
                    {subtotal.toFixed(2)} €
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Colonne 2 : Billets */}
        <div className="p-3.5 rounded-xl bg-surface border border-[#353535] space-y-3">
          <div className="flex items-center justify-between border-b border-[#292929] pb-2">
            <div className="flex items-center gap-2 text-emerald-400 font-bold">
              <Banknote className="w-4 h-4" />
              <span className="uppercase text-[11px] tracking-wider">Billets de banque</span>
            </div>
            <span className="text-white font-bold text-xs">{totalBills.toFixed(2)} €</span>
          </div>

          <div className="space-y-2">
            {bills.map((bill) => {
              const count = breakdown[bill.key] || 0;
              const subtotal = count * bill.value;

              return (
                <div
                  key={bill.key}
                  className="flex items-center justify-between gap-2 p-2 rounded-lg bg-surface-dim hover:bg-surface-high border border-[#2a2a2a] transition-colors"
                >
                  <div className="w-16 font-bold text-white text-xs">{bill.label}</div>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      disabled={disabled || count <= 0}
                      onClick={() => handleStep(bill.key, -1)}
                      className="p-1.5 rounded bg-surface hover:bg-surface-high text-foreground/60 hover:text-white disabled:opacity-30 cursor-pointer"
                    >
                      <Minus className="w-3 h-3" />
                    </button>

                    <input
                      type="number"
                      min="0"
                      step="1"
                      disabled={disabled}
                      value={count === 0 ? '' : count}
                      onChange={(e) => handleCountChange(bill.key, e.target.value)}
                      placeholder="0"
                      className="w-14 bg-background border border-[#353535] rounded px-2 py-1 text-center font-bold text-emerald-400 focus:outline-none focus:border-emerald-400 text-xs"
                    />

                    <button
                      type="button"
                      disabled={disabled}
                      onClick={() => handleStep(bill.key, 1)}
                      className="p-1.5 rounded bg-surface hover:bg-surface-high text-foreground/60 hover:text-white disabled:opacity-30 cursor-pointer"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>

                  <div className="w-16 text-right font-bold text-foreground/80 text-xs">
                    {subtotal.toFixed(2)} €
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Résumé Grand Total & Reset */}
      <div className="p-3.5 rounded-xl bg-surface-high border border-[#353535] flex items-center justify-between">
        <button
          type="button"
          disabled={disabled || grandTotal === 0}
          onClick={handleReset}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-surface border border-[#353535] hover:border-foreground/40 text-[11px] text-foreground/60 hover:text-white transition-colors disabled:opacity-30 cursor-pointer"
        >
          <RotateCcw className="w-3 h-3" />
          <span>Remettre à zéro</span>
        </button>

        <div className="flex items-center gap-3">
          <span className="text-[11px] text-foreground/60 uppercase font-bold">
            Total Espèces Compté :
          </span>
          <span className="font-anybody font-black text-xl text-primary sport-skew">
            {grandTotal.toFixed(2)} €
          </span>
        </div>
      </div>
    </div>
  );
}
