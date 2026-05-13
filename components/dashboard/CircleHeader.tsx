import type { UploadSnapshot } from '@/lib/supabase/types';
import type { CircleStats } from '@/lib/queries/getCircleStats';
import { formatPct, formatCount } from '@/lib/utils/format';

interface Props {
  snapshot: UploadSnapshot;
  stats: CircleStats;
}

export function CircleHeader({ snapshot, stats }: Props) {
  const pct = stats.digital_pct_cnt;

  return (
    <div className="bg-white border-b border-[var(--border)] px-6 py-5">
      <div className="max-w-[1400px] mx-auto">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-1.5 h-14 rounded-full bg-[var(--indiapost)]" />
            <div>
              <p className="text-xs font-medium text-[var(--fg-muted)] uppercase tracking-widest">
                Andhra Pradesh Postal Circle · Digital Transactions
              </p>
              <h1 className="text-3xl font-bold text-[var(--fg)] leading-tight mt-0.5">
                {formatPct(pct)}
                <span className="text-base font-normal text-[var(--fg-muted)] ml-2">digital by count</span>
              </h1>
              <p className="text-xs text-[var(--fg-muted)] mt-1">
                {formatCount(stats.digital_cnt)} of {formatCount(stats.total_cnt)} transactions · {stats.office_count.toLocaleString('en-IN')} offices
              </p>
            </div>
          </div>
          <div className="text-right shrink-0">
            <p className="text-xs text-[var(--fg-muted)] uppercase tracking-wide">Report Period</p>
            <p className="text-sm font-semibold text-[var(--fg)]">{snapshot.period_start} – {snapshot.period_end}</p>
            <p className="text-xs text-[var(--fg-muted)] mt-0.5">Snapshot dated {snapshot.snapshot_date}</p>
          </div>
        </div>
        {/* Circle-level progress bar */}
        <div className="mt-4 h-2 bg-gray-100 rounded-full overflow-hidden" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label={`${formatPct(pct)} digital transactions`}>
          <div
            className="h-full rounded-full bg-[var(--accent)] transition-all"
            style={{ width: `${Math.min(pct, 100)}%` }}
          />
        </div>
        <div className="flex justify-between text-xs text-[var(--fg-muted)] mt-1">
          <span>0%</span>
          <span className="font-medium text-[var(--accent)]">{formatPct(pct)} digital</span>
          <span>100%</span>
        </div>
      </div>
    </div>
  );
}
