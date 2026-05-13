const inrFmt = new Intl.NumberFormat('en-IN', {
  style: 'currency', currency: 'INR', maximumFractionDigits: 0,
});
const cntFmt = new Intl.NumberFormat('en-IN');

export const formatINR = (n: number) => inrFmt.format(n);
export const formatCount = (n: number) => cntFmt.format(n);
export const formatPct = (n: number, digits = 1) => `${n.toFixed(digits)}%`;
export const formatDelta = (n: number, unit: 'pp' | '%' = '%') => {
  const sign = n > 0 ? '↑' : n < 0 ? '↓' : '–';
  return `${sign} ${Math.abs(n).toFixed(1)}${unit === 'pp' ? ' pp' : '%'}`;
};
