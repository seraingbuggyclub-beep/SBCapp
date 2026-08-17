'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export async function verifyAndUnlockAccess(userId: string, code: string) {
  const supabase = await createClient();

  // 1. Appeler la fonction RPC pour vérifier le code
  const { data: isValid, error: rpcError } = await supabase.rpc('sbc_verify_lock_code', {
    input_code: code,
  });

  if (rpcError) {
    return { success: false, error: rpcError.message };
  }

  if (!isValid) {
    return { success: false, error: "Code cadenas incorrect. Veuillez contacter l'administrateur." };
  }

  // 2. Mettre à jour le statut du membre à 'paid'
  const { error: updateError } = await supabase
    .from('sbc_members')
    .update({ payment_status: 'paid' })
    .eq('id', userId);

  if (updateError) {
    return { success: false, error: updateError.message };
  }

  revalidatePath('/dashboard');
  revalidatePath('/check-in');
  return { success: true, error: null };
}

export async function getMemberClubLockCode(): Promise<{ lockCode: string | null; error: string | null }> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { lockCode: null, error: 'Non authentifié' };

    const { data: member, error: memberErr } = await supabase
      .from('sbc_members')
      .select('payment_status, role, email')
      .eq('id', user.id)
      .single();

    if (memberErr || !member) return { lockCode: null, error: 'Membre introuvable' };

    const isPaid = member.payment_status === 'paid';
    const isAdmin = member.role === 'admin' || member.email === 'stefga1@gmail.com';

    if (!isPaid && !isAdmin) {
      return { lockCode: null, error: 'Cotisation non acquittée' };
    }

    const { data: config, error: configErr } = await supabase
      .from('sbc_club_config')
      .select('lock_code')
      .limit(1)
      .single();

    if (configErr || !config) {
      // Fallback par défaut si table non peuplée
      return { lockCode: '4000', error: null };
    }

    return { lockCode: config.lock_code, error: null };
  } catch (err) {
    return { lockCode: '4000', error: null };
  }
}
