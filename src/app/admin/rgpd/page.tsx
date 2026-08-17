'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { usePermissions } from '@/modules/admin/hooks/usePermissions';
import AdminNav from '@/components/admin/AdminNav';
import AdminEmailShield from '@/modules/gdpr/components/AdminEmailShield';
import ConsentsSummaryStatsView from '@/modules/gdpr/components/ConsentsSummaryStatsView';
import GdprRegisterPrintModal from '@/modules/gdpr/components/GdprRegisterPrintModal';
import {
  GdprProcessingActivity,
  MemberConsentsStats,
} from '@/types/models';
import {
  getGdprProcessingRegister,
  getConsentsSummaryStats,
} from '@/modules/gdpr/actions';
import {
  ShieldCheck,
  FileText,
  Mail,
  PieChart,
  Printer,
  RefreshCw,
  ArrowLeft,
  ShieldAlert,
  Edit2,
  Lock,
} from 'lucide-react';
import Link from 'next/link';

export default function AdminGdprPage() {
  const { user, profile } = useAuth();
  const permissions = usePermissions(profile);

  const [activeTab, setActiveTab] = useState<'register' | 'email_shield' | 'stats'>('register');
  const [activities, setActivities] = useState<GdprProcessingActivity[]>([]);
  const [stats, setStats] = useState<MemberConsentsStats>({
    totalMembers: 0,
    newsOptInCount: 0,
    newsOptInPct: 0,
    eventsOptInCount: 0,
    eventsOptInPct: 0,
    imageRightsOptInCount: 0,
    imageRightsOptInPct: 0,
    whatsappOptInCount: 0,
    whatsappOptInPct: 0,
  });
  const [loading, setLoading] = useState(true);
  const [printModalOpen, setPrintModalOpen] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    const [regRes, statsRes] = await Promise.all([
      getGdprProcessingRegister(),
      getConsentsSummaryStats(),
    ]);

    setActivities(regRes.data || []);
    if (statsRes.stats) setStats(statsRes.stats);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (!user || (!permissions.isAdmin && !permissions.isSuperAdmin)) {
    return (
      <div className="max-w-md mx-auto my-12 p-6 bg-surface border border-secondary/30 rounded-2xl text-center space-y-4 font-mono text-xs">
        <ShieldAlert className="w-10 h-10 text-secondary mx-auto" />
        <h2 className="font-anybody font-black text-lg uppercase text-white">
          Accès Restreint
        </h2>
        <p className="text-foreground/60">
          Le registre légal des traitements et le centre RGPD/APD sont réservés aux administrateurs.
        </p>
        <Link
          href="/dashboard"
          className="inline-block premium-btn text-xs px-6 py-2.5 sport-skew"
        >
          <span className="transform skew-x-8">Retour Cockpit</span>
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6 animate-fade-in">
      {/* Header Admin */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#353535] pb-4">
        <div className="flex items-center gap-3">
          <Link
            href="/admin"
            className="p-2 rounded-lg bg-surface hover:bg-surface-high border border-[#353535] text-foreground/60 hover:text-white transition-colors"
            title="Retour Administration"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>

          <div>
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-primary" />
              <h1 className="font-anybody font-black text-xl sm:text-2xl uppercase tracking-tight text-white sport-skew">
                Conformité RGPD & <span className="text-primary">APD Belgique</span>
              </h1>
            </div>
            <p className="text-xs font-mono text-foreground/50">
              Registre des activités de traitement (Art. 30), outil d'email sécurisé et gestion des consentements.
            </p>
          </div>
        </div>

        {/* Actions rapides */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setPrintModalOpen(true)}
            className="px-4 py-2.5 rounded-lg bg-surface hover:bg-surface-high border border-[#353535] text-foreground/80 hover:text-white text-xs font-anybody font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all sport-skew cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5 text-primary" />
            <span className="transform skew-x-8">Imprimer Registre APD</span>
          </button>

          <button
            onClick={loadData}
            disabled={loading}
            className="p-2.5 rounded-lg bg-surface hover:bg-surface-high border border-[#353535] text-foreground/70 hover:text-white transition-colors cursor-pointer"
            title="Actualiser"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Barre d'onglets */}
      <div className="flex items-center gap-2 border-b border-[#353535] pb-2">
        <button
          onClick={() => setActiveTab('register')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded font-anybody font-extrabold uppercase text-xs tracking-wider transition-all sport-skew cursor-pointer ${
            activeTab === 'register'
              ? 'bg-primary text-black shadow-[3px_3px_0px_#000]'
              : 'bg-surface text-foreground/70 hover:text-white hover:bg-surface-high border border-[#353535]'
          }`}
        >
          <FileText className="w-3.5 h-3.5 transform skew-x-8" />
          <span className="transform skew-x-8">1. Registre APD (Art. 30)</span>
        </button>

        <button
          onClick={() => setActiveTab('email_shield')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded font-anybody font-extrabold uppercase text-xs tracking-wider transition-all sport-skew cursor-pointer ${
            activeTab === 'email_shield'
              ? 'bg-primary text-black shadow-[3px_3px_0px_#000]'
              : 'bg-surface text-foreground/70 hover:text-white hover:bg-surface-high border border-[#353535]'
          }`}
        >
          <Mail className="w-3.5 h-3.5 transform skew-x-8" />
          <span className="transform skew-x-8">2. Email Shield Sécurisé</span>
        </button>

        <button
          onClick={() => setActiveTab('stats')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded font-anybody font-extrabold uppercase text-xs tracking-wider transition-all sport-skew cursor-pointer ${
            activeTab === 'stats'
              ? 'bg-primary text-black shadow-[3px_3px_0px_#000]'
              : 'bg-surface text-foreground/70 hover:text-white hover:bg-surface-high border border-[#353535]'
          }`}
        >
          <PieChart className="w-3.5 h-3.5 transform skew-x-8" />
          <span className="transform skew-x-8">3. Taux d'Opt-in & Consentements</span>
        </button>
      </div>

      {/* Contenu selon onglet */}
      {activeTab === 'register' ? (
        <div className="space-y-4 font-mono text-xs">
          <div className="p-4 rounded-xl bg-surface border border-[#353535] flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <ShieldCheck className="w-4 h-4 text-green-400" />
              <span className="text-white font-bold">
                5 Activités de traitement ASBL déclarées et conformes APD
              </span>
            </div>
            <span className="text-foreground/50 text-[10px]">
              Dernière révision : {new Date().toLocaleDateString('fr-FR')}
            </span>
          </div>

          <div className="space-y-4">
            {activities.map((act, index) => (
              <div
                key={act.id}
                className="p-5 rounded-xl bg-surface border border-[#353535] space-y-3 shadow-[4px_4px_0px_#000]"
              >
                <div className="flex items-start justify-between border-b border-[#353535] pb-2">
                  <div>
                    <h3 className="font-anybody font-bold text-sm text-white">
                      {index + 1}. {act.activity_name}
                    </h3>
                    <span className="text-[10px] text-primary uppercase font-bold">
                      Base légale : {act.legal_basis}
                    </span>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-surface-dim border border-[#353535] text-foreground/60">
                    Art. 30 RGPD
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  <div>
                    <strong className="text-foreground/50 uppercase text-[10px] block">Finalité :</strong>
                    <p className="text-foreground/90 font-sans text-xs mt-0.5 leading-relaxed">{act.purpose}</p>
                  </div>
                  <div>
                    <strong className="text-foreground/50 uppercase text-[10px] block">Données traitées :</strong>
                    <p className="text-foreground/90 font-sans text-xs mt-0.5 leading-relaxed">{act.data_categories}</p>
                  </div>
                  <div>
                    <strong className="text-foreground/50 uppercase text-[10px] block">Durée de conservation :</strong>
                    <p className="text-foreground/90 font-sans text-xs mt-0.5 leading-relaxed">{act.retention_period}</p>
                  </div>
                  <div>
                    <strong className="text-foreground/50 uppercase text-[10px] block">Destinataires :</strong>
                    <p className="text-foreground/90 font-sans text-xs mt-0.5 leading-relaxed">{act.recipients}</p>
                  </div>
                </div>

                <div className="pt-2 border-t border-[#353535]/50 flex items-center justify-between text-[11px] text-foreground/50">
                  <span>Sécurité : {act.security_measures}</span>
                  <span className="text-[10px]">Mis à jour : {act.updated_at.split('T')[0]}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : activeTab === 'email_shield' ? (
        <AdminEmailShield />
      ) : (
        <ConsentsSummaryStatsView stats={stats} />
      )}

      {/* Modale d'impression officielle APD */}
      <GdprRegisterPrintModal
        isOpen={printModalOpen}
        onClose={() => setPrintModalOpen(false)}
        activities={activities}
      />
    </div>
  );
}
