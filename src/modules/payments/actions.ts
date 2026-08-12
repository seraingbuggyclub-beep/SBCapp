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

export async function getPaymentStatus(userId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('sbc_members')
    .select('payment_status')
    .eq('id', userId)
    .single();

  if (error) {
    return { status: null, error: error.message };
  }

  return { status: data.payment_status, error: null };
}
