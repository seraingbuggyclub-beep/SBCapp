'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { MemberBalanceItem } from '@/types/models';
import {
  getMembersBalancesList,
  topUpMemberWallet,
} from '../actions';
import {
  Wallet,
  FileText,
  Search,
  RefreshCw,
  PlusCircle,
  CheckCircle,
  Coins,
  ArrowUpRight,
  ArrowDownLeft,
  X,
  AlertCircle,
  Check,
  CreditCard,
  Building2,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';

export default function BarAccountsManager() {
  const [members, setMembers] = useState<MemberBalanceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'debts' | 'credits'>('all');

  // Notifications
  const [msg, setMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Modal Action State
  const [selectedMember, setSelectedMember] = useState<MemberBalanceItem | null>(null);
  const [actionAmount, setActionAmount] = useState<string>('20');
  const [actionMethod, setActionMethod] = useState<string>('Virement');
  const [actionLoading, setActionLoading] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    const res = await getMembersBalancesList();
    setMembers(res.data || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // KPIs
  const metrics = useMemo(() => {
    let totalDebts = 0;
    let totalCredits = 0;
    let debtsCount = 0;
    let creditsCount = 0;

    for (const m of members) {
      const net = m.wallet_balance;
      if (net < 0) {
        totalDebts += Math.abs(net);
        debtsCount++;
      } else if (net > 0) {
        totalCredits += net;
        creditsCount++;
      }
      // prise en compte rétrocompatible tab_balance si non nul
      if (m.tab_balance > 0 && net >= 0) {
        totalDebts += m.tab_balance;
        debtsCount++;
      }
    }

    return { totalDebts, totalCredits, debtsCount, creditsCount };
  }, [members]);

  // Filtrage
  const filteredMembers = useMemo(() => {
    return members.filter((m) => {
      const q = searchQuery.toLowerCase().trim();
      const matchSearch =
        q === '' ||
        `${m.first_name} ${m.last_name}`.toLowerCase().includes(q) ||
        m.email.toLowerCase().includes(q) ||
        (m.phone && m.phone.includes(q));

      if (!matchSearch) return false;

      const isDebt = m.wallet_balance < 0 || m.tab_balance > 0;
      const isCredit = m.wallet_balance > 0;

      if (filterType === 'debts') return isDebt;
      if (filterType === 'credits') return isCredit;
      // 'all' : n'affiche par défaut que les non-nuls sauf si recherche active
      if (q === '') {
        return isDebt || isCredit;
      }
      return true;
    });
  }, [members, searchQuery, filterType]);

  // Soumission action de crédit
  const handleExecuteCredit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMember || Number(actionAmount) <= 0) return;

    setActionLoading(true);
    setMsg(null);

    const amountNum = Number(actionAmount);
    const res = await topUpMemberWallet(selectedMember.id, amountNum, actionMethod);

    setActionLoading(false);

    if (res.success) {
      const newBal = res.newBalance !== undefined ? res.newBalance : selectedMember.wallet_balance + amountNum;
      setMsg({
        text: `Compte de ${selectedMember.first_name} ${selectedMember.last_name} crédité de ${amountNum.toFixed(2)} € avec succès (${actionMethod}) ! Nouveau solde : ${newBal >= 0 ? `+${newBal.toFixed(2)} €` : `-${Math.abs(newBal).toFixed(2)} €`}`,
        type: 'success',
      });
      setSelectedMember(null);
      loadData();
    } else {
      setMsg({ text: res.error || "Erreur lors de l'opération", type: 'error' });
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* 1. KPIS TRÉSORERIE BUVETTE */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Total Ardoises Dues (Soldes négatifs) */}
        <div className="p-4 rounded-2xl bg-surface border border-rose-500/30 flex items-center justify-between shadow-[0_0_25px_rgba(244,63,94,0.1)]">
          <div className="space-y-1">
            <span className="text-[10px] font-mono text-rose-400 uppercase block font-bold flex items-center gap-1.5">
              <TrendingDown className="w-3.5 h-3.5" />
              🔴 Total Ardoises à Recouvrer
            </span>
            <span className="font-anybody font-black text-2xl text-rose-400 sport-skew">
              -{metrics.totalDebts.toFixed(2)} €
            </span>
            <p className="text-[10px] text-foreground/50 font-mono">
              {metrics.debtsCount} membre{metrics.debtsCount > 1 ? 's' : ''} avec ardoise
            </p>
          </div>
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400">
            <FileText className="w-5 h-5" />
          </div>
        </div>

        {/* Total Portefeuilles Prépayés (Soldes positifs) */}
        <div className="p-4 rounded-2xl bg-surface border border-emerald-500/30 flex items-center justify-between shadow-[0_0_25px_rgba(52,211,153,0.1)]">
          <div className="space-y-1">
            <span className="text-[10px] font-mono text-emerald-400 uppercase block font-bold flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5" />
              🟢 Total Comptes Prépayés
            </span>
            <span className="font-anybody font-black text-2xl text-emerald-400 sport-skew">
              +{metrics.totalCredits.toFixed(2)} €
            </span>
            <p className="text-[10px] text-foreground/50 font-mono">
              {metrics.creditsCount} membre{metrics.creditsCount > 1 ? 's' : ''} en crédit d&apos;avance
            </p>
          </div>
          <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
            <Wallet className="w-5 h-5" />
          </div>
        </div>

        {/* Balance Nette Buvette */}
        <div className="p-4 rounded-2xl bg-surface border border-[#353535] flex items-center justify-between shadow-[3px_3px_0px_#000] col-span-1 sm:col-span-2 lg:col-span-1">
          <div className="space-y-1">
            <span className="text-[10px] font-mono text-primary uppercase block font-bold">
              Solde Net Prépayé / Dette
            </span>
            <span
              className={`font-anybody font-black text-2xl sport-skew ${
                metrics.totalCredits - metrics.totalDebts >= 0 ? 'text-white' : 'text-rose-400'
              }`}
            >
              {(metrics.totalCredits - metrics.totalDebts).toFixed(2)} €
            </span>
            <p className="text-[10px] text-foreground/50 font-mono">
              Différentiel trésorerie buvette
            </p>
          </div>
          <div className="p-3 rounded-xl bg-primary/10 border border-primary/30 text-primary">
            <Coins className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Notifications */}
      {msg && (
        <div
          className={`p-3.5 rounded-xl border text-xs font-mono flex items-center justify-between animate-fade-in ${
            msg.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
              : 'bg-rose-500/15 border-rose-500/40 text-rose-300'
          }`}
        >
          <span>{msg.text}</span>
          <button onClick={() => setMsg(null)} className="text-foreground/40 hover:text-white">
            ×
          </button>
        </div>
      )}

      {/* 2. FILTRES & RECHERCHE */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-surface p-3.5 rounded-xl border border-[#353535]">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-foreground/40 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Rechercher un pilote par nom, email..."
            className="w-full bg-background border border-[#353535] rounded-lg pl-9 pr-3 py-1.5 text-xs text-white placeholder-foreground/40 focus:outline-none focus:border-primary font-mono"
          />
        </div>

        <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto no-scrollbar">
          <button
            type="button"
            onClick={() => setFilterType('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-colors cursor-pointer shrink-0 ${
              filterType === 'all' ? 'bg-primary text-black font-bold' : 'bg-surface-high text-foreground/70 hover:text-white'
            }`}
          >
            Tous les soldes
          </button>

          <button
            type="button"
            onClick={() => setFilterType('debts')}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-colors cursor-pointer shrink-0 ${
              filterType === 'debts'
                ? 'bg-rose-500 text-white font-bold shadow-[0_0_10px_rgba(244,63,94,0.4)]'
                : 'bg-surface-high text-rose-300 hover:bg-rose-500/20'
            }`}
          >
            🔴 Ardoises ({metrics.debtsCount})
          </button>

          <button
            type="button"
            onClick={() => setFilterType('credits')}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-colors cursor-pointer shrink-0 ${
              filterType === 'credits'
                ? 'bg-emerald-500 text-black font-bold shadow-[0_0_10px_rgba(52,211,153,0.4)]'
                : 'bg-surface-high text-emerald-400 hover:bg-emerald-500/20'
            }`}
          >
            🟢 Prépayés ({metrics.creditsCount})
          </button>

          <button
            type="button"
            onClick={loadData}
            className="p-1.5 rounded-lg bg-surface-high hover:bg-surface-dim border border-[#353535] text-foreground/60 hover:text-white transition-colors"
            title="Rafraîchir"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* 3. TABLEAU DES COMPTES MEMBRES */}
      <div className="bg-surface rounded-2xl border border-[#353535] overflow-hidden shadow-[0_0_30px_rgba(0,0,0,0.5)]">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse font-mono text-xs">
            <thead>
              <tr className="border-b border-[#353535] bg-surface-dim text-[10px] font-anybody font-bold text-foreground/50 uppercase tracking-wider">
                <th className="px-4 py-3.5">Pilote / Membre</th>
                <th className="px-4 py-3.5">Contact</th>
                <th className="px-4 py-3.5 text-center">État du Compte</th>
                <th className="px-4 py-3.5 text-right">Solde Buvette</th>
                <th className="px-4 py-3.5 text-right">Action Trésorier</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#353535]/50">
              {loading ? (
                <tr>
                  <td colSpan={5} className="text-center py-12 text-foreground/40">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto text-primary mb-2" />
                    Chargement des soldes buvette...
                  </td>
                </tr>
              ) : filteredMembers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-10 text-foreground/40">
                    Aucun compte membre correspondant au filtre sélectionné.
                  </td>
                </tr>
              ) : (
                filteredMembers.map((m) => {
                  const isDebt = m.wallet_balance < 0;
                  const isPositive = m.wallet_balance > 0;
                  const isZero = m.wallet_balance === 0;

                  return (
                    <tr key={m.id} className="hover:bg-surface-high/30 transition-colors">
                      <td className="px-4 py-3.5 font-bold text-white font-sans text-sm">
                        {m.first_name} {m.last_name}
                      </td>
                      <td className="px-4 py-3.5 text-foreground/60 text-[11px]">
                        <div>{m.email}</div>
                        {m.phone && <div className="text-[10px] text-foreground/40">{m.phone}</div>}
                      </td>
                      <td className="px-4 py-3.5 text-center">
                        {isDebt ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/15 border border-rose-500/30 text-rose-300">
                            🔴 Ardoise / Dette
                          </span>
                        ) : isPositive ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 border border-emerald-500/30 text-emerald-300">
                            🟢 Prépayé (Crédit)
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-surface-dim border border-[#353535] text-foreground/40">
                            Neutre (0.00 €)
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-right font-bold text-sm">
                        {isDebt ? (
                          <span className="text-rose-400 font-black">
                            -{Math.abs(m.wallet_balance).toFixed(2)} €
                          </span>
                        ) : isPositive ? (
                          <span className="text-emerald-400 font-black">
                            +{m.wallet_balance.toFixed(2)} €
                          </span>
                        ) : (
                          <span className="text-foreground/40">0.00 €</span>
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedMember(m);
                              setActionAmount(isDebt ? Math.abs(m.wallet_balance).toString() : '20');
                            }}
                            className="px-3 py-1.5 rounded-lg bg-primary/10 hover:bg-primary/20 border border-primary/30 text-primary hover:border-primary text-[11px] font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer sport-skew"
                            title="Créditer le compte membre (virement ou espèces)"
                          >
                            <PlusCircle className="w-3.5 h-3.5" />
                            <span className="transform skew-x-8">
                              {isDebt ? 'Apurer / Créditer' : 'Créditer'}
                            </span>
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

      {/* 4. MODAL ACTION ADMIN : CRÉDITER COMPTE (VIREMENT OU CASH) */}
      {selectedMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in">
          <div
            className="absolute inset-0"
            onClick={() => setSelectedMember(null)}
          />
          <form
            onSubmit={handleExecuteCredit}
            className="relative z-10 w-full max-w-sm bg-[#121212] border border-[#353535] rounded-2xl p-5 space-y-4 shadow-[0_0_50px_rgba(0,0,0,0.9)] font-mono text-xs"
          >
            <div className="flex items-center justify-between border-b border-[#353535] pb-3">
              <h3 className="font-anybody font-bold text-sm uppercase text-white tracking-tight sport-skew">
                Créditer le compte pilote
              </h3>
              <button
                type="button"
                onClick={() => setSelectedMember(null)}
                className="text-foreground/40 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Fiche Membre */}
            <div className="p-3.5 rounded-xl bg-surface border border-[#353535] space-y-1.5">
              <span className="text-foreground/50 text-[10px] block uppercase font-bold">Pilote concerné</span>
              <strong className="text-white text-sm font-sans block">
                {selectedMember.first_name} {selectedMember.last_name}
              </strong>
              <div className="text-[11px] text-foreground/70 flex items-center gap-2 pt-1 border-t border-[#353535]">
                <span>Solde actuel :</span>
                <strong className={selectedMember.wallet_balance < 0 ? 'text-rose-400 font-bold' : 'text-emerald-400 font-bold'}>
                  {selectedMember.wallet_balance < 0
                    ? `Ardoise de -${Math.abs(selectedMember.wallet_balance).toFixed(2)} €`
                    : `+${selectedMember.wallet_balance.toFixed(2)} €`}
                </strong>
              </div>
            </div>

            {/* Saisie Montant */}
            <div className="space-y-1.5">
              <label className="text-foreground/70 text-[11px] block font-bold">
                Montant reçu à créditer (€) * :
              </label>
              <input
                type="number"
                step="0.50"
                min="0.50"
                value={actionAmount}
                onChange={(e) => setActionAmount(e.target.value)}
                className="w-full bg-surface border border-[#353535] rounded-xl px-3 py-2.5 text-lg font-bold text-primary focus:outline-none focus:border-primary"
                required
                autoFocus
              />
              {selectedMember.wallet_balance < 0 && (
                <button
                  type="button"
                  onClick={() => setActionAmount(Math.abs(selectedMember.wallet_balance).toString())}
                  className="text-[10px] text-rose-400 hover:underline block pt-0.5"
                >
                  Régler exactement la dette ({Math.abs(selectedMember.wallet_balance).toFixed(2)} €)
                </button>
              )}
            </div>

            {/* Moyen de Paiement Reçu */}
            <div className="space-y-1.5">
              <label className="text-foreground/70 text-[11px] block font-bold">Moyen de règlement reçu :</label>
              <select
                value={actionMethod}
                onChange={(e) => setActionMethod(e.target.value)}
                className="w-full bg-surface border border-[#353535] rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-primary cursor-pointer font-sans"
              >
                <option value="Virement">Virement bancaire (SEPA)</option>
                <option value="Espèces">Espèces (Cash Buvette)</option>
                <option value="Payconiq">Payconiq QR Direct</option>
              </select>
            </div>

            {/* Boutons */}
            <div className="pt-2 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setSelectedMember(null)}
                className="px-4 py-2.5 rounded-xl bg-surface border border-[#353535] text-foreground/70 hover:text-white"
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={actionLoading}
                className="px-5 py-2.5 rounded-xl bg-primary text-black font-anybody font-black uppercase text-xs tracking-wider hover:bg-secondary hover:text-white transition-colors cursor-pointer disabled:opacity-50 sport-skew shadow-[0_0_15px_rgba(255,110,0,0.3)]"
              >
                <span className="transform skew-x-8">
                  {actionLoading ? 'Enregistrement...' : 'Confirmer le crédit'}
                </span>
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
