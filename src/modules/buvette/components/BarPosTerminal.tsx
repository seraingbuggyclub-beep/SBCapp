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
} from '../actions';
import BarQrScannerModal from './BarQrScannerModal';
import BarCashRegisterCloseModal from './BarCashRegisterCloseModal';
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

  // Modals State
  const [openingCashInput, setOpeningCashInput] = useState<string>('50');
  const [openingNotes, setOpeningNotes] = useState<string>('');
  const [openingLoading, setOpeningLoading] = useState(false);

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
    const [catRes, sessRes] = await Promise.all([
      getBarCatalogue(),
      getActiveBarSession(),
    ]);

    setCategories(catRes.data || []);
    setSession(sessRes.session);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadPosData();
  }, [loadPosData]);

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

  // Ouverture de session
  const handleOpenSession = async (e: React.FormEvent) => {
    e.preventDefault();
    setOpeningLoading(true);
    setMsg(null);

    const res = await openBarSession(Number(openingCashInput || 0), openingNotes);
    setOpeningLoading(false);

    if (res.success && res.session) {
      setSession(res.session);
      setMsg({ text: 'Session de caisse ouverte avec succès !', type: 'success' });
      loadPosData();
    } else {
      setMsg({ text: res.error || "Erreur lors de l'ouverture", type: 'error' });
    }
  };

  // Exécution du paiement
  const handleCheckout = async (paymentMethod: BarPaymentMethod) => {
    if (!session) {
      setMsg({ text: 'Aucune session de caisse active.', type: 'error' });
      return;
    }
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
      sessionId: session.id,
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

  // ÉCRAN 1 : OUVERTURE DE CAISSE
  if (!session) {
    return (
      <div className="max-w-xl mx-auto p-6 bg-surface border border-[#353535] rounded-2xl space-y-6 shadow-[0_0_50px_rgba(0,0,0,0.5)]">
        <div className="flex items-center gap-3 border-b border-[#353535] pb-4">
          <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/30 flex items-center justify-center text-primary">
            <Coins className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-anybody font-black text-xl uppercase tracking-tight text-white sport-skew">
              Ouverture de Caisse Buvette
            </h2>
            <p className="text-xs font-mono text-foreground/50">
              Seraing Buggy Club • Session Événementielle / Entraînement
            </p>
          </div>
        </div>

        {msg && (
          <div className="p-3.5 rounded-xl bg-secondary/15 border border-secondary/40 text-secondary text-xs font-mono flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{msg.text}</span>
          </div>
        )}

        <form onSubmit={handleOpenSession} className="space-y-4 font-mono text-xs">
          <div className="space-y-2">
            <label className="block text-white font-bold uppercase tracking-wider">
              Fond de Caisse Initial en Espèces (€) *
            </label>
            <div className="relative">
              <input
                type="number"
                step="0.50"
                min="0"
                value={openingCashInput}
                onChange={(e) => setOpeningCashInput(e.target.value)}
                placeholder="50.00"
                className="w-full bg-background border border-[#353535] rounded-xl px-4 py-3 text-xl font-bold font-mono text-primary focus:outline-none focus:border-primary"
                required
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-foreground/40 font-bold">
                EUR
              </span>
            </div>
            <p className="text-[11px] text-foreground/50">
              Montant en pièces et billets déjà présent dans le tiroir caisse à l'ouverture.
            </p>
          </div>

          <div className="space-y-2">
            <label className="block text-foreground/70">Remarques ou Nom de l'événement (optionnel) :</label>
            <input
              type="text"
              value={openingNotes}
              onChange={(e) => setOpeningNotes(e.target.value)}
              placeholder="Ex: Manche Championnat SBC, Entraînement libre du samedi..."
              className="w-full bg-background border border-[#353535] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-primary"
            />
          </div>

          <button
            type="submit"
            disabled={openingLoading || !openingCashInput}
            className="w-full premium-btn text-sm py-3 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            <Unlock className="w-4 h-4" />
            <span className="transform skew-x-8">
              {openingLoading ? 'Ouverture...' : 'Ouvrir la Caisse & Démarrer le POS'}
            </span>
          </button>
        </form>
      </div>
    );
  }

  // ÉCRAN 2 : POS TACTILE COMPLET
  return (
    <div className="space-y-4">
      {/* Top Bar Session Info */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-surface p-3.5 rounded-xl border border-[#353535]">
        <div className="flex items-center gap-2.5 font-mono text-xs">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-green-500/15 border border-green-500/30 text-green-400 font-bold uppercase tracking-wider text-[10px]">
            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            Caisse Ouverte
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

        <div className="flex items-center gap-2">
          <button
            onClick={() => setCloseRegisterOpen(true)}
            className="px-3.5 py-1.5 rounded-lg bg-secondary/15 hover:bg-secondary/30 border border-secondary/40 text-secondary text-xs font-mono font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <Lock className="w-3.5 h-3.5" />
            <span>Fermer Caisse (Z)</span>
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

            {/* Sélecteur Client / Membre */}
            <div className="p-2.5 rounded-xl bg-background border border-[#353535] flex items-center justify-between gap-2 font-mono text-xs">
              {selectedBuyer ? (
                <div className="flex items-center justify-between w-full">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center text-primary">
                      <User className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <strong className="text-white block text-xs">
                        {selectedBuyer.first_name} {selectedBuyer.last_name}
                      </strong>
                      <div className="text-[10px] text-foreground/50 flex gap-2">
                        <span>Solde : <strong className="text-primary">{selectedBuyer.wallet_balance.toFixed(2)} €</strong></span>
                        {selectedBuyer.tab_balance > 0 && (
                          <span className="text-yellow-400">Ardoise : {selectedBuyer.tab_balance.toFixed(2)} €</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => setSelectedBuyer(null)}
                    className="p-1 text-foreground/40 hover:text-white"
                    title="Désélectionner"
                  >
                    ×
                  </button>
                </div>
              ) : (
                <div className="flex items-center justify-between w-full">
                  <span className="text-foreground/50 text-[11px]">Client : Anonyme / Visiteur</span>
                  <button
                    type="button"
                    onClick={() => setScannerOpen(true)}
                    className="px-2.5 py-1 rounded bg-primary/10 hover:bg-primary/20 border border-primary/30 text-primary text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    <QrCode className="w-3 h-3" />
                    <span>Scanner Pass</span>
                  </button>
                </div>
              )}
            </div>
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
      <BarQrScannerModal
        isOpen={scannerOpen}
        onClose={() => setScannerOpen(false)}
        onMemberSelected={(member) => {
          setSelectedBuyer(member);
          setMsg({ text: `Membre identifié : ${member.first_name} ${member.last_name}`, type: 'success' });
        }}
      />

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
