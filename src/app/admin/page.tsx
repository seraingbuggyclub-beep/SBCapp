'use client';

import React, { useEffect, useState } from 'react';
import { getMembersList, updatePaymentStatus, getClubConfig, updateLockCode, updateMemberRoleAndPermissions } from '@/modules/admin/actions';
import { createClient } from '@/lib/supabase/client';
import { Shield, Users, Lock, CheckCircle2, XCircle, AlertTriangle, Save, RefreshCw, Settings, ShieldAlert, Ghost, Eye, X, MapPin, Calendar, Hash, Phone, FileText } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { PermissionsMatrix } from '@/modules/admin/components/PermissionsMatrix';
import { usePermissions } from '@/modules/admin/hooks/usePermissions';
import { useSimulation } from '@/modules/admin/contexts/SimulationContext';
import AdminNav from '@/components/admin/AdminNav';

export default function AdminPage() {
  const router = useRouter();
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminPass, setAdminPass] = useState('');
  const [passError, setPassError] = useState('');
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  
  const [members, setMembers] = useState<any[]>([]);
  const [lockCode, setLockCode] = useState('');
  const [loading, setLoading] = useState(false);
  
  const [updateMsg, setUpdateMsg] = useState('');
  const [configMsg, setConfigMsg] = useState('');

  const [expandedMemberId, setExpandedMemberId] = useState<string | null>(null);
  const [savingPerms, setSavingPerms] = useState<string | null>(null);
  const [selectedMember, setSelectedMember] = useState<any | null>(null);

  const supabase = createClient();
  const { simulatedProfile, setSimulatedProfile } = useSimulation();
  const activeProfile = simulatedProfile || userProfile;
  const permissions = usePermissions(
    simulatedProfile ? { email: simulatedProfile.email } : currentUser,
    activeProfile
  );

  useEffect(() => {
    async function checkUser() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        setCurrentUser(user);
        if (user) {
          // Récupérer le profil et le rôle pour vérifier les droits d'administration
          const { data: profile, error } = await supabase
            .from('sbc_members')
            .select('role, permissions, email')
            .eq('id', user.id)
            .single();
          
          if (error) {
            console.error("Erreur profile:", error);
            setPassError(`Erreur base de données : ${error.message} (${error.code}). Vérifiez que la migration SQL a bien été exécutée.`);
          } else {
            setUserProfile(profile);
          }
        } else {
          setPassError("Aucune session utilisateur trouvée. Connectez-vous d'abord.");
        }
      } catch (err: any) {
        console.error("Erreur checkUser:", err);
        setPassError(`Erreur inattendue : ${err.message || err}`);
      }
    }
    checkUser();
  }, [supabase]);

  // Authenticate admin by re-signing in with their own password
  const handleAdminAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setPassError('');

    if (!currentUser) {
      setPassError('Vous devez être connecté à votre compte membre. Utilisez le bouton en haut à droite.');
      return;
    }

    if (!userProfile) {
      setPassError('Votre profil membre est en cours de chargement ou introuvable. Avez-vous exécuté le script SQL ?');
      return;
    }

    // Permettre l'accès si c'est Stéphane OU s'il s'agit d'un membre avec le rôle 'admin'
    const isSuper = currentUser.email === 'stefga1@gmail.com';
    const isSecondaryAdmin = userProfile.role === 'admin';

    if (!isSuper && !isSecondaryAdmin) {
      setPassError("Accès refusé. Vous n'êtes pas administrateur du club.");
      return;
    }

    // Double vérification par mot de passe (mode Sudo)
    const { error } = await supabase.auth.signInWithPassword({
      email: currentUser.email,
      password: adminPass,
    });

    if (error) {
      setPassError(`Erreur d'authentification : ${error.message}`);
    } else {
      setIsAdmin(true);
      fetchAdminData();
    }
  };

  const fetchAdminData = async () => {
    setLoading(true);
    
    // Récupération de la liste des pilotes (soumise à permission members:view)
    const { data: membersData, error: membersErr } = await getMembersList();
    if (membersErr) {
      setUpdateMsg(`Erreur pilotes : ${membersErr}`);
      setTimeout(() => setUpdateMsg(''), 5000);
    } else {
      setMembers(membersData || []);
    }

    // Récupération de la configuration (soumise à permission config:view)
    const { data: configData, error: configErr } = await getClubConfig();
    if (configErr) {
      console.warn("Erreur config:", configErr);
    } else if (configData) {
      setLockCode(configData.lock_code);
    }
    
    setLoading(false);
  };

  const handleUpdateStatus = async (memberId: string, currentStatus: string) => {
    if (simulatedProfile) {
      setUpdateMsg("Simulation active : modification de cotisation bloquée.");
      setTimeout(() => setUpdateMsg(''), 4000);
      return;
    }

    if (!permissions.can('members', 'edit')) return;

    // Rotation des statuts : pending -> paid -> expired -> pending
    let nextStatus: 'pending' | 'paid' | 'expired' = 'paid';
    if (currentStatus === 'paid') nextStatus = 'expired';
    else if (currentStatus === 'expired') nextStatus = 'pending';

    const { data, error } = await updatePaymentStatus(memberId, nextStatus);
    if (!error && data) {
      setMembers((prev) =>
        prev.map((m) => (m.id === memberId ? { ...m, payment_status: nextStatus } : m))
      );
      setUpdateMsg('Statut de cotisation mis à jour.');
      setTimeout(() => setUpdateMsg(''), 3000);
    } else if (error) {
      setUpdateMsg(`Erreur : ${error}`);
      setTimeout(() => setUpdateMsg(''), 4000);
    }
  };

  const handleSaveLockCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (simulatedProfile) {
      setConfigMsg("Simulation active : modification du code cadenas bloquée.");
      setTimeout(() => setConfigMsg(''), 4000);
      return;
    }

    if (!permissions.can('config', 'edit')) return;

    setConfigMsg('');
    const { success, error } = await updateLockCode(lockCode);
    if (success) {
      setConfigMsg('Code cadenas mis à jour avec succès.');
      setTimeout(() => setConfigMsg(''), 3000);
    } else {
      setConfigMsg(`Erreur : ${error}`);
    }
  };

  const handleRoleChange = async (memberId: string, nextRole: 'visitor' | 'member' | 'daily_member' | 'admin', currentPermissions: any) => {
    if (simulatedProfile) {
      setUpdateMsg("Simulation active : modification de rôle bloquée.");
      setTimeout(() => setUpdateMsg(''), 4000);
      return;
    }

    if (!permissions.isSuperAdmin) return;

    // Initialiser des permissions vides pour les rôles normaux, ou garder les droits actuels
    const finalPermissions = nextRole === 'admin' ? (currentPermissions || {}) : {};

    const { success, error } = await updateMemberRoleAndPermissions(memberId, nextRole, finalPermissions);
    if (success) {
      setMembers((prev) =>
        prev.map((m) => (m.id === memberId ? { ...m, role: nextRole, permissions: finalPermissions } : m))
      );
      
      // Si on rétrograde un admin actuellement déplié, on le referme
      if (nextRole !== 'admin' && expandedMemberId === memberId) {
        setExpandedMemberId(null);
      }

      setUpdateMsg('Rôle du membre mis à jour.');
      setTimeout(() => setUpdateMsg(''), 3000);
    } else {
      alert(`Erreur : ${error}`);
    }
  };

  const handleSavePermissions = async (memberId: string, role: string, newPerms: Record<string, string[]>) => {
    if (simulatedProfile) {
      setUpdateMsg("Simulation active : modification de permissions bloquée.");
      setTimeout(() => setUpdateMsg(''), 4000);
      return;
    }

    if (!permissions.isSuperAdmin) return;

    setSavingPerms(memberId);
    const { success, error } = await updateMemberRoleAndPermissions(memberId, role as any, newPerms);
    setSavingPerms(null);

    if (success) {
      setMembers((prev) =>
        prev.map((m) => (m.id === memberId ? { ...m, permissions: newPerms } : m))
      );
      setUpdateMsg('Permissions de l\'administrateur mises à jour.');
      setTimeout(() => setUpdateMsg(''), 3000);
    } else {
      alert(`Erreur de sauvegarde : ${error}`);
    }
  };

  const getRoleBadgeClass = (role: string) => {
    switch (role) {
      case 'admin':
        return 'bg-primary/15 text-primary border-primary/30';
      case 'daily_member':
        return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
      case 'member':
        return 'bg-green-500/10 text-green-400 border-green-500/20';
      case 'visitor':
      default:
        return 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20';
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'admin': return 'Admin';
      case 'daily_member': return 'Membre d\'un jour';
      case 'member': return 'Membre';
      case 'visitor': return 'Visiteur';
      default: return role;
    }
  };

  if (!isAdmin) {
    return (
      <div className="max-w-md mx-auto py-12">
        <form onSubmit={handleAdminAuth} className="premium-card p-6 md:p-8 rounded-lg border border-[#353535] space-y-4">
          <div className="text-center mb-4">
            <div className="w-12 h-12 rounded bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto mb-3 text-primary">
              <Shield className="w-6 h-6" />
            </div>
            <h2 className="font-anybody font-black text-xl uppercase tracking-tight sport-skew text-white">
              Backoffice Administrateur
            </h2>
            <p className="text-[10px] text-foreground/50 font-mono mt-1">
              Saisissez le mot de passe de votre compte administrateur
            </p>
          </div>

          {passError && (
            <div className="p-3 rounded bg-secondary/10 border border-secondary/20 text-secondary text-xs font-mono text-center">
              ⚠️ {passError}
            </div>
          )}

          <div>
            <label className="block text-[10px] font-mono uppercase tracking-wider text-foreground/50 mb-1">
              Mot de passe Admin
            </label>
            <input
              type="password"
              required
              value={adminPass}
              onChange={(e) => setAdminPass(e.target.value)}
              className="w-full bg-background border border-[#353535] rounded px-3 py-2 text-center text-sm text-white focus:outline-none focus:border-primary font-mono tracking-widest"
              placeholder="••••••••"
            />
          </div>

          <button type="submit" className="w-full premium-btn text-xs">
            <span className="transform skew-x-8">Déverrouiller l'administration</span>
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8 py-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-[#353535] pb-4">
        <div>
          <h1 className="font-anybody font-black text-2xl md:text-3xl uppercase tracking-tight sport-skew text-white">
            ADMINISTRATION <span className="text-primary">SBC</span>
          </h1>
          <p className="text-xs text-foreground/50 font-mono mt-1">
            Registre officiel des membres et configuration du club
          </p>
        </div>
        
        <button
          onClick={fetchAdminData}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-surface border border-[#353535] hover:border-primary transition-all text-xs font-mono"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Rafraîchir
        </button>
      </div>

      <AdminNav />

      {updateMsg && (
        <div className="p-3 rounded bg-success/15 border border-success/30 text-success text-xs font-mono">
          ✓ {updateMsg}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Settings widget (Lock code) */}
        <div className="premium-card p-6 rounded-lg border border-[#353535] h-fit space-y-6">
          <div>
            <h3 className="font-anybody font-black text-sm uppercase tracking-wider text-white sport-skew border-b border-[#353535] pb-2 flex items-center gap-2">
              <Lock className="w-4 h-4 text-primary" />
              Code Cadenas Piste
            </h3>
            <p className="text-[10px] text-foreground/45 mt-1 font-mono leading-relaxed">
              Ce code verrouille l'accès des membres en attente de cotisation. Modifiez-le pour restreindre l'accès à la piste.
            </p>
          </div>

          {configMsg && (
            <div className="p-2 rounded bg-primary/10 border border-primary/20 text-primary text-[10px] font-mono">
              {configMsg}
            </div>
          )}

          {!permissions.can('config', 'view') ? (
            <div className="p-3 rounded bg-secondary/5 border border-secondary/15 text-secondary text-[10px] font-mono flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 shrink-0" />
              <span>Lecture refusée. Vous n'avez pas la permission de consulter la configuration.</span>
            </div>
          ) : (
            <form onSubmit={handleSaveLockCode} className="space-y-4">
              <div>
                <label className="block text-[10px] font-mono uppercase tracking-wider text-foreground/50 mb-1">
                  Code cadenas actif
                </label>
                <input
                  type="text"
                  required
                  readOnly={!permissions.can('config', 'edit')}
                  value={lockCode}
                  onChange={(e) => setLockCode(e.target.value)}
                  className={`w-full bg-background border border-[#353535] rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-primary font-mono text-center font-bold tracking-widest ${
                    !permissions.can('config', 'edit') ? 'cursor-not-allowed opacity-60' : ''
                  }`}
                  maxLength={8}
                />
              </div>

              {permissions.can('config', 'edit') ? (
                <button type="submit" className="w-full premium-btn text-xs flex items-center justify-center gap-2 cursor-pointer">
                  <span className="transform skew-x-8 flex items-center gap-1.5">
                    <Save className="w-4 h-4" />
                    Sauvegarder
                  </span>
                </button>
              ) : (
                <div className="p-2 rounded bg-secondary/5 border border-secondary/15 text-secondary text-[9px] font-mono text-center leading-relaxed">
                  Lecture seule. Droits requis : config:edit.
                </div>
              )}
            </form>
          )}
        </div>

        {/* Member list widget */}
        <div className="lg:col-span-2 premium-card rounded-lg overflow-hidden border border-[#353535]">
          <div className="bg-surface-dim px-5 py-4 border-b border-[#353535] flex items-center justify-between">
            <h3 className="font-anybody font-black text-sm uppercase tracking-wider text-white sport-skew flex items-center gap-2">
              <Users className="w-4 h-4 text-primary" />
              Registre des Pilotes ({members.length})
            </h3>
            {permissions.can('members', 'edit') && (
              <span className="text-[10px] font-mono text-foreground/40 bg-surface px-2 py-0.5 rounded border border-[#353535]">
                CLIC SUR LE STATUT DE COTISATION POUR LE MODIFIER
              </span>
            )}
          </div>

          {!permissions.can('members', 'view') ? (
            <div className="p-8 text-center text-xs text-secondary font-mono flex flex-col items-center justify-center gap-2">
              <ShieldAlert className="w-6 h-6 text-secondary" />
              <span>Accès refusé. Vous n'avez pas la permission de consulter la liste des membres.</span>
            </div>
          ) : members.length === 0 ? (
            <div className="p-8 text-center text-xs text-foreground/50 font-mono">
              Aucun pilote enregistré dans la base ou chargement en cours.
            </div>
          ) : (
            <div className="divide-y divide-[#353535]/50 overflow-x-auto">
              <table className="w-full text-left font-mono text-xs">
                <thead>
                  <tr className="bg-surface-dim border-b border-[#353535] text-[10px] text-foreground/45">
                    <th className="px-5 py-3 uppercase">Pilote</th>
                    <th className="px-5 py-3 uppercase">Contact / Licence</th>
                    <th className="px-5 py-3 uppercase text-center">Rôle</th>
                    <th className="px-5 py-3 uppercase text-center">Cotisation</th>
                    <th className="px-5 py-3 uppercase text-center">Détails</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#353535]/50">
                  {members.map((member) => (
                    <React.Fragment key={member.id}>
                      <tr className="hover:bg-surface-high/20 transition-colors">
                        {/* Name */}
                        <td className="px-5 py-3.5">
                          <div className="font-bold text-white text-sm font-sans">
                            {member.first_name} {member.last_name}
                          </div>
                          <div className="text-[10px] text-foreground/40 truncate max-w-45">
                            {member.email}
                          </div>
                        </td>

                        {/* Contact / License */}
                        <td className="px-5 py-3.5">
                          <div className="text-white">{member.phone || 'Pas de tél.'}</div>
                          <div className="text-[10px] text-primary">{member.license_number || 'Non renseigné'}</div>
                        </td>

                        {/* Rôle */}
                        <td className="px-5 py-3.5 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            {permissions.isSuperAdmin ? (
                              <select
                                value={member.role || 'visitor'}
                                disabled={member.id === currentUser?.id} // Ne pas s'auto-rétrograder
                                onChange={(e) => handleRoleChange(member.id, e.target.value as any, member.permissions)}
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
                              <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${getRoleBadgeClass(member.role)}`}>
                                {getRoleLabel(member.role)}
                              </span>
                            )}
                            
                            {/* Bouton de permissions pour les admins secondaires (Super-Admin uniquement) */}
                            {member.role === 'admin' && permissions.isSuperAdmin && (
                              <button
                                onClick={() => setExpandedMemberId(expandedMemberId === member.id ? null : member.id)}
                                className={`p-1 rounded border transition-all ${
                                  expandedMemberId === member.id
                                    ? 'bg-primary/20 border-primary text-primary'
                                    : 'bg-surface border-[#353535] text-foreground/40 hover:text-white hover:border-primary'
                                }`}
                                title="Gérer les droits granulaires"
                              >
                                <Settings className="w-3.5 h-3.5" />
                              </button>
                            )}

                            {/* Bouton de simulation (Super-Admin uniquement, sur les autres comptes) */}
                            {permissions.isSuperAdmin && member.id !== currentUser?.id && (
                              <button
                                onClick={() => {
                                  setSimulatedProfile(member);
                                  router.push('/');
                                }}
                                className={`p-1 rounded border transition-all ${
                                  simulatedProfile?.id === member.id
                                    ? 'bg-primary/20 border-primary text-primary'
                                    : 'bg-surface border-[#353535] text-foreground/40 hover:text-white hover:border-primary'
                                }`}
                                title="Incarner ce profil (Simulation)"
                              >
                                <Ghost className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </td>

                        {/* Status Trigger */}
                        <td className="px-5 py-3.5 text-center">
                          <button
                            onClick={() => handleUpdateStatus(member.id, member.payment_status)}
                            disabled={!permissions.can('members', 'edit')}
                            className={`inline-flex px-2.5 py-1 rounded text-[10px] font-bold uppercase tracking-wider transition-all border ${
                              !permissions.can('members', 'edit') ? 'cursor-not-allowed opacity-75' : 'cursor-pointer'
                            } ${
                              member.payment_status === 'paid'
                                ? 'bg-success/10 text-success border-success/20 hover:bg-success/20'
                                : member.payment_status === 'expired'
                                ? 'bg-secondary/10 text-secondary border-secondary/20 hover:bg-secondary/20'
                                : 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20 hover:bg-yellow-500/20'
                            }`}
                          >
                            {member.payment_status === 'paid'
                              ? 'Payé / Actif'
                              : member.payment_status === 'expired'
                              ? 'Expiré'
                              : 'En Attente'}
                          </button>
                        </td>

                        {/* Détails */}
                        <td className="px-5 py-3.5 text-center">
                          <button
                            onClick={() => setSelectedMember(member)}
                            className="p-1.5 rounded bg-surface border border-[#353535] text-foreground/50 hover:text-primary hover:border-primary transition-all cursor-pointer inline-flex items-center justify-center"
                            title="Voir les détails complets"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                      
                      {/* Grille de permissions dépliable (visible sous le pilote) */}
                      {member.role === 'admin' && permissions.isSuperAdmin && expandedMemberId === member.id && (
                        <tr className="bg-[#121212] border-l-2 border-primary">
                          <td colSpan={5} className="px-5 py-4">
                            <div className="space-y-3">
                              <PermissionsMatrix
                                permissions={member.permissions || {}}
                                onChange={(newPerms) => handleSavePermissions(member.id, member.role, newPerms)}
                                disabled={savingPerms === member.id}
                              />
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          )}
         </div>
      </div>
      
      {/* Modale Détails Pilote */}
      {selectedMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md premium-card p-6 md:p-8 rounded-lg border border-[#353535] relative shadow-[0_0_50px_rgba(0,0,0,0.8)]">
            {/* Bouton de Fermeture */}
            <button
              onClick={() => setSelectedMember(null)}
              className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-surface border border-transparent hover:border-[#353535] text-foreground/50 hover:text-white transition-all cursor-pointer"
              title="Fermer"
            >
              <X className="w-4 h-4" />
            </button>

            {/* En-tête */}
            <div className="mb-5 pb-3 border-b border-[#353535]/50">
              <h3 className="font-anybody font-black text-xl uppercase tracking-tight sport-skew text-white">
                Fiche Pilote
              </h3>
              <p className="text-[10px] text-primary font-mono mt-1 uppercase tracking-wider">
                Seraing Buggy Club
              </p>
            </div>

            {/* Contenu */}
            <div className="space-y-4 font-mono text-xs text-foreground/80">
              {/* Identité */}
              <div>
                <span className="text-[9px] text-foreground/45 uppercase tracking-wider block mb-0.5">Identité</span>
                <div className="font-bold text-sm text-white font-sans">
                  {selectedMember.first_name} {selectedMember.last_name}
                </div>
                <div className="text-[10px] text-foreground/40">{selectedMember.email}</div>
              </div>

              {/* Rôle & Statut */}
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
                    {selectedMember.payment_status === 'paid' ? 'Payé' : selectedMember.payment_status === 'expired' ? 'Expiré' : 'En attente'}
                  </span>
                </div>
              </div>

              <div className="pt-2 border-t border-[#353535]/30 space-y-3">
                {/* Téléphone */}
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded bg-surface border border-[#353535] flex items-center justify-center text-foreground/50 shrink-0">
                    <Phone className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-[9px] text-foreground/45 uppercase tracking-wider block">Téléphone</span>
                    <span className="text-white text-[11px]">{selectedMember.phone || 'Non renseigné'}</span>
                  </div>
                </div>

                {/* Date de naissance */}
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded bg-surface border border-[#353535] flex items-center justify-center text-foreground/50 shrink-0">
                    <Calendar className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-[9px] text-foreground/45 uppercase tracking-wider block">Date de naissance</span>
                    <span className="text-white text-[11px]">
                      {selectedMember.birth_date 
                        ? new Date(selectedMember.birth_date).toLocaleDateString('fr-FR', {
                            day: 'numeric',
                            month: 'long',
                            year: 'numeric'
                          })
                        : 'Non renseignée'}
                    </span>
                  </div>
                </div>

                {/* Adresse */}
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded bg-surface border border-[#353535] flex items-center justify-center text-foreground/50 shrink-0 mt-0.5">
                    <MapPin className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-[9px] text-foreground/45 uppercase tracking-wider block">Adresse</span>
                    <span className="text-white text-[11px] font-sans leading-tight block">
                      {selectedMember.street_number || 'Non renseignée'}
                    </span>
                    {(selectedMember.zip_code || selectedMember.city) && (
                      <span className="text-white text-[11px] font-sans leading-tight block mt-0.5">
                        {selectedMember.zip_code} {selectedMember.city}
                      </span>
                    )}
                  </div>
                </div>

                {/* Transpondeur */}
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded bg-surface border border-[#353535] flex items-center justify-center text-foreground/50 shrink-0">
                    <Hash className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-[9px] text-foreground/45 uppercase tracking-wider block">Transpondeur</span>
                    <span className="text-white text-[11px]">{selectedMember.transponder_number || 'Aucun'}</span>
                  </div>
                </div>

                {/* ROI */}
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded bg-surface border border-[#353535] flex items-center justify-center text-foreground/50 shrink-0">
                    <FileText className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-[9px] text-foreground/45 uppercase tracking-wider block">Règlement Intérieur (ROI)</span>
                    <span className={`text-[11px] font-bold ${selectedMember.roi_accepted ? 'text-success' : 'text-secondary'}`}>
                      {selectedMember.roi_accepted ? 'Accepté ✓' : 'Non validé ✗'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Pied de la modale */}
            <div className="mt-6 pt-4 border-t border-[#353535]/50 flex justify-end">
              <button
                onClick={() => setSelectedMember(null)}
                className="px-4 py-1.5 bg-surface hover:bg-[#353535] border border-[#353535] text-white font-mono text-xs rounded transition-all cursor-pointer"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
