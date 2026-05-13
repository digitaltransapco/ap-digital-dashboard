export type ColorBand = {
  bg: string;
  text: string;
  bar: string;
  label: string;
};

export function digitalPctColor(pct: number | null): ColorBand {
  if (pct === null) return { bg: 'bg-gray-100', text: 'text-gray-500', bar: 'bg-gray-400', label: 'N/A' };
  if (pct < 30) return { bg: 'bg-rose-100', text: 'text-rose-700', bar: 'bg-rose-400', label: 'Low' };
  if (pct < 50) return { bg: 'bg-amber-100', text: 'text-amber-800', bar: 'bg-amber-400', label: 'Moderate' };
  if (pct < 70) return { bg: 'bg-emerald-100', text: 'text-emerald-700', bar: 'bg-emerald-400', label: 'Good' };
  return { bg: 'bg-indigo-100', text: 'text-indigo-700', bar: 'bg-indigo-400', label: 'High' };
}
