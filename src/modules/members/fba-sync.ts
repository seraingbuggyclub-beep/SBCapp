'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { isSuperAdmin } from '@/modules/admin/permissions';

export interface FbaScrapedMember {
  firstName: string;
  lastName: string;
  club: string;
  type: string;
  licenseNumber: string;
}

export interface FbaSyncResult {
  success: boolean;
  licenseNumber?: string | null;
  club?: string | null;
  type?: string | null;
  message?: string;
  error?: string;
}

export interface FbaBatchSyncResult {
  success: boolean;
  totalMembers: number;
  updatedCount: number;
  unmatchedCount: number;
  message?: string;
  error?: string;
}

/**
 * Normalise une chaîne de caractères (supprime les accents, met en minuscule, nettoie les espaces)
 */
function normalizeString(str: string): string {
  if (!str) return '';
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ');
}

/**
 * Récupère l'intégralité du registre des membres affiliés depuis la source officielle FBA
 */
export async function fetchAllFbaMembers(): Promise<FbaScrapedMember[]> {
  try {
    const url = 'https://fba-rc.be/fr/leden/?nocache=' + Date.now();
    const requestData = {
      action: 'jet_engine_ajax',
      handler: 'get_listing',
      query: {},
      widget_settings: {
        lisitng_id: '567',
        columns: '1',
        posts_num: 50,
        custom_query: 'yes',
        custom_query_id: '3',
        _element_id: 'leden',
      },
      page_settings: {
        post_id: 570,
        queried_id: '570|WP_Post',
        element_id: 'leden',
        page: 1,
      },
      listing_type: false,
      isEditMode: false,
      addedPostCSS: ['567', '637'],
    };

    const formData = new URLSearchParams();
    for (const [key, value] of Object.entries(requestData)) {
      if (typeof value === 'object' && value !== null) {
        for (const [subKey, subVal] of Object.entries(value)) {
          if (Array.isArray(subVal)) {
            subVal.forEach((item, idx) => {
              formData.append(`${key}[${subKey}][${idx}]`, item);
            });
          } else {
            formData.append(`${key}[${subKey}]`, String(subVal));
          }
        }
      } else {
        formData.append(key, String(value));
      }
    }

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
        'X-Requested-With': 'XMLHttpRequest',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
      body: formData,
      next: { revalidate: 3600 }, // Cache serveur 1h
    });

    if (!res.ok) {
      throw new Error(`Erreur réseau FBA: statut ${res.status}`);
    }

    const json = await res.json();
    const html = json?.data?.html || '';

    if (!html) {
      return [];
    }

    const items = html.split(/<div class="[^"]*jet-listing-grid__item/);
    const parsedMembers: FbaScrapedMember[] = [];

    for (let i = 1; i < items.length; i++) {
      const block = items[i];
      const fields: string[] = [];
      const fieldRegex = /<div class="[^"]*jet-listing-dynamic-field__content"[^>]*>([\s\S]*?)<\/div>/g;
      let m;
      while ((m = fieldRegex.exec(block)) !== null) {
        fields.push(m[1].trim().replace(/<[^>]+>/g, '').trim());
      }

      // Structure exacte du tableau officiel :
      // Index 0: Prénom | Index 1: Nom de famille | Index 2: Nom du club | Index 3: Type | Index 4: Nombre (Numéro de licence)
      if (fields.length >= 5) {
        const cleanLicense = fields[4].trim();
        parsedMembers.push({
          firstName: fields[0].trim(),
          lastName: fields[1].trim(),
          club: fields[2].trim(),
          type: fields[3].trim(),
          licenseNumber: cleanLicense,
        });
      }
    }

    return parsedMembers;
  } catch (err: unknown) {
    console.error('Erreur lors du scraping du registre FBA:', err);
    return [];
  }
}

/**
 * Recherche flexible d'un membre dans le registre FBA par Nom et Prénom
 */
export async function fetchFbaMemberLicense(
  firstName: string,
  lastName: string
): Promise<FbaScrapedMember | null> {
  const normFirst = normalizeString(firstName);
  const normLast = normalizeString(lastName);

  if (!normFirst || !normLast) {
    return null;
  }

  const allMembers = await fetchAllFbaMembers();
  if (!allMembers.length) {
    return null;
  }

  // Filtrer les candidats correspondants
  const candidates = allMembers.filter((m) => {
    const fbaFirst = normalizeString(m.firstName);
    const fbaLast = normalizeString(m.lastName);

    // Correspondance standard (Prénom + Nom) ou inversée (Nom + Prénom)
    const exactMatch = (fbaFirst === normFirst && fbaLast === normLast) ||
                       (fbaFirst === normLast && fbaLast === normFirst);

    if (exactMatch) return true;

    // Correspondance flexible si prénom ou nom composé inclus
    const fuzzyMatch = (
      (fbaFirst.includes(normFirst) || normFirst.includes(fbaFirst)) &&
      (fbaLast.includes(normLast) || normLast.includes(fbaLast))
    );

    return fuzzyMatch;
  });

  if (candidates.length === 0) {
    return null;
  }

  // Prioriser les affiliations Seraing Buggy Club (SBC)
  const sbcMatch = candidates.find((c) => /seraing|sbc/i.test(c.club));
  return sbcMatch || candidates[0];
}

/**
 * Server Action : Synchronise la licence FBA de l'utilisateur connecté ou d'un membre ciblé (Admin)
 */
export async function syncMyFbaLicense(memberId?: string): Promise<FbaSyncResult> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: 'Non authentifié' };
    }

    const targetId = memberId || user.id;

    // Si on synchronise un autre membre, vérifier que l'utilisateur est admin
    if (targetId !== user.id) {
      const isSuper = isSuperAdmin(user.email);
      const { data: userProfile } = await supabase
        .from('sbc_members')
        .select('role')
        .eq('id', user.id)
        .single();

      if (!isSuper && userProfile?.role !== 'admin') {
        return { success: false, error: 'Action non autorisée' };
      }
    }

    // Récupérer le membre ciblé
    const { data: member, error: memberError } = await supabase
      .from('sbc_members')
      .select('id, first_name, last_name, license_number, fba_license_number')
      .eq('id', targetId)
      .single();

    if (memberError || !member) {
      return { success: false, error: 'Membre introuvable' };
    }

    if (!member.first_name || !member.last_name) {
      return { success: false, error: 'Prénom et nom requis dans le profil pour interroger la FBA' };
    }

    // Interroger le registre FBA
    const fbaData = await fetchFbaMemberLicense(member.first_name, member.last_name);

    if (!fbaData || !fbaData.licenseNumber) {
      return {
        success: false,
        error: `Aucune affiliation trouvée sur fba-rc.be pour ${member.first_name} ${member.last_name}. Vérifiez l'orthographe du nom/prénom.`,
      };
    }

    const now = new Date().toISOString();

    // Mettre à jour Supabase
    const { error: updateError } = await supabase
      .from('sbc_members')
      .update({
        fba_license_number: fbaData.licenseNumber,
        license_number: fbaData.licenseNumber, // Met également à jour le champ license_number pour cohérence globale
        fba_synced_at: now,
        updated_at: now,
      })
      .eq('id', targetId);

    if (updateError) {
      // Si la colonne fba_license_number n'existe pas encore en base, repli sur license_number
      if (updateError.message.includes('fba_license_number')) {
        await supabase
          .from('sbc_members')
          .update({
            license_number: fbaData.licenseNumber,
            updated_at: now,
          })
          .eq('id', targetId);
      } else {
        return { success: false, error: updateError.message };
      }
    }

    revalidatePath('/dashboard');
    revalidatePath('/');
    revalidatePath('/admin');

    return {
      success: true,
      licenseNumber: fbaData.licenseNumber,
      club: fbaData.club,
      type: fbaData.type,
      message: `Licence FBA synchronisée avec succès (${fbaData.licenseNumber} • ${fbaData.club})`,
    };
  } catch (err: unknown) {
    console.error('Erreur syncMyFbaLicense:', err);
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Erreur inattendue lors de la synchronisation',
    };
  }
}

/**
 * Server Action Admin : Synchronise en lot l'ensemble des membres SBC
 */
export async function syncAllMembersFbaLicenses(): Promise<FbaBatchSyncResult> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, totalMembers: 0, updatedCount: 0, unmatchedCount: 0, error: 'Non authentifié' };
    }

    const isSuper = isSuperAdmin(user.email);
    const { data: userProfile } = await supabase
      .from('sbc_members')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!isSuper && userProfile?.role !== 'admin') {
      return { success: false, totalMembers: 0, updatedCount: 0, unmatchedCount: 0, error: 'Action réservée aux administrateurs' };
    }

    // 1. Récupération des membres FBA
    const fbaMembers = await fetchAllFbaMembers();
    if (!fbaMembers.length) {
      return { success: false, totalMembers: 0, updatedCount: 0, unmatchedCount: 0, error: 'Impossible de contacter le registre FBA' };
    }

    // 2. Récupération de tous les membres SBC
    const { data: sbcMembers, error: sbcError } = await supabase
      .from('sbc_members')
      .select('id, first_name, last_name, license_number, fba_license_number');

    if (sbcError || !sbcMembers) {
      return { success: false, totalMembers: 0, updatedCount: 0, unmatchedCount: 0, error: sbcError?.message || 'Erreur chargement membres' };
    }

    let updatedCount = 0;
    let unmatchedCount = 0;
    const now = new Date().toISOString();

    for (const member of sbcMembers) {
      if (!member.first_name || !member.last_name) {
        unmatchedCount++;
        continue;
      }

      const normFirst = normalizeString(member.first_name);
      const normLast = normalizeString(member.last_name);

      const matched = fbaMembers.find((m) => {
        const fbaFirst = normalizeString(m.firstName);
        const fbaLast = normalizeString(m.lastName);
        return (fbaFirst === normFirst && fbaLast === normLast) ||
               (fbaFirst === normLast && fbaLast === normFirst);
      });

      if (matched && matched.licenseNumber) {
        await supabase
          .from('sbc_members')
          .update({
            fba_license_number: matched.licenseNumber,
            license_number: matched.licenseNumber,
            fba_synced_at: now,
            updated_at: now,
          })
          .eq('id', member.id);
        updatedCount++;
      } else {
        unmatchedCount++;
      }
    }

    revalidatePath('/dashboard');
    revalidatePath('/');
    revalidatePath('/admin');

    return {
      success: true,
      totalMembers: sbcMembers.length,
      updatedCount,
      unmatchedCount,
      message: `${updatedCount} licence(s) FBA synchronisée(s) sur ${sbcMembers.length} membre(s).`,
    };
  } catch (err: unknown) {
    console.error('Erreur syncAllMembersFbaLicenses:', err);
    return {
      success: false,
      totalMembers: 0,
      updatedCount: 0,
      unmatchedCount: 0,
      error: err instanceof Error ? err.message : 'Erreur inattendue',
    };
  }
}
