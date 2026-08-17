'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { MemberProfile, MemberProfileCreateInput, MemberProfileUpdateInput, MemberUpdate } from '@/types/models';

export async function getMemberProfile(userId: string): Promise<{ data: MemberProfile | null; error: string | null }> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('sbc_members')
    .select('*')
    .eq('id', userId)
    .single();

  if (error) {
    return { data: null, error: error.message };
  }
  return { data: (data as MemberProfile) || null, error: null };
}

export async function createMemberProfile(profile: MemberProfileCreateInput): Promise<{ data: MemberProfile | null; error: string | null }> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('sbc_members')
    .upsert({
      id: profile.id,
      email: profile.email,
      first_name: profile.first_name,
      last_name: profile.last_name,
      phone: profile.phone || null,
      license_number: profile.license_number || null,
      street_number: profile.street_number || null,
      zip_code: profile.zip_code || null,
      city: profile.city || null,
      birth_date: profile.birth_date || null,
      membership_choice: profile.membership_choice || null,
      transponder_number: profile.transponder_number || null,
      roi_accepted: profile.roi_accepted || false,
      insurance_ack: profile.insurance_ack || false,
      payment_status: 'pending', // par défaut en attente de cotisation
      updated_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) {
    return { data: null, error: error.message };
  }
  
  revalidatePath('/dashboard');
  return { data: (data as MemberProfile) || null, error: null };
}

export async function updateMemberProfile(profile: MemberProfileUpdateInput): Promise<{ data: MemberProfile | null; error: string | null }> {
  const supabase = await createClient();
  const updateData: MemberUpdate = {
    first_name: profile.first_name,
    last_name: profile.last_name,
    phone: profile.phone || null,
    license_number: profile.license_number || null,
    street_number: profile.street_number || null,
    zip_code: profile.zip_code || null,
    city: profile.city || null,
    birth_date: profile.birth_date || null,
    membership_choice: profile.membership_choice || null,
    transponder_number: profile.transponder_number || null,
    roi_accepted: profile.roi_accepted || false,
    updated_at: new Date().toISOString(),
  };

  if (profile.insurance_ack !== undefined) {
    updateData.insurance_ack = profile.insurance_ack;
  }

  const { data, error } = await supabase
    .from('sbc_members')
    .update(updateData)
    .eq('id', profile.id)
    .select()
    .single();

  if (error) {
    // Si la colonne insurance_ack n'a pas encore été ajoutée dans Supabase, repli gracieux
    if (error.message.includes('insurance_ack') && updateData.insurance_ack !== undefined) {
      delete updateData.insurance_ack;
      const { data: retryData, error: retryError } = await supabase
        .from('sbc_members')
        .update(updateData)
        .eq('id', profile.id)
        .select()
        .single();

      if (retryError) {
        return { data: null, error: retryError.message };
      }
      revalidatePath('/dashboard');
      return { data: (retryData as MemberProfile) || null, error: null };
    }
    return { data: null, error: error.message };
  }

  revalidatePath('/dashboard');
  return { data: (data as MemberProfile) || null, error: null };
}
