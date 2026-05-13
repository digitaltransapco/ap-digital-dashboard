'use client';

import { formatCount, formatPct, formatDelta } from '@/lib/utils/format';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface Props {
  currentTotalCnt: number;
  currentDigitalPct: number;
  prevTotalCnt: number;
  prevDigitalPct: number;
  prevDate: string;
}

function DeltaChip({ value, unit }: { value: number; unit: 'pp' | '%' }) {
  if (Math.abs(value) < 0.01) return <span className="text-gray-500 text-xs flex items-center gap-1"><Minus className="w-3 h-3" /> –</span>;
  const positive = value > 0;
  return (
    <span className={`text-xs flex items-center gap-1 font-medium ${positive ? 'text-emerald-600' : 'text-rose-600'}`}>
      {positive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
      {formatDelta(value, unit)}
    </span>
  );
}

export function DeltaPreview({ currentTotalCnt, currentDigitalPct, prevTotalCnt, prevDigitalPct, prevDate }: Props) {
  const deltaCnt = currentTotalCnt - prevTotalCnt;
  const deltaCntPct = prevTotalCnt > 0 ? (deltaCnt / prevTotalCnt) * 100 : 0;
  const deltaDpPp = currentDigitalPct - prevDigitalPct;

  return (
    <div className="p-4 rounded-lg border bg-white">
      <h3 className="text-sm font-semibold text-gray-700 mb-3">Delta vs {prevDate}</h3>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <p className="text-xs text-gray-500">Total Transactions</p>
          <p className="text-lg font-bold font-mono tabular-nums">{formatCount(currentTotalCnt)}</p>
          <DeltaChip value={deltaCntPct} unit="%" />
        </div>
        <div>
          <p className="text-xs text-gray-500">Digital %</p>
          <p className="text-lg font-bold font-mono tabular-nums">{formatPct(currentDigitalPct)}</p>
          <DeltaChip value={deltaDpPp} unit="pp" />
        </div>
      </div>
    </div>
  );
}
