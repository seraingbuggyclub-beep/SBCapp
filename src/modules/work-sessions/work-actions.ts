'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import {
  WorkSession,
  WorkSessionVolunteer,
  CreateWorkSessionInput,
  WorkSessionRedeemType,
  WorkSessionReport,
  getErrorMessage,
} from '@/types/models';

/**
 * Récupère la liste des sessions de travaux avec leurs compteurs de bénévoles
 */
export async function getWorkSessions(includeClosed: boolean = false): Promise<{
  data: WorkSession[];
  error: string | null;
}> {
  try {
    const supabase = await createClient();

    let query = supabase
      .from('work_sessions')
      .select(`
        *,
        volunteers:work_session_volunteers(
          id,
          session_id,
          member_id,
          selected_meal,
          meal_redeemed,
          softs_used,
          water_used,
          checkin_at,
          checkin_by,
          created_at,
          member:sbc_members!work_session_volunteers_member_id_fkey(
            id,
            first_name,
            last_name,
            email,
            phone,
            license_number
          )
        )
      `)
      .order('session_date', { ascending: true })
      .order('start_time', { ascending: true });

    if (!includeClosed) {
      query = query.in('status', ['OPEN', 'IN_PROGRESS']);
    }

    const { data, error } = await query;
    if (error) throw error;

    const formatted: WorkSession[] = (data || []).map((session) => {
      const availableMeals = Array.isArray(session.available_meals)
        ? (session.available_meals as string[])
        : ['Pain Burger', 'Pain Mexicanos', 'Pain Saucisse', 'Végétarien'];

      const volunteersList: WorkSessionVolunteer[] = (session.volunteers || []).map((v: any) => ({
        id: v.id,
        session_id: v.session_id,
        member_id: v.member_id,
        selected_meal: v.selected_meal,
        meal_redeemed: Boolean(v.meal_redeemed),
        softs_used: Number(v.softs_used || 0),
        water_used: Number(v.water_used || 0),
        checkin_at: v.checkin_at,
        checkin_by: v.checkin_by,
        created_at: v.created_at,
        member: v.member ? {
          id: v.member.id,
          first_name: v.member.first_name,
          last_name: v.member.last_name,
          email: v.member.email,
          phone: v.member.phone,
          license_number: v.member.license_number,
        } : null,
      }));

      return {
        id: session.id,
        title: session.title,
        description: session.description,
        session_date: session.session_date,
        start_time: session.start_time,
        end_time: session.end_time,
        max_participants: Number(session.max_participants || 4),
        free_softs_quota: Number(session.free_softs_quota || 2),
        available_meals: availableMeals,
        status: session.status,
        closed_at: session.closed_at,
        closed_by: session.closed_by,
        created_at: session.created_at,
        volunteers_count: volunteersList.length,
        volunteers: volunteersList,
      };
    });

    return { data: formatted, error: null };
  } catch (err: unknown) {
    return { data: [], error: getErrorMessage(err) };
  }
}

/**
 * Récupère les détails d'une session de travaux avec ses bénévoles
 */
export async function getWorkSessionDetails(sessionId: string): Promise<{
  data: WorkSession | null;
  error: string | null;
}> {
  try {
    const supabase = await createClient();

    const { data: session, error } = await supabase
      .from('work_sessions')
      .select(`
        *,
        volunteers:work_session_volunteers(
          id,
          session_id,
          member_id,
          selected_meal,
          meal_redeemed,
          softs_used,
          water_used,
          checkin_at,
          checkin_by,
          created_at,
          member:sbc_members!work_session_volunteers_member_id_fkey(
            id,
            first_name,
            last_name,
            email,
            phone,
            license_number
          )
        )
      `)
      .eq('id', sessionId)
      .single();

    if (error) throw error;
    if (!session) return { data: null, error: 'Session non trouvée' };

    const availableMeals = Array.isArray(session.available_meals)
      ? (session.available_meals as string[])
      : ['Pain Burger', 'Pain Mexicanos', 'Pain Saucisse', 'Végétarien'];

    const volunteersList: WorkSessionVolunteer[] = (session.volunteers || []).map((v: any) => ({
      id: v.id,
      session_id: v.session_id,
      member_id: v.member_id,
      selected_meal: v.selected_meal,
      meal_redeemed: Boolean(v.meal_redeemed),
      softs_used: Number(v.softs_used || 0),
      water_used: Number(v.water_used || 0),
      checkin_at: v.checkin_at,
      checkin_by: v.checkin_by,
      created_at: v.created_at,
      member: v.member ? {
        id: v.member.id,
        first_name: v.member.first_name,
        last_name: v.member.last_name,
        email: v.member.email,
        phone: v.member.phone,
        license_number: v.member.license_number,
      } : null,
    }));

    const result: WorkSession = {
      id: session.id,
      title: session.title,
      description: session.description,
      session_date: session.session_date,
      start_time: session.start_time,
      end_time: session.end_time,
      max_participants: Number(session.max_participants || 4),
      free_softs_quota: Number(session.free_softs_quota || 2),
      available_meals: availableMeals,
      status: session.status,
      closed_at: session.closed_at,
      closed_by: session.closed_by,
      created_at: session.created_at,
      volunteers_count: volunteersList.length,
      volunteers: volunteersList,
    };

    return { data: result, error: null };
  } catch (err: unknown) {
    return { data: null, error: getErrorMessage(err) };
  }
}

/**
 * 1. createWorkSession : Création de la session par le CA/Admin
 */
export async function createWorkSession(input: CreateWorkSessionInput): Promise<{
  data: WorkSession | null;
  error: string | null;
}> {
  try {
    const supabase = await createClient();
    const { data: authData } = await supabase.auth.getUser();

    if (!authData.user) {
      return { data: null, error: 'Non authentifié' };
    }

    // Vérification du rôle admin / référent
    const { data: memberProfile } = await supabase
      .from('sbc_members')
      .select('role')
      .eq('id', authData.user.id)
      .single();

    if (!memberProfile || !['admin', 'referent'].includes(memberProfile.role || '')) {
      return { data: null, error: 'Droits insuffisants pour créer une session travaux' };
    }

    const defaultMeals = ['Pain Burger', 'Pain Mexicanos', 'Pain Saucisse', 'Végétarien'];
    const mealsToSave = input.available_meals && input.available_meals.length > 0
      ? input.available_meals
      : defaultMeals;

    const { data, error } = await supabase
      .from('work_sessions')
      .insert({
        title: input.title.trim(),
        description: input.description?.trim() || null,
        session_date: input.session_date,
        start_time: input.start_time,
        end_time: input.end_time,
        max_participants: input.max_participants || 4,
        free_softs_quota: input.free_softs_quota ?? 2,
        available_meals: mealsToSave,
        status: 'OPEN',
      })
      .select()
      .single();

    if (error) throw error;

    revalidatePath('/events');
    revalidatePath('/admin/buvette');
    revalidatePath('/dashboard');

    return {
      data: {
        ...data,
        volunteers_count: 0,
        volunteers: [],
      } as WorkSession,
      error: null,
    };
  } catch (err: unknown) {
    return { data: null, error: getErrorMessage(err) };
  }
}

/**
 * 2. registerToWorkSession : Inscription du pilote (vérifie que participants_count < max_participants)
 */
export async function registerToWorkSession(
  sessionId: string,
  selectedMeal: string
): Promise<{
  data: WorkSessionVolunteer | null;
  error: string | null;
}> {
  try {
    const supabase = await createClient();
    const { data: authData } = await supabase.auth.getUser();

    if (!authData.user) {
      return { data: null, error: 'Vous devez être connecté pour vous inscrire.' };
    }

    const userId = authData.user.id;

    if (!selectedMeal || !selectedMeal.trim()) {
      return { data: null, error: 'Le choix du repas est obligatoire pour les bénévoles.' };
    }

    // Récupérer la session et le nombre d'inscrits actuels
    const { data: session, error: sessErr } = await supabase
      .from('work_sessions')
      .select('id, title, max_participants, status, available_meals')
      .eq('id', sessionId)
      .single();

    if (sessErr || !session) {
      return { data: null, error: 'Session de travaux introuvable.' };
    }

    if (session.status !== 'OPEN') {
      return { data: null, error: 'Les inscriptions pour cette session sont fermées.' };
    }

    // Vérifier le nombre d'inscrits actuels
    const { count, error: countErr } = await supabase
      .from('work_session_volunteers')
      .select('id', { count: 'exact', head: true })
      .eq('session_id', sessionId);

    if (countErr) throw countErr;

    if ((count || 0) >= session.max_participants) {
      return {
        data: null,
        error: `Session complète ! Le nombre maximum de ${session.max_participants} bénévoles est déjà atteint.`,
      };
    }

    // Vérifier si le membre est déjà inscrit
    const { data: existingReg } = await supabase
      .from('work_session_volunteers')
      .select('id')
      .eq('session_id', sessionId)
      .eq('member_id', userId)
      .maybeSingle();

    if (existingReg) {
      return { data: null, error: 'Vous êtes déjà inscrit à cette session de travaux.' };
    }

    // Insérer l'inscription
    const { data, error } = await supabase
      .from('work_session_volunteers')
      .insert({
        session_id: sessionId,
        member_id: userId,
        selected_meal: selectedMeal.trim(),
        meal_redeemed: false,
        softs_used: 0,
        water_used: 0,
      })
      .select()
      .single();

    if (error) throw error;

    revalidatePath('/events');
    revalidatePath('/admin/buvette');
    revalidatePath('/dashboard');

    return { data: data as WorkSessionVolunteer, error: null };
  } catch (err: unknown) {
    return { data: null, error: getErrorMessage(err) };
  }
}

/**
 * 3. cancelWorkSessionRegistration : Désinscription tant que la session n'a pas débuté / n'est pas clôturée
 */
export async function cancelWorkSessionRegistration(sessionId: string): Promise<{
  success: boolean;
  error: string | null;
}> {
  try {
    const supabase = await createClient();
    const { data: authData } = await supabase.auth.getUser();

    if (!authData.user) {
      return { success: false, error: 'Non authentifié' };
    }

    const userId = authData.user.id;

    // Vérifier le statut de la session
    const { data: session } = await supabase
      .from('work_sessions')
      .select('status')
      .eq('id', sessionId)
      .single();

    if (session && session.status === 'CLOSED') {
      return { success: false, error: 'Impossible de se désinscrire d\'une session déjà clôturée.' };
    }

    const { error } = await supabase
      .from('work_session_volunteers')
      .delete()
      .eq('session_id', sessionId)
      .eq('member_id', userId);

    if (error) throw error;

    revalidatePath('/events');
    revalidatePath('/admin/buvette');
    revalidatePath('/dashboard');

    return { success: true, error: null };
  } catch (err: unknown) {
    return { success: false, error: getErrorMessage(err) };
  }
}

/**
 * 4. checkinVolunteer : Validation de la présence sur place par le Référent/Admin
 */
export async function checkinVolunteer(
  sessionId: string,
  memberId: string
): Promise<{
  success: boolean;
  error: string | null;
}> {
  try {
    const supabase = await createClient();
    const { data: authData } = await supabase.auth.getUser();

    if (!authData.user) {
      return { success: false, error: 'Non authentifié' };
    }

    const { data: adminProfile } = await supabase
      .from('sbc_members')
      .select('role')
      .eq('id', authData.user.id)
      .single();

    if (!adminProfile || !['admin', 'referent'].includes(adminProfile.role || '')) {
      return { success: false, error: 'Action réservée aux Référents et Administrateurs' };
    }

    const { error } = await supabase
      .from('work_session_volunteers')
      .update({
        checkin_at: new Date().toISOString(),
        checkin_by: authData.user.id,
      })
      .eq('session_id', sessionId)
      .eq('member_id', memberId);

    if (error) throw error;

    revalidatePath('/admin/buvette');
    revalidatePath('/events');

    return { success: true, error: null };
  } catch (err: unknown) {
    return { success: false, error: getErrorMessage(err) };
  }
}

/**
 * 5. redeemVolunteerItem : Distribution d'un avantage bénévole
 * - SOFT : Incrémente softs_used si < free_softs_quota.
 * - WATER : Incrémente water_used (gratuit illimité).
 * - MEAL : Bascule meal_redeemed à true.
 */
export async function redeemVolunteerItem(
  sessionId: string,
  memberId: string,
  itemType: WorkSessionRedeemType
): Promise<{
  success: boolean;
  quotaExceeded?: boolean;
  message?: string;
  error: string | null;
}> {
  try {
    const supabase = await createClient();
    const { data: authData } = await supabase.auth.getUser();

    if (!authData.user) {
      return { success: false, error: 'Non authentifié' };
    }

    const { data: adminProfile } = await supabase
      .from('sbc_members')
      .select('role')
      .eq('id', authData.user.id)
      .single();

    if (!adminProfile || !['admin', 'referent'].includes(adminProfile.role || '')) {
      return { success: false, error: 'Action réservée aux Référents et Administrateurs' };
    }

    // Récupérer la session et le bénévole
    const { data: session } = await supabase
      .from('work_sessions')
      .select('id, title, status, free_softs_quota')
      .eq('id', sessionId)
      .single();

    if (!session) {
      return { success: false, error: 'Session non trouvée' };
    }

    if (session.status === 'CLOSED') {
      return { success: false, error: 'La session est clôturée. Les distributions gratuites sont bloquées.' };
    }

    const { data: volunteer, error: volErr } = await supabase
      .from('work_session_volunteers')
      .select('*')
      .eq('session_id', sessionId)
      .eq('member_id', memberId)
      .single();

    if (volErr || !volunteer) {
      return { success: false, error: 'Bénévole non inscrit à cette session' };
    }

    // Auto-checkin si ce n'était pas encore fait
    if (!volunteer.checkin_at) {
      await supabase
        .from('work_session_volunteers')
        .update({
          checkin_at: new Date().toISOString(),
          checkin_by: authData.user.id,
        })
        .eq('id', volunteer.id);
    }

    if (itemType === 'SOFT') {
      const currentSofts = volunteer.softs_used || 0;
      const quota = session.free_softs_quota || 2;

      if (currentSofts >= quota) {
        return {
          success: false,
          quotaExceeded: true,
          message: `Quota de softs gratuits atteint (${quota}/${quota}). Veuillez basculer vers un débit caisse classique.`,
          error: null,
        };
      }

      const { error: updErr } = await supabase
        .from('work_session_volunteers')
        .update({ softs_used: currentSofts + 1 })
        .eq('id', volunteer.id);

      if (updErr) throw updErr;

      // Déduction du stock buvette pour traçabilité (Soft générique ou premier article soft)
      try {
        const { data: softItem } = await supabase
          .from('bar_items')
          .select('id, stock_quantity, cost_price')
          .ilike('name', '%coca%')
          .eq('is_active', true)
          .limit(1)
          .maybeSingle();

        if (softItem) {
          await supabase
            .from('bar_items')
            .update({ stock_quantity: Math.max(0, (softItem.stock_quantity || 0) - 1) })
            .eq('id', softItem.id);

          await supabase
            .from('bar_stock_movements')
            .insert({
              item_id: softItem.id,
              type: 'LOSS',
              quantity: -1,
              cost_price_at_time: softItem.cost_price || 0.65,
              reason: `Bénévolat Travaux SBC - ${session.title}`,
              admin_id: authData.user.id,
            });
        }
      } catch (stockErr) {
        console.warn('Erreur décompte stock bar soft travaux:', stockErr);
      }

      revalidatePath('/admin/buvette');
      return {
        success: true,
        message: `Soft distribué (${currentSofts + 1} / ${quota})`,
        error: null,
      };
    }

    if (itemType === 'WATER') {
      const currentWater = volunteer.water_used || 0;

      const { error: updErr } = await supabase
        .from('work_session_volunteers')
        .update({ water_used: currentWater + 1 })
        .eq('id', volunteer.id);

      if (updErr) throw updErr;

      // Déduction du stock buvette eau
      try {
        const { data: waterItem } = await supabase
          .from('bar_items')
          .select('id, stock_quantity, cost_price')
          .ilike('name', '%eau%')
          .eq('is_active', true)
          .limit(1)
          .maybeSingle();

        if (waterItem) {
          await supabase
            .from('bar_items')
            .update({ stock_quantity: Math.max(0, (waterItem.stock_quantity || 0) - 1) })
            .eq('id', waterItem.id);

          await supabase
            .from('bar_stock_movements')
            .insert({
              item_id: waterItem.id,
              type: 'LOSS',
              quantity: -1,
              cost_price_at_time: waterItem.cost_price || 0.40,
              reason: `Bénévolat Travaux SBC (Eau) - ${session.title}`,
              admin_id: authData.user.id,
            });
        }
      } catch (stockErr) {
        console.warn('Erreur décompte stock bar eau travaux:', stockErr);
      }

      revalidatePath('/admin/buvette');
      return {
        success: true,
        message: `Eau distribuée (Total: ${currentWater + 1})`,
        error: null,
      };
    }

    if (itemType === 'MEAL') {
      const { error: updErr } = await supabase
        .from('work_session_volunteers')
        .update({ meal_redeemed: true })
        .eq('id', volunteer.id);

      if (updErr) throw updErr;

      revalidatePath('/admin/buvette');
      return {
        success: true,
        message: `Repas (${volunteer.selected_meal}) validé et distribué !`,
        error: null,
      };
    }

    return { success: false, error: 'Type de distribution invalide' };
  } catch (err: unknown) {
    return { success: false, error: getErrorMessage(err) };
  }
}

/**
 * 6. closeWorkSessionManually : Clôture manuelle exclusive par l'Admin/Référent
 * - Bloque les distributions gratuites
 * - Fige le rapport
 * - Génère l'écriture de synthèse des sorties de stock au compte de charges "Bénévolat Travaux ASBL"
 */
export async function closeWorkSessionManually(sessionId: string): Promise<{
  data: WorkSessionReport | null;
  error: string | null;
}> {
  try {
    const supabase = await createClient();
    const { data: authData } = await supabase.auth.getUser();

    if (!authData.user) {
      return { data: null, error: 'Non authentifié' };
    }

    const { data: adminProfile } = await supabase
      .from('sbc_members')
      .select('role')
      .eq('id', authData.user.id)
      .single();

    if (!adminProfile || !['admin', 'referent'].includes(adminProfile.role || '')) {
      return { data: null, error: 'Action réservée aux Référents et Administrateurs' };
    }

    // Récupérer la session et tous les bénévoles
    const { data: session, error: sessErr } = await supabase
      .from('work_sessions')
      .select(`
        *,
        volunteers:work_session_volunteers(*)
      `)
      .eq('id', sessionId)
      .single();

    if (sessErr || !session) {
      return { data: null, error: 'Session non trouvée' };
    }

    if (session.status === 'CLOSED') {
      return { data: null, error: 'Cette session est déjà clôturée.' };
    }

    const volunteers = session.volunteers || [];
    const totalVolunteers = volunteers.length;
    const checkedInVolunteers = volunteers.filter((v: any) => v.checkin_at).length;
    const softsRedeemed = volunteers.reduce((acc: number, v: any) => acc + (v.softs_used || 0), 0);
    const waterRedeemed = volunteers.reduce((acc: number, v: any) => acc + (v.water_used || 0), 0);
    const mealsRedeemed = volunteers.filter((v: any) => v.meal_redeemed).length;

    // Coûts de revient indicatifs pour la comptabilité ASBL :
    // Repas ~ 3.50€ / Soft ~ 0.65€ / Eau ~ 0.40€
    const estimatedExpense = Number((mealsRedeemed * 3.50 + softsRedeemed * 0.65 + waterRedeemed * 0.40).toFixed(2));

    // Clôturer la session en base
    const { error: closeErr } = await supabase
      .from('work_sessions')
      .update({
        status: 'CLOSED',
        closed_at: new Date().toISOString(),
        closed_by: authData.user.id,
      })
      .eq('id', sessionId);

    if (closeErr) throw closeErr;

    // Générer l'écriture comptable de synthèse si une dépense estimée existe
    if (estimatedExpense > 0) {
      try {
        await supabase
          .from('accounting_transactions')
          .insert({
            date: session.session_date || new Date().toISOString().split('T')[0],
            type: 'DEPENSE',
            category: 'TRAVAUX_PISTE',
            payment_method: 'ESPECES',
            amount: estimatedExpense,
            description: `Bénévolat Travaux ASBL : ${session.title} (${checkedInVolunteers} bénévoles, ${mealsRedeemed} repas, ${softsRedeemed} softs, ${waterRedeemed} eaux)`,
            source_type: 'MANUAL',
            source_id: session.id,
            author_id: authData.user.id,
          });
      } catch (accErr) {
        console.warn('Erreur écriture comptabilité travaux:', accErr);
      }
    }

    const report: WorkSessionReport = {
      sessionId: session.id,
      title: session.title,
      date: session.session_date,
      totalVolunteers,
      checkedInVolunteers,
      softsRedeemed,
      waterRedeemed,
      mealsRedeemed,
      estimatedExpense,
    };

    revalidatePath('/admin/buvette');
    revalidatePath('/admin/comptabilite');
    revalidatePath('/events');
    revalidatePath('/dashboard');

    return { data: report, error: null };
  } catch (err: unknown) {
    return { data: null, error: getErrorMessage(err) };
  }
}

/**
 * Supprimer une session de travaux (Admin uniquement)
 */
export async function deleteWorkSession(sessionId: string): Promise<{
  success: boolean;
  error: string | null;
}> {
  try {
    const supabase = await createClient();
    const { data: authData } = await supabase.auth.getUser();

    if (!authData.user) {
      return { success: false, error: 'Non authentifié' };
    }

    const { data: adminProfile } = await supabase
      .from('sbc_members')
      .select('role')
      .eq('id', authData.user.id)
      .single();

    if (!adminProfile || !['admin', 'referent'].includes(adminProfile.role || '')) {
      return { success: false, error: 'Action réservée aux Administrateurs' };
    }

    const { error } = await supabase
      .from('work_sessions')
      .delete()
      .eq('id', sessionId);

    if (error) throw error;

    revalidatePath('/events');
    revalidatePath('/admin/buvette');

    return { success: true, error: null };
  } catch (err: unknown) {
    return { success: false, error: getErrorMessage(err) };
  }
}
