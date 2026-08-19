'use client';

import React, { useState } from 'react';
import { FbaAttendanceItem, TrackItem } from '@/types/models';
import { generateFbaRegisterExport } from '../actions';
import {
  Search,
  Download,
  Printer,
  UserPlus,
  Clock,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  User,
  Filter,
} from 'lucide-react';

interface AttendanceRegisterTableProps {
  attendances: FbaAttendanceItem[];
  tracks: TrackItem[];
  datePreset: 'today' | 'week' | 'month' | 'all';
  onDatePresetChange: (preset: 'today' | 'week' | 'month' | 'all') => void;
  selectedTrackId: string;
  onTrackChange: (id: string) => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onOpenVisitorModal: () => void;
  onOpenPrintModal: () => void;
}

export default function AttendanceRegisterTable({
  attendances,
  tracks,
  datePreset,
  onDatePresetChange,
  selectedTrackId,
  onTrackChange,
  searchQuery,
  onSearchChange,
  onOpenVisitorModal,
  onOpenPrintModal,
}: AttendanceRegisterTableProps) {
  const [exportingCsv, setExportingCsv] = useState(false);

  const handleExportCsv = async () => {
    setExportingCsv(true);
    const res = await generateFbaRegisterExport();
    setExportingCsv(false);

    if (res.csvContent) {
      const blob = new Blob([res.csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `SBC_Registre_Presence_FBA_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const filteredAttendances = attendances.filter((item) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    const name = item.user_id
      ? `${item.sbc_members?.first_name || ''} ${item.sbc_members?.last_name || ''}`.toLowerCase()
      : (item.visitor_name || '').toLowerCase();
    const license = item.user_id
      ? (item.sbc_members?.license_number || '').toLowerCase()
      : (item.visitor_license || '').toLowerCase();
    const track = (item.tracks?.name || '').toLowerCase();

    return name.includes(q) || license.includes(q) || track.includes(q);
  });

  return (
    <div className="space-y-4 font-mono text-xs">
      {/* Barre d'outils et filtres */}
      <div className="p-4 rounded-xl bg-surface border border-[#353535] flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Recherche */}
        <div className="relative w-full md:w-64">
          <Search className="w-4 h-4 text-foreground/40 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Rechercher pilote, licence..."
            className="w-full bg-background border border-[#353535] rounded-lg pl-9 pr-3 py-1.5 text-xs text-white placeholder-foreground/40 focus:outline-none focus:border-primary"
          />
        </div>

        {/* Filtres & Actions */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Période */}
          <div className="flex rounded-lg bg-background border border-[#353535] p-0.5">
            <button
              onClick={() => onDatePresetChange('today')}
              className={`px-2.5 py-1 rounded text-[11px] font-bold transition-colors cursor-pointer ${
                datePreset === 'today' ? 'bg-primary text-black' : 'text-foreground/60 hover:text-white'
              }`}
            >
              Aujourd'hui
            </button>
            <button
              onClick={() => onDatePresetChange('week')}
              className={`px-2.5 py-1 rounded text-[11px] font-bold transition-colors cursor-pointer ${
                datePreset === 'week' ? 'bg-primary text-black' : 'text-foreground/60 hover:text-white'
              }`}
            >
              7 jours
            </button>
            <button
              onClick={() => onDatePresetChange('month')}
              className={`px-2.5 py-1 rounded text-[11px] font-bold transition-colors cursor-pointer ${
                datePreset === 'month' ? 'bg-primary text-black' : 'text-foreground/60 hover:text-white'
              }`}
            >
              Ce mois
            </button>
            <button
              onClick={() => onDatePresetChange('all')}
              className={`px-2.5 py-1 rounded text-[11px] font-bold transition-colors cursor-pointer ${
                datePreset === 'all' ? 'bg-primary text-black' : 'text-foreground/60 hover:text-white'
              }`}
            >
              Tout
            </button>
          </div>


          {/* Actions */}
          <button
            type="button"
            onClick={onOpenVisitorModal}
            className="px-3 py-1.5 rounded-lg bg-surface-high hover:bg-surface border border-[#353535] text-primary hover:text-white flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>+ Visiteur</span>
          </button>

          <button
            type="button"
            onClick={handleExportCsv}
            disabled={exportingCsv}
            className="px-3 py-1.5 rounded-lg bg-surface-high hover:bg-surface border border-[#353535] text-foreground/80 hover:text-white flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Exporter en CSV pour l'assurance"
          >
            <Download className="w-3.5 h-3.5 text-primary" />
            <span className="hidden sm:inline">Export CSV</span>
          </button>

          <button
            type="button"
            onClick={onOpenPrintModal}
            className="px-3 py-1.5 rounded-lg bg-surface-high hover:bg-surface border border-primary/30 text-primary hover:text-white flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Générer l'attestation imprimable"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Attestation FBA</span>
          </button>
        </div>
      </div>

      {/* Tableau Registre */}
      <div className="bg-surface rounded-xl border border-[#353535] overflow-hidden shadow-[4px_4px_0px_#000]">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#353535] bg-surface-dim text-[10px] font-anybody font-bold text-foreground/50 uppercase tracking-wider">
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Pilote</th>
                <th className="px-4 py-3">Licence FBA</th>
                <th className="px-4 py-3">Complexe / Site</th>
                <th className="px-4 py-3">Arrivée</th>
                <th className="px-4 py-3">Départ</th>
                <th className="px-4 py-3">Durée</th>
                <th className="px-4 py-3 text-center">Source</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#353535]/50">
              {filteredAttendances.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-10 text-foreground/40">
                    Aucun émargement enregistré pour cette période.
                  </td>
                </tr>
              ) : (
                filteredAttendances.map((item) => {
                  const isMember = Boolean(item.user_id);
                  const fullName = isMember
                    ? `${item.sbc_members?.first_name || ''} ${item.sbc_members?.last_name || ''}`.trim()
                    : item.visitor_name || 'Pilote Visiteur';
                  const isOngoing = !item.check_out_at;

                  return (
                    <tr key={item.id} className="hover:bg-surface-high/30 transition-colors">
                      {/* Date */}
                      <td className="px-4 py-3 text-foreground/80 whitespace-nowrap">
                        {item.check_in_at.split('T')[0]}
                      </td>

                      {/* Pilote */}
                      <td className="px-4 py-3">
                        <div className="font-bold text-white font-sans text-xs flex items-center gap-1.5">
                          <User className="w-3.5 h-3.5 text-primary shrink-0" />
                          <span>{fullName}</span>
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          {isMember ? (
                            <span className="inline-block px-1.5 py-0.2 rounded bg-primary/10 border border-primary/30 text-primary text-[9px] font-bold">
                              Membre SBC
                            </span>
                          ) : (
                            <span className="inline-block px-1.5 py-0.2 rounded bg-amber-500/15 border border-amber-500/30 text-amber-400 text-[9px] font-bold">
                              Visiteur 1j
                            </span>
                          )}
                          {isMember && item.sbc_members?.email && (
                            <span className="text-[10px] text-foreground/45">
                              {item.sbc_members.email}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Licence FBA */}
                      <td className="px-4 py-3 whitespace-nowrap font-mono">
                        {isMember ? (
                          item.sbc_members?.license_number ? (
                            <span className="text-foreground/90 font-bold">
                              {item.sbc_members.license_number}
                            </span>
                          ) : (
                            <span className="text-green-400 text-[10px]">Affilié Club</span>
                          )
                        ) : (
                          <span className="text-amber-300 font-bold">
                            {item.visitor_license || 'Non spécifié'}
                          </span>
                        )}
                      </td>

                      {/* Complexe / Site */}
                      <td className="px-4 py-3 text-foreground/80 whitespace-nowrap font-semibold">
                        {item.tracks?.name || 'Complexe SBC'}
                      </td>

                      {/* Arrivée */}
                      <td className="px-4 py-3 text-white font-bold whitespace-nowrap">
                        {new Date(item.check_in_at).toLocaleTimeString('fr-FR', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>

                      {/* Départ */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        {item.check_out_at ? (
                          <span className="text-foreground/70 font-mono">
                            {new Date(item.check_out_at).toLocaleTimeString('fr-FR', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-[10px] font-bold uppercase bg-green-500/15 border border-green-500/30 text-green-400 animate-pulse">
                            <span className="w-1.5 h-1.5 rounded-full bg-green-400" />
                            Sur Site
                          </span>
                        )}
                      </td>

                      {/* Durée */}
                      <td className="px-4 py-3 text-foreground/60 whitespace-nowrap">
                        {item.duration_minutes ? `${item.duration_minutes} min` : isOngoing ? 'En cours' : '-'}
                      </td>

                      {/* Source */}
                      <td className="px-4 py-3 text-center text-foreground/45 text-[10px] uppercase whitespace-nowrap">
                        {item.source === 'SELF_DASHBOARD'
                          ? 'Cockpit'
                          : item.source === 'QR_SCAN'
                          ? 'Scan QR'
                          : 'Admin'}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
