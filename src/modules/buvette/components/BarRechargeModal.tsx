'use client';

import React, { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import {
  X,
  Copy,
  Check,
  CreditCard,
  QrCode,
  Info,
} from 'lucide-react';
import { generateSepaQrPayload, SBC_BANK_DETAILS } from '@/modules/payments/utils/sepa-qr';

interface BarRechargeModalProps {
  member: { id: string; first_name: string; last_name: string; wallet_balance?: number } | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function BarRechargeModal({ member, isOpen, onClose }: BarRechargeModalProps) {
  const [amount, setAmount] = useState<number>(20);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  if (!isOpen || !member) return null;

  const currentBalance = Number(member.wallet_balance || 0);

  const communication = `SOLDE BUVETTE ${member.last_name.toUpperCase()} ${member.first_name.toUpperCase()}`;

  const qrPayload = generateSepaQrPayload({
    beneficiaryName: SBC_BANK_DETAILS.beneficiaryName,
    iban: SBC_BANK_DETAILS.iban,
    amount: amount > 0 ? amount : 20,
    communication,
  });

  const handleCopy = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in">
      <div className="absolute inset-0" onClick={onClose} />
      <div className="relative z-10 w-full max-w-lg bg-[#121212] border border-[#353535] rounded-2xl overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.9)]">
        {/* Header */}
        <div className="p-5 border-b border-[#353535] bg-surface flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/30 flex items-center justify-center text-primary">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-anybody font-black text-lg uppercase text-white tracking-tight sport-skew">
                Recharger mon compte <span className="text-primary">Buvette</span>
              </h2>
              <p className="text-[11px] font-mono text-foreground/60">
                Crédit instantané par virement ou apurement d&apos;ardoise
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg bg-surface-dim hover:bg-surface-high text-foreground/50 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-5 max-h-[80vh] overflow-y-auto font-mono text-xs">
          {/* État actuel du solde */}
          <div
            className={`p-3.5 rounded-xl border flex items-center justify-between ${
              currentBalance < 0
                ? 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
            }`}
          >
            <div>
              <span className="text-[10px] uppercase font-bold tracking-wider block opacity-75">
                {currentBalance < 0 ? 'Ardoise actuelle à solder' : 'Solde disponible'}
              </span>
              <strong className="font-anybody font-black text-lg">
                {currentBalance < 0 ? `-${Math.abs(currentBalance).toFixed(2)} €` : `+${currentBalance.toFixed(2)} €`}
              </strong>
            </div>
            {currentBalance < 0 && (
              <button
                type="button"
                onClick={() => setAmount(Number(Math.abs(currentBalance).toFixed(2)))}
                className="px-3 py-1.5 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 text-white font-bold text-[10px] transition-colors"
              >
                Apurer ({Math.abs(currentBalance).toFixed(2)} €)
              </button>
            )}
          </div>

          {/* Sélecteur de montant rapide */}
          <div className="space-y-2">
            <label className="text-[10px] text-foreground/60 uppercase font-bold block">
              Montant du pack à créditer (min. 10 €) :
            </label>
            <div className="grid grid-cols-4 gap-2">
              {[10, 20, 50, 100].map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setAmount(preset)}
                  className={`py-2 rounded-xl border font-bold text-xs transition-all ${
                    amount === preset
                      ? 'bg-primary text-black border-primary font-black shadow-[0_0_15px_rgba(255,110,0,0.3)]'
                      : 'bg-surface border-[#353535] text-white hover:border-primary/50'
                  }`}
                >
                  +{preset} €
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2 mt-2">
              <input
                type="number"
                min="10"
                step="1"
                value={amount || ''}
                onChange={(e) => setAmount(Math.max(0, Number(e.target.value)))}
                placeholder="Autre montant (min. 10 €)..."
                className="flex-1 bg-surface border border-[#353535] rounded-xl px-3 py-2 text-white font-mono text-xs focus:outline-none focus:border-primary"
              />
              <span className="font-bold text-foreground/60">EUR (€)</span>
            </div>
          </div>

          {/* QR Code SEPA EPC */}
          <div className="p-4 rounded-xl bg-surface border border-[#353535] text-center space-y-3">
            <div className="flex items-center justify-center gap-2 text-primary font-bold text-[11px] uppercase">
              <QrCode className="w-4 h-4" />
              <span>Scan QR Bancaire (Belfius, BNP, KBC, ING...)</span>
            </div>

            <div className="inline-block p-3 bg-white rounded-xl shadow-lg">
              <QRCodeSVG
                value={qrPayload}
                size={160}
                level="M"
                fgColor="#000000"
                bgColor="#FFFFFF"
              />
            </div>
            <p className="text-[10px] text-foreground/50">
              Scannez ce QR Code avec votre application bancaire habituelle pour pré-remplir le virement de {amount.toFixed(2)} €.
            </p>
          </div>

          {/* Coordonnées bancaires copiables */}
          <div className="space-y-2 bg-surface-dim p-4 rounded-xl border border-[#353535]">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[9px] uppercase text-foreground/45 block">Bénéficiaire</span>
                <span className="font-bold text-white text-xs">{SBC_BANK_DETAILS.beneficiaryName}</span>
              </div>
              <span className="text-[10px] text-foreground/50 font-mono">{SBC_BANK_DETAILS.bankName}</span>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-[#353535]">
              <div>
                <span className="text-[9px] uppercase text-foreground/45 block">IBAN</span>
                <span className="font-mono font-bold text-primary text-xs">{SBC_BANK_DETAILS.iban}</span>
              </div>
              <button
                type="button"
                onClick={() => handleCopy(SBC_BANK_DETAILS.ibanRaw, 'iban')}
                className="px-2.5 py-1 rounded-lg bg-surface border border-[#353535] text-foreground/70 hover:text-white flex items-center gap-1.5 text-[10px]"
              >
                {copiedField === 'iban' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                <span>{copiedField === 'iban' ? 'Copié !' : 'Copier'}</span>
              </button>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-[#353535]">
              <div>
                <span className="text-[9px] uppercase text-foreground/45 block">Communication obligatoire</span>
                <span className="font-mono font-bold text-white text-[11px] break-all">{communication}</span>
              </div>
              <button
                type="button"
                onClick={() => handleCopy(communication, 'comm')}
                className="px-2.5 py-1 rounded-lg bg-surface border border-[#353535] text-foreground/70 hover:text-white flex items-center gap-1.5 text-[10px]"
              >
                {copiedField === 'comm' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                <span>{copiedField === 'comm' ? 'Copié !' : 'Copier'}</span>
              </button>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-primary/5 border border-primary/20 flex items-start gap-2.5 text-[10px] text-foreground/70">
            <Info className="w-4 h-4 text-primary shrink-0 mt-0.5" />
            <p>
              Votre compte sera crédité dès validation du virement par le trésorier. Vous pouvez continuer à vous servir au frigo en attendant (votre ardoise s&apos;ajustera automatiquement).
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[#353535] bg-surface flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-surface-high hover:bg-surface-dim border border-[#353535] text-white font-bold text-xs transition-colors"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
}
