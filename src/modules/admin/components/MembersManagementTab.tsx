'use client';

import React, { useState, useMemo } from 'react';
import {
  Users,
  Eye,
  Settings,
  X,
  MapPin,
  Calendar,
  Hash,
  Phone,
  FileText,
  Search,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Shield,
} from 'lucide-react';
import { MemberProfile, UserRole, ModulePermissionsMap } from '@/types/models';
import { PermissionsMatrix } from './PermissionsMatrix';

interface MembersManagementTabProps {
  members: MemberProfile[];
  currentUserId?: string;
  isSuperAdmin: boolean;
  canEditMembers: boolean;
  expandedMemberId: string | null;
  savingPerms: string | null;
  onRoleChange: (memberId: string, nextRole: UserRole, currentPermissions: ModulePermissionsMap | null | undefined) => void;
  onUpdateStatus: (memberId: string, currentStatus: string) => void;
  onSavePermissions: (memberId: string, role: string, newPerms: Record<string, string[]>) => void;
  onToggleExpandedMember: (memberId: string | null) => void;
}

export default function MembersManagementTab({
  members,
  currentUserId,
  isSuperAdmin,
  canEditMembers,
  expandedMemberId,
  savingPerms,
  onRoleChange,
  onUpdateStatus,
  onSavePermissions,
  onToggleExpandedMember,
}: MembersManagementTabProps) {
  const [selectedMember, setSelectedMember] = useState<MemberProfile | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [roleFilter, setRoleFilter] = useState<string>('all');

  const filteredMembers = useMemo(() => {
    return members.filter((m) => {
      const q = searchQuery.toLowerCase();
      const matchName = `${m.first_name || ''} ${m.last_name || ''}`.toLowerCase().includes(q);
      const matchEmail = (m.email || '').toLowerCase().includes(q);
      const matchLicense = (m.license_number || '').toLowerCase().includes(q);
      const matchSearch = matchName || matchEmail || matchLicense;

      if (!matchSearch) return false;
      if (roleFilter === 'all') return true;
      return m.role === roleFilter;
    });
  }, [members, searchQuery, roleFilter]);

  const getRoleBadgeClass = (role?: string) => {
    switch (role) {
      case 'admin':
        return 'bg-primary/20 text-primary border-primary/40';
      case 'member':
        return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      case 'daily_member':
        return 'bg-purple-500/20 text-purple-400 border-purple-500/30';
      default:
        return 'bg-surface text-foreground/50 border-[#353535]';
    }
  };

  const getRoleLabel = (role?: string) => {
    switch (role) {
      case 'admin':
        return 'Admin';
      case 'member':
        return 'Membre';
      case 'daily_member':
        return '1 Jour';
      default:
        return 'Visiteur';
    }
  };

  return (
    <div className="space-y-6">
      {/* Barre de Recherche et Filtres */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-surface-dim p-4 rounded-lg border border-[#353535]">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-foreground/40 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Rechercher nom, email, licence..."
            className="w-full bg-background border border-[#353535] rounded pl-9 pr-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-primary"
          />
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
          <div className="flex items-center gap-1.5 text-xs font-mono">
            <span className="text-foreground/50 text-[11px]">Rôle :</span>
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="bg-background border border-[#353535] rounded px-2.5 py-1.5 text-white text-xs font-mono focus:outline-none focus:border-primary"
            >
              <option value="all">Tous ({members.length})</option>
              <option value="admin">Admins</option>
              <option value="member">Membres</option>
              <option value="daily_member">Journée</option>
              <option value="visitor">Visiteurs</option>
            </select>
          </div>

          <span className="text-xs font-mono text-primary font-bold">
            {filteredMembers.length} pilote(s)
          </span>
        </div>
      </div>

      {/* Table des Membres */}
      <div className="overflow-x-auto rounded-lg border border-[#353535]">
        <table className="w-full text-left font-mono text-xs border-collapse">
          <thead>
            <tr className="bg-surface-dim text-foreground/60 border-b border-[#353535]">
              <th className="px-5 py-3.5 font-bold uppercase tracking-wider text-[10px]">Pilote</th>
              <th className="px-5 py-3.5 font-bold uppercase tracking-wider text-[10px]">Licence / Contact</th>
              <th className="px-5 py-3.5 font-bold uppercase tracking-wider text-[10px] text-center">Cotisation</th>
              <th className="px-5 py-3.5 font-bold uppercase tracking-wider text-[10px] text-center">Rôle</th>
              <th className="px-5 py-3.5 font-bold uppercase tracking-wider text-[10px] text-right">Fiche</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#353535]/60 bg-surface/30">
            {filteredMembers.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-5 py-10 text-center text-foreground/40 font-mono">
                  Aucun membre ne correspond à vos critères de recherche.
                </td>
              </tr>
            ) : (
              filteredMembers.map((member) => (
                <React.Fragment key={member.id}>
                  <tr className="hover:bg-surface-high/30 transition-colors">
                    {/* Nom & Email */}
                    <td className="px-5 py-3.5">
                      <div className="font-bold text-white font-sans text-sm">
                        {member.first_name} {member.last_name}
                      </div>
                      <div className="text-[10px] text-foreground/45">{member.email}</div>
                    </td>

                    {/* Licence & Téléphone */}
                    <td className="px-5 py-3.5 text-foreground/70">
                      <div className="text-primary font-bold">{member.license_number || 'Pas de licence'}</div>
                      <div className="text-[10px] text-foreground/40">{member.phone || 'Pas de téléphone'}</div>
                    </td>

                    {/* Cotisation (Rotation Clickable) */}
                    <td className="px-5 py-3.5 text-center">
                      {canEditMembers ? (
                        <button
                          onClick={() => onUpdateStatus(member.id, member.payment_status || 'pending')}
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-[10px] font-bold uppercase tracking-wider border cursor-pointer transition-all hover:scale-105 ${
                            member.payment_status === 'paid'
                              ? 'bg-success/15 text-success border-success/30 shadow-[0_0_10px_rgba(118,177,72,0.15)]'
                              : member.payment_status === 'expired'
                              ? 'bg-secondary/15 text-secondary border-secondary/30'
                              : 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30'
                          }`}
                          title="Cliquer pour faire pivoter le statut : En attente -> Payé -> Expiré"
                        >
                          {member.payment_status === 'paid' ? (
                            <>
                              <CheckCircle2 className="w-3 h-3" /> En ordre
                            </>
                          ) : member.payment_status === 'expired' ? (
                            <>
                              <XCircle className="w-3 h-3" /> Expiré
                            </>
                          ) : (
                            <>
                              <AlertTriangle className="w-3 h-3" /> En attente
                            </>
                          )}
                        </button>
                      ) : (
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-[10px] font-bold uppercase tracking-wider border ${
                            member.payment_status === 'paid'
                              ? 'bg-success/15 text-success border-success/30'
                              : member.payment_status === 'expired'
                              ? 'bg-secondary/15 text-secondary border-secondary/30'
                              : 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30'
                          }`}
                        >
                          {member.payment_status === 'paid'
                            ? 'En ordre'
                            : member.payment_status === 'expired'
                            ? 'Expiré'
                            : 'En attente'}
                        </span>
                      )}
                    </td>

                    {/* Rôle */}
                    <td className="px-5 py-3.5 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        {isSuperAdmin ? (
                          <select
                            value={member.role || 'visitor'}
                            disabled={member.id === currentUserId}
                            onChange={(e) => onRoleChange(member.id, e.target.value as UserRole, member.permissions)}
                            className={`bg-background border border-[#353535] rounded px-1.5 py-1 text-[10px] text-white focus:outline-none focus:border-primary font-mono cursor-pointer font-bold uppercase tracking-wider ${
                              member.role === 'admin' ? 'text-primary border-primary/20' : ''
                            }`}
                          >
                            <option value="visitor">Visiteur</option>
                            <option value="member">Membre</option>
                            <option value="daily_member">1 Jour</option>
                            <option value="admin">Admin</option>
                          </select>
                        ) : (
                          <span
                            className={`inline-flex px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${getRoleBadgeClass(
                              member.role
                            )}`}
                          >
                            {getRoleLabel(member.role)}
                          </span>
                        )}

                        {/* Bouton de permissions pour les admins secondaires */}
                        {member.role === 'admin' && isSuperAdmin && (
                          <button
                            onClick={() => onToggleExpandedMember(expandedMemberId === member.id ? null : member.id)}
                            className={`p-1 rounded border transition-all cursor-pointer ${
                              expandedMemberId === member.id
                                ? 'bg-primary/20 border-primary text-primary'
                                : 'bg-surface border-[#353535] text-foreground/40 hover:text-white hover:border-primary'
                            }`}
                            title="Gérer les droits granulaires"
                          >
                            <Settings className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>

                    {/* Action Fiche Pilote */}
                    <td className="px-5 py-3.5 text-right">
                      <button
                        onClick={() => setSelectedMember(member)}
                        className="p-1.5 rounded bg-surface hover:bg-surface-high border border-[#353535] text-foreground/60 hover:text-white hover:border-primary cursor-pointer transition-colors inline-flex items-center gap-1 text-[10px]"
                        title="Consulter la fiche complète"
                      >
                        <Eye className="w-3.5 h-3.5 text-primary" />
                        <span className="hidden md:inline">Voir</span>
                      </button>
                    </td>
                  </tr>

                  {/* Grille de permissions dépliable */}
                  {member.role === 'admin' && isSuperAdmin && expandedMemberId === member.id && (
                    <tr className="bg-[#121212] border-l-2 border-primary">
                      <td colSpan={5} className="px-5 py-4">
                        <div className="space-y-3">
                          <PermissionsMatrix
                            permissions={member.permissions || {}}
                            onChange={(newPerms) => onSavePermissions(member.id, member.role || 'admin', newPerms)}
                            disabled={savingPerms === member.id}
                          />
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modale Détails Pilote */}
      {selectedMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md premium-card p-6 md:p-8 rounded-lg border border-[#353535] relative shadow-[0_0_50px_rgba(0,0,0,0.8)]">
            <button
              onClick={() => setSelectedMember(null)}
              className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-surface border border-transparent hover:border-[#353535] text-foreground/50 hover:text-white transition-all cursor-pointer"
              title="Fermer"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="mb-5 pb-3 border-b border-[#353535]/50">
              <h3 className="font-anybody font-black text-xl uppercase tracking-tight sport-skew text-white">
                Fiche Pilote
              </h3>
              <p className="text-[10px] text-primary font-mono mt-1 uppercase tracking-wider">
                Seraing Buggy Club
              </p>
            </div>

            <div className="space-y-4 font-mono text-xs text-foreground/80">
              <div>
                <span className="text-[9px] text-foreground/45 uppercase tracking-wider block mb-0.5">Identité</span>
                <div className="font-bold text-sm text-white font-sans">
                  {selectedMember.first_name} {selectedMember.last_name}
                </div>
                <div className="text-[10px] text-foreground/40">{selectedMember.email}</div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-1">
                <div>
                  <span className="text-[9px] text-foreground/45 uppercase tracking-wider block mb-0.5">Rôle</span>
                  <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${getRoleBadgeClass(selectedMember.role)}`}>
                    {getRoleLabel(selectedMember.role)}
                  </span>
                </div>
                <div>
                  <span className="text-[9px] text-foreground/45 uppercase tracking-wider block mb-0.5">Cotisation</span>
                  <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${
                    selectedMember.payment_status === 'paid'
                      ? 'bg-success/10 text-success border-success/20'
                      : selectedMember.payment_status === 'expired'
                      ? 'bg-secondary/10 text-secondary border-secondary/20'
                      : 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20'
                  }`}>
                    {selectedMember.payment_status === 'paid' ? 'En ordre' : selectedMember.payment_status === 'expired' ? 'Expiré' : 'En attente'}
                  </span>
                </div>
              </div>

              <div className="space-y-2 pt-2 border-t border-[#353535]/50">
                <div className="flex items-center gap-2 text-foreground/70">
                  <Hash className="w-3.5 h-3.5 text-primary shrink-0" />
                  <span>Licence FBA : <strong className="text-white">{selectedMember.license_number || 'Non renseigné'}</strong></span>
                </div>
                <div className="flex items-center gap-2 text-foreground/70">
                  <Phone className="w-3.5 h-3.5 text-primary shrink-0" />
                  <span>Tél : <strong className="text-white">{selectedMember.phone || 'Non renseigné'}</strong></span>
                </div>
                <div className="flex items-center gap-2 text-foreground/70">
                  <MapPin className="w-3.5 h-3.5 text-primary shrink-0" />
                  <span>Adresse : <strong className="text-white">{selectedMember.street_number ? `${selectedMember.street_number}, ${selectedMember.zip_code} ${selectedMember.city}` : 'Non renseignée'}</strong></span>
                </div>
                <div className="flex items-center gap-2 text-foreground/70">
                  <Calendar className="w-3.5 h-3.5 text-primary shrink-0" />
                  <span>Date Naissance : <strong className="text-white">{selectedMember.birth_date || 'Non renseignée'}</strong></span>
                </div>
                <div className="flex items-center gap-2 text-foreground/70">
                  <FileText className="w-3.5 h-3.5 text-primary shrink-0" />
                  <span>Transpondeur : <strong className="text-white">{selectedMember.transponder_number || 'Aucun'}</strong></span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
