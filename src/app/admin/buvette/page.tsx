'use client';

import React, { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { usePermissions } from '@/modules/admin/hooks/usePermissions';
import AdminNav from '@/components/admin/AdminNav';
import BarPosTerminal from '@/modules/buvette/components/BarPosTerminal';
import BarStockManager from '@/modules/buvette/components/BarStockManager';
import BarAccountsManager from '@/modules/buvette/components/BarAccountsManager';
import WorkSessionBarTerminal from '@/modules/work-sessions/components/WorkSessionBarTerminal';
import BarCashRegisterOpenModal from '@/modules/buvette/components/BarCashRegisterOpenModal';
import {
  Coffee,
  Boxes,
  Wallet,
  Clock,
  Coins,
  ShieldAlert,
  ArrowLeft,
  Wrench,
} from 'lucide-react';
import Link from 'next/link';

type BuvetteTab = 'stocks' | 'accounts' | 'volunteers';

export default function AdminBuvettePage() {
  const { user, profile } = useAuth();
  const permissions = usePermissions(profile);
  const [activeTab, setActiveTab] = useState<BuvetteTab>('stocks');
  const [openCashModalOpen, setOpenCashModalOpen] = useState(false);

  if (!user || (!permissions.isAdmin && !permissions.isSuperAdmin)) {
    return (
      <div className="max-w-md mx-auto my-12 p-6 bg-surface border border-secondary/30 rounded-2xl text-center space-y-4 font-mono text-xs">
        <ShieldAlert className="w-10 h-10 text-secondary mx-auto" />
        <h2 className="font-anybody font-black text-lg uppercase text-white">
          Accès Restreint
        </h2>
        <p className="text-foreground/60">
          La gestion de la buvette est réservée aux administrateurs du Seraing Buggy Club.
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
              <Coffee className="w-5 h-5 text-primary" />
              <h1 className="font-anybody font-black text-xl sm:text-2xl uppercase tracking-tight text-white sport-skew">
                Back-office Buvette & Stocks <span className="text-primary">SBC</span>
              </h1>
            </div>
            <p className="text-xs font-mono text-foreground/50">
              Gestion du catalogue, approvisionnements, validation des virements et packs bénévoles.
            </p>
          </div>
        </div>

        {/* Bouton Caisse Direct + Préparation Fond + Navigation Onglets */}
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/buvette"
            className="px-4 py-2 rounded-lg bg-primary text-black font-anybody font-black text-xs uppercase tracking-wider transition-all sport-skew flex items-center gap-2 shadow-[2px_2px_0px_#000] hover:bg-secondary hover:text-white"
          >
            <Coins className="w-4 h-4" />
            <span className="transform skew-x-8">Ouvrir la Caisse POS</span>
          </Link>

          <button
            type="button"
            onClick={() => setOpenCashModalOpen(true)}
            className="px-3.5 py-2 rounded-lg bg-surface-high hover:bg-surface-dim border border-[#353535] hover:border-primary text-foreground/80 hover:text-white text-xs font-mono font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <Coins className="w-4 h-4 text-primary" />
            <span>Préparer / Ouvrir le fond de caisse</span>
          </button>

          <button
            onClick={() => setActiveTab('stocks')}
            className={`px-4 py-2 rounded-lg font-anybody font-bold text-xs uppercase tracking-wider transition-all sport-skew flex items-center gap-2 cursor-pointer ${
              activeTab === 'stocks'
                ? 'bg-white text-black shadow-[2px_2px_0px_#000]'
                : 'bg-surface border border-[#353535] text-foreground/60 hover:text-white'
            }`}
          >
            <Boxes className="w-4 h-4" />
            <span className="transform skew-x-8">Stocks & Tarifs</span>
          </button>

          <button
            onClick={() => setActiveTab('accounts')}
            className={`px-4 py-2 rounded-lg font-anybody font-bold text-xs uppercase tracking-wider transition-all sport-skew flex items-center gap-2 cursor-pointer ${
              activeTab === 'accounts'
                ? 'bg-white text-black shadow-[2px_2px_0px_#000]'
                : 'bg-surface border border-[#353535] text-foreground/60 hover:text-white'
            }`}
          >
            <Wallet className="w-4 h-4" />
            <span className="transform skew-x-8">Comptes & Virements</span>
          </button>

          <button
            onClick={() => setActiveTab('volunteers')}
            className={`px-4 py-2 rounded-lg font-anybody font-bold text-xs uppercase tracking-wider transition-all sport-skew flex items-center gap-2 cursor-pointer ${
              activeTab === 'volunteers'
                ? 'bg-white text-black shadow-[2px_2px_0px_#000]'
                : 'bg-surface border border-[#353535] text-foreground/60 hover:text-white'
            }`}
          >
            <Wrench className="w-4 h-4" />
            <span className="transform skew-x-8">Packs Bénévoles</span>
          </button>
        </div>
      </div>

      {/* Contenu Onglet Actif */}
      {activeTab === 'stocks' && <BarStockManager />}
      {activeTab === 'accounts' && <BarAccountsManager />}
      {activeTab === 'volunteers' && <WorkSessionBarTerminal />}

      {/* Modale de Préparation / Ouverture Fond de Caisse */}
      {openCashModalOpen && (
        <BarCashRegisterOpenModal
          isOpen={openCashModalOpen}
          onClose={() => setOpenCashModalOpen(false)}
        />
      )}
    </div>
  );
}
