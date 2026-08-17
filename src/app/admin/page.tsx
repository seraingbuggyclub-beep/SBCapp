'use client';

import React, { useEffect, useState, useCallback } from 'react';
import {
  getMembersList,
  updatePaymentStatus,
  getClubConfig,
  updateLockCode,
  updateMemberRoleAndPermissions,
} from '@/modules/admin/actions';
import { createClient } from '@/lib/supabase/client';
import { Shield, Users, Lock, Key, Ghost, ShieldAlert, RefreshCw, Radio, Flag, Coins } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { usePermissions } from '@/modules/admin/hooks/usePermissions';
import { useSimulation } from '@/modules/admin/contexts/SimulationContext';
import AdminNav from '@/components/admin/AdminNav';
import { useAuth } from '@/hooks/useAuth';
import { MemberProfile, UserRole, ModulePermissionsMap } from '@/types/models';

import MembersManagementTab from '@/modules/admin/components/MembersManagementTab';
import PermissionsTab from '@/modules/admin/components/PermissionsTab';
import AccessCodeTab from '@/modules/admin/components/AccessCodeTab';
import CommunicationsTab from '@/modules/admin/components/CommunicationsTab';
import AdminTracksTab from '@/modules/tracks/components/AdminTracksTab';
import TreasuryTab from '@/modules/admin/components/TreasuryTab';

type AdminTab = 'members' | 'treasury' | 'tracks' | 'communications' | 'permissions' | 'cadenas';

export default function AdminPage() {
  const router = useRouter();
  const { user: currentUser, profile: userProfile } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminPass, setAdminPass] = useState('');
  const [passError, setPassError] = useState('');
  const [activeTab, setActiveTab] = useState<AdminTab>('members');
  
  const [members, setMembers] = useState<MemberProfile[]>([]);
  const [lockCode, setLockCode] = useState('');
  const [loading, setLoading] = useState(false);
  
  const [updateMsg, setUpdateMsg] = useState('');
  const [configMsg, setConfigMsg] = useState('');

  const [expandedMemberId, setExpandedMemberId] = useState<string | null>(null);
  const [savingPerms, setSavingPerms] = useState<string | null>(null);

  const supabase = createClient();
  const { simulatedProfile, setSimulatedProfile } = useSimulation();
  const activeProfile = simulatedProfile || userProfile;
  const permissions = usePermissions(
    simulatedProfile ? { email: simulatedProfile.email } : currentUser,
    activeProfile
  );

  const fetchAdminData = useCallback(async () => {
    setLoading(true);
    
    // Récupération de la liste des pilotes
    const { data: membersData, error: membersErr } = await getMembersList();
    if (membersErr) {
      setUpdateMsg(`Erreur pilotes : ${membersErr}`);
      setTimeout(() => setUpdateMsg(''), 5000);
    } else {
      setMembers(membersData || []);
    }

    // Récupération de la configuration cadenas
    const { data: configData, error: configErr } = await getClubConfig();
    if (configErr) {
      console.warn("Erreur config:", configErr);
    } else if (configData) {
      setLockCode(configData.lock_code);
    }
    
    setLoading(false);
  }, []);

  // Déverrouillage automatique si session admin reconnue
  useEffect(() => {
    if (currentUser && (currentUser.email === 'stefga1@gmail.com' || userProfile?.role === 'admin')) {
      setIsAdmin(true);
      fetchAdminData();
    }
  }, [currentUser, userProfile, fetchAdminData]);

  const handleAdminAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setPassError('');

    if (!currentUser) {
      setPassError('Vous devez être connecté à votre compte membre.');
      return;
    }

    const { error } = await supabase.auth.signInWithPassword({
      email: currentUser.email!,
      password: adminPass,
    });

    if (error) {
      setPassError(`Erreur d'authentification : ${error.message}`);
    } else {
      setIsAdmin(true);
      fetchAdminData();
    }
  };

  const handleUpdateStatus = async (memberId: string, currentStatus: string) => {
    if (simulatedProfile) {
      setUpdateMsg("Simulation active : modification de cotisation bloquée.");
      setTimeout(() => setUpdateMsg(''), 4000);
      return;
    }

    if (!permissions.can('members', 'edit')) return;

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

  const handleRoleChange = async (memberId: string, nextRole: UserRole, currentPermissions: ModulePermissionsMap | null | undefined) => {
    if (simulatedProfile) {
      setUpdateMsg("Simulation active : modification de rôle bloquée.");
      setTimeout(() => setUpdateMsg(''), 4000);
      return;
    }

    if (!permissions.isSuperAdmin) return;

    const finalPermissions: ModulePermissionsMap = nextRole === 'admin' ? (currentPermissions || {}) : {};

    const { success, error } = await updateMemberRoleAndPermissions(memberId, nextRole, finalPermissions);
    if (success) {
      setMembers((prev) =>
        prev.map((m) => (m.id === memberId ? { ...m, role: nextRole, permissions: finalPermissions } : m))
      );
      
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
    const { success, error } = await updateMemberRoleAndPermissions(memberId, role as UserRole, newPerms);
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

  if (!isAdmin) {
    return (
      <div className="max-w-md mx-auto py-12 space-y-6">
        <div className="premium-card p-8 rounded-lg border border-[#353535] text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-secondary/15 border-2 border-secondary text-secondary flex items-center justify-center mx-auto">
            <Lock className="w-8 h-8" />
          </div>
          <div>
            <h2 className="font-anybody font-black text-2xl uppercase tracking-tight sport-skew text-white">
              Espace Administrateur
            </h2>
            <p className="text-xs text-foreground/50 font-mono mt-1">
              Veuillez confirmer votre mot de passe pour accéder au panneau de gestion.
            </p>
          </div>

          {passError && (
            <div className="p-3 bg-secondary/20 border border-secondary/40 text-secondary rounded text-xs font-mono text-left">
              ⚠️ {passError}
            </div>
          )}

          <form onSubmit={handleAdminAuth} className="space-y-4 pt-2">
            <input
              type="password"
              value={adminPass}
              onChange={(e) => setAdminPass(e.target.value)}
              placeholder="Mot de passe de session..."
              className="w-full bg-background border border-[#353535] rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-primary font-mono"
            />
            <button type="submit" className="w-full premium-btn text-xs">
              <span className="transform skew-x-8">Déverrouiller l'administration</span>
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8 py-4">
      {/* Header Admin */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#353535] pb-4">
        <div>
          <div className="flex items-center gap-2">
            <Shield className="w-6 h-6 text-primary" />
            <h1 className="font-anybody font-black text-2xl md:text-3xl uppercase tracking-tight sport-skew text-white">
              Administration <span className="text-primary">SBC</span>
            </h1>
          </div>
          <p className="text-xs text-foreground/50 font-mono mt-1">
            Gestion du club, cotisations, permissions et sécurité
          </p>
        </div>

        <AdminNav />
      </div>

      {/* Bannière de notification globale */}
      {updateMsg && (
        <div className="p-3 rounded bg-primary/10 border border-primary/30 text-primary text-xs font-mono animate-fade-in flex items-center justify-between">
          <span>{updateMsg}</span>
          <button onClick={() => setUpdateMsg('')} className="text-foreground/40 hover:text-white cursor-pointer">×</button>
        </div>
      )}

      {/* Navigation par Onglets */}
      <div className="flex items-center gap-2 border-b border-[#353535] pb-2 overflow-x-auto">
        <button
          onClick={() => setActiveTab('members')}
          className={`px-4 py-2 rounded font-anybody font-bold text-xs uppercase tracking-wider transition-all sport-skew flex items-center gap-2 cursor-pointer ${
            activeTab === 'members'
              ? 'bg-primary text-black shadow-[2px_2px_0px_#000]'
              : 'bg-surface border border-[#353535] text-foreground/60 hover:text-white'
          }`}
        >
          <Users className="w-4 h-4" />
          <span className="transform skew-x-8">Pilotes ({members.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('treasury')}
          className={`px-4 py-2 rounded font-anybody font-bold text-xs uppercase tracking-wider transition-all sport-skew flex items-center gap-2 cursor-pointer ${
            activeTab === 'treasury'
              ? 'bg-primary text-black shadow-[2px_2px_0px_#000]'
              : 'bg-surface border border-[#353535] text-foreground/60 hover:text-white'
          }`}
        >
          <Coins className="w-4 h-4" />
          <span className="transform skew-x-8">Trésorerie & Cotisations</span>
        </button>

        <button
          onClick={() => setActiveTab('tracks')}
          className={`px-4 py-2 rounded font-anybody font-bold text-xs uppercase tracking-wider transition-all sport-skew flex items-center gap-2 cursor-pointer ${
            activeTab === 'tracks'
              ? 'bg-primary text-black shadow-[2px_2px_0px_#000]'
              : 'bg-surface border border-[#353535] text-foreground/60 hover:text-white'
          }`}
        >
          <Flag className="w-4 h-4" />
          <span className="transform skew-x-8">Pistes</span>
        </button>

        <button
          onClick={() => setActiveTab('communications')}
          className={`px-4 py-2 rounded font-anybody font-bold text-xs uppercase tracking-wider transition-all sport-skew flex items-center gap-2 cursor-pointer ${
            activeTab === 'communications'
              ? 'bg-primary text-black shadow-[2px_2px_0px_#000]'
              : 'bg-surface border border-[#353535] text-foreground/60 hover:text-white'
          }`}
        >
          <Radio className="w-4 h-4" />
          <span className="transform skew-x-8">Babillard Pit-Lane</span>
        </button>

        <button
          onClick={() => setActiveTab('permissions')}
          className={`px-4 py-2 rounded font-anybody font-bold text-xs uppercase tracking-wider transition-all sport-skew flex items-center gap-2 cursor-pointer ${
            activeTab === 'permissions'
              ? 'bg-primary text-black shadow-[2px_2px_0px_#000]'
              : 'bg-surface border border-[#353535] text-foreground/60 hover:text-white'
          }`}
        >
          <Ghost className="w-4 h-4" />
          <span className="transform skew-x-8">Permissions & Simulateur</span>
        </button>

        <button
          onClick={() => setActiveTab('cadenas')}
          className={`px-4 py-2 rounded font-anybody font-bold text-xs uppercase tracking-wider transition-all sport-skew flex items-center gap-2 cursor-pointer ${
            activeTab === 'cadenas'
              ? 'bg-primary text-black shadow-[2px_2px_0px_#000]'
              : 'bg-surface border border-[#353535] text-foreground/60 hover:text-white'
          }`}
        >
          <Key className="w-4 h-4" />
          <span className="transform skew-x-8">Code Cadenas</span>
        </button>

        <button
          onClick={fetchAdminData}
          disabled={loading}
          className="ml-auto p-2 bg-surface hover:bg-surface-high border border-[#353535] rounded text-foreground/60 hover:text-white cursor-pointer transition-colors disabled:opacity-40"
          title="Actualiser les données"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Contenu de l'onglet actif */}
      {activeTab === 'members' && (
        <MembersManagementTab
          members={members}
          currentUserId={currentUser?.id}
          isSuperAdmin={permissions.isSuperAdmin}
          canEditMembers={permissions.can('members', 'edit')}
          expandedMemberId={expandedMemberId}
          savingPerms={savingPerms}
          onRoleChange={handleRoleChange}
          onUpdateStatus={handleUpdateStatus}
          onSavePermissions={handleSavePermissions}
          onToggleExpandedMember={setExpandedMemberId}
        />
      )}

      {activeTab === 'treasury' && (
        <TreasuryTab
          canEdit={permissions.isAdmin || permissions.isSuperAdmin}
          isSimulated={Boolean(simulatedProfile)}
        />
      )}

      {activeTab === 'tracks' && (
        <AdminTracksTab
          canEdit={permissions.isAdmin || permissions.isSuperAdmin}
          isSimulated={Boolean(simulatedProfile)}
        />
      )}

      {activeTab === 'communications' && (
        <CommunicationsTab
          canEdit={permissions.can('news', 'edit') || permissions.isSuperAdmin || permissions.isAdmin}
          isSimulated={Boolean(simulatedProfile)}
        />
      )}

      {activeTab === 'permissions' && (
        <PermissionsTab
          simulatedProfile={simulatedProfile}
          currentUserProfile={userProfile}
          isSuperAdmin={permissions.isSuperAdmin}
          onSetSimulatedProfile={setSimulatedProfile}
        />
      )}

      {activeTab === 'cadenas' && (
        <AccessCodeTab
          lockCode={lockCode}
          configMsg={configMsg}
          canEditConfig={permissions.can('config', 'edit')}
          isSimulated={Boolean(simulatedProfile)}
          onLockCodeChange={setLockCode}
          onSaveLockCode={handleSaveLockCode}
        />
      )}
    </div>
  );
}
