'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export async function getMemberProfile(userId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('sbc_members')
    .select('*')
    .eq('id', userId)
    .single();

  if (error) {
    return { data: null, error: error.message };
  }
  return { data, error: null };
}

export async function createMemberProfile(profile: {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  phone?: string;
  license_number?: string;
  street_number?: string;
  zip_code?: string;
  city?: string;
  birth_date?: string;
  membership_choice?: string;
  transponder_number?: string;
  roi_accepted?: boolean;
  insurance_ack?: boolean;
}) {
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
  return { data, error: null };
}

export async function updateMemberProfile(profile: {
  id: string;
  first_name: string;
  last_name: string;
  phone?: string;
  license_number?: string;
  street_number?: string;
  zip_code?: string;
  city?: string;
  birth_date?: string;
  membership_choice?: string;
  transponder_number?: string;
  roi_accepted?: boolean;
  insurance_ack?: boolean;
}) {
  const supabase = await createClient();
  const updateData: any = {
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
    return { data: null, error: error.message };
  }

  revalidatePath('/dashboard');
  return { data, error: null };
}
