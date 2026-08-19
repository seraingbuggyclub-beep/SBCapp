'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { usePermissions } from '@/modules/admin/hooks/usePermissions';
import AdminNav from '@/components/admin/AdminNav';
import AttendanceRegisterTable from '@/modules/attendance/components/AttendanceRegisterTable';
import AttendanceAnalyticsView from '@/modules/attendance/components/AttendanceAnalyticsView';
import VisitorAttendanceModal from '@/modules/attendance/components/VisitorAttendanceModal';
import AttendanceFbaPrintModal from '@/modules/attendance/components/AttendanceFbaPrintModal';
import {
  FbaAttendanceItem,
  AttendanceStats,
  TrackItem,
} from '@/types/models';
import {
  getAttendanceRegister,
  getAttendanceStats,
} from '@/modules/attendance/actions';
import { getTracks } from '@/modules/tracks/actions';
import {
  ShieldCheck,
  BarChart3,
  ListOrdered,
  RefreshCw,
  ArrowLeft,
  ShieldAlert,
  UserPlus,
} from 'lucide-react';
import Link from 'next/link';

export default function AdminPresencesPage() {
  const { user, profile } = useAuth();
  const permissions = usePermissions(profile);

  const [activeTab, setActiveTab] = useState<'register' | 'analytics'>('register');
  const [datePreset, setDatePreset] = useState<'today' | 'week' | 'month' | 'all'>('month');
  const [selectedTrackId, setSelectedTrackId] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [analyticsPeriod, setAnalyticsPeriod] = useState<'week' | 'month' | 'year'>('month');

  const [attendances, setAttendances] = useState<FbaAttendanceItem[]>([]);
  const [tracks, setTracks] = useState<TrackItem[]>([]);
  const [stats, setStats] = useState<AttendanceStats>({
    totalSessions: 0,
    totalMembersCount: 0,
    totalVisitorsCount: 0,
    averageDurationMinutes: 0,
    peakHour: '14h - 16h',
    busiestDay: 'Samedi',
    dayOfWeekCounts: {},
    hourlyDistribution: {},
    trackDistribution: {},
  });
  const [loading, setLoading] = useState(true);

  // Modales
  const [visitorModalOpen, setVisitorModalOpen] = useState(false);
  const [printModalOpen, setPrintModalOpen] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);

    // Calcul de la plage de dates
    const now = new Date();
    let from: string | undefined;
    const to = now.toISOString().split('T')[0];

    if (datePreset === 'today') {
      from = to;
    } else if (datePreset === 'week') {
      const d = new Date();
      d.setDate(d.getDate() - 7);
      from = d.toISOString().split('T')[0];
    } else if (datePreset === 'month') {
      const d = new Date();
      d.setMonth(d.getMonth() - 1);
      from = d.toISOString().split('T')[0];
    }

    const [tracksRes, registerRes, statsRes] = await Promise.all([
      getTracks(),
      getAttendanceRegister(from ? { from, to } : undefined, selectedTrackId),
      getAttendanceStats(analyticsPeriod),
    ]);

    setTracks(tracksRes.data || []);
    setAttendances(registerRes.data || []);
    if (statsRes.stats) {
      setStats(statsRes.stats);
    }
    setLoading(false);
  }, [datePreset, selectedTrackId, analyticsPeriod]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const canAccessAttendance = Boolean(
    permissions.isAdmin ||
    permissions.isSuperAdmin ||
    permissions.referentPermissions?.can_view_attendance ||
    permissions.referentPermissions?.can_validate_attendance
  );

  if (!user || !canAccessAttendance) {
    return (
      <div className="max-w-md mx-auto my-12 p-6 bg-surface border border-secondary/30 rounded-2xl text-center space-y-4 font-mono text-xs">
        <ShieldAlert className="w-10 h-10 text-secondary mx-auto" />
        <h2 className="font-anybody font-black text-lg uppercase text-white">
          Accès Restreint
        </h2>
        <p className="text-foreground/60">
          Le registre légal de présence FBA et les validations de présence sont réservés aux référents et administrateurs habilités.
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
                Registre de Présence <span className="text-primary">FBA</span> & Fréquentation
              </h1>
            </div>
            <p className="text-xs font-mono text-foreground/50">
              Émargement légal pour assurance, traçabilité des pilotes et analyse d'affluence.
            </p>
          </div>
        </div>

        {/* Boutons d'action rapides */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setVisitorModalOpen(true)}
            className="premium-btn text-xs px-4 py-2.5 flex items-center gap-2 cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            <span className="transform skew-x-8">+ Visiteur FBA</span>
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

      {/* Barre de navigation interne d'onglets */}
      <div className="flex items-center gap-2 border-b border-[#353535] pb-2">
        <button
          onClick={() => setActiveTab('register')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded font-anybody font-extrabold uppercase text-xs tracking-wider transition-all sport-skew cursor-pointer ${
            activeTab === 'register'
              ? 'bg-primary text-black shadow-[3px_3px_0px_#000]'
              : 'bg-surface text-foreground/70 hover:text-white hover:bg-surface-high border border-[#353535]'
          }`}
        >
          <ListOrdered className="w-3.5 h-3.5 transform skew-x-8" />
          <span className="transform skew-x-8">1. Registre Officiel FBA ({attendances.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('analytics')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded font-anybody font-extrabold uppercase text-xs tracking-wider transition-all sport-skew cursor-pointer ${
            activeTab === 'analytics'
              ? 'bg-primary text-black shadow-[3px_3px_0px_#000]'
              : 'bg-surface text-foreground/70 hover:text-white hover:bg-surface-high border border-[#353535]'
          }`}
        >
          <BarChart3 className="w-3.5 h-3.5 transform skew-x-8" />
          <span className="transform skew-x-8">2. Analyse & Graphiques</span>
        </button>
      </div>

      {/* Contenu des onglets */}
      {activeTab === 'register' ? (
        <AttendanceRegisterTable
          attendances={attendances}
          tracks={tracks}
          datePreset={datePreset}
          onDatePresetChange={setDatePreset}
          selectedTrackId={selectedTrackId}
          onTrackChange={setSelectedTrackId}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onOpenVisitorModal={() => setVisitorModalOpen(true)}
          onOpenPrintModal={() => setPrintModalOpen(true)}
        />
      ) : (
        <AttendanceAnalyticsView
          stats={stats}
          period={analyticsPeriod}
          onPeriodChange={setAnalyticsPeriod}
        />
      )}

      {/* Modale Visiteur */}
      <VisitorAttendanceModal
        isOpen={visitorModalOpen}
        onClose={() => setVisitorModalOpen(false)}
        onSuccess={loadData}
        tracks={tracks}
      />

      {/* Modale Attestation FBA Imprimable */}
      <AttendanceFbaPrintModal
        isOpen={printModalOpen}
        onClose={() => setPrintModalOpen(false)}
        attendances={attendances}
      />
    </div>
  );
}
