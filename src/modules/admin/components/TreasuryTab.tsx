'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  MembershipPaymentItem,
  MembershipPricing,
  SpecialRateItem,
} from '@/types/models';
import {
  getTreasuryPaymentsList,
  updateClubMembershipPricing,
  validateMembershipPayment,
  revertMembershipPayment,
} from '@/modules/payments/actions';
import {
  Coins,
  CheckCircle2,
  AlertTriangle,
  Clock,
  RefreshCw,
  Plus,
  Trash2,
  Save,
  Check,
  CreditCard,
  Banknote,
  Search,
  Filter,
  Sparkles,
  Calendar,
  Shield,
  Trophy,
  Tag,
  ArrowRight,
  TrendingUp,
} from 'lucide-react';

interface TreasuryTabProps {
  canEdit: boolean;
  isSimulated?: boolean;
}

export default function TreasuryTab({ canEdit, isSimulated = false }: TreasuryTabProps) {
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState<number>(currentYear);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const [activeSubTab, setActiveSubTab] = useState<'ledger' | 'pricing'>('ledger');

  const [payments, setPayments] = useState<MembershipPaymentItem[]>([]);
  const [pricing, setPricing] = useState<MembershipPricing | null>(null);
  const [loading, setLoading] = useState(true);

  // Notifications
  const [msg, setMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  // Pricing Form State
  const [priceWithFba, setPriceWithFba] = useState<number>(85);
  const [priceWithoutFba, setPriceWithoutFba] = useState<number>(55);
  const [belgianChampionshipFee, setBelgianChampionshipFee] = useState<number>(20);
  const [specialRates, setSpecialRates] = useState<SpecialRateItem[]>([]);
  const [discountEnabled, setDiscountEnabled] = useState<boolean>(false);
  const [discountAmount, setDiscountAmount] = useState<number>(15);
  const [discountLabel, setDiscountLabel] = useState<string>('Réduction mi-saison');
  const [discountStartDate, setDiscountStartDate] = useState<string>('');
  const [discountEndDate, setDiscountEndDate] = useState<string>('');
  const [savingPricing, setSavingPricing] = useState<boolean>(false);

  // Chargement des données
  const fetchTreasuryData = useCallback(async () => {
    setLoading(true);
    const res = await getTreasuryPaymentsList(selectedYear, statusFilter);
    if (res.error) {
      setMsg({ text: `Erreur : ${res.error}`, type: 'error' });
    } else {
      setPayments(res.data || []);
      if (res.pricing) {
        setPricing(res.pricing);
        setPriceWithFba(res.pricing.price_with_fba);
        setPriceWithoutFba(res.pricing.price_without_fba);
        setBelgianChampionshipFee(res.pricing.belgian_championship_fee);
        setSpecialRates(res.pricing.special_rates || []);
        setDiscountEnabled(res.pricing.discount_enabled);
        setDiscountAmount(res.pricing.discount_amount);
        setDiscountLabel(res.pricing.discount_label);
        setDiscountStartDate(res.pricing.discount_start_date || '');
        setDiscountEndDate(res.pricing.discount_end_date || '');
      }
    }
    setLoading(false);
  }, [selectedYear, statusFilter]);

  useEffect(() => {
    fetchTreasuryData();
  }, [fetchTreasuryData]);

  // Validation 1 clic
  const handleValidatePayment = async (paymentId: string, method: 'virement' | 'cash' | 'autre' = 'virement') => {
    if (isSimulated) {
      setMsg({ text: 'Simulation active : action bloquée.', type: 'error' });
      setTimeout(() => setMsg(null), 3000);
      return;
    }
    if (!canEdit) return;

    setActionLoadingId(paymentId);
    const res = await validateMembershipPayment(paymentId, method);
    setActionLoadingId(null);

    if (res.success) {
      setMsg({ text: 'Paiement validé avec succès. Statut du membre basculé en ordre (QR Blanc).', type: 'success' });
      fetchTreasuryData();
    } else {
      setMsg({ text: `Erreur : ${res.error}`, type: 'error' });
    }
    setTimeout(() => setMsg(null), 4000);
  };

  // Annulation / remise en attente
  const handleRevertPayment = async (paymentId: string) => {
    if (isSimulated) {
      setMsg({ text: 'Simulation active : action bloquée.', type: 'error' });
      setTimeout(() => setMsg(null), 3000);
      return;
    }
    if (!canEdit) return;

    setActionLoadingId(paymentId);
    const res = await revertMembershipPayment(paymentId);
    setActionLoadingId(null);

    if (res.success) {
      setMsg({ text: 'Paiement remis en attente.', type: 'success' });
      fetchTreasuryData();
    } else {
      setMsg({ text: `Erreur : ${res.error}`, type: 'error' });
    }
    setTimeout(() => setMsg(null), 4000);
  };

  // Sauvegarde des tarifs
  const handleSavePricing = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSimulated) {
      setMsg({ text: 'Simulation active : modification des tarifs bloquée.', type: 'error' });
      setTimeout(() => setMsg(null), 3000);
      return;
    }
    if (!canEdit) return;

    setSavingPricing(true);
    const res = await updateClubMembershipPricing({
      year: selectedYear,
      price_with_fba: Number(priceWithFba),
      price_without_fba: Number(priceWithoutFba),
      belgian_championship_fee: Number(belgianChampionshipFee),
      special_rates: specialRates,
      discount_enabled: discountEnabled,
      discount_amount: Number(discountAmount),
      discount_label: discountLabel,
      discount_start_date: discountStartDate || null,
      discount_end_date: discountEndDate || null,
    });
    setSavingPricing(false);

    if (res.success) {
      setMsg({ text: 'Grille tarifaire et réductions enregistrées avec succès.', type: 'success' });
      fetchTreasuryData();
    } else {
      setMsg({ text: `Erreur : ${res.error}`, type: 'error' });
    }
    setTimeout(() => setMsg(null), 4000);
  };

  // Gestion des tarifs spéciaux
  const handleAddSpecialRate = () => {
    const newId = `custom-${Date.now()}`;
    setSpecialRates([
      ...specialRates,
      { id: newId, label: 'Nouveau Tarif Spécial', amount: 50, description: '' },
    ]);
  };

  const handleRemoveSpecialRate = (id: string) => {
    setSpecialRates(specialRates.filter((r) => r.id !== id));
  };

  const handleUpdateSpecialRate = (id: string, field: keyof SpecialRateItem, val: string | number) => {
    setSpecialRates(
      specialRates.map((r) => (r.id === id ? { ...r, [field]: val } : r))
    );
  };

  // KPIs financiers
  const metrics = useMemo(() => {
    const totalCollected = payments
      .filter((p) => p.status === 'paid')
      .reduce((sum, p) => sum + Number(p.amount || 0), 0);

    const paidCount = payments.filter((p) => p.status === 'paid').length;
    const pendingCount = payments.filter((p) => p.status === 'pending').length;

    return { totalCollected, paidCount, pendingCount, totalCount: payments.length };
  }, [payments]);

  // Filtrage recherche
  const filteredPayments = useMemo(() => {
    return payments.filter((p) => {
      const q = searchQuery.toLowerCase();
      const memberName = `${p.sbc_members?.first_name || ''} ${p.sbc_members?.last_name || ''}`.toLowerCase();
      const memberEmail = (p.sbc_members?.email || '').toLowerCase();
      const license = (p.license_number || p.sbc_members?.license_number || '').toLowerCase();
      return memberName.includes(q) || memberEmail.includes(q) || license.includes(q);
    });
  }, [payments, searchQuery]);

  return (
    <div className="space-y-6">
      {/* Header & SubTabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-surface border border-[#353535] p-5 rounded-2xl">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Coins className="w-5 h-5 text-primary" />
            <h2 className="font-anybody font-black text-lg md:text-xl uppercase tracking-tight text-white sport-skew">
              Trésorerie & Cotisations SBC
            </h2>
          </div>
          <p className="text-xs text-foreground/60 font-mono">
            Gestion du livre de recettes, encaissements bancaires et paramétrage des tarifs officiels.
          </p>
        </div>

        {/* SubTab switcher */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveSubTab('ledger')}
            className={`px-3.5 py-2 rounded-lg font-anybody font-bold text-xs uppercase tracking-wider transition-all sport-skew flex items-center gap-1.5 cursor-pointer ${
              activeSubTab === 'ledger'
                ? 'bg-primary text-black shadow-[2px_2px_0px_#000]'
                : 'bg-surface-high border border-[#353535] text-foreground/70 hover:text-white'
            }`}
          >
            <Banknote className="w-3.5 h-3.5" />
            <span className="transform skew-x-8">Livre de Recettes</span>
          </button>

          <button
            onClick={() => setActiveSubTab('pricing')}
            className={`px-3.5 py-2 rounded-lg font-anybody font-bold text-xs uppercase tracking-wider transition-all sport-skew flex items-center gap-1.5 cursor-pointer ${
              activeSubTab === 'pricing'
                ? 'bg-primary text-black shadow-[2px_2px_0px_#000]'
                : 'bg-surface-high border border-[#353535] text-foreground/70 hover:text-white'
            }`}
          >
            <Tag className="w-3.5 h-3.5" />
            <span className="transform skew-x-8">Tarifs & Réductions</span>
          </button>

          <button
            onClick={fetchTreasuryData}
            disabled={loading}
            className="p-2 rounded-lg bg-surface-high hover:bg-surface border border-[#353535] text-foreground/70 hover:text-white transition-colors cursor-pointer"
            title="Actualiser"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
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

      {/* SUBTAB 1 : LIVRE DE RECETTES */}
      {activeSubTab === 'ledger' && (
        <div className="space-y-6">
          {/* KPIs Financiers */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Total Encaissé */}
            <div className="p-4 rounded-xl bg-surface border border-green-500/30 flex items-center justify-between shadow-[3px_3px_0px_#000]">
              <div className="space-y-1">
                <span className="text-[10px] font-mono text-foreground/50 uppercase block">
                  Total Encaissé ({selectedYear})
                </span>
                <span className="font-anybody font-black text-2xl text-green-400">
                  {metrics.totalCollected.toFixed(2)} €
                </span>
              </div>
              <div className="p-3 rounded-xl bg-green-500/10 border border-green-500/30 text-green-400">
                <TrendingUp className="w-5 h-5" />
              </div>
            </div>

            {/* Cotisations Réglées */}
            <div className="p-4 rounded-xl bg-surface border border-primary/30 flex items-center justify-between shadow-[3px_3px_0px_#000]">
              <div className="space-y-1">
                <span className="text-[10px] font-mono text-foreground/50 uppercase block">
                  Cotisations Réglées
                </span>
                <span className="font-anybody font-black text-2xl text-white">
                  {metrics.paidCount} <span className="text-xs font-normal text-foreground/50">pilotes</span>
                </span>
              </div>
              <div className="p-3 rounded-xl bg-primary/10 border border-primary/30 text-primary">
                <CheckCircle2 className="w-5 h-5" />
              </div>
            </div>

            {/* En Attente */}
            <div className="p-4 rounded-xl bg-surface border border-yellow-500/30 flex items-center justify-between shadow-[3px_3px_0px_#000]">
              <div className="space-y-1">
                <span className="text-[10px] font-mono text-foreground/50 uppercase block">
                  En Attente de Virement
                </span>
                <span className="font-anybody font-black text-2xl text-yellow-400">
                  {metrics.pendingCount} <span className="text-xs font-normal text-foreground/50">demandes</span>
                </span>
              </div>
              <div className="p-3 rounded-xl bg-yellow-500/10 border border-yellow-500/30 text-yellow-400">
                <Clock className="w-5 h-5" />
              </div>
            </div>
          </div>

          {/* Filtres & Recherche */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-surface p-3.5 rounded-xl border border-[#353535]">
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 text-foreground/40 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Rechercher pilote, licence, email..."
                className="w-full bg-background border border-[#353535] rounded-lg pl-9 pr-3 py-1.5 text-xs text-white placeholder-foreground/40 focus:outline-none focus:border-primary font-mono"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              {/* Année */}
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                className="bg-background border border-[#353535] rounded-lg px-3 py-1.5 text-xs font-mono text-white focus:outline-none focus:border-primary cursor-pointer"
              >
                <option value={currentYear}>Saison {currentYear}</option>
                <option value={currentYear - 1}>Saison {currentYear - 1}</option>
                <option value={currentYear + 1}>Saison {currentYear + 1}</option>
              </select>

              {/* Statut */}
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-background border border-[#353535] rounded-lg px-3 py-1.5 text-xs font-mono text-white focus:outline-none focus:border-primary cursor-pointer"
              >
                <option value="all">Tous les statuts</option>
                <option value="paid">Payé uniquement</option>
                <option value="pending">En attente uniquement</option>
              </select>
            </div>
          </div>

          {/* Tableau Grand Livre de Recettes */}
          <div className="bg-surface rounded-xl border border-[#353535] overflow-hidden shadow-[4px_4px_0px_#000]">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-[#353535] bg-surface-dim text-[10px] font-anybody font-bold text-foreground/50 uppercase tracking-wider">
                    <th className="px-4 py-3">Pilote</th>
                    <th className="px-4 py-3">Formule & Options</th>
                    <th className="px-4 py-3 text-right">Montant</th>
                    <th className="px-4 py-3 text-center">Statut</th>
                    <th className="px-4 py-3 text-center">Mode</th>
                    <th className="px-4 py-3 text-right">Action Rapide</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#353535]/50 font-mono text-xs">
                  {filteredPayments.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center py-10 text-foreground/40 font-mono">
                        Aucun enregistrement de cotisation trouvé pour cette sélection.
                      </td>
                    </tr>
                  ) : (
                    filteredPayments.map((p) => {
                      const isPaid = p.status === 'paid';
                      const isLoadingThis = actionLoadingId === p.id;

                      return (
                        <tr key={p.id} className="hover:bg-surface-high/30 transition-colors">
                          {/* Pilote */}
                          <td className="px-4 py-3">
                            <div className="font-bold text-white font-sans text-sm">
                              {p.sbc_members?.first_name} {p.sbc_members?.last_name}
                            </div>
                            <div className="text-[10px] text-foreground/45 flex items-center gap-1.5 mt-0.5">
                              <span>{p.sbc_members?.email}</span>
                              {p.license_number && (
                                <>
                                  <span>•</span>
                                  <span className="text-primary">Licence: {p.license_number}</span>
                                </>
                              )}
                            </div>
                          </td>

                          {/* Formule */}
                          <td className="px-4 py-3">
                            <div className="flex flex-col gap-1">
                              <span className="font-bold text-white text-xs">
                                {p.formula === 'with_fba'
                                  ? 'Cotisation + Assurance FBA'
                                  : p.formula === 'without_fba'
                                  ? 'Cotisation Seule (Sans FBA)'
                                  : 'Tarif Spécial Club'}
                              </span>

                              <div className="flex flex-wrap gap-1">
                                {p.includes_belgian_championship && (
                                  <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-yellow-500/15 text-yellow-400 border border-yellow-500/30">
                                    + Championnat Belgique
                                  </span>
                                )}
                                {p.applied_discount > 0 && (
                                  <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-primary/15 text-primary border border-primary/30">
                                    -{p.applied_discount} € Remise
                                  </span>
                                )}
                              </div>
                            </div>
                          </td>

                          {/* Montant */}
                          <td className="px-4 py-3 text-right">
                            <span className="font-anybody font-black text-base text-primary">
                              {Number(p.amount || 0).toFixed(2)} €
                            </span>
                          </td>

                          {/* Statut */}
                          <td className="px-4 py-3 text-center">
                            {isPaid ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-green-500/15 border border-green-500/30 text-green-400">
                                <CheckCircle2 className="w-3 h-3" />
                                Payé
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-yellow-500/15 border border-yellow-500/30 text-yellow-400 animate-pulse">
                                <Clock className="w-3 h-3" />
                                En attente
                              </span>
                            )}
                          </td>

                          {/* Mode */}
                          <td className="px-4 py-3 text-center text-foreground/60 text-[11px] uppercase">
                            {p.payment_method || 'Virement'}
                          </td>

                          {/* Action */}
                          <td className="px-4 py-3 text-right">
                            {isPaid ? (
                              <button
                                onClick={() => handleRevertPayment(p.id)}
                                disabled={isLoadingThis}
                                className="p-1.5 px-2.5 rounded bg-surface hover:bg-surface-high border border-[#353535] text-[10px] font-mono text-foreground/60 hover:text-secondary transition-colors cursor-pointer disabled:opacity-40"
                                title="Annuler et remettre en attente"
                              >
                                {isLoadingThis ? '...' : 'Remettre en attente'}
                              </button>
                            ) : (
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  onClick={() => handleValidatePayment(p.id, 'virement')}
                                  disabled={isLoadingThis}
                                  className="px-2.5 py-1 rounded bg-green-500/20 hover:bg-green-500/30 border border-green-500/40 text-green-400 text-[10px] font-mono font-bold uppercase tracking-wider flex items-center gap-1 transition-all cursor-pointer hover:scale-105 shadow-sm disabled:opacity-40"
                                  title="Valider la réception du virement"
                                >
                                  <Check className="w-3 h-3" />
                                  <span>{isLoadingThis ? 'Validation...' : 'Valider Virement'}</span>
                                </button>

                                <button
                                  onClick={() => handleValidatePayment(p.id, 'cash')}
                                  disabled={isLoadingThis}
                                  className="px-2 py-1 rounded bg-surface hover:bg-surface-high border border-[#353535] text-foreground/70 hover:text-white text-[10px] font-mono transition-colors cursor-pointer"
                                  title="Valider en Espèces / Cash"
                                >
                                  Cash
                                </button>
                              </div>
                            )}
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
      )}

      {/* SUBTAB 2 : TARIFS & RÉDUCTIONS */}
      {activeSubTab === 'pricing' && (
        <form onSubmit={handleSavePricing} className="space-y-6">
          {/* Tarifs Principaux */}
          <div className="p-5 rounded-xl bg-surface border border-[#353535] space-y-4">
            <div className="flex items-center gap-2 border-b border-[#353535] pb-3">
              <Tag className="w-4 h-4 text-primary" />
              <h3 className="font-anybody font-bold text-sm uppercase text-white tracking-wider">
                Grille des Tarifs Officiels ({selectedYear})
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 font-mono text-xs">
              {/* Avec FBA */}
              <div className="space-y-1.5">
                <label className="text-foreground/70 block">
                  Cotisation + Assurance FBA (€) :
                </label>
                <input
                  type="number"
                  step="0.50"
                  value={priceWithFba}
                  onChange={(e) => setPriceWithFba(Number(e.target.value))}
                  className="w-full bg-background border border-[#353535] rounded-lg px-3 py-2 text-white focus:outline-none focus:border-primary font-bold"
                  required
                />
                <span className="text-[10px] text-foreground/45">Tarif standard comprenant la couverture FBA du club</span>
              </div>

              {/* Sans FBA */}
              <div className="space-y-1.5">
                <label className="text-foreground/70 block">
                  Cotisation Seule / Sans FBA (€) :
                </label>
                <input
                  type="number"
                  step="0.50"
                  value={priceWithoutFba}
                  onChange={(e) => setPriceWithoutFba(Number(e.target.value))}
                  className="w-full bg-background border border-[#353535] rounded-lg px-3 py-2 text-white focus:outline-none focus:border-primary font-bold"
                  required
                />
                <span className="text-[10px] text-foreground/45">Obligation pour le pilote de renseigner sa licence FBA valide</span>
              </div>

              {/* Championnat Belgique */}
              <div className="space-y-1.5">
                <label className="text-foreground/70 block">
                  Supplément Championnat Belgique (€) :
                </label>
                <input
                  type="number"
                  step="0.50"
                  value={belgianChampionshipFee}
                  onChange={(e) => setBelgianChampionshipFee(Number(e.target.value))}
                  className="w-full bg-background border border-[#353535] rounded-lg px-3 py-2 text-white focus:outline-none focus:border-primary font-bold"
                  required
                />
                <span className="text-[10px] text-foreground/45">Option supplémentaire inscription classement national</span>
              </div>
            </div>
          </div>

          {/* Tarifs Spéciaux Personnalisables */}
          <div className="p-5 rounded-xl bg-surface border border-[#353535] space-y-4">
            <div className="flex items-center justify-between border-b border-[#353535] pb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-primary" />
                <h3 className="font-anybody font-bold text-sm uppercase text-white tracking-wider">
                  Tarifs Spéciaux Sur-Mesure
                </h3>
              </div>

              <button
                type="button"
                onClick={handleAddSpecialRate}
                className="px-3 py-1.5 rounded-lg bg-surface-high hover:bg-surface border border-[#353535] text-xs font-mono text-primary hover:text-white flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Ajouter un tarif</span>
              </button>
            </div>

            <div className="space-y-3 font-mono text-xs">
              {specialRates.length === 0 ? (
                <p className="text-foreground/40 text-xs py-2">
                  Aucun tarif spécial configuré. Cliquez sur « Ajouter un tarif » pour créer des formules spécifiques (ex: Jeune, Famille, etc.).
                </p>
              ) : (
                specialRates.map((rate) => (
                  <div key={rate.id} className="p-3.5 rounded-xl bg-background border border-[#353535] flex flex-col sm:flex-row items-center gap-3">
                    <div className="w-full sm:w-1/3">
                      <label className="text-[9px] text-foreground/45 uppercase block mb-1">Libellé</label>
                      <input
                        type="text"
                        value={rate.label}
                        onChange={(e) => handleUpdateSpecialRate(rate.id, 'label', e.target.value)}
                        placeholder="Ex: Tarif Jeune (-16 ans)"
                        className="w-full bg-surface border border-[#353535] rounded px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-primary font-bold"
                      />
                    </div>

                    <div className="w-full sm:w-1/4">
                      <label className="text-[9px] text-foreground/45 uppercase block mb-1">Montant (€)</label>
                      <input
                        type="number"
                        step="0.50"
                        value={rate.amount}
                        onChange={(e) => handleUpdateSpecialRate(rate.id, 'amount', Number(e.target.value))}
                        className="w-full bg-surface border border-[#353535] rounded px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-primary font-bold"
                      />
                    </div>

                    <div className="w-full sm:flex-1">
                      <label className="text-[9px] text-foreground/45 uppercase block mb-1">Description</label>
                      <input
                        type="text"
                        value={rate.description || ''}
                        onChange={(e) => handleUpdateSpecialRate(rate.id, 'description', e.target.value)}
                        placeholder="Condition d'éligibilité..."
                        className="w-full bg-surface border border-[#353535] rounded px-2.5 py-1.5 text-xs text-foreground/80 focus:outline-none focus:border-primary"
                      />
                    </div>

                    <div className="self-end sm:self-center pt-2 sm:pt-4">
                      <button
                        type="button"
                        onClick={() => handleRemoveSpecialRate(rate.id)}
                        className="p-2 rounded bg-surface hover:bg-secondary/20 text-foreground/40 hover:text-secondary transition-colors cursor-pointer"
                        title="Supprimer ce tarif"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Réduction Saisonnière Programmée */}
          <div className="p-5 rounded-xl bg-surface border border-[#353535] space-y-4">
            <div className="flex items-center justify-between border-b border-[#353535] pb-3">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-primary" />
                <h3 className="font-anybody font-bold text-sm uppercase text-white tracking-wider">
                  Réduction Saisonnière Programmée
                </h3>
              </div>

              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={discountEnabled}
                  onChange={(e) => setDiscountEnabled(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-zinc-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary" />
                <span className="ml-2 text-xs font-mono text-white">
                  {discountEnabled ? 'Active' : 'Désactivée'}
                </span>
              </label>
            </div>

            {discountEnabled && (
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 font-mono text-xs animate-fade-in">
                <div className="space-y-1 sm:col-span-2">
                  <label className="text-foreground/70 block">Libellé de la promotion :</label>
                  <input
                    type="text"
                    value={discountLabel}
                    onChange={(e) => setDiscountLabel(e.target.value)}
                    placeholder="Ex: Offre Spéciale Mi-Saison"
                    className="w-full bg-background border border-[#353535] rounded-lg px-3 py-2 text-white focus:outline-none focus:border-primary"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-foreground/70 block">Montant déduit (€) :</label>
                  <input
                    type="number"
                    step="0.50"
                    value={discountAmount}
                    onChange={(e) => setDiscountAmount(Number(e.target.value))}
                    className="w-full bg-background border border-[#353535] rounded-lg px-3 py-2 text-white focus:outline-none focus:border-primary font-bold"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-foreground/70 block">Période d'application :</label>
                  <div className="flex gap-2">
                    <input
                      type="date"
                      value={discountStartDate}
                      onChange={(e) => setDiscountStartDate(e.target.value)}
                      className="w-1/2 bg-background border border-[#353535] rounded px-2 py-1.5 text-xs text-white"
                      title="Date de début"
                    />
                    <input
                      type="date"
                      value={discountEndDate}
                      onChange={(e) => setDiscountEndDate(e.target.value)}
                      className="w-1/2 bg-background border border-[#353535] rounded px-2 py-1.5 text-xs text-white"
                      title="Date de fin"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Bouton de Sauvegarde */}
          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={savingPricing}
              className="premium-btn text-xs px-6 py-2.5 flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span className="transform skew-x-8">
                {savingPricing ? 'Enregistrement...' : 'Enregistrer la configuration tarifaire'}
              </span>
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
