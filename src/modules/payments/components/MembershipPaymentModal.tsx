'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import {
  X,
  Copy,
  Check,
  CreditCard,
  Shield,
  Trophy,
  AlertCircle,
  Tag,
  CheckCircle2,
  Sparkles,
  Info,
  QrCode,
  Building2,
  FileText,
} from 'lucide-react';
import {
  MembershipPricing,
  MemberProfile,
  MembershipPaymentItem,
} from '@/types/models';
import {
  getClubMembershipPricing,
  getMemberMembershipPayment,
  submitMembershipPaymentChoice,
} from '../actions';
import { generateSepaQrPayload, SBC_BANK_DETAILS } from '../utils/sepa-qr';

interface MembershipPaymentModalProps {
  member: MemberProfile | null;
  isOpen: boolean;
  onClose: () => void;
  onPaymentUpdated?: () => void;
}

export default function MembershipPaymentModal({
  member,
  isOpen,
  onClose,
  onPaymentUpdated,
}: MembershipPaymentModalProps) {
  const currentYear = new Date().getFullYear();

  const [pricing, setPricing] = useState<MembershipPricing | null>(null);
  const [existingPayment, setExistingPayment] = useState<MembershipPaymentItem | null>(null);
  const [loading, setLoading] = useState(true);

  // Form State
  const [formula, setFormula] = useState<'with_fba' | 'without_fba' | 'special'>('with_fba');
  const [specialRateId, setSpecialRateId] = useState<string>('');
  const [licenseNumber, setLicenseNumber] = useState<string>('');
  const [includesChampionship, setIncludesChampionship] = useState<boolean>(false);

  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [savingChoice, setSavingChoice] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Initialisation des données
  useEffect(() => {
    if (!isOpen || !member) return;

    const loadData = async () => {
      setLoading(true);
      setErrorMsg(null);

      const [pricingRes, paymentRes] = await Promise.all([
        getClubMembershipPricing(currentYear),
        getMemberMembershipPayment(member.id, currentYear),
      ]);

      if (pricingRes.data) {
        setPricing(pricingRes.data);
      }

      if (paymentRes.data) {
        const p = paymentRes.data;
        setExistingPayment(p);
        setFormula(p.formula);
        setSpecialRateId(p.special_rate_id || '');
        setLicenseNumber(p.license_number || member.license_number || '');
        setIncludesChampionship(p.includes_belgian_championship);
      } else {
        setLicenseNumber(member.license_number || '');
      }

      setLoading(false);
    };

    loadData();
  }, [isOpen, member, currentYear]);

  // Calcul du montant total en temps réel
  const calculation = useMemo(() => {
    if (!pricing) return { base: 0, championship: 0, discount: 0, total: 0, isDiscountActive: false };

    let base = pricing.price_with_fba;
    if (formula === 'without_fba') {
      base = pricing.price_without_fba;
    } else if (formula === 'special' && specialRateId) {
      const sp = pricing.special_rates.find((r) => r.id === specialRateId);
      if (sp) base = sp.amount;
    }

    const championship = includesChampionship ? pricing.belgian_championship_fee : 0;

    // Réduction saisonnière
    let discount = 0;
    let isDiscountActive = false;
    if (pricing.discount_enabled && pricing.discount_amount > 0) {
      const today = new Date().toISOString().split('T')[0];
      const isInRange =
        (!pricing.discount_start_date || today >= pricing.discount_start_date) &&
        (!pricing.discount_end_date || today <= pricing.discount_end_date);

      if (isInRange) {
        discount = pricing.discount_amount;
        isDiscountActive = true;
      }
    }

    const total = Math.max(0, base + championship - discount);
    return { base, championship, discount, total, isDiscountActive };
  }, [pricing, formula, specialRateId, includesChampionship]);

  // Communication générée automatiquement
  const communication = useMemo(() => {
    if (!member) return `Cotisation SBC ${currentYear}`;
    const cleanLast = (member.last_name || '').toUpperCase().trim();
    const cleanFirst = (member.first_name || '').trim();
    return `${cleanLast} ${cleanFirst} Cotisation ${currentYear}`.trim();
  }, [member, currentYear]);

  // QR Code EPC SEPA
  const sepaQrPayload = useMemo(() => {
    return generateSepaQrPayload({
      beneficiaryName: SBC_BANK_DETAILS.beneficiaryName,
      iban: SBC_BANK_DETAILS.ibanRaw,
      amount: calculation.total,
      communication: communication,
    });
  }, [calculation.total, communication]);

  const handleCopy = (text: string, fieldName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 2500);
  };

  const handleSaveChoice = async () => {
    if (!member) return;
    setErrorMsg(null);
    setSuccessMsg(null);

    if (formula === 'without_fba' && (!licenseNumber || !licenseNumber.trim())) {
      setErrorMsg('Veuillez renseigner obligatoirement votre numéro de licence FBA pour la formule sans assurance club.');
      return;
    }

    setSavingChoice(true);
    const res = await submitMembershipPaymentChoice({
      user_id: member.id,
      year: currentYear,
      formula,
      special_rate_id: formula === 'special' ? specialRateId : null,
      license_number: licenseNumber.trim(),
      includes_belgian_championship: includesChampionship,
    });
    setSavingChoice(false);

    if (res.success) {
      setSuccessMsg('Choix de cotisation enregistré. Vous pouvez maintenant effectuer le virement bancaire ci-dessous.');
      if (onPaymentUpdated) onPaymentUpdated();
    } else {
      setErrorMsg(res.error || 'Erreur lors de l\'enregistrement.');
    }
  };

  if (!isOpen || !member) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in">
      {/* Click outside backdrop */}
      <div className="absolute inset-0" onClick={onClose} />

      {/* Modal Card */}
      <div className="relative z-10 w-full max-w-2xl bg-[#0f0f0f] border border-[#353535] rounded-2xl shadow-[0_0_50px_rgba(0,0,0,0.9)] overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-5 border-b border-[#292929] flex items-center justify-between bg-surface-dim">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/30 flex items-center justify-center text-primary">
              <CreditCard className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-anybody font-black text-lg md:text-xl uppercase tracking-tight text-white sport-skew">
                Cotisation Annuelle <span className="text-primary">{currentYear}</span>
              </h2>
              <p className="text-[11px] font-mono text-foreground/50">
                Seraing Buggy Club • Validation & Paiement Sécurisé
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-surface border border-transparent hover:border-[#353535] text-foreground/50 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {loading ? (
            <div className="py-12 flex flex-col items-center justify-center gap-3 text-foreground/50 font-mono text-xs">
              <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              <span>Chargement des tarifs officiels SBC...</span>
            </div>
          ) : (
            <>
              {/* Alert notification if messages */}
              {errorMsg && (
                <div className="p-3.5 rounded-xl bg-secondary/15 border border-secondary/40 text-secondary text-xs font-mono flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {successMsg && (
                <div className="p-3.5 rounded-xl bg-primary/15 border border-primary/40 text-primary text-xs font-mono flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{successMsg}</span>
                </div>
              )}

              {/* 1. Choix de la Formule */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="font-anybody font-bold text-xs uppercase tracking-wider text-white flex items-center gap-1.5">
                    <span className="w-5 h-5 rounded-full bg-primary text-black flex items-center justify-center text-[10px] font-black">1</span>
                    Choisissez votre formule de cotisation
                  </label>

                  {calculation.isDiscountActive && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-primary/20 border border-primary/40 text-primary text-[10px] font-mono font-bold animate-pulse">
                      <Sparkles className="w-3 h-3" />
                      {pricing?.discount_label} (-{pricing?.discount_amount} €)
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Option Avec FBA */}
                  <div
                    onClick={() => setFormula('with_fba')}
                    className={`p-4 rounded-xl border transition-all cursor-pointer flex flex-col justify-between gap-3 ${
                      formula === 'with_fba'
                        ? 'bg-primary/10 border-primary shadow-[0_0_15px_rgba(255,110,0,0.15)]'
                        : 'bg-surface border-[#353535] hover:border-foreground/30'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-1">
                        <span className="font-anybody font-black text-sm uppercase text-white block">
                          Cotisation + Assurance FBA
                        </span>
                        <p className="text-[11px] font-mono text-foreground/60">
                          Couverture complète officielle FBA incluse pour rouler sur la piste.
                        </p>
                      </div>
                      <input
                        type="radio"
                        name="membership_formula"
                        checked={formula === 'with_fba'}
                        onChange={() => setFormula('with_fba')}
                        className="accent-primary mt-1"
                      />
                    </div>
                    <div className="font-anybody font-black text-lg text-primary">
                      {pricing?.price_with_fba.toFixed(2)} €
                    </div>
                  </div>

                  {/* Option Sans FBA */}
                  <div
                    onClick={() => setFormula('without_fba')}
                    className={`p-4 rounded-xl border transition-all cursor-pointer flex flex-col justify-between gap-3 ${
                      formula === 'without_fba'
                        ? 'bg-primary/10 border-primary shadow-[0_0_15px_rgba(255,110,0,0.15)]'
                        : 'bg-surface border-[#353535] hover:border-foreground/30'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-1">
                        <span className="font-anybody font-black text-sm uppercase text-white block">
                          Cotisation Seule (Sans FBA)
                        </span>
                        <p className="text-[11px] font-mono text-foreground/60">
                          Pour les pilotes possédant déjà une licence FBA via un autre club.
                        </p>
                      </div>
                      <input
                        type="radio"
                        name="membership_formula"
                        checked={formula === 'without_fba'}
                        onChange={() => setFormula('without_fba')}
                        className="accent-primary mt-1"
                      />
                    </div>
                    <div className="font-anybody font-black text-lg text-primary">
                      {pricing?.price_without_fba.toFixed(2)} €
                    </div>
                  </div>
                </div>

                {/* Tarifs Spéciaux Optionnels */}
                {pricing?.special_rates && pricing.special_rates.length > 0 && (
                  <div className="pt-2">
                    <div
                      onClick={() => setFormula('special')}
                      className={`p-3.5 rounded-xl border transition-all cursor-pointer space-y-2 ${
                        formula === 'special'
                          ? 'bg-primary/10 border-primary'
                          : 'bg-surface border-[#353535] hover:border-foreground/30'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Tag className="w-4 h-4 text-primary" />
                          <span className="font-anybody font-bold text-xs uppercase text-white">
                            Tarifs Spéciaux du Club
                          </span>
                        </div>
                        <input
                          type="radio"
                          name="membership_formula"
                          checked={formula === 'special'}
                          onChange={() => setFormula('special')}
                          className="accent-primary"
                        />
                      </div>

                      {formula === 'special' && (
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
                          {pricing.special_rates.map((rate) => (
                            <button
                              key={rate.id}
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSpecialRateId(rate.id);
                              }}
                              className={`p-2.5 rounded-lg border text-left text-xs font-mono transition-all cursor-pointer ${
                                specialRateId === rate.id
                                  ? 'bg-primary text-black font-bold border-primary shadow-sm'
                                  : 'bg-background border-[#353535] text-white hover:border-primary/50'
                              }`}
                            >
                              <div className="font-bold truncate">{rate.label}</div>
                              <div className="text-[11px] opacity-90 mt-0.5">{rate.amount.toFixed(2)} €</div>
                              {rate.description && (
                                <div className="text-[9px] opacity-70 mt-1 line-clamp-1">{rate.description}</div>
                              )}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Saisie OBLIGATOIRE du numéro de licence si SANS FBA */}
                {formula === 'without_fba' && (
                  <div className="p-4 rounded-xl bg-secondary/10 border border-secondary/40 space-y-2 animate-fade-in">
                    <label className="block text-xs font-mono font-bold text-white uppercase">
                      Numéro de licence FBA en cours de validité (Obligatoire) *
                    </label>
                    <input
                      type="text"
                      value={licenseNumber}
                      onChange={(e) => setLicenseNumber(e.target.value)}
                      placeholder="Ex: FBA-2026-987654"
                      className="w-full bg-background border border-[#353535] rounded-lg px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-primary uppercase"
                      required
                    />
                    <p className="text-[10px] font-mono text-foreground/60">
                      Sans licence FBA valide, vous ne serez pas couvert sur la piste du Seraing Buggy Club.
                    </p>
                  </div>
                )}

                {/* Option Championnat de Belgique */}
                <div className="p-3.5 rounded-xl bg-surface border border-[#353535] flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-yellow-500/10 border border-yellow-500/30 text-yellow-400">
                      <Trophy className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="font-anybody font-bold text-xs uppercase text-white block">
                        Participation au Championnat de Belgique
                      </span>
                      <span className="text-[11px] font-mono text-foreground/50">
                        Inscription officielle au classement national FBA
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="font-anybody font-bold text-xs text-yellow-400">
                      +{pricing?.belgian_championship_fee.toFixed(2)} €
                    </span>
                    <input
                      type="checkbox"
                      checked={includesChampionship}
                      onChange={(e) => setIncludesChampionship(e.target.checked)}
                      className="w-4 h-4 accent-primary cursor-pointer"
                    />
                  </div>
                </div>
              </div>

              {/* Récapitulatif Tarifaire */}
              <div className="p-4 rounded-xl bg-surface-dim border border-[#353535] space-y-2 font-mono text-xs">
                <div className="flex justify-between text-foreground/70">
                  <span>Tarif de base ({formula === 'with_fba' ? 'Avec FBA' : formula === 'without_fba' ? 'Sans FBA' : 'Spécial'}) :</span>
                  <span className="text-white font-bold">{calculation.base.toFixed(2)} €</span>
                </div>

                {includesChampionship && (
                  <div className="flex justify-between text-yellow-400">
                    <span>Supplément Championnat de Belgique :</span>
                    <span className="font-bold">+{calculation.championship.toFixed(2)} €</span>
                  </div>
                )}

                {calculation.isDiscountActive && (
                  <div className="flex justify-between text-primary">
                    <span>{pricing?.discount_label} :</span>
                    <span className="font-bold">-{calculation.discount.toFixed(2)} €</span>
                  </div>
                )}

                <div className="pt-2 border-t border-[#353535] flex justify-between items-center text-sm font-sans">
                  <strong className="text-white uppercase font-anybody">Montant total à régler :</strong>
                  <span className="font-anybody font-black text-2xl text-primary sport-skew">
                    {calculation.total.toFixed(2)} €
                  </span>
                </div>
              </div>

              {/* Bouton de confirmation du choix */}
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={handleSaveChoice}
                  disabled={savingChoice}
                  className="px-4 py-2.5 rounded-lg bg-surface hover:bg-surface-high border border-[#353535] hover:border-primary text-xs font-mono text-white flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
                >
                  <FileText className="w-3.5 h-3.5 text-primary" />
                  <span>{savingChoice ? 'Enregistrement...' : 'Enregistrer mon choix de formule'}</span>
                </button>
              </div>

              {/* 2. Coordonnées Bancaires & QR Code EPC SEPA */}
              <div className="space-y-3 pt-4 border-t border-[#292929]">
                <label className="font-anybody font-bold text-xs uppercase tracking-wider text-white flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded-full bg-primary text-black flex items-center justify-center text-[10px] font-black">2</span>
                  Effectuez votre virement bancaire
                </label>

                <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
                  {/* Coordonnées */}
                  <div className="md:col-span-7 space-y-3 font-mono text-xs">
                    {/* Bénéficiaire */}
                    <div className="p-3 rounded-xl bg-surface border border-[#353535] flex items-center justify-between">
                      <div>
                        <span className="text-[10px] text-foreground/45 uppercase block">Bénéficiaire</span>
                        <strong className="text-white text-xs">{SBC_BANK_DETAILS.beneficiaryName}</strong>
                      </div>
                      <button
                        onClick={() => handleCopy(SBC_BANK_DETAILS.beneficiaryName, 'name')}
                        className="p-1.5 rounded bg-background hover:bg-surface-high text-foreground/60 hover:text-white cursor-pointer transition-colors"
                        title="Copier le nom"
                      >
                        {copiedField === 'name' ? <Check className="w-3.5 h-3.5 text-primary" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>

                    {/* IBAN */}
                    <div className="p-3 rounded-xl bg-surface border border-[#353535] flex items-center justify-between">
                      <div>
                        <span className="text-[10px] text-foreground/45 uppercase block">IBAN du Club ({SBC_BANK_DETAILS.bankName})</span>
                        <strong className="text-primary font-mono text-sm tracking-wider">{SBC_BANK_DETAILS.iban}</strong>
                      </div>
                      <button
                        onClick={() => handleCopy(SBC_BANK_DETAILS.iban, 'iban')}
                        className="p-1.5 rounded bg-background hover:bg-surface-high text-foreground/60 hover:text-white cursor-pointer transition-colors"
                        title="Copier l'IBAN"
                      >
                        {copiedField === 'iban' ? <Check className="w-3.5 h-3.5 text-primary" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>

                    {/* Communication */}
                    <div className="p-3 rounded-xl bg-surface border border-[#353535] flex items-center justify-between">
                      <div>
                        <span className="text-[10px] text-foreground/45 uppercase block">Communication Obligatoire</span>
                        <strong className="text-white text-xs tracking-wide">{communication}</strong>
                      </div>
                      <button
                        onClick={() => handleCopy(communication, 'comm')}
                        className="p-1.5 rounded bg-background hover:bg-surface-high text-foreground/60 hover:text-white cursor-pointer transition-colors"
                        title="Copier la communication"
                      >
                        {copiedField === 'comm' ? <Check className="w-3.5 h-3.5 text-primary" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>

                  {/* QR Code EPC SEPA */}
                  <div className="md:col-span-5 flex flex-col items-center justify-center p-4 rounded-xl bg-white border border-zinc-300 text-black text-center shadow-md">
                    <div className="flex items-center gap-1.5 text-[10px] font-mono font-bold text-zinc-700 uppercase tracking-wider mb-2">
                      <QrCode className="w-3.5 h-3.5 text-primary" />
                      <span>Scan Bancaire Direct</span>
                    </div>

                    <div className="p-1 bg-white rounded-lg">
                      <QRCodeSVG
                        value={sepaQrPayload}
                        size={140}
                        level="M"
                        fgColor="#000000"
                        bgColor="#FFFFFF"
                      />
                    </div>

                    <p className="text-[9px] font-mono text-zinc-600 mt-2 leading-tight">
                      Ouvrez votre app bancaire (Belfius, BNP, KBC, ING) et scannez ce code pour pré-remplir instantanément le virement.
                    </p>
                  </div>
                </div>
              </div>

              {/* Info Validation */}
              <div className="p-3.5 rounded-xl bg-surface/50 border border-[#353535] text-[11px] font-mono text-foreground/60 flex items-start gap-2">
                <Info className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                <p>
                  Dès réception de votre virement par la trésorerie du club, votre compte sera validé en 1 clic et votre <strong>Pass Pilote QR basculera automatiquement en Blanc</strong>.
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
