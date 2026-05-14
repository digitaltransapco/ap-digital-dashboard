import { createServiceClient } from '@/lib/supabase/server';

export interface CircleStats {
  total_cnt: number;
  total_amt: number;
  digital_cnt: number;
  digital_amt: number;
  manual_cnt: number;
  manual_amt: number;
  digital_pct_cnt: number;
  digital_pct_amt: number;
  avg_txns_per_division: number;
  digital_headroom: number;
  office_count: number;
}

interface OfficeRow {
  office_id: number;
  total_cnt: number | null;
  total_amt: number | null;
  digital_cnt: number | null;
  digital_amt: number | null;
  manual_cnt: number | null;
  manual_amt: number | null;
  digital_pct_cnt: number | null;
}

export async function getCircleStats(snapshotId: string): Promise<CircleStats | null> {
  const supabase = createServiceClient();

  // 1. Fetch all transaction rows for this snapshot
  const allRows: OfficeRow[] = [];
  let page = 0;
  const PAGE_SIZE = 1000;
  while (true) {
    const { data, error } = await supabase
      .from('office_transactions')
      .select('office_id, total_cnt, total_amt, digital_cnt, digital_amt, manual_cnt, manual_amt, digital_pct_cnt')
      .eq('snapshot_id', snapshotId)
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

    if (error || !data || data.length === 0) break;
    allRows.push(...(data as OfficeRow[]));
    if (data.length < PAGE_SIZE) break;
    page++;
  }

  if (allRows.length === 0) return null;

  // 2. Build the set of office IDs that exist in offices_master (excludes orphans)
  const officeIds = allRows.map((r) => r.office_id);
  const masterSet = new Set<number>();
  const BATCH = 500;
  for (let i = 0; i < officeIds.length; i += BATCH) {
    const { data } = await supabase
      .from('offices_master')
      .select('office_id')
      .in('office_id', officeIds.slice(i, i + BATCH));
    for (const r of (data ?? []) as { office_id: number }[]) {
      masterSet.add(r.office_id);
    }
  }

  // 3. Aggregate only matched offices — same universe as division cards
  const rows = allRows.filter((r) => masterSet.has(r.office_id));

  if (rows.length === 0) return null;

  const total_cnt = rows.reduce((s, r) => s + (r.total_cnt ?? 0), 0);
  const total_amt = rows.reduce((s, r) => s + Number(r.total_amt ?? 0), 0);
  const digital_cnt = rows.reduce((s, r) => s + (r.digital_cnt ?? 0), 0);
  const digital_amt = rows.reduce((s, r) => s + Number(r.digital_amt ?? 0), 0);
  const manual_cnt = rows.reduce((s, r) => s + (r.manual_cnt ?? 0), 0);
  const manual_amt = rows.reduce((s, r) => s + Number(r.manual_amt ?? 0), 0);

  const digital_pct_cnt = total_cnt > 0 ? (digital_cnt / total_cnt) * 100 : 0;
  const digital_pct_amt = total_amt > 0 ? (digital_amt / total_amt) * 100 : 0;

  const digital_headroom = rows.reduce((s, r) => {
    const pct = r.digital_pct_cnt ?? 0;
    return pct < digital_pct_cnt ? s + (r.total_cnt ?? 0) * (digital_pct_cnt - pct) / 100 : s;
  }, 0);

  return {
    total_cnt, total_amt, digital_cnt, digital_amt, manual_cnt, manual_amt,
    digital_pct_cnt, digital_pct_amt,
    avg_txns_per_division: total_cnt / 29,
    digital_headroom: Math.round(digital_headroom),
    office_count: rows.length,
  };
}
