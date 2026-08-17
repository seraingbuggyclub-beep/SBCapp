export interface BelgianHoliday {
  date: string; // Format 'YYYY-MM-DD'
  name: string;
  type: 'official_holiday' | 'special_day';
  description?: string;
}

/**
 * Algorithme de Meeus/Jones/Butcher pour calculer la date du dimanche de Pâques
 */
export function getEasterDate(year: number): Date {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31); // 3 = Mars, 4 = Avril
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(Date.UTC(year, month - 1, day));
}

function formatDateString(date: Date): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, '0');
  const d = String(date.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date.getTime());
  result.setUTCDate(result.getUTCDate() + days);
  return result;
}

/**
 * Calcule le N-ième jour de la semaine dans un mois donné
 * (ex: 2ème dimanche de mai pour la Fête des Mères)
 */
function getNthDayOfMonth(year: number, monthZeroIndexed: number, targetDayOfWeek: number, nth: number): Date {
  let count = 0;
  for (let day = 1; day <= 31; day++) {
    const d = new Date(Date.UTC(year, monthZeroIndexed, day));
    if (d.getUTCMonth() !== monthZeroIndexed) break;
    if (d.getUTCDay() === targetDayOfWeek) {
      count++;
      if (count === nth) {
        return d;
      }
    }
  }
  return new Date(Date.UTC(year, monthZeroIndexed, 1));
}

/**
 * Retourne la liste complète des jours fériés et fêtes clés belges pour une année donnée
 */
export function getBelgianHolidays(year: number): BelgianHoliday[] {
  const easterSunday = getEasterDate(year);
  const easterMonday = addDays(easterSunday, 1);
  const ascension = addDays(easterSunday, 39);
  const pentecostSunday = addDays(easterSunday, 49);
  const pentecostMonday = addDays(easterSunday, 50);

  // Fêtes mobiles civiles (2e dimanche de mai et 2e dimanche de juin)
  const mothersDay = getNthDayOfMonth(year, 4, 0, 2); // Mai = index 4, Dimanche = 0
  const fathersDay = getNthDayOfMonth(year, 5, 0, 2); // Juin = index 5, Dimanche = 0

  const holidays: BelgianHoliday[] = [
    // 1. Jours fériés officiels fixes
    {
      date: `${year}-01-01`,
      name: 'Nouvel An',
      type: 'official_holiday',
      description: 'Jour férié officiel',
    },
    {
      date: `${year}-05-01`,
      name: 'Fête du Travail',
      type: 'official_holiday',
      description: 'Jour férié officiel',
    },
    {
      date: `${year}-07-21`,
      name: 'Fête Nationale Belge',
      type: 'official_holiday',
      description: 'Jour férié officiel national',
    },
    {
      date: `${year}-08-15`,
      name: 'Assomption',
      type: 'official_holiday',
      description: 'Jour férié officiel',
    },
    {
      date: `${year}-11-01`,
      name: 'Toussaint',
      type: 'official_holiday',
      description: 'Jour férié officiel',
    },
    {
      date: `${year}-11-11`,
      name: 'Armistice 1918',
      type: 'official_holiday',
      description: 'Jour férié officiel national',
    },
    {
      date: `${year}-12-25`,
      name: 'Noël',
      type: 'official_holiday',
      description: 'Jour férié officiel',
    },

    // 2. Jours fériés officiels mobiles (Pâques, Ascension, Pentecôte)
    {
      date: formatDateString(easterSunday),
      name: 'Pâques',
      type: 'official_holiday',
      description: 'Dimanche de Pâques',
    },
    {
      date: formatDateString(easterMonday),
      name: 'Lundi de Pâques',
      type: 'official_holiday',
      description: 'Jour férié officiel',
    },
    {
      date: formatDateString(ascension),
      name: 'Ascension',
      type: 'official_holiday',
      description: 'Jour férié officiel (Jeudi)',
    },
    {
      date: formatDateString(pentecostSunday),
      name: 'Pentecôte',
      type: 'official_holiday',
      description: 'Dimanche de Pentecôte',
    },
    {
      date: formatDateString(pentecostMonday),
      name: 'Lundi de Pentecôte',
      type: 'official_holiday',
      description: 'Jour férié officiel',
    },

    // 3. Fêtes clés traditionnelles et régionales
    {
      date: formatDateString(mothersDay),
      name: 'Fête des Mères',
      type: 'special_day',
      description: 'Célébration (2e dimanche de mai)',
    },
    {
      date: formatDateString(fathersDay),
      name: 'Fête des Pères',
      type: 'special_day',
      description: 'Célébration (2e dimanche de juin)',
    },
    {
      date: `${year}-09-27`,
      name: 'Fête Fédération Wallonie-Bruxelles',
      type: 'special_day',
      description: 'Fête de la Communauté française',
    },
    {
      date: `${year}-12-06`,
      name: 'Saint-Nicolas',
      type: 'special_day',
      description: 'Fête des enfants et traditions',
    },
  ];

  return holidays.sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * Récupère les jours fériés et fêtes pour un mois spécifique
 */
export function getBelgianHolidaysForMonth(year: number, month: number): BelgianHoliday[] {
  const allHolidays = getBelgianHolidays(year);
  const monthPrefix = `${year}-${String(month).padStart(2, '0')}`;
  return allHolidays.filter((h) => h.date.startsWith(monthPrefix));
}
