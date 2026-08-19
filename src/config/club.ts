/**
 * Source Unique de Vérité (Single Source of Truth)
 * Constantes et Métadonnées Officielles du Seraing Buggy Club ASBL
 */

export const CLUB_CONFIG = {
  name: 'Seraing Buggy Club ASBL',
  shortName: 'Seraing Buggy Club',
  sigle: 'SBC ASBL',
  legalForm: 'Association Sans But Lucratif (ASBL)',
  foundationYear: 2022,
  bce: 'BE 0786.735.722',
  bceRaw: '0786735722',
  rpm: 'RPM Liège',
  address: {
    street: 'Rue Bigaye 60',
    zipCode: '4101',
    city: 'Seraing',
    country: 'Belgique',
    full: 'Rue Bigaye 60, 4101 Seraing, Belgique',
  },
  contact: {
    phone: '+32 476 36 64 73',
    phoneRaw: '+32476366473',
    email: 'seraingbuggyclub@gmail.com',
  },
  affiliation: {
    name: "Fédération Belge d'Automodélisme (FBA)",
    shortName: 'FBA',
  },
  appVersion: 'SBC v2.5',
} as const;

export type ClubConfig = typeof CLUB_CONFIG;
