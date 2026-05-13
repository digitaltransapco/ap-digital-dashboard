// IMPORTANT: these buckets match what is shown to Directorate. Do not change without sign-off.
export const MANUAL_MODES = [
  'Cash',
  'On Postal Service',
  'Postage Stamp',
  'Service Stamp',
  'Franking Machine',
  'Contract',
] as const;

export const DIGITAL_MODES = [
  'DQR Scan',
  'Franchise Wallet',
  'SBIPOS-CARD',
  'SBIPOS BHARATQR',
  'SBIEPAY BHARATQR',
  'SBIEPAY UPI',
  'SBIEPAY Credit Card',
  'SBIEPAY Debit Card',
  'SBIEPAY NEFT',
  'RTGS',
  'Wallet',
  'POSB',
  'IPPB',
] as const;

export const OTHER_MODES = ['Other'] as const;

export type ManualMode = typeof MANUAL_MODES[number];
export type DigitalMode = typeof DIGITAL_MODES[number];
export type OtherMode = typeof OTHER_MODES[number];
export type ModeType = 'manual' | 'digital' | 'other';

const MANUAL_SET = new Set<string>(MANUAL_MODES);
const DIGITAL_SET = new Set<string>(DIGITAL_MODES);

export function bucketOf(modeName: string): ModeType {
  if (MANUAL_SET.has(modeName)) return 'manual';
  if (DIGITAL_SET.has(modeName)) return 'digital';
  return 'other';
}

export const ALL_MODES = [...MANUAL_MODES, ...DIGITAL_MODES, ...OTHER_MODES];
