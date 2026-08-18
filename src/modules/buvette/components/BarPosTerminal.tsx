'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  BarCategory,
  BarItem,
  BarCartItem,
  BarSession,
  BarPaymentMethod,
  MemberBalanceItem,
} from '@/types/models';
import {
  getBarCatalogue,
  getActiveBarSession,
  openBarSession,
  createPosOrder,
  getMembersBalancesList,
} from '../actions';
import dynamic from 'next/dynamic';

const BarQrScannerModal = dynamic(() => import('./BarQrScannerModal'), {
  ssr: false,
});
import BarCashRegisterCloseModal from './BarCashRegisterCloseModal';
import BarCashRegisterOpenModal from './BarCashRegisterOpenModal';
import CashCounterGrid from './CashCounterGrid';
import {
  Plus,
  Minus,
  Trash2,
  QrCode,
  User,
  UserX,
  CreditCard,
  Banknote,
  Wallet,
  FileText,
  Lock,
  Unlock,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Search,
  Check,
  RotateCcw,
  Sparkles,
  Calculator,
  Coins,
  X,
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';

export default function BarPosTerminal() {
  const [categories, setCategories] = useState<BarCategory[]>([]);
  const [session, setSession] = useState<BarSession | null>(null);
  const [loading, setLoading] = useState(true);

  // Cart State
  const [cart, setCart] = useState<BarCartItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedBuyer, setSelectedBuyer] = useState<MemberBalanceItem | null>(null);

  // Member Search State
  const [membersList, setMembersList] = useState<MemberBalanceItem[]>([]);
  const [memberSearchQuery, setMemberSearchQuery] = useState('');
  const [isMemberDropdownOpen, setIsMemberDropdownOpen] = useState(false);

  // Modals State
  const [openRegisterModalOpen, setOpenRegisterModalOpen] = useState(false);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [closeRegisterOpen, setCloseRegisterOpen] = useState(false);

  // Cash Change Calculator Modal
  const [cashModalOpen, setCashModalOpen] = useState(false);
  const [cashReceived, setCashReceived] = useState<string>('');

  // Payconiq Modal
  const [payconiqModalOpen, setPayconiqModalOpen] = useState(false);

  // Notifications
  const [msg, setMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [checkoutLoading, setCheckoutLoading] = useState(false);

  // Chargement des données
  const loadPosData = useCallback(async () => {
    setLoading(true);
    const [catRes, sessRes, membersRes] = await Promise.all([
      getBarCatalogue(),
      getActiveBarSession(),
      getMembersBalancesList(),
    ]);

    setCategories(catRes.data || []);
    setSession(sessRes.session);
    setMembersList(membersRes.data || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadPosData();
  }, [loadPosData]);

  // Filtrage des membres pour autocomplétion
  const filteredMembers = useMemo(() => {
    if (!memberSearchQuery.trim()) return membersList.slice(0, 10);
    const q = memberSearchQuery.toLowerCase().trim();
    return membersList.filter(
      (m) =>
        m.first_name.toLowerCase().includes(q) ||
        m.last_name.toLowerCase().includes(q) ||
        m.email.toLowerCase().includes(q) ||
        (m.phone && m.phone.includes(q))
    ).slice(0, 12);
  }, [membersList, memberSearchQuery]);

  // Total panier
  const cartTotal = useMemo(() => {
    return cart.reduce((sum, line) => sum + line.item.selling_price * line.quantity, 0);
  }, [cart]);

  // Rendu de monnaie calculé
  const changeDue = useMemo(() => {
    const received = Number(cashReceived || 0);
    return Math.max(0, received - cartTotal);
  }, [cashReceived, cartTotal]);

  // Ajouter au panier
  const addToCart = (item: BarItem) => {
    setCart((prev) => {
      const existing = prev.find((line) => line.item.id === item.id);
      if (existing) {
        return prev.map((line) =>
          line.item.id === item.id
            ? { ...line, quantity: line.quantity + 1 }
            : line
        );
      }
      return [...prev, { item, quantity: 1 }];
    });
  };

  // Modifier quantité
  const updateQuantity = (itemId: string, delta: number) => {
    setCart((prev) => {
      return prev
        .map((line) => {
          if (line.item.id === itemId) {
            const newQty = line.quantity + delta;
            return newQty > 0 ? { ...line, quantity: newQty } : null;
          }
          return line;
        })
        .filter(Boolean) as BarCartItem[];
    });
  };

  // Vider panier
  const clearCart = () => {
    setCart([]);
    setSelectedBuyer(null);
    setCashReceived('');
  };

  // Exécution du paiement
  const handleCheckout = async (paymentMethod: BarPaymentMethod) => {
    if (cart.length === 0) {
      setMsg({ text: 'Le panier est vide.', type: 'error' });
      return;
    }

    if (paymentMethod === 'WALLET' && !selectedBuyer) {
      setMsg({ text: 'Veuillez scanner ou sélectionner un membre pour payer par portefeuille.', type: 'error' });
      return;
    }

    if (paymentMethod === 'TAB' && !selectedBuyer) {
      setMsg({ text: 'Veuillez scanner ou sélectionner un membre pour mettre sur ardoise.', type: 'error' });
      return;
    }

    setCheckoutLoading(true);
    setMsg(null);

    const res = await createPosOrder({
      sessionId: session?.id || null,
      buyerId: selectedBuyer?.id || null,
      items: cart.map((c) => ({ itemId: c.item.id, quantity: c.quantity })),
      paymentMethod,
      cashGiven: paymentMethod === 'CASH' ? Number(cashReceived || cartTotal) : undefined,
    });

    setCheckoutLoading(false);

    if (res.success) {
      let successText = `Encaissement de ${cartTotal.toFixed(2)} € validé (${paymentMethod}) !`;
      if (paymentMethod === 'CASH' && res.changeDue && res.changeDue > 0) {
        successText += ` Rendu monnaie : ${res.changeDue.toFixed(2)} €`;
      }
      setMsg({ text: successText, type: 'success' });
      clearCart();
      setCashModalOpen(false);
      setPayconiqModalOpen(false);
      loadPosData();
    } else {
      setMsg({ text: res.error || "Erreur lors de l'encaissement.", type: 'error' });
    }
  };

  // Articles filtrés par catégorie
  const filteredItems = useMemo(() => {
    if (selectedCategory === 'all') {
      return categories.flatMap((c) => c.items || []);
    }
    const cat = categories.find((c) => c.id === selectedCategory);
    return cat?.items || [];
  }, [categories, selectedCategory]);

  if (loading) {
    return (
      <div className="py-16 flex flex-col items-center justify-center gap-3 text-foreground/50 font-mono text-xs">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        <span>Chargement du terminal POS Buvette SBC...</span>
      </div>
    );
  }

  // POS TACTILE COMPLET (ACCÈS DIRECT SANS BLOCAGE DE FOND DE CAISSE)
  return (
    <div className="space-y-4">
      {/* Top Bar Session Info */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-surface p-3.5 rounded-xl border border-[#353535]">
        {session ? (
          <div className="flex flex-wrap items-center gap-2.5 font-mono text-xs">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-green-500/15 border border-green-500/30 text-green-400 font-bold uppercase tracking-wider text-[10px]">
              <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
              Session Espèces Active
            </span>
            <span className="text-foreground/50">•</span>
            <span className="text-foreground/70">
              Fond : <strong className="text-white">{session.opening_cash.toFixed(2)} €</strong>
            </span>
            <span className="text-foreground/50">•</span>
            <span className="text-foreground/70">
              Par : <strong className="text-white">{session.opened_by_member?.first_name} {session.opened_by_member?.last_name}</strong>
            </span>
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-2.5 font-mono text-xs">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-500/15 border border-blue-500/30 text-blue-400 font-bold uppercase tracking-wider text-[10px]">
              <Wallet className="w-3 h-3" />
              Mode Débit Compte / Dématérialisé
            </span>
            <span className="text-foreground/50 text-[11px] hidden sm:inline">
              (Débit immédiat portefeuille / ardoise / Payconiq)
            </span>
          </div>
        )}

        <div className="flex items-center gap-2">
          {session ? (
            <button
              onClick={() => setCloseRegisterOpen(true)}
              className="px-3.5 py-1.5 rounded-lg bg-secondary/15 hover:bg-secondary/30 border border-secondary/40 text-secondary text-xs font-mono font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <Lock className="w-3.5 h-3.5" />
              <span>Fermer Caisse (Z)</span>
            </button>
          ) : (
            <button
              onClick={() => setOpenRegisterModalOpen(true)}
              className="px-3.5 py-1.5 rounded-lg bg-surface-high hover:bg-surface-dim border border-[#353535] hover:border-primary text-foreground/80 hover:text-white text-xs font-mono font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <Coins className="w-3.5 h-3.5 text-primary" />
              <span>Préparer / Ouvrir le fond de caisse</span>
            </button>
          )}
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
          <div className="flex items-center gap-2">
            {msg.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
            <span>{msg.text}</span>
          </div>
          <button onClick={() => setMsg(null)} className="text-foreground/40 hover:text-white">
            ×
          </button>
        </div>
      )}

      {/* Grille Principale POS */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        {/* SECTION GAUCHE : CATALOGUE TACTILE (7 colonnes) */}
        <div className="lg:col-span-7 space-y-3">
          {/* Onglets Catégories */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
            <button
              onClick={() => setSelectedCategory('all')}
              className={`px-3 py-2 rounded-lg font-anybody font-bold text-xs uppercase tracking-wider transition-all sport-skew shrink-0 cursor-pointer ${
                selectedCategory === 'all'
                  ? 'bg-primary text-black shadow-[2px_2px_0px_#000]'
                  : 'bg-surface border border-[#353535] text-foreground/70 hover:text-white'
              }`}
            >
              <span className="transform skew-x-8">Tous les articles</span>
            </button>

            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-3 py-2 rounded-lg font-anybody font-bold text-xs uppercase tracking-wider transition-all sport-skew shrink-0 cursor-pointer ${
                  selectedCategory === cat.id
                    ? 'bg-primary text-black shadow-[2px_2px_0px_#000]'
                    : 'bg-surface border border-[#353535] text-foreground/70 hover:text-white'
                }`}
              >
                <span className="transform skew-x-8">{cat.name}</span>
              </button>
            ))}
          </div>

          {/* Grille des Touches Articles Tactiles */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5 max-h-[620px] overflow-y-auto pr-1">
            {filteredItems.map((item) => {
              const inStock = item.stock_quantity > 0;
              const isLowStock = item.stock_quantity <= item.alert_threshold;

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => inStock && addToCart(item)}
                  disabled={!inStock}
                  className={`p-3 rounded-xl border text-left flex flex-col justify-between h-28 transition-all relative overflow-hidden group cursor-pointer ${
                    !inStock
                      ? 'bg-surface/30 border-[#353535]/50 opacity-40 cursor-not-allowed'
                      : 'bg-surface hover:bg-surface-high border-[#353535] hover:border-primary active:scale-95 shadow-sm'
                  }`}
                >
                  <div className="space-y-1">
                    <span className="font-anybody font-black text-xs uppercase text-white block leading-tight group-hover:text-primary transition-colors line-clamp-2">
                      {item.name}
                    </span>
                    <span className="font-mono text-sm font-bold text-primary block">
                      {item.selling_price.toFixed(2)} €
                    </span>
                  </div>

                  <div className="flex items-center justify-between pt-1 border-t border-[#353535]/60 font-mono text-[9px]">
                    <span className={isLowStock ? 'text-secondary font-bold' : 'text-foreground/50'}>
                      Stock : {item.stock_quantity}
                    </span>
                    <span className="w-5 h-5 rounded bg-primary/20 text-primary flex items-center justify-center font-bold text-xs group-hover:bg-primary group-hover:text-black transition-colors">
                      +
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* SECTION DROITE : TICKET DE CAISSE & ENCAISSEMENT (5 colonnes) */}
        <div className="lg:col-span-5 bg-surface border border-[#353535] rounded-2xl p-4 space-y-4 shadow-[4px_4px_0px_#000]">
          {/* Header Ticket + Sélection Membre */}
          <div className="space-y-3 pb-3 border-b border-[#353535]">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-primary" />
                <h3 className="font-anybody font-black text-sm uppercase text-white sport-skew">
                  Ticket de Caisse
                </h3>
              </div>

              {cart.length > 0 && (
                <button
                  onClick={clearCart}
                  className="text-[10px] font-mono text-foreground/40 hover:text-secondary flex items-center gap-1 transition-colors cursor-pointer"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>Vider</span>
                </button>
              )}
            </div>

            {/* Sélecteur Client / Membre Autocomplété */}
            {selectedBuyer ? (
              <div className="p-2.5 rounded-xl bg-background border border-primary/40 shadow-[0_0_15px_rgba(255,110,0,0.1)] flex items-center justify-between gap-2 font-mono text-xs animate-fade-in">
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/30 flex items-center justify-center text-primary shrink-0">
                    <User className="w-4 h-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <strong className="text-white text-xs truncate">
                        {selectedBuyer.first_name} {selectedBuyer.last_name}
                      </strong>
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-primary/20 text-primary font-bold">
                        Solde : {selectedBuyer.wallet_balance.toFixed(2)} €
                      </span>
                    </div>
                    {selectedBuyer.tab_balance > 0 && (
                      <span className="text-[10px] text-yellow-400 font-bold block mt-0.5">
                        Ardoise : {selectedBuyer.tab_balance.toFixed(2)} €
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => setScannerOpen(true)}
                    className="p-1.5 rounded-lg bg-surface hover:bg-surface-high border border-[#353535] text-primary hover:text-white transition-colors cursor-pointer"
                    title="Changer par scan QR Code"
                  >
                    <QrCode className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedBuyer(null);
                      setMemberSearchQuery('');
                    }}
                    className="p-1.5 rounded-lg bg-secondary/15 hover:bg-secondary/30 border border-secondary/30 text-secondary hover:text-white transition-colors cursor-pointer"
                    title="Désélectionner (Revenir en Anonyme)"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ) : (
              <div className="relative font-mono text-xs">
                <div className="flex items-center gap-2">
                  {/* Champ de recherche */}
                  <div className="relative flex-1">
                    <Search className="w-3.5 h-3.5 text-foreground/40 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="text"
                      value={memberSearchQuery}
                      onChange={(e) => {
                        setMemberSearchQuery(e.target.value);
                        setIsMemberDropdownOpen(true);
                      }}
                      onFocus={() => setIsMemberDropdownOpen(true)}
                      placeholder="Rechercher pilote (nom, prénom...)"
                      className="w-full bg-background border border-[#353535] focus:border-primary rounded-xl pl-8.5 pr-8 py-2 text-xs text-white placeholder-foreground/40 focus:outline-none transition-colors"
                    />
                    {memberSearchQuery && (
                      <button
                        type="button"
                        onClick={() => {
                          setMemberSearchQuery('');
                          setIsMemberDropdownOpen(false);
                        }}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-foreground/40 hover:text-white p-0.5"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  {/* Bouton Scanner Pass */}
                  <button
                    type="button"
                    onClick={() => setScannerOpen(true)}
                    className="px-3 py-2 rounded-xl bg-primary/10 hover:bg-primary/20 border border-primary/30 text-primary text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
                    title="Scanner le QR Code membre"
                  >
                    <QrCode className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Scanner</span>
                  </button>
                </div>

                {/* Dropdown autocomplétion */}
                {isMemberDropdownOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-20"
                      onClick={() => setIsMemberDropdownOpen(false)}
                    />
                    <div className="absolute left-0 right-0 top-full mt-1 z-30 bg-[#161616] border border-[#353535] rounded-xl shadow-[0_10px_40px_rgba(0,0,0,0.8)] overflow-hidden max-h-56 overflow-y-auto animate-fade-in divide-y divide-[#252525]">
                      {filteredMembers.length === 0 ? (
                        <div className="p-3 text-center text-foreground/40 text-[11px]">
                          Aucun pilote trouvé
                        </div>
                      ) : (
                        filteredMembers.map((m) => (
                          <button
                            key={m.id}
                            type="button"
                            onClick={() => {
                              setSelectedBuyer(m);
                              setIsMemberDropdownOpen(false);
                              setMemberSearchQuery('');
                              setMsg({ text: `Pilote sélectionné : ${m.first_name} ${m.last_name}`, type: 'success' });
                            }}
                            className="w-full p-2.5 text-left hover:bg-surface flex items-center justify-between gap-2 transition-colors cursor-pointer"
                          >
                            <div className="min-w-0">
                              <strong className="text-white block text-xs truncate">
                                {m.first_name} {m.last_name}
                              </strong>
                              <span className="text-[10px] text-foreground/45 block truncate">{m.email}</span>
                            </div>
                            <div className="text-right shrink-0">
                              <span
                                className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                                  m.wallet_balance < 0
                                    ? 'bg-rose-500/15 text-rose-400'
                                    : m.wallet_balance > 0
                                    ? 'bg-emerald-500/15 text-emerald-400'
                                    : 'bg-surface text-foreground/50'
                                }`}
                              >
                                {m.wallet_balance < 0
                                  ? `-${Math.abs(m.wallet_balance).toFixed(2)} €`
                                  : `+${m.wallet_balance.toFixed(2)} €`}
                              </span>
                              {m.tab_balance > 0 && (
                                <span className="text-[9px] text-yellow-400 block mt-0.5">
                                  Ardoise: {m.tab_balance.toFixed(2)} €
                                </span>
                              )}
                            </div>
                          </button>
                        ))
                      )}
                    </div>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Lignes du panier */}
          <div className="space-y-2 max-h-56 overflow-y-auto font-mono text-xs pr-1">
            {cart.length === 0 ? (
              <div className="py-8 text-center text-foreground/30 text-xs">
                Aucun article dans le ticket. Touchez les articles à gauche pour composer la commande.
              </div>
            ) : (
              cart.map((line) => (
                <div
                  key={line.item.id}
                  className="p-2 rounded-lg bg-surface-dim border border-[#353535]/60 flex items-center justify-between gap-2"
                >
                  <div className="flex-1 min-w-0">
                    <span className="font-bold text-white block truncate">{line.item.name}</span>
                    <span className="text-[10px] text-foreground/50">
                      {line.item.selling_price.toFixed(2)} € unitaire
                    </span>
                  </div>

                  {/* Contrôles Quantité */}
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => updateQuantity(line.item.id, -1)}
                      className="w-6 h-6 rounded bg-background hover:bg-surface border border-[#353535] text-white flex items-center justify-center cursor-pointer"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="w-6 text-center font-bold text-white">{line.quantity}</span>
                    <button
                      onClick={() => updateQuantity(line.item.id, 1)}
                      className="w-6 h-6 rounded bg-background hover:bg-surface border border-[#353535] text-white flex items-center justify-center cursor-pointer"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>

                  <span className="font-bold text-primary text-right w-16">
                    {(line.item.selling_price * line.quantity).toFixed(2)} €
                  </span>
                </div>
              ))
            )}
          </div>

          {/* Total TTC */}
          <div className="p-3.5 rounded-xl bg-surface-dim border border-[#353535] flex items-center justify-between">
            <span className="font-anybody font-bold text-sm uppercase text-foreground/70">
              Total à Encaisser :
            </span>
            <span className="font-anybody font-black text-2xl text-primary sport-skew">
              {cartTotal.toFixed(2)} €
            </span>
          </div>

          {/* Boutons d'encaissement multi-modes */}
          <div className="space-y-2 pt-2 border-t border-[#353535]">
            <span className="text-[10px] font-mono text-foreground/45 uppercase block">
              Sélectionnez le mode de règlement :
            </span>

            <div className="grid grid-cols-2 gap-2">
              {/* Espèces / Cash */}
              <button
                type="button"
                disabled={cart.length === 0 || checkoutLoading}
                onClick={() => {
                  setCashReceived(cartTotal.toString());
                  setCashModalOpen(true);
                }}
                className="p-3 rounded-xl bg-surface hover:bg-surface-high border border-[#353535] hover:border-green-500 text-left transition-all cursor-pointer flex flex-col justify-between gap-1 group disabled:opacity-40"
              >
                <div className="flex items-center justify-between text-green-400">
                  <Banknote className="w-4 h-4" />
                  <span className="text-[10px] font-mono uppercase">Espèces</span>
                </div>
                <span className="font-anybody font-bold text-xs text-white group-hover:text-green-400 transition-colors">
                  Cash (+ Rendu)
                </span>
              </button>

              {/* Payconiq / QR */}
              <button
                type="button"
                disabled={cart.length === 0 || checkoutLoading}
                onClick={() => setPayconiqModalOpen(true)}
                className="p-3 rounded-xl bg-surface hover:bg-surface-high border border-[#353535] hover:border-pink-500 text-left transition-all cursor-pointer flex flex-col justify-between gap-1 group disabled:opacity-40"
              >
                <div className="flex items-center justify-between text-pink-400">
                  <QrCode className="w-4 h-4" />
                  <span className="text-[10px] font-mono uppercase">Scan</span>
                </div>
                <span className="font-anybody font-bold text-xs text-white group-hover:text-pink-400 transition-colors">
                  Payconiq / QR
                </span>
              </button>

              {/* Portefeuille Membre */}
              <button
                type="button"
                disabled={
                  cart.length === 0 ||
                  checkoutLoading ||
                  !selectedBuyer ||
                  selectedBuyer.wallet_balance < cartTotal
                }
                onClick={() => handleCheckout('WALLET')}
                className="p-3 rounded-xl bg-surface hover:bg-surface-high border border-[#353535] hover:border-primary text-left transition-all cursor-pointer flex flex-col justify-between gap-1 group disabled:opacity-30"
                title={!selectedBuyer ? 'Nécessite de scanner un membre' : ''}
              >
                <div className="flex items-center justify-between text-primary">
                  <Wallet className="w-4 h-4" />
                  <span className="text-[10px] font-mono uppercase">Solde</span>
                </div>
                <span className="font-anybody font-bold text-xs text-white group-hover:text-primary transition-colors">
                  Portefeuille SBC
                </span>
              </button>

              {/* Ardoise / TAB */}
              <button
                type="button"
                disabled={cart.length === 0 || checkoutLoading || !selectedBuyer}
                onClick={() => handleCheckout('TAB')}
                className="p-3 rounded-xl bg-surface hover:bg-surface-high border border-[#353535] hover:border-yellow-400 text-left transition-all cursor-pointer flex flex-col justify-between gap-1 group disabled:opacity-30"
                title={!selectedBuyer ? 'Nécessite de scanner un membre' : ''}
              >
                <div className="flex items-center justify-between text-yellow-400">
                  <FileText className="w-4 h-4" />
                  <span className="text-[10px] font-mono uppercase">Ardoise</span>
                </div>
                <span className="font-anybody font-bold text-xs text-white group-hover:text-yellow-400 transition-colors">
                  Mettre sur Ardoise
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* MODALE CALCULATEUR RENDU DE MONNAIE (CASH) */}
      {cashModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in">
          <div className="absolute inset-0" onClick={() => setCashModalOpen(false)} />
          <div className="relative z-10 w-full max-w-sm bg-[#0f0f0f] border border-[#353535] rounded-2xl p-5 space-y-4 shadow-[0_0_50px_rgba(0,0,0,0.9)] font-mono text-xs">
            <div className="flex items-center justify-between border-b border-[#292929] pb-3">
              <div className="flex items-center gap-2 text-green-400">
                <Banknote className="w-5 h-5" />
                <strong className="font-anybody font-bold uppercase text-white text-sm">
                  Encaissement Espèces
                </strong>
              </div>
              <button onClick={() => setCashModalOpen(false)} className="text-foreground/40 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div className="p-3 rounded-xl bg-surface border border-[#353535] flex items-center justify-between">
                <span className="text-foreground/60">Total à payer :</span>
                <strong className="text-white text-base">{cartTotal.toFixed(2)} €</strong>
              </div>

              <div className="space-y-1">
                <label className="block text-foreground/70">Montant reçu du client (€) :</label>
                <input
                  type="number"
                  step="0.50"
                  value={cashReceived}
                  onChange={(e) => setCashReceived(e.target.value)}
                  className="w-full bg-background border border-green-500/50 rounded-xl px-3 py-2 text-lg font-bold text-white focus:outline-none focus:border-green-500"
                  autoFocus
                />
              </div>

              {/* Raccourcis billets courants */}
              <div className="grid grid-cols-4 gap-1.5">
                {[5, 10, 20, 50].map((b) => (
                  <button
                    key={b}
                    type="button"
                    onClick={() => setCashReceived(b.toString())}
                    className="p-1.5 rounded bg-surface hover:bg-surface-high border border-[#353535] text-center text-xs font-bold text-white"
                  >
                    {b} €
                  </button>
                ))}
              </div>

              {/* Rendu calculé */}
              <div className="p-3.5 rounded-xl bg-green-500/10 border border-green-500/30 flex items-center justify-between text-green-400">
                <span className="font-bold">Monnaie à rendre :</span>
                <span className="font-anybody font-black text-xl">{changeDue.toFixed(2)} €</span>
              </div>
            </div>

            <div className="pt-2 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setCashModalOpen(false)}
                className="px-3 py-2 rounded-lg bg-surface border border-[#353535] text-foreground/70 hover:text-white"
              >
                Annuler
              </button>
              <button
                type="button"
                disabled={checkoutLoading || Number(cashReceived || 0) < cartTotal}
                onClick={() => handleCheckout('CASH')}
                className="px-5 py-2 rounded-lg bg-green-500 text-black font-anybody font-black uppercase text-xs tracking-wider hover:bg-green-400 transition-colors disabled:opacity-40"
              >
                {checkoutLoading ? 'Encaissement...' : 'Valider Vente Cash'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODALE PAYCONIQ / QR BANCAIRE */}
      {payconiqModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in">
          <div className="absolute inset-0" onClick={() => setPayconiqModalOpen(false)} />
          <div className="relative z-10 w-full max-w-sm bg-[#0f0f0f] border border-[#353535] rounded-2xl p-5 space-y-4 shadow-[0_0_50px_rgba(0,0,0,0.9)] text-center">
            <div className="flex items-center justify-between border-b border-[#292929] pb-3 text-left">
              <div className="flex items-center gap-2 text-pink-400">
                <QrCode className="w-5 h-5" />
                <strong className="font-anybody font-bold uppercase text-white text-sm">
                  Paiement Payconiq / Scan
                </strong>
              </div>
              <button onClick={() => setPayconiqModalOpen(false)} className="text-foreground/40 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex flex-col items-center justify-center p-4 bg-white rounded-xl">
              <QRCodeSVG
                value={`https://payconiq.com/pay?club=sbc&amount=${cartTotal.toFixed(2)}`}
                size={160}
                level="M"
                fgColor="#000000"
                bgColor="#FFFFFF"
              />
              <span className="text-xs font-mono font-bold text-black mt-2">
                Montant : {cartTotal.toFixed(2)} €
              </span>
            </div>

            <p className="text-[11px] font-mono text-foreground/60 leading-tight">
              Faites scanner ce code au client avec son application bancaire ou Payconiq.
            </p>

            <div className="pt-2 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setPayconiqModalOpen(false)}
                className="px-3 py-2 rounded-lg bg-surface border border-[#353535] text-foreground/70 hover:text-white text-xs font-mono"
              >
                Annuler
              </button>
              <button
                type="button"
                disabled={checkoutLoading}
                onClick={() => handleCheckout('PAYCONIQ')}
                className="px-5 py-2 rounded-lg bg-pink-500 text-black font-anybody font-black uppercase text-xs tracking-wider hover:bg-pink-400 transition-colors"
              >
                {checkoutLoading ? 'Validation...' : 'Paiement Reçu'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SCANNER MODAL */}
      {scannerOpen && (
        <BarQrScannerModal
          isOpen={scannerOpen}
          onClose={() => setScannerOpen(false)}
          onMemberSelected={(member) => {
            setSelectedBuyer(member);
            setMsg({ text: `Membre identifié : ${member.first_name} ${member.last_name}`, type: 'success' });
          }}
        />
      )}

      {/* PREPARATION & OPENING CASH SESSION MODAL */}
      {openRegisterModalOpen && (
        <BarCashRegisterOpenModal
          isOpen={openRegisterModalOpen}
          onClose={() => setOpenRegisterModalOpen(false)}
          onSessionOpened={(newSession) => {
            setSession(newSession);
            loadPosData();
            setMsg({
              text: `Session espèces activée avec ${newSession.opening_cash.toFixed(2)} € de fond de caisse !`,
              type: 'success',
            });
          }}
        />
      )}

      {/* CLOSING SESSION MODAL */}
      {session && (
        <BarCashRegisterCloseModal
          session={session}
          isOpen={closeRegisterOpen}
          onClose={() => setCloseRegisterOpen(false)}
          onSessionClosed={() => {
            setSession(null);
            loadPosData();
          }}
        />
      )}
    </div>
  );
}
