import type { CircleStats } from '@/lib/queries/getCircleStats';
import type { SnapshotDelta } from '@/lib/queries/getDelta';
import { formatCount, formatPct, formatDelta } from '@/lib/utils/format';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface Props {
  stats: CircleStats;
  delta: SnapshotDelta | null;
}

interface KpiCardProps {
  label: string;
  value: string;
  info?: string;
  delta?: string | null;
  deltaPositive?: boolean | null;
  highlight?: boolean;
}

function KpiCard({ label, value, info, delta, deltaPositive, highlight }: KpiCardProps) {
  return (
    <Card className={`p-4 flex flex-col gap-2 ${highlight ? 'border-[var(--accent)] ring-1 ring-[var(--accent)]/20' : ''}`}>
      <div className="flex items-center gap-1">
        <p className="text-xs font-medium text-[var(--fg-muted)] uppercase tracking-wide leading-tight">{label}</p>
        {info && (
          <Tooltip>
            <TooltipTrigger className="text-[var(--fg-muted)] cursor-default text-[10px] leading-none select-none">ⓘ</TooltipTrigger>
            <TooltipContent side="top" className="max-w-[220px] text-xs">{info}</TooltipContent>
          </Tooltip>
        )}
      </div>
      <p className="text-2xl font-bold font-mono tabular-nums text-[var(--fg)] leading-none">{value}</p>
      {delta !== undefined && delta !== null && (
        <span className={`text-xs font-medium ${deltaPositive === true ? 'text-[var(--positive)]' : deltaPositive === false ? 'text-[var(--danger)]' : 'text-[var(--fg-muted)]'}`}>
          {delta}
        </span>
      )}
    </Card>
  );
}

export function CircleKpiRowSkeleton() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
      {Array.from({ length: 5 }).map((_, i) => (
        <Card key={i} className="p-4 space-y-2">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-7 w-28" />
          <Skeleton className="h-3 w-14" />
        </Card>
      ))}
    </div>
  );
}

export function CircleKpiRow({ stats, delta }: Props) {
  const deltaTotalCntPct = delta?.delta_total_cnt_pct ?? null;
  const deltaDigitalPp = delta?.delta_digital_pct_cnt_pp ?? null;

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
      <KpiCard
        label="Total Transactions"
        value={formatCount(stats.total_cnt)}
        info="Total booking-counter transactions across all AP Circle offices in this MTD period (Cash + 12 digital modes only)."
        delta={deltaTotalCntPct != null ? formatDelta(deltaTotalCntPct) : null}
        deltaPositive={deltaTotalCntPct != null ? deltaTotalCntPct > 0 : null}
      />
      <KpiCard
        label="Cash Txns"
        value={formatCount(stats.manual_cnt)}
        info="Transactions paid in physical cash. These are the offices' conversion opportunity."
        delta={null}
      />
      <KpiCard
        label="Digital %"
        value={formatPct(stats.digital_pct_cnt)}
        info="Percentage of transactions processed through any of the 12 digital modes (UPI, card, IPPB, etc.)."
        delta={deltaDigitalPp != null ? formatDelta(deltaDigitalPp, 'pp') : null}
        deltaPositive={deltaDigitalPp != null ? deltaDigitalPp > 0 : null}
        highlight
      />
      <KpiCard
        label="Avg Txns / Division"
        value={formatCount(Math.round(stats.avg_txns_per_division))}
        info="Total transactions divided across 29 AP Circle territorial divisions."
        delta={null}
      />
      <KpiCard
        label="Total Headroom"
        value={formatCount(stats.digital_headroom)}
        info="Estimated additional digital transactions if every below-average office matched the circle's current digital %. Sum across all laggard offices."
        delta={null}
      />
    </div>
  );
}
