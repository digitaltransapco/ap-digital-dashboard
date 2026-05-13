'use client';

import type { RankingView } from '@/lib/queries/getTopOffices';

interface Props {
  value: RankingView;
  onChange: (v: RankingView) => void;
}

const OPTIONS: { value: RankingView; label: string; title: string }[] = [
  { value: 'push', label: 'Push Targets', title: 'High manual count — convert these first' },
  { value: 'champions', label: 'Champions', title: 'High volume + high digital %' },
  { value: 'volume', label: 'Volume Leaders', title: 'Simply who\'s busiest' },
];

export function RankingToggle({ value, onChange }: Props) {
  return (
    <div className="flex gap-1 bg-gray-100 rounded-lg p-0.5" role="group" aria-label="Ranking view">
      {OPTIONS.map((opt) => (
        <button
          key={opt.value}
          title={opt.title}
          onClick={() => onChange(opt.value)}
          className={`flex-1 text-xs px-2 py-1.5 rounded-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]
            ${value === opt.value
              ? 'bg-white text-[var(--accent)] shadow-sm'
              : 'text-gray-500 hover:text-gray-700'}`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
