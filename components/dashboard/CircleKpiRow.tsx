import type { CircleStats } from '@/lib/queries/getCircleStats';
import type { SnapshotDelta } from '@/lib/queries/getDelta';
import { formatCount, formatINR, formatPct, formatDelta } from '@/lib/utils/format';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

interface Props {
  stats: CircleStats;
  delta: SnapshotDelta | null;
}

interface KpiCardProps {
  label: string;
  value: string;
  delta?: string | null;
  deltaPositive?: boolean | null;
  highlight?: boolean;
}

function KpiCard({ label, value, delta, deltaPositive, highlight }: KpiCardProps) {
  return (
    <Card className={`p-4 flex flex-col gap-2 ${highlight ? 'border-[var(--accent)] ring-1 ring-[var(--accent)]/20' : ''}`}>
      <p className="text-xs font-medium text-[var(--fg-muted)] uppercase tracking-wide leading-tight">{label}</p>
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
    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
      {Array.from({ length: 7 }).map((_, i) => (
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

  const totalAmtDelta = delta?.prev_snapshot?.total_amt && stats.total_amt
    ? ((stats.total_amt - Number(delta.prev_snapshot.total_amt)) / Number(delta.prev_snapshot.total_amt)) * 100
    : null;

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
      <KpiCard
        label="Total Transactions"
        value={formatCount(stats.total_cnt)}
        delta={deltaTotalCntPct != null ? formatDelta(deltaTotalCntPct) : null}
        deltaPositive={deltaTotalCntPct != null ? deltaTotalCntPct > 0 : null}
      />
      <KpiCard
        label="Total Amount"
        value={formatINR(stats.total_amt)}
        delta={totalAmtDelta != null ? formatDelta(totalAmtDelta) : null}
        deltaPositive={totalAmtDelta != null ? totalAmtDelta > 0 : null}
      />
      <KpiCard
        label="Digital % (Count)"
        value={formatPct(stats.digital_pct_cnt)}
        delta={deltaDigitalPp != null ? formatDelta(deltaDigitalPp, 'pp') : null}
        deltaPositive={deltaDigitalPp != null ? deltaDigitalPp > 0 : null}
        highlight
      />
      <KpiCard
        label="Digital % (Amount)"
        value={formatPct(stats.digital_pct_amt)}
        delta={null}
      />
      <KpiCard
        label="Avg Ticket Size"
        value={formatINR(stats.avg_ticket_size)}
        delta={null}
      />
      <KpiCard
        label="Avg Txns / Division"
        value={formatCount(Math.round(stats.avg_txns_per_division))}
        delta={null}
      />
      <KpiCard
        label="Digital Headroom"
        value={formatCount(stats.digital_headroom)}
        delta={null}
      />
    </div>
  );
}
