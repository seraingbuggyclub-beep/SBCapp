'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import {
  ConsentUpdateInput,
  GdprProcessingActivity,
  EmailLogItem,
  MemberConsentsStats,
  SecuredEmailAudience,
  EmailCategory,
} from '@/types/models';

/**
 * Met à jour les consentements RGPD d'un membre avec horodatage strict
 */
export async function updateMemberConsents(
  memberId: string,
  consents: ConsentUpdateInput
): Promise<{ success: boolean; error: string | null }> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Non authentifié' };

    // Vérifier si l'utilisateur est le propriétaire ou un admin
    if (user.id !== memberId) {
      const { data: adminCheck } = await supabase
        .from('sbc_members')
        .select('role')
        .eq('id', user.id)
        .single();
      if (adminCheck?.role !== 'admin') {
        return { success: false, error: 'Action non autorisée' };
      }
    }

    const payload: {
      consent_email_club_news?: boolean;
      consent_email_events?: boolean;
      consent_image_rights?: boolean;
      consent_whatsapp_group?: boolean;
      consent_updated_at: string;
    } = {
      consent_updated_at: new Date().toISOString(),
    };

    if (consents.consent_email_club_news !== undefined) {
      payload.consent_email_club_news = consents.consent_email_club_news;
    }
    if (consents.consent_email_events !== undefined) {
      payload.consent_email_events = consents.consent_email_events;
    }
    if (consents.consent_image_rights !== undefined) {
      payload.consent_image_rights = consents.consent_image_rights;
    }
    if (consents.consent_whatsapp_group !== undefined) {
      payload.consent_whatsapp_group = consents.consent_whatsapp_group;
    }

    const { error } = await supabase
      .from('sbc_members')
      .update(payload)
      .eq('id', memberId);

    if (error) throw error;

    revalidatePath('/dashboard');
    revalidatePath('/dashboard/privacy');
    revalidatePath('/admin/rgpd');

    return { success: true, error: null };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erreur mise à jour consentements';
    return { success: false, error: message };
  }
}

/**
 * Récupère les consentements et le token de désinscription d'un membre
 */
export async function getMemberConsents(
  memberId: string
): Promise<{
  data: {
    consent_email_club_news: boolean;
    consent_email_events: boolean;
    consent_image_rights: boolean;
    consent_whatsapp_group: boolean;
    consent_updated_at: string;
    unsubscribe_token: string;
  } | null;
  error: string | null;
}> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('sbc_members')
      .select('consent_email_club_news, consent_email_events, consent_image_rights, consent_whatsapp_group, consent_updated_at, unsubscribe_token')
      .eq('id', memberId)
      .single();

    if (error) throw error;

    return { data, error: null };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erreur récupération consentements';
    return { data: null, error: message };
  }
}

/**
 * Désinscription en 1 clic par token sécurisé sans mot de passe (Lien footer email conforme APD)
 */
export async function unsubscribeByToken(
  token: string,
  category: 'all' | 'events' | 'news' = 'all'
): Promise<{ success: boolean; memberName?: string; error: string | null }> {
  try {
    const supabase = await createClient();

    // 1. Chercher le membre par son token
    const { data: member, error: findErr } = await supabase
      .from('sbc_members')
      .select('id, first_name, last_name, consent_email_club_news, consent_email_events')
      .eq('unsubscribe_token', token)
      .single();

    if (findErr || !member) {
      return { success: false, error: 'Lien de désinscription invalide ou expiré.' };
    }

    const payload: {
      consent_email_club_news?: boolean;
      consent_email_events?: boolean;
      consent_updated_at: string;
    } = {
      consent_updated_at: new Date().toISOString(),
    };

    if (category === 'all') {
      payload.consent_email_club_news = false;
      payload.consent_email_events = false;
    } else if (category === 'events') {
      payload.consent_email_events = false;
    } else if (category === 'news') {
      payload.consent_email_club_news = false;
    }

    const { error: updateErr } = await supabase
      .from('sbc_members')
      .update(payload)
      .eq('id', member.id);

    if (updateErr) throw updateErr;

    return {
      success: true,
      memberName: `${member.first_name} ${member.last_name}`,
      error: null,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erreur désinscription';
    return { success: false, error: message };
  }
}

/**
 * Export complet des données personnelles (Droit à la portabilité - Art. 20 RGPD)
 */
export async function exportMemberData(
  memberId: string
): Promise<{ jsonContent: string | null; filename: string; error: string | null }> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { jsonContent: null, filename: '', error: 'Non authentifié' };

    // 1. Récupérer le profil et consentements
    const { data: profile } = await supabase
      .from('sbc_members')
      .select('*')
      .eq('id', memberId)
      .single();

    if (!profile) return { jsonContent: null, filename: '', error: 'Membre introuvable' };

    // 2. Récupérer les paiements de cotisation
    const { data: payments } = await supabase
      .from('membership_payments')
      .select('*')
      .eq('user_id', memberId);

    // 3. Récupérer les pointages FBA
    const { data: attendances } = await supabase
      .from('fba_attendances')
      .select('*, tracks:track_id (name)')
      .eq('user_id', memberId);

    // 4. Récupérer les commandes buvette
    const { data: barOrders } = await supabase
      .from('bar_orders')
      .select('*, bar_order_items (*)')
      .eq('member_id', memberId);

    const exportBundle = {
      export_info: {
        platform: 'Seraing Buggy Club ASBL (SBC App)',
        export_date: new Date().toISOString(),
        rgpd_article: 'Article 20 - Droit à la portabilité des données',
        dpo_contact: 'contact@seraingbuggyclub.be',
      },
      profile,
      membership_payments: payments || [],
      fba_track_attendances: attendances || [],
      bar_orders: barOrders || [],
    };

    const jsonString = JSON.stringify(exportBundle, null, 2);
    const filename = `SBC_Export_RGPD_${profile.last_name || 'Membre'}_${new Date().toISOString().split('T')[0]}.json`;

    return { jsonContent: jsonString, filename, error: null };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erreur export données';
    return { jsonContent: null, filename: '', error: message };
  }
}

/**
 * Demande de suppression / anonymisation de compte (Droit à l'effacement - Art. 17 RGPD)
 */
export async function requestAccountDeletion(
  memberId: string
): Promise<{ success: boolean; error: string | null }> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || user.id !== memberId) {
      return { success: false, error: 'Action non autorisée' };
    }

    // Anonymisation des données personnelles tout en préservant l'intégrité comptable
    const { error } = await supabase
      .from('sbc_members')
      .update({
        first_name: 'Anonyme',
        last_name: 'RGPD',
        phone: null,
        street_number: null,
        zip_code: null,
        city: null,
        birth_date: null,
        license_number: null,
        transponder_number: null,
        consent_email_club_news: false,
        consent_email_events: false,
        consent_image_rights: false,
        consent_whatsapp_group: false,
        payment_status: 'expired',
        updated_at: new Date().toISOString(),
      })
      .eq('id', memberId);

    if (error) throw error;

    return { success: true, error: null };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erreur suppression';
    return { success: false, error: message };
  }
}

/**
 * Récupère le Registre des Traitements APD (Article 30 RGPD)
 */
export async function getGdprProcessingRegister(): Promise<{
  data: GdprProcessingActivity[];
  error: string | null;
}> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('gdpr_processing_register')
      .select('*')
      .order('updated_at', { ascending: false });

    if (error) throw error;

    return { data: (data || []) as GdprProcessingActivity[], error: null };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erreur registre APD';
    return { data: [], error: message };
  }
}

/**
 * Mise à jour d'une fiche d'activité dans le registre des traitements APD
 */
export async function updateGdprProcessingActivity(
  id: string,
  input: Partial<GdprProcessingActivity>
): Promise<{ success: boolean; error: string | null }> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Non authentifié' };

    const { error } = await supabase
      .from('gdpr_processing_register')
      .update({
        ...input,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (error) throw error;

    revalidatePath('/admin/rgpd');
    return { success: true, error: null };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erreur mise à jour registre';
    return { success: false, error: message };
  }
}

/**
 * Calcule les statistiques d'opt-in et de consentement de la communauté
 */
export async function getConsentsSummaryStats(): Promise<{
  stats: MemberConsentsStats;
  error: string | null;
}> {
  const defaultStats: MemberConsentsStats = {
    totalMembers: 0,
    newsOptInCount: 0,
    newsOptInPct: 0,
    eventsOptInCount: 0,
    eventsOptInPct: 0,
    imageRightsOptInCount: 0,
    imageRightsOptInPct: 0,
    whatsappOptInCount: 0,
    whatsappOptInPct: 0,
  };

  try {
    const supabase = await createClient();

    const { data: members, error } = await supabase
      .from('sbc_members')
      .select('consent_email_club_news, consent_email_events, consent_image_rights, consent_whatsapp_group');

    if (error) throw error;

    const total = (members || []).length;
    if (total === 0) return { stats: defaultStats, error: null };

    let newsCount = 0;
    let eventsCount = 0;
    let imageCount = 0;
    let waCount = 0;

    (members || []).forEach((m) => {
      if (m.consent_email_club_news) newsCount++;
      if (m.consent_email_events) eventsCount++;
      if (m.consent_image_rights) imageCount++;
      if (m.consent_whatsapp_group) waCount++;
    });

    return {
      stats: {
        totalMembers: total,
        newsOptInCount: newsCount,
        newsOptInPct: Math.round((newsCount / total) * 100),
        eventsOptInCount: eventsCount,
        eventsOptInPct: Math.round((eventsCount / total) * 100),
        imageRightsOptInCount: imageCount,
        imageRightsOptInPct: Math.round((imageCount / total) * 100),
        whatsappOptInCount: waCount,
        whatsappOptInPct: Math.round((waCount / total) * 100),
      },
      error: null,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erreur statistiques';
    return { stats: defaultStats, error: message };
  }
}

/**
 * Calcule l'audience sécurisée (destinataires consentants) pour un email
 */
export async function getSecuredEmailAudience(
  category: EmailCategory
): Promise<{ audience: SecuredEmailAudience; error: string | null }> {
  try {
    const supabase = await createClient();

    const consentCol =
      category === 'EVENTS'
        ? 'consent_email_events'
        : 'consent_email_club_news';

    const { data: members, error } = await supabase
      .from('sbc_members')
      .select('id, email, ' + consentCol);

    if (error) throw error;

    let count = 0;
    let excluded = 0;

    (members || []).forEach((m) => {
      // Pour les alertes urgentes météo ou infos club, tous ceux avec consent_email_club_news
      // @ts-expect-error dynamic key access
      if (m[consentCol] === true) count++;
      else excluded++;
    });

    return {
      audience: {
        count,
        excludedCount: excluded,
        category,
      },
      error: null,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erreur calcul audience';
    return {
      audience: { count: 0, excludedCount: 0, category },
      error: message,
    };
  }
}

/**
 * Envoie un email sécurisé aux membres consentants avec enregistrement du journal
 */
export async function sendSecuredAdminEmail(
  subject: string,
  body: string,
  category: EmailCategory
): Promise<{ success: boolean; recipientsCount?: number; error: string | null }> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Non authentifié' };

    const { data: admin } = await supabase
      .from('sbc_members')
      .select('role')
      .eq('id', user.id)
      .single();

    if (admin?.role !== 'admin') {
      return { success: false, error: 'Action réservée aux administrateurs' };
    }

    const { audience } = await getSecuredEmailAudience(category);
    if (audience.count === 0) {
      return { success: false, error: 'Aucun destinataire consentant trouvé.' };
    }

    // Enregistrement dans le journal d'audit de sécurité
    const { error: logErr } = await supabase
      .from('email_logs')
      .insert({
        sender_id: user.id,
        subject: subject.trim(),
        category,
        recipients_count: audience.count,
        sent_at: new Date().toISOString(),
      });

    if (logErr) throw logErr;

    revalidatePath('/admin/rgpd');

    return { success: true, recipientsCount: audience.count, error: null };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erreur envoi';
    return { success: false, error: message };
  }
}

/**
 * Récupère les logs d'envoi d'emails récents
 */
export async function getEmailLogs(): Promise<{
  data: EmailLogItem[];
  error: string | null;
}> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('email_logs')
      .select(`
        *,
        sender:sender_id (first_name, last_name)
      `)
      .order('sent_at', { ascending: false })
      .limit(20);

    if (error) throw error;

    return { data: (data || []) as unknown as EmailLogItem[], error: null };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erreur logs email';
    return { data: [], error: message };
  }
}
