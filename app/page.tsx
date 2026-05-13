import { Suspense } from 'react';
import { getLatestSnapshot } from '@/lib/queries/getLatestSnapshot';
import { getCircleStats } from '@/lib/queries/getCircleStats';
import { getDivisionStats } from '@/lib/queries/getDivisionStats';
import { getDelta } from '@/lib/queries/getDelta';
import { CircleHeader } from '@/components/dashboard/CircleHeader';
import { CircleKpiRow, CircleKpiRowSkeleton } from '@/components/dashboard/CircleKpiRow';
import { CircleLeaderboard } from '@/components/dashboard/CircleLeaderboard';
import { BICalloutStrip } from '@/components/dashboard/BICalloutStrip';
import { DivisionGrid } from '@/components/dashboard/DivisionGrid';
import { Skeleton } from '@/components/ui/skeleton';
import { generateInsights } from '@/lib/insights/generate';
import type { OfficeInsightData, DivisionInsightData } from '@/lib/insights/generate';
import { createServiceClient } from '@/lib/supabase/server';
import Link from 'next/link';
import { Upload } from 'lucide-react';

export const dynamic = 'force-dynamic';

interface OfficeQueryRow {
  office_id: number;
  total_cnt: number | null;
  digital_pct_cnt: number | null;
  manual_cnt: number | null;
  digital_cnt: number | null;
  modes: Record<string, { cnt: number; amt: number }> | null;
}

async function getOfficeInsightData(snapshotId: string): Promise<OfficeInsightData[]> {
  const supabase = createServiceClient();
  const PAGE_SIZE = 1000;

  // 1. Fetch all transactions paginated
  const allTxns: OfficeQueryRow[] = [];
  let page = 0;
  while (true) {
    const { data } = await supabase
      .from('office_transactions')
      .select('office_id, total_cnt, digital_pct_cnt, manual_cnt, digital_cnt, modes')
      .eq('snapshot_id', snapshotId)
      .gt('total_cnt', 0)
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);
    if (!data || data.length === 0) break;
    allTxns.push(...(data as unknown as OfficeQueryRow[]));
    if (data.length < PAGE_SIZE) break;
    page++;
  }

  // 2. Fetch office names from master (batched)
  const officeIds = allTxns.map((r) => r.office_id);
  const masterMap = new Map<number, { office_name: string; division_name: string }>();
  const BATCH = 500;
  for (let i = 0; i < officeIds.length; i += BATCH) {
    const { data } = await supabase
      .from('offices_master')
      .select('office_id, office_name, division_name')
      .in('office_id', officeIds.slice(i, i + BATCH));
    for (const r of (data ?? []) as { office_id: number; office_name: string; division_name: string }[]) {
      masterMap.set(r.office_id, { office_name: r.office_name, division_name: r.division_name });
    }
  }

  return allTxns.map((row) => {
    const master = masterMap.get(row.office_id);
    const topDigitalMode = row.modes
      ? Object.entries(row.modes).filter(([, v]) => v.cnt > 0).sort((a, b) => b[1].cnt - a[1].cnt)[0]?.[0]
      : undefined;
    return {
      office_id: row.office_id,
      office_name: master?.office_name ?? `Office ${row.office_id}`,
      division_name: master?.division_name ?? '',
      total_cnt: row.total_cnt ?? 0,
      digital_pct_cnt: row.digital_pct_cnt ?? null,
      manual_cnt: row.manual_cnt ?? 0,
      top_digital_mode: topDigitalMode,
    };
  });
}

export default async function DashboardPage() {
  const snapshot = await getLatestSnapshot();

  if (!snapshot) {
    return (
      <div className="min-h-screen bg-[var(--bg)] flex flex-col items-center justify-center gap-6 px-4">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Upload className="w-8 h-8 text-indigo-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">No Data Yet</h1>
          <p className="text-gray-500 mb-6">Upload the first Booking Paymentwise CSV to see the dashboard.</p>
          <Link
            href="/upload"
            className="inline-flex items-center gap-2 bg-indigo-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-indigo-700 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
          >
            <Upload className="w-4 h-4" />
            Upload First Report
          </Link>
        </div>
      </div>
    );
  }

  const [circleStats, divisionStats, delta] = await Promise.all([
    getCircleStats(snapshot.id),
    getDivisionStats(snapshot.id),
    getDelta(snapshot),
  ]);

  if (!circleStats) {
    return (
      <div className="min-h-screen bg-[var(--bg)] flex items-center justify-center">
        <p className="text-gray-500">Failed to load circle statistics.</p>
      </div>
    );
  }

  const officeData = await getOfficeInsightData(snapshot.id);
  const divisionInsightData: DivisionInsightData[] = divisionStats.map((d) => ({
    division_name: d.division_name,
    digital_pct_cnt: d.digital_pct_cnt,
    // top_digital_mode not available at division level without extra query — intentionally omitted
  }));
  const callouts = generateInsights(circleStats, officeData, divisionInsightData);

  return (
    <div className="min-h-screen bg-[var(--bg)]">
      <CircleHeader snapshot={snapshot} stats={circleStats} />

      <div className="max-w-[1400px] mx-auto px-4 py-6 space-y-8">
        <div className="flex justify-end">
          <Link
            href="/upload"
            className="inline-flex items-center gap-1.5 text-xs text-[var(--fg-muted)] hover:text-[var(--accent)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] rounded"
          >
            <Upload className="w-3.5 h-3.5" />
            Upload new report
          </Link>
        </div>

        <Suspense fallback={<CircleKpiRowSkeleton />}>
          <CircleKpiRow stats={circleStats} delta={delta} />
        </Suspense>

        <Suspense fallback={<Skeleton className="h-64 w-full rounded-xl" />}>
          <CircleLeaderboard snapshotId={snapshot.id} />
        </Suspense>

        <BICalloutStrip callouts={callouts} />

        <div>
          <div className="flex items-baseline justify-between mb-4">
            <h2 className="text-lg font-bold text-[var(--fg)]">Division Breakdown</h2>
            <span className="text-xs text-[var(--fg-muted)]">{divisionStats.length} divisions · top 5 offices per view</span>
          </div>
          <Suspense fallback={
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="h-80 rounded-xl" />
              ))}
            </div>
          }>
            <DivisionGrid divisionStats={divisionStats} snapshotId={snapshot.id} />
          </Suspense>
        </div>

        <footer className="text-center text-xs text-[var(--fg-muted)] py-6 border-t border-[var(--border)]">
          Last updated {snapshot.snapshot_date} · Compiled by O/o the CPMG, Andhra Pradesh Circle, Vijayawada
        </footer>
      </div>
    </div>
  );
}
