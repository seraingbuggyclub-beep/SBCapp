'use client';

import React, { useState, useEffect } from 'react';
import {
  AccountingTransaction,
  AccountingType,
  AccountingCategory,
  AccountingPaymentMethod,
  CreateTransactionInput,
} from '@/types/models';
import {
  createAccountingTransaction,
  updateAccountingTransaction,
} from '../actions';
import {
  X,
  Plus,
  Save,
  FileText,
  AlertCircle,
  CheckCircle2,
  Receipt,
  Sparkles,
  ArrowDownRight,
  ArrowUpRight,
  Upload,
} from 'lucide-react';

interface AccountingTransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  transactionToEdit?: AccountingTransaction | null;
}

export default function AccountingTransactionModal({
  isOpen,
  onClose,
  onSuccess,
  transactionToEdit,
}: AccountingTransactionModalProps) {
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [type, setType] = useState<AccountingType>('DEPENSE');
  const [category, setCategory] = useState<AccountingCategory>('ACHAT_MATERIEL');
  const [paymentMethod, setPaymentMethod] = useState<AccountingPaymentMethod>('BANQUE');
  const [amount, setAmount] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [receiptUrl, setReceiptUrl] = useState<string>('');

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (transactionToEdit) {
      setDate(transactionToEdit.date);
      setType(transactionToEdit.type);
      setCategory(transactionToEdit.category);
      setPaymentMethod(transactionToEdit.payment_method);
      setAmount(transactionToEdit.amount.toString());
      setDescription(transactionToEdit.description);
      setReceiptUrl(transactionToEdit.receipt_url || '');
    } else {
      setDate(new Date().toISOString().split('T')[0]);
      setType('DEPENSE');
      setCategory('ACHAT_MATERIEL');
      setPaymentMethod('BANQUE');
      setAmount('');
      setDescription('');
      setReceiptUrl('');
    }
  }, [transactionToEdit, isOpen]);

  // Raccourcis rapides de saisie
  const applyPreset = (preset: {
    type: AccountingType;
    category: AccountingCategory;
    paymentMethod: AccountingPaymentMethod;
    description: string;
  }) => {
    setType(preset.type);
    setCategory(preset.category);
    setPaymentMethod(preset.paymentMethod);
    setDescription(preset.description);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || Number(amount) <= 0 || !description.trim()) {
      setErrorMsg('Veuillez renseigner un montant valide et une description.');
      return;
    }

    setLoading(true);
    setErrorMsg(null);

    const payload: CreateTransactionInput = {
      date,
      type,
      category,
      payment_method: paymentMethod,
      amount: Number(amount),
      description: description.trim(),
      receipt_url: receiptUrl.trim() || null,
    };

    let res: { success: boolean; error: string | null };
    if (transactionToEdit) {
      res = await updateAccountingTransaction(transactionToEdit.id, payload);
    } else {
      res = await createAccountingTransaction(payload);
    }

    setLoading(false);

    if (res.success) {
      onSuccess();
      onClose();
    } else {
      setErrorMsg(res.error || "Erreur lors de l'enregistrement de l'écriture.");
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in">
      <div className="absolute inset-0" onClick={onClose} />

      <div className="relative z-10 w-full max-w-lg bg-[#0f0f0f] border border-[#353535] rounded-2xl shadow-[0_0_50px_rgba(0,0,0,0.9)] overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-5 border-b border-[#292929] flex items-center justify-between bg-surface-dim">
          <div className="flex items-center gap-2.5">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
              type === 'RECETTE' ? 'bg-green-500/10 text-green-400 border border-green-500/30' : 'bg-secondary/10 text-secondary border border-secondary/30'
            }`}>
              <Receipt className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-anybody font-black text-lg uppercase tracking-tight text-white sport-skew">
                {transactionToEdit ? "Modifier l'Écriture" : 'Nouvelle Écriture Comptable'}
              </h2>
              <p className="text-[11px] font-mono text-foreground/50">
                Grand Livre ASBL • Caisse & Banque
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-surface text-foreground/50 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4 font-mono text-xs flex-1">
          {errorMsg && (
            <div className="p-3 rounded-xl bg-secondary/15 border border-secondary/40 text-secondary flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Raccourcis Préréglages (si nouvelle écriture) */}
          {!transactionToEdit && (
            <div className="space-y-1.5 pb-2 border-b border-[#292929]">
              <div className="flex items-center gap-1.5 text-[10px] text-foreground/50 uppercase">
                <Sparkles className="w-3 h-3 text-primary" />
                <span>Raccourcis dépenses fréquentes :</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => applyPreset({
                    type: 'DEPENSE',
                    category: 'ACHAT_MATERIEL',
                    paymentMethod: 'BANQUE',
                    description: 'Achat outillage / visserie stands',
                  })}
                  className="px-2.5 py-1 rounded bg-surface hover:bg-surface-high border border-[#353535] text-[10px] text-foreground/80 hover:text-white transition-colors cursor-pointer"
                >
                  Outillage
                </button>

                <button
                  type="button"
                  onClick={() => applyPreset({
                    type: 'DEPENSE',
                    category: 'TRAVAUX_PISTE',
                    paymentMethod: 'BANQUE',
                    description: 'Essence / Entretien débroussailleuse & tonte',
                  })}
                  className="px-2.5 py-1 rounded bg-surface hover:bg-surface-high border border-[#353535] text-[10px] text-foreground/80 hover:text-white transition-colors cursor-pointer"
                >
                  Essence Débroussailleuse
                </button>

                <button
                  type="button"
                  onClick={() => applyPreset({
                    type: 'DEPENSE',
                    category: 'TRAVAUX_PISTE',
                    paymentMethod: 'BANQUE',
                    description: 'Moquette / Drainage / Travaux piste',
                  })}
                  className="px-2.5 py-1 rounded bg-surface hover:bg-surface-high border border-[#353535] text-[10px] text-foreground/80 hover:text-white transition-colors cursor-pointer"
                >
                  Travaux Moquette
                </button>

                <button
                  type="button"
                  onClick={() => applyPreset({
                    type: 'DEPENSE',
                    category: 'DEPOT_BANQUE',
                    paymentMethod: 'ESPECES',
                    description: 'Dépôt espèces caisse vers compte bancaire',
                  })}
                  className="px-2.5 py-1 rounded bg-surface hover:bg-surface-high border border-[#353535] text-[10px] text-foreground/80 hover:text-white transition-colors cursor-pointer"
                >
                  Dépôt Banque
                </button>
              </div>
            </div>
          )}

          {/* Type : Recette vs Dépense */}
          <div className="space-y-1.5">
            <label className="text-foreground/70 block uppercase text-[10px]">Type d'opération * :</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setType('RECETTE')}
                className={`p-2.5 rounded-xl border flex items-center justify-center gap-2 font-bold transition-all cursor-pointer ${
                  type === 'RECETTE'
                    ? 'bg-green-500/15 border-green-500 text-green-400 shadow-[0_0_15px_rgba(34,197,94,0.2)]'
                    : 'bg-surface border-[#353535] text-foreground/60 hover:text-white'
                }`}
              >
                <ArrowDownRight className="w-4 h-4" />
                <span>RECETTE (Entrée +)</span>
              </button>

              <button
                type="button"
                onClick={() => setType('DEPENSE')}
                className={`p-2.5 rounded-xl border flex items-center justify-center gap-2 font-bold transition-all cursor-pointer ${
                  type === 'DEPENSE'
                    ? 'bg-secondary/15 border-secondary text-secondary shadow-[0_0_15px_rgba(239,68,68,0.2)]'
                    : 'bg-surface border-[#353535] text-foreground/60 hover:text-white'
                }`}
              >
                <ArrowUpRight className="w-4 h-4" />
                <span>DÉPENSE (Sortie -)</span>
              </button>
            </div>
          </div>

          {/* Date & Montant */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-foreground/70 block uppercase text-[10px]">Date * :</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full bg-background border border-[#353535] rounded-xl px-3 py-2 text-white focus:outline-none focus:border-primary"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-foreground/70 block uppercase text-[10px]">Montant (€) * :</label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="w-full bg-background border border-[#353535] rounded-xl px-3 py-2 text-lg font-bold text-white focus:outline-none focus:border-primary"
                required
              />
            </div>
          </div>

          {/* Catégorie & Moyen de Paiement */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-foreground/70 block uppercase text-[10px]">Catégorie ASBL * :</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as AccountingCategory)}
                className="w-full bg-background border border-[#353535] rounded-xl px-3 py-2 text-white focus:outline-none focus:border-primary cursor-pointer font-sans"
              >
                <option value="ACHAT_MATERIEL">Achat Matériel / Outillage</option>
                <option value="TRAVAUX_PISTE">Travaux Piste / Aménagements</option>
                <option value="COTISATION">Cotisation Membre</option>
                <option value="BUVETTE">Buvette / Restauration</option>
                <option value="ASSURANCE_FBA">Assurance & Affiliation FBA</option>
                <option value="FRAIS_DIVERS">Frais Divers / Administratif</option>
                <option value="DEPOT_BANQUE">Dépôt Caisse vers Banque</option>
                <option value="RETRAIT_CAISSE">Retrait Fond de Caisse</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-foreground/70 block uppercase text-[10px]">Moyen de règlement * :</label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value as AccountingPaymentMethod)}
                className="w-full bg-background border border-[#353535] rounded-xl px-3 py-2 text-white focus:outline-none focus:border-primary cursor-pointer font-sans"
              >
                <option value="BANQUE">Compte Bancaire (Virement / Carte)</option>
                <option value="ESPECES">Caisse Espèces (Cash)</option>
                <option value="PAYCONIQ">Payconiq / QR</option>
              </select>
            </div>
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <label className="text-foreground/70 block uppercase text-[10px]">Description / Libellé de l'opération * :</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ex: Facture Leroy Merlin (vis, boulons pour podium)"
              className="w-full bg-background border border-[#353535] rounded-xl px-3 py-2 text-white focus:outline-none focus:border-primary"
              required
            />
          </div>

          {/* Justificatif / Facture (Lien ou URL) */}
          <div className="space-y-1.5">
            <label className="text-foreground/70 block uppercase text-[10px]">Lien du justificatif / Facture (optionnel) :</label>
            <div className="relative">
              <input
                type="text"
                value={receiptUrl}
                onChange={(e) => setReceiptUrl(e.target.value)}
                placeholder="https://... ou réf ticket"
                className="w-full bg-background border border-[#353535] rounded-xl px-3 py-2 text-white focus:outline-none focus:border-primary placeholder-foreground/30"
              />
            </div>
            <p className="text-[10px] text-foreground/45">
              Lien vers le cloud, Google Drive ou référence du ticket archivé pour le réviseur aux comptes.
            </p>
          </div>

          {/* Actions */}
          <div className="pt-3 border-t border-[#292929] flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg bg-surface border border-[#353535] text-foreground/70 hover:text-white"
            >
              Annuler
            </button>

            <button
              type="submit"
              disabled={loading}
              className="premium-btn text-xs px-6 py-2.5 flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span className="transform skew-x-8">
                {loading ? 'Enregistrement...' : transactionToEdit ? 'Mettre à jour' : 'Enregistrer au Grand Livre'}
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
