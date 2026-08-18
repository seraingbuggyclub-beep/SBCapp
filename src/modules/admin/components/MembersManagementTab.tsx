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
  QrCode,
  Maximize2,
  ShieldAlert,
  Ban,
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { MemberProfile, UserRole, ModulePermissionsMap, getErrorMessage } from '@/types/models';
import { PermissionsMatrix } from './PermissionsMatrix';
import { getMemberQrPayload, getMemberQrTheme } from '@/modules/members/utils/qrcode';
import { blacklistAndRevokeMember } from '../blacklist-actions';
import BlacklistReasonSelector, {
  getSavedRejectionMessage,
  saveRejectionMessage,
} from './BlacklistReasonSelector';
import QrCodeModal from '@/modules/members/components/QrCodeModal';
import ReferentPermissionsModal from './ReferentPermissionsModal';
import MemberKeysManager from './MemberKeysManager';

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
  onNavigateToBlacklist?: () => void;
  onRefreshMembers?: () => void;
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
  onNavigateToBlacklist,
  onRefreshMembers,
}: MembersManagementTabProps) {
  const [selectedMember, setSelectedMember] = useState<MemberProfile | null>(null);
  const [qrModalMember, setQrModalMember] = useState<MemberProfile | null>(null);
  const [referentModalMember, setReferentModalMember] = useState<MemberProfile | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [roleFilter, setRoleFilter] = useState<string>('all');

  // Modale de révocation et mise sur liste noire
  const [blacklistModalMember, setBlacklistModalMember] = useState<MemberProfile | null>(null);
  const [internalReason, setInternalReason] = useState<string>('');
  const [rejectionMessage, setRejectionMessage] = useState<string>(
    "Votre demande d'inscription n'a pas été retenue par l'Organe d'Administration du Seraing Buggy Club (ASBL), conformément aux statuts du club."
  );
  const [revoking, setRevoking] = useState<boolean>(false);
  const [actionError, setActionError] = useState<string>('');
  const [actionSuccess, setActionSuccess] = useState<string>('');

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
      case 'referent':
        return 'bg-cyan-500/20 text-cyan-400 border-cyan-500/40';
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
      case 'referent':
        return 'Référent';
      case 'member':
        return 'Membre';
      case 'daily_member':
        return '1 Jour';
      default:
        return 'Visiteur';
    }
  };

  const handleOpenBlacklistModal = (member: MemberProfile) => {
    setBlacklistModalMember(member);
    setInternalReason('');
    setRejectionMessage(getSavedRejectionMessage());
    setActionError('');
    setActionSuccess('');
  };

  const handleConfirmBlacklist = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!blacklistModalMember) return;
    if (!internalReason.trim()) {
      setActionError('Veuillez sélectionner ou préciser au moins un motif interne de blocage.');
      return;
    }

    setRevoking(true);
    setActionError('');
    setActionSuccess('');

    try {
      saveRejectionMessage(rejectionMessage);
      const { success, error } = await blacklistAndRevokeMember(
        blacklistModalMember.id,
        internalReason,
        rejectionMessage
      );

      if (!success || error) throw new Error(error || 'Erreur lors de la révocation.');

      setActionSuccess(`Le membre ${blacklistModalMember.first_name} ${blacklistModalMember.last_name} a été révoqué et ajouté à la liste noire.`);
      setBlacklistModalMember(null);
      if (selectedMember?.id === blacklistModalMember.id) {
        setSelectedMember(null);
      }
      onUpdateStatus(blacklistModalMember.id, 'expired');
      if (onRefreshMembers) {
        onRefreshMembers();
      }
      setTimeout(() => setActionSuccess(''), 4000);
    } catch (err: unknown) {
      setActionError(getErrorMessage(err));
    } finally {
      setRevoking(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Alertes d'action */}
      {actionSuccess && (
        <div className="p-3 rounded bg-success/15 border border-success/30 text-success text-xs font-mono flex items-center gap-2 animate-fade-in">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{actionSuccess}</span>
        </div>
      )}
      {actionError && (
        <div className="p-3 rounded bg-secondary/15 border border-secondary/30 text-secondary text-xs font-mono flex items-center gap-2 animate-fade-in">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{actionError}</span>
        </div>
      )}

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
          {onNavigateToBlacklist && (
            <button
              onClick={onNavigateToBlacklist}
              className="px-3 py-1.5 rounded bg-secondary/15 hover:bg-secondary/25 border border-secondary/40 text-secondary font-anybody font-bold uppercase text-[11px] tracking-wider transition-all sport-skew flex items-center gap-1.5 cursor-pointer"
            >
              <ShieldAlert className="w-3.5 h-3.5" />
              <span className="transform skew-x-8">Liste Noire</span>
            </button>
          )}

          <div className="flex items-center gap-1.5 text-xs font-mono">
            <span className="text-foreground/50 text-[11px]">Rôle :</span>
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="bg-background border border-[#353535] rounded px-2.5 py-1.5 text-white text-xs font-mono focus:outline-none focus:border-primary"
            >
              <option value="all">Tous ({members.length})</option>
              <option value="admin">Admins</option>
              <option value="referent">Référents</option>
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
              <th className="px-5 py-3.5 font-bold uppercase tracking-wider text-[10px]">Licence</th>
              <th className="px-5 py-3.5 font-bold uppercase tracking-wider text-[10px]">Cotisation</th>
              <th className="px-5 py-3.5 font-bold uppercase tracking-wider text-[10px]">Rôle & Accès</th>
              <th className="px-5 py-3.5 font-bold uppercase tracking-wider text-[10px] text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#353535]/50">
            {filteredMembers.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-5 py-8 text-center text-foreground/40 font-mono text-xs">
                  Aucun membre trouvé pour cette recherche.
                </td>
              </tr>
            ) : (
              filteredMembers.map((member) => (
                <React.Fragment key={member.id}>
                  <tr className="hover:bg-surface/50 transition-colors">
                    {/* Infos Membre */}
                    <td className="px-5 py-3.5">
                      <div className="font-bold text-white font-sans text-sm">
                        {member.first_name || 'Non renseigné'} {member.last_name || ''}
                      </div>
                      <div className="text-[11px] text-foreground/45 flex items-center gap-2 mt-0.5">
                        <span>{member.email}</span>
                        {member.phone && (
                          <>
                            <span>•</span>
                            <span>{member.phone}</span>
                          </>
                        )}
                      </div>
                    </td>

                    {/* Licence FBA */}
                    <td className="px-5 py-3.5">
                      {member.license_number ? (
                        <span className="font-bold text-white bg-surface px-2 py-0.5 rounded border border-[#353535] text-[11px]">
                          {member.license_number}
                        </span>
                      ) : (
                        <span className="text-foreground/30 italic text-[11px]">Aucune</span>
                      )}
                    </td>

                    {/* Statut de Cotisation (Badge cliquable pour switcher) */}
                    <td className="px-5 py-3.5">
                      <button
                        onClick={() => onUpdateStatus(member.id, member.payment_status || 'pending')}
                        disabled={!canEditMembers}
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider border cursor-pointer transition-all hover:scale-105 ${
                          member.payment_status === 'paid'
                            ? 'bg-success/15 text-success border-success/30 hover:bg-success/25'
                            : member.payment_status === 'expired'
                            ? 'bg-secondary/15 text-secondary border-secondary/30 hover:bg-secondary/25'
                            : 'bg-yellow-500/15 text-yellow-500 border-yellow-500/30 hover:bg-yellow-500/25'
                        }`}
                        title="Cliquer pour basculer le statut"
                      >
                        {member.payment_status === 'paid' ? (
                          <>
                            <CheckCircle2 className="w-3 h-3" />
                            <span>En ordre</span>
                          </>
                        ) : member.payment_status === 'expired' ? (
                          <>
                            <XCircle className="w-3 h-3" />
                            <span>Expiré</span>
                          </>
                        ) : (
                          <>
                            <AlertTriangle className="w-3 h-3" />
                            <span>En attente</span>
                          </>
                        )}
                      </button>
                    </td>

                    {/* Rôle & Switcher de Rôle */}
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-1.5">
                        {canEditMembers ? (
                          <select
                            value={member.role || 'visitor'}
                            disabled={member.id === currentUserId}
                            onChange={(e) => {
                              const nextRole = e.target.value as UserRole;
                              onRoleChange(member.id, nextRole, member.permissions);
                              if (nextRole === 'referent') {
                                setReferentModalMember(member);
                              }
                            }}
                            className={`bg-background border border-[#353535] rounded px-1.5 py-1 text-[10px] text-white focus:outline-none focus:border-primary font-mono cursor-pointer font-bold uppercase tracking-wider ${
                              member.role === 'admin' ? 'text-primary border-primary/20' : member.role === 'referent' ? 'text-cyan-400 border-cyan-500/30' : ''
                            }`}
                          >
                            <option value="visitor">Visiteur</option>
                            <option value="member">Membre</option>
                            <option value="daily_member">1 Jour</option>
                            <option value="referent">Référent</option>
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

                        {/* Bouton de configuration pour les Référents */}
                        {member.role === 'referent' && canEditMembers && (
                          <button
                            onClick={() => setReferentModalMember(member)}
                            className="p-1 rounded border border-cyan-500/40 bg-cyan-500/10 text-cyan-400 hover:bg-cyan-500/20 transition-all cursor-pointer"
                            title="Configurer les pistes et permissions du référent"
                          >
                            <Settings className="w-3.5 h-3.5" />
                          </button>
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

                    {/* Actions : QR Code & Fiche Pilote & Blacklist */}
                    <td className="px-5 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => setQrModalMember(member)}
                          className={`p-1.5 rounded border transition-all cursor-pointer inline-flex items-center gap-1 text-[10px] ${
                            member.payment_status === 'paid'
                              ? 'bg-green-500/10 border-green-500/30 text-green-400 hover:bg-green-500/20'
                              : 'bg-red-500/10 border-red-500/30 text-red-400 hover:bg-red-500/20'
                          }`}
                          title={`Pass QR Code (${member.payment_status === 'paid' ? 'En ordre' : 'Cotisation non réglée'})`}
                        >
                          <QrCode className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline font-mono">QR</span>
                        </button>

                        <button
                          onClick={() => setSelectedMember(member)}
                          className="p-1.5 rounded bg-surface hover:bg-surface-high border border-[#353535] text-foreground/60 hover:text-white hover:border-primary cursor-pointer transition-colors inline-flex items-center gap-1 text-[10px]"
                          title="Consulter la fiche complète"
                        >
                          <Eye className="w-3.5 h-3.5 text-primary" />
                          <span className="hidden md:inline">Voir</span>
                        </button>

                        <button
                          onClick={() => handleOpenBlacklistModal(member)}
                          className="p-1.5 rounded bg-surface hover:bg-secondary/20 border border-[#353535] hover:border-secondary/40 text-foreground/50 hover:text-secondary cursor-pointer transition-colors inline-flex items-center gap-1 text-[10px]"
                          title="Révoquer & Ajouter à la liste noire"
                        >
                          <Ban className="w-3.5 h-3.5 text-secondary" />
                          <span className="hidden xl:inline">Bloquer</span>
                        </button>
                      </div>
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

      {/* Modale Détails Pilote avec QR Code & Gestion des Clés */}
      {selectedMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-2xl premium-card p-6 md:p-7 rounded-2xl border border-[#353535] relative shadow-[0_0_50px_rgba(0,0,0,0.8)] max-h-[90vh] overflow-y-auto space-y-6">
            <button
              onClick={() => setSelectedMember(null)}
              className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-surface border border-transparent hover:border-[#353535] text-foreground/50 hover:text-white transition-all cursor-pointer"
              title="Fermer"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="pb-3 border-b border-[#353535]/50">
              <h3 className="font-anybody font-black text-xl uppercase tracking-tight sport-skew text-white">
                Fiche Pilote & Inventaire
              </h3>
              <p className="text-[10px] text-primary font-mono mt-0.5 uppercase tracking-wider">
                Seraing Buggy Club • Dossier Officiel
              </p>
            </div>

            {/* QR Code Card inside details modal */}
            {(() => {
              const theme = getMemberQrTheme(selectedMember.payment_status);
              const payload = getMemberQrPayload(selectedMember.id);

              return (
                <div className={`p-4 rounded-xl border bg-black/60 flex items-center justify-between gap-4 ${theme.containerBorder} ${theme.glowClass}`}>
                  <div className="p-2 rounded-lg bg-black border border-[#353535] shrink-0">
                    <QRCodeSVG
                      value={payload}
                      size={72}
                      level="M"
                      fgColor={theme.fgColor}
                      bgColor="transparent"
                    />
                  </div>

                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase tracking-wider border ${theme.badgeClass}`}>
                      {theme.isPaid ? <CheckCircle2 className="w-3 h-3" /> : <AlertTriangle className="w-3 h-3" />}
                      <span>{theme.statusLabel}</span>
                    </div>

                    <p className="text-[10px] font-mono text-foreground/50 truncate">
                      ID: {selectedMember.id.substring(0, 16)}...
                    </p>

                    <button
                      onClick={() => {
                        const m = selectedMember;
                        setSelectedMember(null);
                        setQrModalMember(m);
                      }}
                      className="px-2.5 py-1 rounded bg-surface hover:bg-surface-high border border-[#353535] hover:border-primary text-[10px] font-mono text-foreground/80 hover:text-white flex items-center gap-1 transition-all cursor-pointer"
                    >
                      <Maximize2 className="w-3 h-3 text-primary" />
                      <span>Agrandir (Mode Soleil)</span>
                    </button>
                  </div>
                </div>
              );
            })()}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 font-mono text-xs text-foreground/80">
              <div className="space-y-3 p-4 rounded-xl bg-surface/30 border border-[#353535]">
                <div>
                  <span className="text-[9px] text-foreground/45 uppercase tracking-wider block mb-0.5">Identité</span>
                  <div className="font-bold text-sm text-white font-sans">
                    {selectedMember.first_name} {selectedMember.last_name}
                  </div>
                  <div className="text-[10px] text-foreground/40">{selectedMember.email}</div>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-1 border-t border-[#353535]/40">
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
              </div>

              <div className="space-y-2 p-4 rounded-xl bg-surface/30 border border-[#353535]">
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
                  <span className="truncate">Adresse : <strong className="text-white">{selectedMember.street_number ? `${selectedMember.street_number}, ${selectedMember.zip_code} ${selectedMember.city}` : 'Non renseignée'}</strong></span>
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

            {/* Section Matériel & Clés confiés & Convention Référent */}
            <div className="pt-2 border-t border-[#353535]/50">
              <MemberKeysManager
                member={selectedMember}
                canEdit={canEditMembers}
                onRefreshParent={onRefreshMembers}
              />
            </div>

            {/* Actions disciplinaires */}
            <div className="pt-2 border-t border-[#353535]/50">
              <button
                type="button"
                onClick={() => {
                  handleOpenBlacklistModal(selectedMember);
                }}
                className="w-full py-2.5 rounded bg-secondary/15 hover:bg-secondary/25 border border-secondary/40 text-secondary text-xs font-mono font-bold flex items-center justify-center gap-2 cursor-pointer transition-colors"
              >
                <Ban className="w-4 h-4" />
                <span>Révoquer & Ajouter à la liste noire</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modale de Révocation et Mise sur Liste Noire */}
      {blacklistModalMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-lg premium-card p-6 rounded-lg border border-secondary/50 shadow-2xl relative space-y-4">
            <div className="flex items-center justify-between border-b border-[#353535] pb-3">
              <div className="flex items-center gap-2 text-secondary">
                <ShieldAlert className="w-5 h-5" />
                <h3 className="font-anybody font-black text-lg uppercase tracking-tight sport-skew text-white">
                  Révoquer & Mettre sur Liste Noire
                </h3>
              </div>
              <button
                onClick={() => setBlacklistModalMember(null)}
                className="p-1 rounded hover:bg-surface text-foreground/50 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 rounded bg-secondary/10 border border-secondary/30 text-secondary text-xs font-mono space-y-1">
              <p className="font-bold">
                ⚠️ Attention : Action disciplinaire immédiate.
              </p>
              <p className="text-foreground/80">
                Le compte de <strong>{blacklistModalMember.first_name} {blacklistModalMember.last_name}</strong> ({blacklistModalMember.email}) sera immédiatement révoqué (cotisation expirée, permissions réinitialisées) et ses futures tentatives d'inscription seront automatiquement bloquées.
              </p>
            </div>

            <form onSubmit={handleConfirmBlacklist} className="space-y-3 font-mono text-xs">
              <BlacklistReasonSelector
                key={blacklistModalMember.id}
                initialReason={internalReason}
                initialRejectionMessage={rejectionMessage}
                onChange={({ internalReason: newReason, rejectionMessage: newMsg }) => {
                  setInternalReason((prev) => (prev === newReason ? prev : newReason));
                  setRejectionMessage((prev) => (prev === newMsg ? prev : newMsg));
                }}
              />

              <div className="pt-3 border-t border-[#353535] flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setBlacklistModalMember(null)}
                  className="px-4 py-2 rounded bg-surface hover:bg-surface-high border border-[#353535] text-foreground/70 cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={revoking}
                  className="px-5 py-2 rounded bg-secondary hover:bg-secondary/80 text-white font-anybody font-black uppercase text-xs tracking-wider transition-all sport-skew shadow-[2px_2px_0px_#000] cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                >
                  <Ban className="w-4 h-4" />
                  <span className="transform skew-x-8">
                    {revoking ? 'Révocation en cours...' : 'Confirmer le blocage définitif'}
                  </span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modale Plein Écran QR Code */}
      <QrCodeModal
        member={qrModalMember}
        isOpen={Boolean(qrModalMember)}
        onClose={() => setQrModalMember(null)}
      />

      {/* Modale de Gestion des Prérogatives Référent */}
      <ReferentPermissionsModal
        member={referentModalMember}
        isOpen={Boolean(referentModalMember)}
        onClose={() => setReferentModalMember(null)}
        onSuccess={() => {
          if (onRefreshMembers) {
            onRefreshMembers();
          }
        }}
      />
    </div>
  );
}
