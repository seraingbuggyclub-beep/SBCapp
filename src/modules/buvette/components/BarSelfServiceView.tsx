'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  BarCategory,
  BarItem,
  BarCartItem,
  MemberProfile,
} from '@/types/models';
import {
  getBarCatalogue,
  submitSelfServiceOrder,
  getMemberSelfServiceData,
} from '../actions';
import {
  Coffee,
  Plus,
  Minus,
  Trash2,
  Wallet,
  CheckCircle2,
  AlertCircle,
  ShoppingBag,
  CreditCard,
  Sparkles,
  RefreshCw,
} from 'lucide-react';
import Link from 'next/link';
import BarRechargeModal from './BarRechargeModal';

interface BarSelfServiceViewProps {
  member: MemberProfile | null;
}

export default function BarSelfServiceView({ member: initialMember }: BarSelfServiceViewProps) {
  const [memberData, setMemberData] = useState<{
    id: string;
    first_name: string;
    last_name: string;
    wallet_balance: number;
    email: string;
  } | null>(initialMember ? {
    id: initialMember.id,
    first_name: initialMember.first_name,
    last_name: initialMember.last_name,
    wallet_balance: Number(initialMember.wallet_balance || 0),
    email: initialMember.email,
  } : null);

  const [categories, setCategories] = useState<BarCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [cart, setCart] = useState<BarCartItem[]>([]);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [rechargeModalOpen, setRechargeModalOpen] = useState(false);
  const [msg, setMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Recharger le catalogue et le profil
  const refreshMember = useCallback(async () => {
    const res = await getMemberSelfServiceData();
    if (res.data) {
      setMemberData(res.data);
    }
  }, []);

  const loadCatalogue = useCallback(async () => {
    setLoading(true);
    const res = await getBarCatalogue();
    setCategories(res.data || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadCatalogue();
    refreshMember();
  }, [loadCatalogue, refreshMember]);

  const cartTotal = useMemo(() => {
    return cart.reduce((sum, line) => sum + line.item.selling_price * line.quantity, 0);
  }, [cart]);

  const totalCartCount = useMemo(() => {
    return cart.reduce((sum, line) => sum + line.quantity, 0);
  }, [cart]);

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

  const handleCheckout = async () => {
    if (!memberData) {
      setMsg({ text: 'Veuillez vous connecter pour enregistrer vos consommations.', type: 'error' });
      return;
    }
    if (cart.length === 0) {
      setMsg({ text: 'Sélectionnez au moins une boisson ou un snack.', type: 'error' });
      return;
    }

    setCheckoutLoading(true);
    setMsg(null);

    const res = await submitSelfServiceOrder(
      cart.map((c) => ({
        productId: c.item.id,
        itemId: c.item.id,
        quantity: c.quantity,
      }))
    );

    setCheckoutLoading(false);

    if (res.success) {
      const updatedBalance = res.newBalance !== undefined ? res.newBalance : memberData.wallet_balance - cartTotal;
      setMemberData((prev) => prev ? { ...prev, wallet_balance: updatedBalance } : null);

      setMsg({
        text: `Consommation validée (${cartTotal.toFixed(2)} €) ! Nouveau solde : ${
          updatedBalance < 0 ? `Ardoise de -${Math.abs(updatedBalance).toFixed(2)} €` : `+${updatedBalance.toFixed(2)} €`
        }. Santé !`,
        type: 'success',
      });
      setCart([]);
      loadCatalogue(); // rafraîchir les stocks
    } else {
      setMsg({ text: res.error || 'Erreur lors de la validation.', type: 'error' });
    }
  };

  const filteredItems = useMemo(() => {
    if (selectedCategory === 'all') {
      return categories.flatMap((c) => c.items || []);
    }
    const cat = categories.find((c) => c.id === selectedCategory);
    return cat?.items || [];
  }, [categories, selectedCategory]);

  if (!memberData) {
    return (
      <div className="max-w-md mx-auto my-8 p-6 bg-surface border border-[#353535] rounded-2xl text-center space-y-4 font-mono text-xs shadow-2xl">
        <Coffee className="w-12 h-12 text-primary mx-auto" />
        <h2 className="font-anybody font-black text-xl uppercase text-white tracking-tight sport-skew">
          Frigo Libre-Service <span className="text-primary">SBC</span>
        </h2>
        <p className="text-foreground/60 leading-relaxed">
          Pour enregistrer vos consommations en toute autonomie sur votre smartphone, veuillez vous connecter à votre compte pilote SBC.
        </p>
        <Link
          href="/dashboard"
          className="inline-block premium-btn text-xs px-6 py-3 sport-skew"
        >
          <span className="transform skew-x-8">Se connecter à mon compte</span>
        </Link>
      </div>
    );
  }

  const isDebt = memberData.wallet_balance < 0;
  const isZero = memberData.wallet_balance === 0;

  return (
    <div className="max-w-3xl mx-auto px-3 sm:px-4 py-4 sm:py-6 space-y-5 animate-fade-in pb-32">
      {/* 1. EN-TÊTE PILOTE & BADGE DYNAMIQUE DU SOLDE */}
      <div className="p-4 sm:p-5 rounded-2xl bg-surface border border-[#353535] shadow-[0_0_30px_rgba(0,0,0,0.6)] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/30 flex items-center justify-center text-primary shrink-0 shadow-[0_0_15px_rgba(255,110,0,0.2)]">
            <Coffee className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-anybody font-black text-lg sm:text-xl uppercase text-white tracking-tight sport-skew">
                Frigo Libre-Service <span className="text-primary">SBC</span>
              </h1>
            </div>
            <p className="text-xs font-mono text-foreground/70">
              Pilote : <strong className="text-white font-bold">{memberData.first_name} {memberData.last_name}</strong>
            </p>
          </div>
        </div>

        {/* Badge Solde Dynamique & Bouton Recharger */}
        <div className="flex items-center gap-2 font-mono self-stretch sm:self-auto justify-between sm:justify-end">
          {/* Badge Solde */}
          <div
            className={`px-3.5 py-2 rounded-xl border flex flex-col justify-center min-w-[130px] transition-all shadow-sm ${
              isDebt
                ? 'bg-rose-500/15 border-rose-500/40 text-rose-300 shadow-[0_0_15px_rgba(244,63,94,0.2)]'
                : isZero
                ? 'bg-amber-500/15 border-amber-500/40 text-amber-300'
                : 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400 shadow-[0_0_15px_rgba(52,211,153,0.15)]'
            }`}
          >
            <span className="text-[9px] uppercase font-bold tracking-wider block opacity-80">
              {isDebt ? 'Ardoise' : 'Solde disponible'}
            </span>
            <span className="font-anybody font-black text-base sm:text-lg">
              {isDebt
                ? `-${Math.abs(memberData.wallet_balance).toFixed(2)} €`
                : `+${memberData.wallet_balance.toFixed(2)} €`}
            </span>
          </div>

          {/* Bouton Recharger */}
          <button
            type="button"
            onClick={() => setRechargeModalOpen(true)}
            className="px-3.5 py-2.5 rounded-xl bg-surface-high hover:bg-surface-dim border border-[#353535] hover:border-primary/50 text-white font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer sport-skew"
            title="Recharger mon compte par virement bancaire"
          >
            <CreditCard className="w-4 h-4 text-primary" />
            <span className="transform skew-x-8 text-[11px] uppercase">Recharger</span>
          </button>
        </div>
      </div>

      {/* Notifications */}
      {msg && (
        <div
          className={`p-4 rounded-xl border text-xs font-mono flex items-start gap-2.5 animate-fade-in shadow-lg ${
            msg.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
              : 'bg-rose-500/15 border-rose-500/40 text-rose-300'
          }`}
        >
          {msg.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
          )}
          <div className="flex-1">
            <span>{msg.text}</span>
          </div>
          <button onClick={() => setMsg(null)} className="opacity-60 hover:opacity-100">
            ×
          </button>
        </div>
      )}

      {/* 2. SÉLECTEUR DE CATÉGORIES */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1.5 no-scrollbar">
        <button
          onClick={() => setSelectedCategory('all')}
          className={`px-3.5 py-2 rounded-xl text-xs font-anybody font-bold uppercase tracking-wider transition-all sport-skew cursor-pointer shrink-0 ${
            selectedCategory === 'all'
              ? 'bg-primary text-black shadow-[0_0_15px_rgba(255,110,0,0.3)]'
              : 'bg-surface border border-[#353535] text-foreground/70 hover:text-white hover:border-primary/40'
          }`}
        >
          <span className="transform skew-x-8">Tout ({categories.reduce((s, c) => s + (c.items?.length || 0), 0)})</span>
        </button>

        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setSelectedCategory(cat.id)}
            className={`px-3.5 py-2 rounded-xl text-xs font-anybody font-bold uppercase tracking-wider transition-all sport-skew cursor-pointer shrink-0 ${
              selectedCategory === cat.id
                ? 'bg-primary text-black shadow-[0_0_15px_rgba(255,110,0,0.3)]'
                : 'bg-surface border border-[#353535] text-foreground/70 hover:text-white hover:border-primary/40'
            }`}
          >
            <span className="transform skew-x-8">{cat.name} ({cat.items?.length || 0})</span>
          </button>
        ))}
      </div>

      {/* 3. CATALOGUE PRODUITS (GRILLE SMARTPHONE) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {loading ? (
          <div className="col-span-full py-16 text-center text-foreground/40 text-xs font-mono space-y-2">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto text-primary" />
            <p>Chargement des consommations fraîches...</p>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="col-span-full py-12 text-center text-foreground/40 text-xs font-mono">
            Aucun article disponible dans cette catégorie.
          </div>
        ) : (
          filteredItems.map((item) => {
            const inStock = item.stock_quantity > 0;
            const inCart = cart.find((l) => l.item.id === item.id);
            const cartQty = inCart ? inCart.quantity : 0;

            return (
              <div
                key={item.id}
                className={`p-3.5 rounded-2xl border flex flex-col justify-between min-h-[120px] transition-all select-none relative ${
                  !inStock
                    ? 'bg-surface/30 border-[#353535] opacity-45 cursor-not-allowed'
                    : cartQty > 0
                    ? 'bg-primary/10 border-primary shadow-[0_0_20px_rgba(255,110,0,0.2)] ring-1 ring-primary/50'
                    : 'bg-surface hover:bg-surface-high border-[#353535] hover:border-primary/40'
                }`}
              >
                {/* Info Produit */}
                <div onClick={() => inStock && addToCart(item)} className="cursor-pointer">
                  <div className="flex items-start justify-between gap-1">
                    <span className="font-anybody font-bold text-xs uppercase text-white leading-tight line-clamp-2">
                      {item.name}
                    </span>
                  </div>
                  <div className="mt-1 flex items-baseline gap-1.5">
                    <span className="font-mono text-sm sm:text-base font-bold text-primary">
                      {item.selling_price.toFixed(2)} €
                    </span>
                    <span className="text-[10px] font-mono text-foreground/40">
                      (stock: {item.stock_quantity})
                    </span>
                  </div>
                </div>

                {/* Sélecteur + / - Simple */}
                <div className="mt-3 flex items-center justify-between pt-2 border-t border-[#353535]/60 font-mono">
                  {cartQty > 0 ? (
                    <div className="flex items-center justify-between w-full">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          updateQuantity(item.id, -1);
                        }}
                        className="w-7 h-7 rounded-lg bg-surface-dim hover:bg-surface border border-[#353535] text-white flex items-center justify-center active:scale-95 transition-transform"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <span className="font-bold text-sm text-primary px-2 font-mono">
                        {cartQty}
                      </span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (cartQty < item.stock_quantity) {
                            updateQuantity(item.id, 1);
                          }
                        }}
                        disabled={cartQty >= item.stock_quantity}
                        className="w-7 h-7 rounded-lg bg-primary text-black font-bold flex items-center justify-center active:scale-95 transition-transform disabled:opacity-40"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      disabled={!inStock}
                      onClick={(e) => {
                        e.stopPropagation();
                        addToCart(item);
                      }}
                      className="w-full py-1.5 rounded-lg bg-surface-dim hover:bg-primary/20 border border-[#353535] hover:border-primary/40 text-foreground/80 hover:text-primary font-bold text-[11px] flex items-center justify-center gap-1.5 transition-colors disabled:opacity-40"
                    >
                      <Plus className="w-3 h-3" />
                      <span>Ajouter</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* 4. PANIER FLOTTANT / BAS DE PAGE & VALIDATION INSTANTANÉE */}
      {cart.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-40 p-4 bg-[#0d0d0de6] backdrop-blur-xl border-t border-primary/40 shadow-[0_-10px_35px_rgba(0,0,0,0.8)] animate-slide-up">
          <div className="max-w-3xl mx-auto space-y-3 font-mono">
            {/* Ligne récapitulative des articles */}
            <div className="flex items-center justify-between text-xs border-b border-[#353535] pb-2.5">
              <div className="flex items-center gap-2">
                <ShoppingBag className="w-4 h-4 text-primary" />
                <span className="text-white font-bold uppercase font-anybody">
                  Ma sélection ({totalCartCount} article{totalCartCount > 1 ? 's' : ''})
                </span>
              </div>
              <button
                type="button"
                onClick={() => setCart([])}
                className="text-foreground/50 hover:text-rose-400 text-[11px] transition-colors"
              >
                Vider
              </button>
            </div>

            {/* Détail rapide des lignes sélectionnées */}
            <div className="flex items-center gap-2 overflow-x-auto py-1 no-scrollbar text-xs">
              {cart.map((line) => (
                <div
                  key={line.item.id}
                  className="px-2.5 py-1 rounded-lg bg-surface border border-[#353535] flex items-center gap-2 shrink-0"
                >
                  <span className="text-white font-medium">{line.item.name}</span>
                  <span className="text-primary font-bold">x{line.quantity}</span>
                  <span className="text-foreground/50 text-[10px]">
                    ({(line.item.selling_price * line.quantity).toFixed(2)} €)
                  </span>
                </div>
              ))}
            </div>

            {/* Total & Bouton Direct de Validation */}
            <div className="flex items-center justify-between gap-3 pt-1">
              <div>
                <span className="text-[9px] uppercase text-foreground/50 font-bold block">
                  Total à débiter
                </span>
                <span className="font-anybody font-black text-2xl text-primary sport-skew">
                  {cartTotal.toFixed(2)} €
                </span>
              </div>

              <button
                type="button"
                disabled={checkoutLoading}
                onClick={handleCheckout}
                className="flex-1 sm:flex-initial premium-btn text-xs sm:text-sm px-6 py-3.5 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 sport-skew shadow-[0_0_25px_rgba(255,110,0,0.4)]"
              >
                <span className="text-base">🥤</span>
                <span className="transform skew-x-8 font-black uppercase tracking-wider">
                  {checkoutLoading ? 'Enregistrement...' : 'Valider ma consommation'}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Rechargement Compte SEPA */}
      <BarRechargeModal
        member={memberData}
        isOpen={rechargeModalOpen}
        onClose={() => {
          setRechargeModalOpen(false);
          refreshMember();
        }}
      />
    </div>
  );
}
