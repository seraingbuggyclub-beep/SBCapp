'use client';

import React, { useState, useEffect } from 'react';
import { MemberProfile, ConsentUpdateInput } from '@/types/models';
import {
  updateMemberConsents,
  exportMemberData,
  requestAccountDeletion,
} from '../actions';
import {
  ShieldCheck,
  Download,
  Trash2,
  Bell,
  Trophy,
  Camera,
  MessageSquare,
  CheckCircle2,
  AlertCircle,
  Clock,
  Lock,
  ExternalLink,
  RefreshCw,
} from 'lucide-react';

interface MemberPrivacyCenterProps {
  member: MemberProfile | null;
  onUpdate?: () => void;
}

export default function MemberPrivacyCenter({
  member,
  onUpdate,
}: MemberPrivacyCenterProps) {
  const [newsConsent, setNewsConsent] = useState<boolean>(member?.consent_email_club_news !== false);
  const [eventsConsent, setEventsConsent] = useState<boolean>(member?.consent_email_events !== false);
  const [imageConsent, setImageConsent] = useState<boolean>(member?.consent_image_rights !== false);
  const [waConsent, setWaConsent] = useState<boolean>(Boolean(member?.consent_whatsapp_group));

  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (member) {
      setNewsConsent(member.consent_email_club_news !== false);
      setEventsConsent(member.consent_email_events !== false);
      setImageConsent(member.consent_image_rights !== false);
      setWaConsent(Boolean(member.consent_whatsapp_group));
    }
  }, [member]);

  const handleToggle = async (key: keyof ConsentUpdateInput, currentVal: boolean) => {
    if (!member) return;
    setSaving(true);
    setMsg(null);

    const newVal = !currentVal;
    if (key === 'consent_email_club_news') setNewsConsent(newVal);
    if (key === 'consent_email_events') setEventsConsent(newVal);
    if (key === 'consent_image_rights') setImageConsent(newVal);
    if (key === 'consent_whatsapp_group') setWaConsent(newVal);

    const res = await updateMemberConsents(member.id, { [key]: newVal });
    setSaving(false);

    if (res.success) {
      setMsg({ type: 'success', text: 'Préférences de confidentialité enregistrées.' });
      if (onUpdate) onUpdate();
    } else {
      setMsg({ type: 'error', text: res.error || 'Erreur lors de la mise à jour.' });
    }
  };

  const handleExportData = async () => {
    if (!member) return;
    setExporting(true);
    const res = await exportMemberData(member.id);
    setExporting(false);

    if (res.jsonContent) {
      const blob = new Blob([res.jsonContent], { type: 'application/json;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', res.filename || 'SBC_Mes_Donnees_RGPD.json');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const handleDeleteAccount = async () => {
    if (!member) return;
    setDeleting(true);
    const res = await requestAccountDeletion(member.id);
    setDeleting(false);

    if (res.success) {
      alert('Votre compte a été anonymisé conformément au droit à l\'effacement.');
      window.location.href = '/';
    } else {
      alert(res.error || 'Erreur lors de la suppression.');
    }
  };

  if (!member) return null;

  return (
    <div className="premium-card p-6 md:p-8 rounded-2xl border border-[#353535] space-y-6 shadow-[0_0_30px_rgba(0,0,0,0.5)] font-mono text-xs">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#353535] pb-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary border border-primary/30 flex items-center justify-center">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-anybody font-black text-base uppercase text-white tracking-tight sport-skew">
              Centre de Confidentialité & Préférences RGPD
            </h3>
            <p className="text-[11px] text-foreground/50">
              Conformité APD Belgique • Maîtrise totale de vos données et communications
            </p>
          </div>
        </div>

        <button
          onClick={handleExportData}
          disabled={exporting}
          className="px-3.5 py-2 rounded-lg bg-surface hover:bg-surface-high border border-[#353535] text-primary hover:text-white flex items-center gap-1.5 transition-colors cursor-pointer shrink-0 self-start sm:self-center disabled:opacity-50"
        >
          <Download className="w-3.5 h-3.5" />
          <span>{exporting ? 'Génération...' : '📥 Télécharger mes données (JSON)'}</span>
        </button>
      </div>

      {/* Messages */}
      {msg && (
        <div
          className={`p-3 rounded-xl border flex items-center justify-between animate-fade-in ${
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

      {/* Toggles de Consentement */}
      <div className="space-y-4">
        <h4 className="font-anybody font-bold text-xs uppercase text-foreground/70 tracking-wider">
          1. Préférences de Communication & Droit à l'Image
        </h4>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Toggle 1 : Communications Officielles */}
          <div className="p-4 rounded-xl bg-surface-dim border border-[#353535] flex items-start justify-between gap-3">
            <div className="flex items-start gap-2.5">
              <Bell className="w-4 h-4 text-primary shrink-0 mt-0.5" />
              <div>
                <strong className="text-white block font-bold font-sans text-xs">
                  Communications Officielles du Club
                </strong>
                <p className="text-[10px] text-foreground/60 mt-0.5 leading-relaxed">
                  Convocations AG, rappels de cotisation, informations administratives importantes.
                </p>
              </div>
            </div>
            <input
              type="checkbox"
              checked={newsConsent}
              onChange={() => handleToggle('consent_email_club_news', newsConsent)}
              disabled={saving}
              className="toggle-checkbox w-5 h-5 accent-primary cursor-pointer shrink-0 mt-1"
            />
          </div>

          {/* Toggle 2 : Annonces de Courses & Travaux */}
          <div className="p-4 rounded-xl bg-surface-dim border border-[#353535] flex items-start justify-between gap-3">
            <div className="flex items-start gap-2.5">
              <Trophy className="w-4 h-4 text-primary shrink-0 mt-0.5" />
              <div>
                <strong className="text-white block font-bold font-sans text-xs">
                  Annonces de Courses & Journées Travaux
                </strong>
                <p className="text-[10px] text-foreground/60 mt-0.5 leading-relaxed">
                  Calendrier des courses amicales et championnats, ouvertures exceptionnelles de la piste.
                </p>
              </div>
            </div>
            <input
              type="checkbox"
              checked={eventsConsent}
              onChange={() => handleToggle('consent_email_events', eventsConsent)}
              disabled={saving}
              className="toggle-checkbox w-5 h-5 accent-primary cursor-pointer shrink-0 mt-1"
            />
          </div>

          {/* Toggle 3 : Droit à l'Image */}
          <div className="p-4 rounded-xl bg-surface-dim border border-[#353535] flex items-start justify-between gap-3">
            <div className="flex items-start gap-2.5">
              <Camera className="w-4 h-4 text-primary shrink-0 mt-0.5" />
              <div>
                <strong className="text-white block font-bold font-sans text-xs">
                  Droit à l'Image (Photos & Podiums)
                </strong>
                <p className="text-[10px] text-foreground/60 mt-0.5 leading-relaxed">
                  Autorisation de publication des photos des courses, podiums et stands sur les réseaux du SBC.
                </p>
              </div>
            </div>
            <input
              type="checkbox"
              checked={imageConsent}
              onChange={() => handleToggle('consent_image_rights', imageConsent)}
              disabled={saving}
              className="toggle-checkbox w-5 h-5 accent-primary cursor-pointer shrink-0 mt-1"
            />
          </div>

          {/* Toggle 4 : Groupe WhatsApp */}
          <div className="p-4 rounded-xl bg-surface-dim border border-[#353535] flex items-start justify-between gap-3">
            <div className="flex items-start gap-2.5">
              <MessageSquare className="w-4 h-4 text-primary shrink-0 mt-0.5" />
              <div>
                <strong className="text-white block font-bold font-sans text-xs">
                  Groupe Communautaire WhatsApp
                </strong>
                <p className="text-[10px] text-foreground/60 mt-0.5 leading-relaxed">
                  Autorisation d'ajout de votre numéro dans le groupe informel des pilotes du club.
                </p>
              </div>
            </div>
            <input
              type="checkbox"
              checked={waConsent}
              onChange={() => handleToggle('consent_whatsapp_group', waConsent)}
              disabled={saving}
              className="toggle-checkbox w-5 h-5 accent-primary cursor-pointer shrink-0 mt-1"
            />
          </div>
        </div>
      </div>

      {/* Droits RGPD & DPO */}
      <div className="pt-4 border-t border-[#353535] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="text-[11px] text-foreground/50 space-y-0.5">
          <p>
            Délégué à la Protection des Données (DPO) : <strong>contact@seraingbuggyclub.be</strong>
          </p>
          <p>
            Vous disposez d'un droit permanent d'accès (Art. 15), de rectification (Art. 16) et de portabilité (Art. 20).
          </p>
        </div>

        <button
          type="button"
          onClick={() => setDeleteModalOpen(true)}
          className="px-3 py-1.5 rounded-lg bg-secondary/10 hover:bg-secondary/20 border border-secondary/30 text-secondary text-[11px] font-bold flex items-center gap-1.5 transition-colors cursor-pointer self-start sm:self-center"
        >
          <Trash2 className="w-3.5 h-3.5" />
          <span>Supprimer mon compte (Art. 17)</span>
        </button>
      </div>

      {/* Modale de Confirmation de Suppression */}
      {deleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
          <div className="w-full max-w-md bg-[#0f0f0f] border border-secondary/40 rounded-2xl p-6 space-y-4 shadow-2xl">
            <div className="flex items-center gap-3 text-secondary">
              <AlertCircle className="w-6 h-6" />
              <h3 className="font-anybody font-black text-base uppercase text-white">
                Confirmer la suppression du compte ?
              </h3>
            </div>
            <p className="text-xs text-foreground/70 leading-relaxed">
              Conformément à l'Article 17 du RGPD, vos coordonnées personnelles seront immédiatement effacées.
              Les écritures financières obligatoires seront anonymisées conformément aux exigences de la loi ASBL belge.
            </p>
            <div className="flex justify-end gap-2 pt-2 border-t border-[#292929]">
              <button
                onClick={() => setDeleteModalOpen(false)}
                className="px-4 py-2 rounded-lg bg-surface border border-[#353535] text-foreground/70"
              >
                Annuler
              </button>
              <button
                onClick={handleDeleteAccount}
                disabled={deleting}
                className="px-4 py-2 rounded-lg bg-secondary text-white font-bold cursor-pointer disabled:opacity-50"
              >
                {deleting ? 'Suppression...' : 'Confirmer l\'effacement'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
