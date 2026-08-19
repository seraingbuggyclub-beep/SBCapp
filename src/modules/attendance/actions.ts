'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import {
  FbaAttendanceItem,
  AttendanceStats,
  VisitorAttendanceInput,
} from '@/types/models';

/**
 * Pointage autonome d'un membre sur la piste (Check-in FBA)
 */
export async function checkInMember(
  trackId?: string
): Promise<{ success: boolean; data?: FbaAttendanceItem; error: string | null }> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Non authentifié' };

    // Vérifier si le membre a déjà une session ouverte aujourd'hui
    const today = new Date().toISOString().split('T')[0];
    const { data: existing } = await supabase
      .from('fba_attendances')
      .select(`
        *,
        sbc_members:user_id (first_name, last_name, email, license_number, payment_status),
        tracks:track_id (name)
      `)
      .eq('user_id', user.id)
      .is('check_out_at', null)
      .gte('check_in_at', `${today}T00:00:00.000Z`)
      .order('check_in_at', { ascending: false })
      .maybeSingle();

    if (existing) {
      return { success: true, data: existing as unknown as FbaAttendanceItem, error: null };
    }

    const { data, error } = await supabase
      .from('fba_attendances')
      .insert({
        user_id: user.id,
        track_id: trackId || null,
        source: 'SELF_DASHBOARD',
        check_in_at: new Date().toISOString(),
      })
      .select(`
        *,
        sbc_members:user_id (first_name, last_name, email, license_number, payment_status),
        tracks:track_id (name)
      `)
      .single();

    if (error) throw error;

    revalidatePath('/dashboard');
    revalidatePath('/check-in');
    revalidatePath('/admin/presences');

    return { success: true, data: data as unknown as FbaAttendanceItem, error: null };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erreur pointage';
    return { success: false, error: message };
  }
}

/**
 * Clôture de la session de roulage du membre (Check-out / Départ)
 */
export async function checkOutMember(
  attendanceId: string
): Promise<{ success: boolean; error: string | null }> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Non authentifié' };

    const { error } = await supabase
      .from('fba_attendances')
      .update({
        check_out_at: new Date().toISOString(),
      })
      .eq('id', attendanceId);

    if (error) throw error;

    revalidatePath('/dashboard');
    revalidatePath('/check-in');
    revalidatePath('/admin/presences');

    return { success: true, error: null };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erreur départ';
    return { success: false, error: message };
  }
}

/**
 * Récupère la session active en cours d'un membre (si présent sur la piste)
 */
export async function getCurrentMemberActiveAttendance(
  userId: string
): Promise<{ data: FbaAttendanceItem | null; error: string | null }> {
  try {
    const supabase = await createClient();
    const today = new Date().toISOString().split('T')[0];

    const { data, error } = await supabase
      .from('fba_attendances')
      .select(`
        *,
        sbc_members:user_id (first_name, last_name, email, license_number, payment_status),
        tracks:track_id (name)
      `)
      .eq('user_id', userId)
      .is('check_out_at', null)
      .gte('check_in_at', `${today}T00:00:00.000Z`)
      .order('check_in_at', { ascending: false })
      .maybeSingle();

    if (error) throw error;

    return { data: (data as unknown as FbaAttendanceItem) || null, error: null };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erreur recherche pointage';
    return { data: null, error: message };
  }
}

/**
 * Enregistrement rapide d'un pilote visiteur pour l'assurance FBA
 */
export async function registerVisitorAttendance(
  input: VisitorAttendanceInput
): Promise<{ success: boolean; error: string | null }> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Non authentifié' };

    if (!input.name.trim() || !input.licenseNumber.trim()) {
      return { success: false, error: 'Le nom et le numéro de licence FBA sont obligatoires.' };
    }

    const { error } = await supabase
      .from('fba_attendances')
      .insert({
        visitor_name: input.name.trim(),
        visitor_license: input.licenseNumber.trim().toUpperCase(),
        track_id: input.trackId || null,
        source: 'ADMIN_MANUAL',
        check_in_at: new Date().toISOString(),
      });

    if (error) throw error;

    revalidatePath('/admin/presences');
    return { success: true, error: null };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erreur enregistrement visiteur';
    return { success: false, error: message };
  }
}

/**
 * Récupère le registre légal des présences FBA avec filtres
 */
export async function getAttendanceRegister(
  dateRange?: { from?: string; to?: string },
  trackId?: string
): Promise<{ data: FbaAttendanceItem[]; error: string | null }> {
  try {
    const supabase = await createClient();

    let query = supabase
      .from('fba_attendances')
      .select(`
        *,
        sbc_members:user_id (first_name, last_name, email, license_number, payment_status),
        tracks:track_id (name)
      `)
      .order('check_in_at', { ascending: false });

    if (dateRange?.from) {
      query = query.gte('check_in_at', `${dateRange.from}T00:00:00.000Z`);
    }
    if (dateRange?.to) {
      query = query.lte('check_in_at', `${dateRange.to}T23:59:59.999Z`);
    }
    if (trackId && trackId !== 'all') {
      query = query.eq('track_id', trackId);
    }

    const { data, error } = await query;
    if (error) throw error;

    const formatted: FbaAttendanceItem[] = (data || []).map((item) => {
      let durationMinutes: number | null = null;
      if (item.check_in_at && item.check_out_at) {
        const start = new Date(item.check_in_at).getTime();
        const end = new Date(item.check_out_at).getTime();
        durationMinutes = Math.max(1, Math.round((end - start) / (1000 * 60)));
      }

      return {
        id: item.id,
        user_id: item.user_id,
        visitor_name: item.visitor_name,
        visitor_license: item.visitor_license,
        track_id: item.track_id,
        check_in_at: item.check_in_at,
        check_out_at: item.check_out_at,
        source: item.source as import('@/types/models').AttendanceSource,
        created_at: item.created_at,
        duration_minutes: durationMinutes,
        sbc_members: item.sbc_members as {
          first_name: string;
          last_name: string;
          email: string;
          license_number?: string | null;
          payment_status?: string | null;
        } | null,
        tracks: item.tracks as { name: string } | null,
      };
    });

    return { data: formatted, error: null };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erreur registre FBA';
    return { data: [], error: message };
  }
}

/**
 * Calcule les statistiques et données graphiques de fréquentation
 */
export async function getAttendanceStats(
  period: 'week' | 'month' | 'year' = 'month'
): Promise<{ stats: AttendanceStats; error: string | null }> {
  const defaultStats: AttendanceStats = {
    totalSessions: 0,
    totalMembersCount: 0,
    totalVisitorsCount: 0,
    averageDurationMinutes: 0,
    peakHour: '14h - 16h',
    busiestDay: 'Samedi',
    dayOfWeekCounts: {
      Lundi: 0,
      Mardi: 0,
      Mercredi: 0,
      Jeudi: 0,
      Vendredi: 0,
      Samedi: 0,
      Dimanche: 0,
    },
    hourlyDistribution: {},
    trackDistribution: {},
  };

  try {
    const supabase = await createClient();

    // Définir la plage de dates selon la période
    const now = new Date();
    const startDate = new Date();
    if (period === 'week') startDate.setDate(now.getDate() - 7);
    else if (period === 'month') startDate.setMonth(now.getMonth() - 1);
    else if (period === 'year') startDate.setFullYear(now.getFullYear() - 1);

    const { data: rows, error } = await supabase
      .from('fba_attendances')
      .select(`
        *,
        tracks:track_id (name)
      `)
      .gte('check_in_at', startDate.toISOString())
      .order('check_in_at', { ascending: true });

    if (error) throw error;

    const daysMap = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
    const dayOfWeekCounts: { [k: string]: number } = {
      Lundi: 0,
      Mardi: 0,
      Mercredi: 0,
      Jeudi: 0,
      Vendredi: 0,
      Samedi: 0,
      Dimanche: 0,
    };
    const hourlyMap: { [hour: string]: number } = {};
    const trackMap: { [name: string]: number } = {};

    let totalDurationMinutes = 0;
    let durationCount = 0;
    let membersCount = 0;
    let visitorsCount = 0;

    (rows || []).forEach((r) => {
      if (r.user_id) membersCount++;
      else visitorsCount++;

      const checkInDate = new Date(r.check_in_at);
      const dayName = daysMap[checkInDate.getDay()];
      if (dayOfWeekCounts[dayName] !== undefined) {
        dayOfWeekCounts[dayName]++;
      }

      const hour = `${checkInDate.getHours()}h`;
      hourlyMap[hour] = (hourlyMap[hour] || 0) + 1;

      const trackName = (r.tracks as { name: string } | null)?.name || 'Piste non spécifiée';
      trackMap[trackName] = (trackMap[trackName] || 0) + 1;

      if (r.check_in_at && r.check_out_at) {
        const dur = Math.max(1, Math.round((new Date(r.check_out_at).getTime() - new Date(r.check_in_at).getTime()) / (1000 * 60)));
        totalDurationMinutes += dur;
        durationCount++;
      }
    });

    // Jour le plus fréquenté
    let busiestDay = 'Samedi';
    let maxDayCount = -1;
    Object.entries(dayOfWeekCounts).forEach(([day, count]) => {
      if (count > maxDayCount) {
        maxDayCount = count;
        busiestDay = day;
      }
    });

    // Heure de pointe
    let peakHour = '14h - 16h';
    let maxHourCount = -1;
    Object.entries(hourlyMap).forEach(([hr, count]) => {
      if (count > maxHourCount) {
        maxHourCount = count;
        peakHour = `${hr}`;
      }
    });

    const avgDuration = durationCount > 0 ? Math.round(totalDurationMinutes / durationCount) : 90;

    return {
      stats: {
        totalSessions: (rows || []).length,
        totalMembersCount: membersCount,
        totalVisitorsCount: visitorsCount,
        averageDurationMinutes: avgDuration,
        peakHour,
        busiestDay,
        dayOfWeekCounts,
        hourlyDistribution: hourlyMap,
        trackDistribution: trackMap,
      },
      error: null,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erreur calcul statistiques';
    return { stats: defaultStats, error: message };
  }
}

/**
 * Génère le contenu CSV du registre d'assurance FBA
 */
export async function generateFbaRegisterExport(
  dateRange?: { from?: string; to?: string }
): Promise<{ csvContent: string; error: string | null }> {
  try {
    const { data, error } = await getAttendanceRegister(dateRange);
    if (error) throw new Error(error);

    const headers = [
      'Date',
      'Pilote',
      'Licence FBA',
      'Complexe / Site',
      "Heure d'arrivée",
      'Heure de départ',
      'Durée (min)',
      'Statut Pilote',
      'Mode de pointage',
    ];

    const rows = data.map((item) => {
      const isMember = Boolean(item.user_id);
      const name = isMember
        ? `${item.sbc_members?.last_name || ''} ${item.sbc_members?.first_name || ''}`.trim()
        : item.visitor_name || 'Pilote Visiteur';
      const license = isMember
        ? item.sbc_members?.license_number || 'Affilié Club'
        : item.visitor_license || 'Licence externe';
      const checkInTime = new Date(item.check_in_at).toLocaleTimeString('fr-FR', {
        hour: '2-digit',
        minute: '2-digit',
      });
      const checkOutTime = item.check_out_at
        ? new Date(item.check_out_at).toLocaleTimeString('fr-FR', {
            hour: '2-digit',
            minute: '2-digit',
          })
        : 'Sur site';

      return [
        `"${item.check_in_at.split('T')[0]}"`,
        `"${name}"`,
        `"${license}"`,
        `"${item.tracks?.name || 'Complexe SBC'}"`,
        `"${checkInTime}"`,
        `"${checkOutTime}"`,
        `"${item.duration_minutes || '-'}"`,
        `"${isMember ? 'Membre SBC' : 'Visiteur 1j'}"`,
        `"${item.source}"`,
      ];
    });

    const csv = [headers.join(';'), ...rows.map((r) => r.join(';'))].join('\n');
    return { csvContent: csv, error: null };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erreur export CSV';
    return { csvContent: '', error: message };
  }
}
