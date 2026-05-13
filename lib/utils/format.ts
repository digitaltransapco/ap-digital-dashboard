const inrFmt = new Intl.NumberFormat('en-IN', {
  style: 'currency', currency: 'INR', maximumFractionDigits: 0,
});
const cntFmt = new Intl.NumberFormat('en-IN');

export const formatINR = (n: number) => inrFmt.format(n);
export const formatCount = (n: number) => cntFmt.format(n);

/** Compact Indian-style: ₹3.16 Cr / ₹45.2 L / ₹1,234 */
export const formatINRCr = (n: number): string => {
  if (n >= 1_00_00_000) return `₹${(n / 1_00_00_000).toFixed(2)} Cr`;
  if (n >= 1_00_000) return `₹${(n / 1_00_000).toFixed(1)} L`;
  return inrFmt.format(n);
};
export const formatPct = (n: number, digits = 1) => `${n.toFixed(digits)}%`;
export const formatDelta = (n: number, unit: 'pp' | '%' = '%') => {
  const sign = n > 0 ? '↑' : n < 0 ? '↓' : '–';
  return `${sign} ${Math.abs(n).toFixed(1)}${unit === 'pp' ? ' pp' : '%'}`;
};
