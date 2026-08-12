'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { isSuperAdmin, hasPermission } from './permissions';

// Récupérer la liste des membres (sécurisée)
export async function getMembersList() {
  const supabase = await createClient();
  
  // Vérification de la session utilisateur
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { data: [], error: 'Non authentifié.' };
  }

  // Récupération du profil de l'appelant pour valider ses droits
  const { data: callerProfile, error: callerError } = await supabase
    .from('sbc_members')
    .select('role, permissions, email')
    .eq('id', user.id)
    .single();

  if (callerError || !callerProfile) {
    return { data: [], error: 'Impossible de charger vos droits d\'accès.' };
  }

  const isSuper = isSuperAdmin(callerProfile.email);
  const isAdmin = callerProfile.role === 'admin';
  const hasViewAccess = hasPermission(
    callerProfile.role,
    callerProfile.permissions,
    'members',
    'view',
    callerProfile.email
  );

  if (!isSuper && !isAdmin && !hasViewAccess) {
    return { data: [], error: 'Accès refusé. Droits insuffisants.' };
  }

  // Récupération de tous les membres (y compris rôle et permissions)
  const { data, error } = await supabase
    .from('sbc_members')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    return { data: [], error: error.message };
  }
  return { data, error: null };
}

// Mettre à jour le statut de paiement d'un membre (sécurisée)
export async function updatePaymentStatus(
  memberId: string,
  status: 'pending' | 'paid' | 'expired'
) {
  const supabase = await createClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { data: null, error: 'Non authentifié.' };
  }

  // Vérification des privilèges
  const { data: callerProfile } = await supabase
    .from('sbc_members')
    .select('role, permissions, email')
    .eq('id', user.id)
    .single();

  const isAuthorized = hasPermission(
    callerProfile?.role,
    callerProfile?.permissions,
    'members',
    'edit',
    callerProfile?.email
  );

  if (!isAuthorized) {
    return { data: null, error: 'Accès refusé. Vous n\'avez pas la permission de modifier les membres.' };
  }

  const { data, error } = await supabase
    .from('sbc_members')
    .update({ payment_status: status, updated_at: new Date().toISOString() })
    .eq('id', memberId)
    .select()
    .single();

  if (error) {
    return { data: null, error: error.message };
  }

  revalidatePath('/');
  revalidatePath('/admin');
  revalidatePath('/dashboard');
  revalidatePath('/check-in');
  return { data, error: null };
}

// Récupérer la configuration du club (notamment le code cadenas) (sécurisée)
export async function getClubConfig() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { data: null, error: 'Non authentifié.' };
  }

  // Vérification des droits de lecture de config
  const { data: callerProfile } = await supabase
    .from('sbc_members')
    .select('role, permissions, email')
    .eq('id', user.id)
    .single();

  const isAuthorized = hasPermission(
    callerProfile?.role,
    callerProfile?.permissions,
    'config',
    'view',
    callerProfile?.email
  );

  if (!isAuthorized) {
    return { data: null, error: 'Accès refusé. Droits insuffisants pour voir la configuration.' };
  }

  const { data, error } = await supabase
    .from('sbc_club_config')
    .select('*')
    .limit(1)
    .maybeSingle();

  if (error) {
    return { data: null, error: error.message };
  }
  return { data, error: null };
}

// Mettre à jour le code cadenas du club (sécurisée)
export async function updateLockCode(newCode: string) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: 'Non authentifié.' };
  }

  // Vérification des droits d'édition de config
  const { data: callerProfile } = await supabase
    .from('sbc_members')
    .select('role, permissions, email')
    .eq('id', user.id)
    .single();

  const isAuthorized = hasPermission(
    callerProfile?.role,
    callerProfile?.permissions,
    'config',
    'edit',
    callerProfile?.email
  );

  if (!isAuthorized) {
    return { success: false, error: 'Accès refusé. Vous n\'avez pas la permission de modifier la configuration.' };
  }

  const { data: config } = await getClubConfig();

  let error;
  if (config) {
    const { error: updateError } = await supabase
      .from('sbc_club_config')
      .update({ lock_code: newCode, updated_at: new Date().toISOString() })
      .eq('id', config.id);
    error = updateError;
  } else {
    const { error: insertError } = await supabase
      .from('sbc_club_config')
      .insert({ lock_code: newCode });
    error = insertError;
  }

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath('/');
  revalidatePath('/admin');
  revalidatePath('/dashboard');
  revalidatePath('/check-in');
  return { success: true, error: null };
}

// Mettre à jour le rôle et les permissions d'un membre (RÉSERVÉ AU SUPER-ADMIN)
export async function updateMemberRoleAndPermissions(
  memberId: string,
  role: 'visitor' | 'member' | 'daily_member' | 'admin',
  permissions: Record<string, string[]>
) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: 'Non authentifié.' };
  }

  // Seul le Super-Admin (email === 'stefga1@gmail.com') a le droit de promouvoir ou modifier les permissions
  if (!isSuperAdmin(user.email)) {
    return { success: false, error: 'Accès refusé. Seul le Super-Administrateur peut modifier les rôles et permissions.' };
  }

  // Empêcher de s'auto-rétrograder ou de s'auto-enlever des droits
  if (user.id === memberId && role !== 'admin') {
    return { success: false, error: 'Opération interdite. Vous ne pouvez pas rétrograder votre propre compte Super-Admin.' };
  }

  const { error } = await supabase
    .from('sbc_members')
    .update({
      role,
      permissions,
      updated_at: new Date().toISOString()
    })
    .eq('id', memberId);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath('/admin');
  revalidatePath('/dashboard');
  return { success: true, error: null };
}
