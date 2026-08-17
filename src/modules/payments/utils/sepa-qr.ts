export interface SepaQrParams {
  beneficiaryName: string;
  iban: string;
  amount: number;
  communication: string;
  bic?: string;
}

export const SBC_BANK_DETAILS = {
  beneficiaryName: 'Seraing Buggy Club',
  iban: 'BE66 0019 8022 0543',
  ibanRaw: 'BE66001980220543',
  bankName: 'Belfius Banque',
};

/**
 * Génère une charge utile standardisée EPC (European Payments Council) QR-Code
 * Reconnu par l'ensemble des applications bancaires européennes et belges (Belfius, BNP, KBC/CBC, ING, etc.)
 */
export function generateSepaQrPayload({
  beneficiaryName = SBC_BANK_DETAILS.beneficiaryName,
  iban = SBC_BANK_DETAILS.iban,
  amount,
  communication,
  bic = '',
}: SepaQrParams): string {
  const cleanIban = iban.replace(/\s+/g, '').toUpperCase();
  const formattedAmount = `EUR${Number(amount || 0).toFixed(2)}`;
  const cleanName = beneficiaryName.substring(0, 70);
  const cleanComm = communication.substring(0, 140);
  const cleanBic = bic.replace(/\s+/g, '').toUpperCase();

  // Spécification officielle EPC069-08 Quick Response Code Guidelines
  return [
    'BCD',
    '002',
    '1',
    'SCT',
    cleanBic,
    cleanName,
    cleanIban,
    formattedAmount,
    '',
    '',
    cleanComm,
    '',
  ].join('\n');
}
