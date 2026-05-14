// Per Directorate guidance (May 2026): analysis universe is restricted
// to Cash + 12 specific digital modes. All other modes are excluded
// from totals entirely.

export const MANUAL_MODES = [
  'Cash',
] as const;

export const DIGITAL_MODES = [
  'DQR Scan',
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

// EXCLUDED from analysis entirely (not counted in totals):
// Postage Stamp, Service Stamp, Franking Machine, On Postal Service,
// Contract, Franchise Wallet, Other
export const EXCLUDED_MODES = [
  'Postage Stamp',
  'Service Stamp',
  'Franking Machine',
  'On Postal Service',
  'Contract',
  'Franchise Wallet',
  'Other',
] as const;

export type ModeBucket = 'manual' | 'digital' | 'excluded';

export function bucketOf(modeName: string): ModeBucket {
  if ((MANUAL_MODES as readonly string[]).includes(modeName)) return 'manual';
  if ((DIGITAL_MODES as readonly string[]).includes(modeName)) return 'digital';
  return 'excluded';
}
