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
 * Normalise une chaîne de caractères :
 * - Normalisation Unicode NFD + suppression des diacritiques (accents)
 * - Conversion en minuscules
 * - Remplacement des caractères spéciaux par des espaces
 * - Nettoyage des espaces multiples
 */
function normalizeString(str: string): string {
  if (!str) return '';
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

/**
 * Détermine si une affiliation FBA correspond au club 143 (Seraing Buggy Club)
 */
function isSbcClub(member: FbaScrapedMember): boolean {
  const normClub = normalizeString(member.club);
  const licenseNum = (member.licenseNumber || '').trim();
  return (
    licenseNum.startsWith('143-') ||
    licenseNum.startsWith('143') ||
    normClub.includes('143') ||
    normClub.includes('seraing') ||
    normClub.includes('sbc')
  );
}

/**
 * Recherche et associe un membre au registre FBA :
 * 1. Normalisation NFD (minuscules + sans accents/caractères spéciaux)
 * 2. Priorité absolue au club 143 / Seraing Buggy Club (ou matricule débutant par 143-)
 * 3. Tolérance & Fuzzy matching (noms/prénoms composés ou inversés)
 */
function matchFbaMember(
  allMembers: FbaScrapedMember[],
  firstName: string,
  lastName: string
): FbaScrapedMember | null {
  const normFirst = normalizeString(firstName);
  const normLast = normalizeString(lastName);

  if (!normFirst || !normLast) {
    return null;
  }

  const targetCombined1 = `${normFirst} ${normLast}`;
  const targetCombined2 = `${normLast} ${normFirst}`;

  // 1. Recherche exacte : prénom + nom (ou nom + prénom)
  const exactMatches = allMembers.filter((m) => {
    const fFirst = normalizeString(m.firstName);
    const fLast = normalizeString(m.lastName);
    const fCombined1 = `${fFirst} ${fLast}`;
    const fCombined2 = `${fLast} ${fFirst}`;

    return (
      (fFirst === normFirst && fLast === normLast) ||
      (fFirst === normLast && fLast === normFirst) ||
      fCombined1 === targetCombined1 ||
      fCombined2 === targetCombined1 ||
      fCombined1 === targetCombined2 ||
      fCombined2 === targetCombined2
    );
  });

  if (exactMatches.length > 0) {
    // Priorité stricte au Club 143 / Seraing Buggy Club
    const sbcMatch = exactMatches.find(isSbcClub);
    if (sbcMatch) return sbcMatch;
    return exactMatches[0];
  }

  // 2. Recherche tolérante / Fuzzy matching (noms/prénoms composés, tokens multiples)
  const targetTokens = [...normFirst.split(' '), ...normLast.split(' ')].filter(Boolean);

  const fuzzyMatches = allMembers.filter((m) => {
    const fFirst = normalizeString(m.firstName);
    const fLast = normalizeString(m.lastName);
    const fbaFull = `${fFirst} ${fLast}`;
    const fbaFullRev = `${fLast} ${fFirst}`;

    // Tous les tokens cibles sont présents dans le nom FBA
    const allTokensMatch = targetTokens.length > 0 && targetTokens.every((t) => fbaFull.includes(t));
    if (allTokensMatch) return true;

    // Inclusion partielle / réciproque
    const isContained = (
      (fFirst.includes(normFirst) || normFirst.includes(fFirst)) &&
      (fLast.includes(normLast) || normLast.includes(fLast))
    ) || (
      (fFirst.includes(normLast) || normLast.includes(fFirst)) &&
      (fLast.includes(normFirst) || normFirst.includes(fLast))
    );

    return isContained || fbaFull.includes(targetCombined1) || fbaFullRev.includes(targetCombined1);
  });

  if (fuzzyMatches.length > 0) {
    // Priorité stricte au Club 143 / Seraing Buggy Club
    const sbcFuzzy = fuzzyMatches.find(isSbcClub);
    if (sbcFuzzy) return sbcFuzzy;
    return fuzzyMatches[0];
  }

  return null;
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
  const allMembers = await fetchAllFbaMembers();
  if (!allMembers.length) {
    return null;
  }
  return matchFbaMember(allMembers, firstName, lastName);
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

      const matched = matchFbaMember(fbaMembers, member.first_name, member.last_name);

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
