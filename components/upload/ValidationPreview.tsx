'use client';

import { CheckCircle2, AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react';
import { useState } from 'react';
import { formatCount } from '@/lib/utils/format';

interface Props {
  rowCount: number;
  matchedOffices: number;
  orphanOffices: number;
  orphanNames: string[];
  summaryMatch: boolean;
  summaryDiff: number;
  snapshotExists: boolean;
}

export function ValidationPreview({
  rowCount, matchedOffices, orphanOffices, orphanNames,
  summaryMatch, summaryDiff, snapshotExists,
}: Props) {
  const [showOrphans, setShowOrphans] = useState(false);

  return (
    <div className="space-y-3">
      <h3 className="font-semibold text-gray-800">Validation</h3>

      {/* Hierarchy match */}
      <div className="flex items-start gap-3 p-3 rounded-lg border bg-white">
        {orphanOffices === 0
          ? <CheckCircle2 className="w-5 h-5 text-emerald-600 mt-0.5 shrink-0" />
          : <AlertTriangle className="w-5 h-5 text-amber-500 mt-0.5 shrink-0" />}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-800">
            {orphanOffices === 0
              ? `All ${formatCount(rowCount)} offices matched to hierarchy`
              : `${formatCount(matchedOffices)} matched · ${formatCount(orphanOffices)} not in hierarchy`}
          </p>
          {orphanOffices > 0 && (
            <button
              className="text-xs text-indigo-600 mt-1 flex items-center gap-1"
              onClick={() => setShowOrphans(!showOrphans)}
            >
              {showOrphans ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              {showOrphans ? 'Hide' : 'Show'} unmatched offices
            </button>
          )}
          {showOrphans && orphanNames.length > 0 && (
            <div className="mt-2 text-xs text-gray-600 max-h-32 overflow-y-auto bg-gray-50 rounded p-2">
              {orphanNames.slice(0, 50).map((n, i) => <div key={i}>{n}</div>)}
              {orphanNames.length > 50 && <div>… and {orphanNames.length - 50} more</div>}
            </div>
          )}
        </div>
      </div>

      {/* Summary checksum */}
      <div className="flex items-center gap-3 p-3 rounded-lg border bg-white">
        {summaryMatch
          ? <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          : <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0" />}
        <p className="text-sm font-medium text-gray-800">
          {summaryMatch
            ? 'Office rows sum matches CSV summary row'
            : `Mismatch of ${formatCount(Math.abs(summaryDiff))} transactions vs summary row`}
        </p>
      </div>

      {/* Duplicate date warning */}
      {snapshotExists && (
        <div className="flex items-center gap-3 p-3 rounded-lg border border-amber-200 bg-amber-50">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
          <p className="text-sm font-medium text-amber-800">
            A snapshot for this date already exists — uploading will overwrite it.
          </p>
        </div>
      )}
    </div>
  );
}
