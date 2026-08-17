'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { MemberBalanceItem } from '@/types/models';
import {
  getMembersBalancesList,
  topUpMemberWallet,
  settleMemberTab,
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
} from 'lucide-react';

export default function BarAccountsManager() {
  const [members, setMembers] = useState<MemberBalanceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'tabs' | 'wallets'>('all');

  // Notifications
  const [msg, setMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Modal Action State
  const [selectedMember, setSelectedMember] = useState<MemberBalanceItem | null>(null);
  const [actionType, setActionType] = useState<'topup' | 'settle' | null>(null);
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
    const totalTabsDue = members.reduce((sum, m) => sum + m.tab_balance, 0);
    const totalWalletsHeld = members.reduce((sum, m) => sum + m.wallet_balance, 0);
    const tabsCount = members.filter((m) => m.tab_balance > 0).length;
    const walletsCount = members.filter((m) => m.wallet_balance > 0).length;

    return { totalTabsDue, totalWalletsHeld, tabsCount, walletsCount };
  }, [members]);

  // Filtrage
  const filteredMembers = useMemo(() => {
    return members.filter((m) => {
      const q = searchQuery.toLowerCase();
      const matchSearch =
        `${m.first_name} ${m.last_name}`.toLowerCase().includes(q) ||
        m.email.toLowerCase().includes(q);

      if (!matchSearch) return false;

      if (filterType === 'tabs') return m.tab_balance > 0;
      if (filterType === 'wallets') return m.wallet_balance > 0;
      return true;
    });
  }, [members, searchQuery, filterType]);

  // Soumission action
  const handleExecuteAction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMember || !actionType || Number(actionAmount) <= 0) return;

    setActionLoading(true);
    setMsg(null);

    let res: { success: boolean; error: string | null };
    if (actionType === 'topup') {
      res = await topUpMemberWallet(
        selectedMember.id,
        Number(actionAmount),
        actionMethod
      );
    } else {
      res = await settleMemberTab(
        selectedMember.id,
        Number(actionAmount),
        actionMethod
      );
    }

    setActionLoading(false);

    if (res.success) {
      setMsg({
        text: actionType === 'topup'
          ? `Portefeuille de ${selectedMember.first_name} crédité de ${Number(actionAmount).toFixed(2)} € !`
          : `Ardoise de ${selectedMember.first_name} réduite de ${Number(actionAmount).toFixed(2)} € !`,
        type: 'success',
      });
      setSelectedMember(null);
      setActionType(null);
      loadData();
    } else {
      setMsg({ text: res.error || "Erreur lors de l'opération", type: 'error' });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Total Ardoises Dues */}
        <div className="p-4 rounded-xl bg-surface border border-yellow-500/30 flex items-center justify-between shadow-[3px_3px_0px_#000]">
          <div className="space-y-1">
            <span className="text-[10px] font-mono text-yellow-400 uppercase block font-bold">
              Total Ardoises à Recouvrer
            </span>
            <span className="font-anybody font-black text-2xl text-yellow-400">
              {metrics.totalTabsDue.toFixed(2)} €
            </span>
            <p className="text-[10px] text-foreground/50 font-mono">
              {metrics.tabsCount} membres ayant des consommations impayées
            </p>
          </div>
          <div className="p-3 rounded-xl bg-yellow-500/10 border border-yellow-500/30 text-yellow-400">
            <FileText className="w-5 h-5" />
          </div>
        </div>

        {/* Total Portefeuilles Prépayés */}
        <div className="p-4 rounded-xl bg-surface border border-primary/30 flex items-center justify-between shadow-[3px_3px_0px_#000]">
          <div className="space-y-1">
            <span className="text-[10px] font-mono text-primary uppercase block font-bold">
              Total Portefeuilles Prépayés
            </span>
            <span className="font-anybody font-black text-2xl text-primary">
              {metrics.totalWalletsHeld.toFixed(2)} €
            </span>
            <p className="text-[10px] text-foreground/50 font-mono">
              {metrics.walletsCount} membres avec un solde positif disponible
            </p>
          </div>
          <div className="p-3 rounded-xl bg-primary/10 border border-primary/30 text-primary">
            <Wallet className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Notifications */}
      {msg && (
        <div
          className={`p-3.5 rounded-xl border text-xs font-mono flex items-center justify-between animate-fade-in ${
            msg.type === 'success'
              ? 'bg-primary/10 border-primary/30 text-primary'
              : 'bg-secondary/15 border-secondary/40 text-secondary'
          }`}
        >
          <span>{msg.text}</span>
          <button onClick={() => setMsg(null)} className="text-foreground/40 hover:text-white">
            ×
          </button>
        </div>
      )}

      {/* Filtres & Recherche */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-surface p-3.5 rounded-xl border border-[#353535]">
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-foreground/40 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Rechercher par nom, email..."
            className="w-full bg-background border border-[#353535] rounded-lg pl-9 pr-3 py-1.5 text-xs text-white placeholder-foreground/40 focus:outline-none focus:border-primary font-mono"
          />
        </div>

        <div className="flex items-center gap-1.5 w-full sm:w-auto">
          <button
            onClick={() => setFilterType('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-colors cursor-pointer ${
              filterType === 'all' ? 'bg-primary text-black font-bold' : 'bg-surface-high text-foreground/70 hover:text-white'
            }`}
          >
            Tous ({members.length})
          </button>

          <button
            onClick={() => setFilterType('tabs')}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-colors cursor-pointer ${
              filterType === 'tabs' ? 'bg-yellow-500 text-black font-bold' : 'bg-surface-high text-yellow-400 hover:bg-yellow-500/20'
            }`}
          >
            Ardoises ({metrics.tabsCount})
          </button>

          <button
            onClick={() => setFilterType('wallets')}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-colors cursor-pointer ${
              filterType === 'wallets' ? 'bg-primary text-black font-bold' : 'bg-surface-high text-primary hover:bg-primary/20'
            }`}
          >
            Portefeuilles ({metrics.walletsCount})
          </button>
        </div>
      </div>

      {/* Tableau des comptes */}
      <div className="bg-surface rounded-xl border border-[#353535] overflow-hidden shadow-[4px_4px_0px_#000]">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse font-mono text-xs">
            <thead>
              <tr className="border-b border-[#353535] bg-surface-dim text-[10px] font-anybody font-bold text-foreground/50 uppercase tracking-wider">
                <th className="px-4 py-3">Membre</th>
                <th className="px-4 py-3">Email & Contact</th>
                <th className="px-4 py-3 text-right">Solde Portefeuille</th>
                <th className="px-4 py-3 text-right">Ardoise Due</th>
                <th className="px-4 py-3 text-right">Actions Rapides</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#353535]/50">
              {filteredMembers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-10 text-foreground/40">
                    Aucun compte membre avec solde ou ardoise trouvé.
                  </td>
                </tr>
              ) : (
                filteredMembers.map((m) => (
                  <tr key={m.id} className="hover:bg-surface-high/30 transition-colors">
                    <td className="px-4 py-3 font-bold text-white font-sans text-sm">
                      {m.first_name} {m.last_name}
                    </td>
                    <td className="px-4 py-3 text-foreground/60 text-[11px]">
                      {m.email}
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-primary">
                      {m.wallet_balance > 0 ? `${m.wallet_balance.toFixed(2)} €` : '-'}
                    </td>
                    <td className="px-4 py-3 text-right font-bold">
                      {m.tab_balance > 0 ? (
                        <span className="text-yellow-400 font-bold bg-yellow-500/10 px-2 py-0.5 rounded border border-yellow-500/30">
                          {m.tab_balance.toFixed(2)} €
                        </span>
                      ) : (
                        <span className="text-foreground/40">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => {
                            setSelectedMember(m);
                            setActionType('topup');
                            setActionAmount('20');
                          }}
                          className="px-2.5 py-1 rounded bg-primary/10 hover:bg-primary/20 border border-primary/30 text-primary text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 transition-colors cursor-pointer"
                          title="Créditer le portefeuille"
                        >
                          <PlusCircle className="w-3 h-3" />
                          <span>Recharger</span>
                        </button>

                        {m.tab_balance > 0 && (
                          <button
                            onClick={() => {
                              setSelectedMember(m);
                              setActionType('settle');
                              setActionAmount(m.tab_balance.toString());
                            }}
                            className="px-2.5 py-1 rounded bg-yellow-500/15 hover:bg-yellow-500/25 border border-yellow-500/40 text-yellow-400 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 transition-colors cursor-pointer"
                            title="Régler l'ardoise"
                          >
                            <Check className="w-3 h-3" />
                            <span>Régler Ardoise</span>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL ACTION RECHARGE / RÈGLEMENT */}
      {selectedMember && actionType && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in">
          <div
            className="absolute inset-0"
            onClick={() => {
              setSelectedMember(null);
              setActionType(null);
            }}
          />
          <form
            onSubmit={handleExecuteAction}
            className="relative z-10 w-full max-w-sm bg-[#0f0f0f] border border-[#353535] rounded-2xl p-5 space-y-4 shadow-[0_0_50px_rgba(0,0,0,0.9)] font-mono text-xs"
          >
            <div className="flex items-center justify-between border-b border-[#292929] pb-3">
              <h3 className="font-anybody font-bold text-sm uppercase text-white">
                {actionType === 'topup' ? 'Recharger le Portefeuille' : "Régler l'Ardoise"}
              </h3>
              <button
                type="button"
                onClick={() => {
                  setSelectedMember(null);
                  setActionType(null);
                }}
                className="text-foreground/40 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3 rounded-xl bg-surface border border-[#353535] space-y-1">
              <span className="text-foreground/50 text-[10px] block uppercase">Membre</span>
              <strong className="text-white text-sm block">
                {selectedMember.first_name} {selectedMember.last_name}
              </strong>
              <div className="text-[11px] text-foreground/60 flex gap-2 pt-1">
                <span>Solde : {selectedMember.wallet_balance.toFixed(2)} €</span>
                <span>•</span>
                <span className="text-yellow-400">Ardoise : {selectedMember.tab_balance.toFixed(2)} €</span>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-foreground/70 block">Montant (€) * :</label>
              <input
                type="number"
                step="0.50"
                min="0.50"
                value={actionAmount}
                onChange={(e) => setActionAmount(e.target.value)}
                className="w-full bg-surface border border-[#353535] rounded-lg px-3 py-2 text-lg font-bold text-primary focus:outline-none focus:border-primary"
                required
                autoFocus
              />
            </div>

            <div className="space-y-1">
              <label className="text-foreground/70 block">Moyen de règlement :</label>
              <select
                value={actionMethod}
                onChange={(e) => setActionMethod(e.target.value)}
                className="w-full bg-surface border border-[#353535] rounded-lg px-3 py-2 text-white focus:outline-none focus:border-primary cursor-pointer font-sans"
              >
                <option value="Virement">Virement bancaire</option>
                <option value="Espèces">Espèces (Cash)</option>
                <option value="Payconiq">Payconiq</option>
              </select>
            </div>

            <div className="pt-2 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setSelectedMember(null);
                  setActionType(null);
                }}
                className="px-3 py-2 rounded-lg bg-surface border border-[#353535] text-foreground/70 hover:text-white"
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={actionLoading}
                className="px-5 py-2 rounded-lg bg-primary text-black font-anybody font-black uppercase text-xs tracking-wider hover:bg-secondary hover:text-white transition-colors cursor-pointer"
              >
                {actionLoading ? 'Validation...' : 'Valider'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
