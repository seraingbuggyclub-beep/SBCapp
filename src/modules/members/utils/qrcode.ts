import { PaymentStatus } from '@/types/models';

export interface QrThemeConfig {
  isPaid: boolean;
  fgColor: string;
  bgColor: string;
  badgeText: string;
  badgeClass: string;
  containerBorder: string;
  glowClass: string;
  statusLabel: string;
}

/**
 * Génère le payload sécurisé pour le QR code du membre
 */
export function getMemberQrPayload(memberId: string): string {
  if (!memberId) return 'sbc:member:unknown';
  return `sbc:member:${memberId}`;
}

/**
 * Décode et extrait l'ID membre depuis un texte scanné
 */
export function extractMemberIdFromQr(qrText: string): string | null {
  if (!qrText) return null;
  const trimmed = qrText.trim();
  if (trimmed.startsWith('sbc:member:')) {
    return trimmed.replace('sbc:member:', '').trim();
  }
  // Format UUID standard
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (uuidRegex.test(trimmed)) {
    return trimmed;
  }
  return null;
}

/**
 * Calcule les paramètres de thème et rendu du QR code selon l'état de la cotisation
 */
export function getMemberQrTheme(paymentStatus?: string | PaymentStatus | null): QrThemeConfig {
  const isPaid = paymentStatus === 'paid';

  if (isPaid) {
    return {
      isPaid: true,
      fgColor: '#FFFFFF',
      bgColor: '#0c0c0c',
      badgeText: 'Cotisation en ordre • Membre actif',
      badgeClass: 'bg-green-500/15 text-green-400 border-green-500/30',
      containerBorder: 'border-green-500/30 hover:border-green-500/50',
      glowClass: 'shadow-[0_0_15px_rgba(34,197,94,0.15)]',
      statusLabel: 'En ordre',
    };
  }

  const isExpired = paymentStatus === 'expired';

  return {
    isPaid: false,
    fgColor: '#EF4444',
    bgColor: '#180a0a',
    badgeText: isExpired ? 'Cotisation expirée • Renouvellement requis' : 'Cotisation non réglée • Accès restreint',
    badgeClass: 'bg-red-500/15 text-red-400 border-red-500/40 animate-pulse',
    containerBorder: 'border-red-500/40 hover:border-red-500/60',
    glowClass: 'shadow-[0_0_20px_rgba(239,68,68,0.25)]',
    statusLabel: isExpired ? 'Expiré' : 'En attente',
  };
}
