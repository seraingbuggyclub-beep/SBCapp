'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  BarCategory,
  BarItem,
  BarCartItem,
  BarPaymentMethod,
  MemberProfile,
} from '@/types/models';
import { getBarCatalogue, createSelfServiceOrder } from '../actions';
import {
  Coffee,
  Plus,
  Minus,
  Trash2,
  Wallet,
  FileText,
  QrCode,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  ShoppingBag,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import Link from 'next/link';

interface BarSelfServiceViewProps {
  member: MemberProfile | null;
}

export default function BarSelfServiceView({ member }: BarSelfServiceViewProps) {
  const [categories, setCategories] = useState<BarCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [cart, setCart] = useState<BarCartItem[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<BarPaymentMethod>('WALLET');

  const [payconiqModalOpen, setPayconiqModalOpen] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [msg, setMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    const loadCatalogue = async () => {
      setLoading(true);
      const res = await getBarCatalogue();
      setCategories(res.data || []);
      setLoading(false);
    };
    loadCatalogue();
  }, []);

  const cartTotal = useMemo(() => {
    return cart.reduce((sum, line) => sum + line.item.selling_price * line.quantity, 0);
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

  const handleCheckout = async (methodToUse: BarPaymentMethod = paymentMethod) => {
    if (!member) {
      setMsg({ text: 'Veuillez vous connecter pour enregistrer vos consommations.', type: 'error' });
      return;
    }
    if (cart.length === 0) {
      setMsg({ text: 'Sélectionnez au moins une boisson ou un snack.', type: 'error' });
      return;
    }

    setCheckoutLoading(true);
    setMsg(null);

    const res = await createSelfServiceOrder({
      buyerId: member.id,
      items: cart.map((c) => ({ itemId: c.item.id, quantity: c.quantity })),
      paymentMethod: methodToUse,
    });

    setCheckoutLoading(false);

    if (res.success) {
      setMsg({
        text: `Consommation de ${cartTotal.toFixed(2)} € validée avec succès ! Merci de préserver les stocks du club.`,
        type: 'success',
      });
      setCart([]);
      setPayconiqModalOpen(false);
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

  if (!member) {
    return (
      <div className="max-w-md mx-auto p-6 bg-surface border border-[#353535] rounded-2xl text-center space-y-4 font-mono text-xs">
        <Coffee className="w-10 h-10 text-primary mx-auto" />
        <h2 className="font-anybody font-black text-lg uppercase text-white">
          Frigo Libre-Service SBC
        </h2>
        <p className="text-foreground/60">
          Pour enregistrer vos consommations en autonomie, veuillez vous connecter à votre compte pilote.
        </p>
        <Link
          href="/dashboard"
          className="inline-block premium-btn text-xs px-6 py-2.5 sport-skew"
        >
          <span className="transform skew-x-8">Se connecter</span>
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 space-y-6 animate-fade-in">
      {/* Header Pilote & Solde */}
      <div className="p-4 rounded-2xl bg-surface border border-[#353535] flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-[0_0_30px_rgba(0,0,0,0.5)]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/30 flex items-center justify-center text-primary">
            <Coffee className="w-5 h-5" />
          </div>
          <div>
            <h1 className="font-anybody font-black text-lg uppercase text-white sport-skew">
              Frigo Libre-Service <span className="text-primary">SBC</span>
            </h1>
            <p className="text-[11px] font-mono text-foreground/50">
              Pilote : <strong className="text-white">{member.first_name} {member.last_name}</strong>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 font-mono text-xs">
          <div className="px-3 py-1.5 rounded-xl bg-background border border-primary/30 text-primary">
            <span className="text-[9px] uppercase text-foreground/45 block">Mon Solde</span>
            <strong className="font-bold text-sm">{Number(member.wallet_balance || 0).toFixed(2)} €</strong>
          </div>

          {Number(member.tab_balance || 0) > 0 && (
            <div className="px-3 py-1.5 rounded-xl bg-background border border-yellow-500/30 text-yellow-400">
              <span className="text-[9px] uppercase text-foreground/45 block">Mon Ardoise</span>
              <strong className="font-bold text-sm">{Number(member.tab_balance || 0).toFixed(2)} €</strong>
            </div>
          )}
        </div>
      </div>

      {/* Notifications */}
      {msg && (
        <div
          className={`p-4 rounded-xl border text-xs font-mono flex items-center gap-2 animate-fade-in ${
            msg.type === 'success'
              ? 'bg-primary/10 border-primary/30 text-primary'
              : 'bg-secondary/15 border-secondary/40 text-secondary'
          }`}
        >
          {msg.type === 'success' ? <CheckCircle2 className="w-5 h-5 shrink-0" /> : <AlertCircle className="w-5 h-5 shrink-0" />}
          <span>{msg.text}</span>
        </div>
      )}

      {/* Catégories */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        <button
          onClick={() => setSelectedCategory('all')}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-anybody font-bold uppercase tracking-wider transition-all sport-skew cursor-pointer shrink-0 ${
            selectedCategory === 'all'
              ? 'bg-primary text-black'
              : 'bg-surface border border-[#353535] text-foreground/70 hover:text-white'
          }`}
        >
          <span className="transform skew-x-8">Tout</span>
        </button>

        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setSelectedCategory(cat.id)}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-anybody font-bold uppercase tracking-wider transition-all sport-skew cursor-pointer shrink-0 ${
              selectedCategory === cat.id
                ? 'bg-primary text-black'
                : 'bg-surface border border-[#353535] text-foreground/70 hover:text-white'
            }`}
          >
            <span className="transform skew-x-8">{cat.name}</span>
          </button>
        ))}
      </div>

      {/* Grille Articles */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {loading ? (
          <div className="col-span-full py-12 text-center text-foreground/40 text-xs font-mono">
            Chargement des consommations disponibles...
          </div>
        ) : (
          filteredItems.map((item) => {
            const inStock = item.stock_quantity > 0;
            const inCart = cart.find((l) => l.item.id === item.id);

            return (
              <div
                key={item.id}
                onClick={() => inStock && addToCart(item)}
                className={`p-3.5 rounded-xl border flex flex-col justify-between h-28 transition-all cursor-pointer select-none ${
                  !inStock
                    ? 'bg-surface/30 border-[#353535] opacity-40 cursor-not-allowed'
                    : inCart
                    ? 'bg-primary/10 border-primary shadow-[0_0_15px_rgba(255,110,0,0.15)]'
                    : 'bg-surface hover:bg-surface-high border-[#353535] hover:border-primary/50'
                }`}
              >
                <div>
                  <span className="font-anybody font-bold text-xs uppercase text-white block line-clamp-2">
                    {item.name}
                  </span>
                  <span className="font-mono text-sm font-bold text-primary block mt-0.5">
                    {item.selling_price.toFixed(2)} €
                  </span>
                </div>

                <div className="flex items-center justify-between font-mono text-[10px]">
                  <span className="text-foreground/40">Stock : {item.stock_quantity}</span>
                  {inCart && (
                    <span className="px-2 py-0.5 rounded-full bg-primary text-black font-bold">
                      x{inCart.quantity}
                    </span>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Panier & Validation (Flottant ou Bas de page) */}
      {cart.length > 0 && (
        <div className="p-4 rounded-2xl bg-surface border border-primary/40 space-y-4 shadow-[0_0_30px_rgba(255,110,0,0.2)] animate-fade-in">
          <div className="flex items-center justify-between border-b border-[#353535] pb-3 font-mono text-xs">
            <span className="font-bold text-white uppercase flex items-center gap-2">
              <ShoppingBag className="w-4 h-4 text-primary" />
              Mes consommations retirées
            </span>
            <button
              onClick={() => setCart([])}
              className="text-foreground/40 hover:text-secondary text-[11px]"
            >
              Vider
            </button>
          </div>

          {/* Lignes Panier */}
          <div className="space-y-2 max-h-40 overflow-y-auto font-mono text-xs pr-1">
            {cart.map((line) => (
              <div
                key={line.item.id}
                className="p-2 rounded-lg bg-surface-dim flex items-center justify-between"
              >
                <span className="text-white truncate flex-1">{line.item.name}</span>
                <div className="flex items-center gap-2 ml-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      updateQuantity(line.item.id, -1);
                    }}
                    className="w-5 h-5 rounded bg-background border border-[#353535] text-white flex items-center justify-center"
                  >
                    <Minus className="w-3 h-3" />
                  </button>
                  <span className="font-bold text-white w-4 text-center">{line.quantity}</span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      updateQuantity(line.item.id, 1);
                    }}
                    className="w-5 h-5 rounded bg-background border border-[#353535] text-white flex items-center justify-center"
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                  <span className="font-bold text-primary w-14 text-right">
                    {(line.item.selling_price * line.quantity).toFixed(2)} €
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Mode de règlement */}
          <div className="space-y-2 pt-2 border-t border-[#353535] font-mono text-xs">
            <span className="text-[10px] text-foreground/45 uppercase block">Mode de règlement :</span>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setPaymentMethod('WALLET')}
                className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer ${
                  paymentMethod === 'WALLET'
                    ? 'bg-primary/20 border-primary text-primary font-bold'
                    : 'bg-surface-dim border-[#353535] text-foreground/60'
                }`}
              >
                <Wallet className="w-4 h-4 mx-auto mb-1" />
                <span className="text-[10px] block">Mon Solde</span>
              </button>

              <button
                type="button"
                onClick={() => setPaymentMethod('TAB')}
                className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer ${
                  paymentMethod === 'TAB'
                    ? 'bg-yellow-500/20 border-yellow-500 text-yellow-400 font-bold'
                    : 'bg-surface-dim border-[#353535] text-foreground/60'
                }`}
              >
                <FileText className="w-4 h-4 mx-auto mb-1" />
                <span className="text-[10px] block">Mon Ardoise</span>
              </button>

              <button
                type="button"
                onClick={() => setPaymentMethod('PAYCONIQ')}
                className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer ${
                  paymentMethod === 'PAYCONIQ'
                    ? 'bg-pink-500/20 border-pink-500 text-pink-400 font-bold'
                    : 'bg-surface-dim border-[#353535] text-foreground/60'
                }`}
              >
                <QrCode className="w-4 h-4 mx-auto mb-1" />
                <span className="text-[10px] block">Payconiq</span>
              </button>
            </div>
          </div>

          {/* Bouton de confirmation */}
          <div className="flex items-center justify-between pt-2">
            <div>
              <span className="text-[10px] font-mono text-foreground/45 uppercase block">Total</span>
              <span className="font-anybody font-black text-2xl text-primary sport-skew">
                {cartTotal.toFixed(2)} €
              </span>
            </div>

            <button
              type="button"
              disabled={checkoutLoading}
              onClick={() => {
                if (paymentMethod === 'PAYCONIQ') {
                  setPayconiqModalOpen(true);
                } else {
                  handleCheckout(paymentMethod);
                }
              }}
              className="premium-btn text-xs px-6 py-3 flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span className="transform skew-x-8">
                {checkoutLoading ? 'Validation...' : 'Valider mon retrait'}
              </span>
            </button>
          </div>
        </div>
      )}

      {/* Payconiq Modal */}
      {payconiqModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in">
          <div className="absolute inset-0" onClick={() => setPayconiqModalOpen(false)} />
          <div className="relative z-10 w-full max-w-sm bg-[#0f0f0f] border border-[#353535] rounded-2xl p-5 space-y-4 shadow-[0_0_50px_rgba(0,0,0,0.9)] text-center">
            <h3 className="font-anybody font-bold text-sm uppercase text-white">
              Paiement Payconiq Buvette
            </h3>

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

            <button
              onClick={() => handleCheckout('PAYCONIQ')}
              disabled={checkoutLoading}
              className="w-full premium-btn text-xs py-2.5"
            >
              <span className="transform skew-x-8">J'ai effectué le paiement</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
