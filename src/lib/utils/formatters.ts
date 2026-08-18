/**
 * Utilitaires de formatage universels (Clean Code & DRY) — SBC App
 */

/**
 * Formate un montant numérique en devise Euro (€)
 * @example formatCurrency(20.5) => "20,50 €" (ou "20.50 €")
 */
export function formatCurrency(amount: number | null | undefined): string {
  const value = Number(amount || 0);
  return `${value.toFixed(2)} €`;
}

/**
 * Formate une date en chaîne lisible (Français par défaut)
 * @example formatDate("2026-08-18") => "18/08/2026"
 */
export function formatDate(
  date: string | Date | null | undefined,
  options: Intl.DateTimeFormatOptions = {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }
): string {
  if (!date) return '-';
  try {
    const d = typeof date === 'string' ? new Date(date) : date;
    if (isNaN(d.getTime())) return '-';
    return d.toLocaleDateString('fr-FR', options);
  } catch {
    return '-';
  }
}

/**
 * Formate une date avec heure complète
 * @example formatDateTime("2026-08-18T14:30:00Z") => "18/08/2026 à 16:30"
 */
export function formatDateTime(date: string | Date | null | undefined): string {
  if (!date) return '-';
  try {
    const d = typeof date === 'string' ? new Date(date) : date;
    if (isNaN(d.getTime())) return '-';
    return d.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '-';
  }
}
