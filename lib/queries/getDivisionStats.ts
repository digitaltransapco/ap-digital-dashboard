import { createServiceClient } from '@/lib/supabase/server';
import { ALL_DIVISIONS } from '@/lib/utils/constants';

export interface DivisionStats {
  division_name: string;
  total_cnt: number;
  total_amt: number;
  digital_cnt: number;
  digital_amt: number;
  digital_pct_cnt: number;
  digital_pct_amt: number;
  office_count: number;
}

interface TxnRow {
  office_id: number;
  total_cnt: number | null;
  total_amt: number | null;
  digital_cnt: number | null;
  digital_amt: number | null;
}

interface MasterRow {
  office_id: number;
  division_name: string;
}

export async function getDivisionStats(snapshotId: string): Promise<DivisionStats[]> {
  const supabase = createServiceClient();
  const PAGE_SIZE = 1000;

  // 1. Fetch all transaction rows for this snapshot
  const allTxns: TxnRow[] = [];
  let page = 0;
  while (true) {
    const { data, error } = await supabase
      .from('office_transactions')
      .select('office_id, total_cnt, total_amt, digital_cnt, digital_amt')
      .eq('snapshot_id', snapshotId)
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);
    if (error || !data || data.length === 0) break;
    allTxns.push(...(data as TxnRow[]));
    if (data.length < PAGE_SIZE) break;
    page++;
  }

  // 2. Fetch offices_master for the relevant office IDs (batched)
  const officeIds = allTxns.map((r) => r.office_id);
  const masterMap = new Map<number, string>();
  const BATCH = 500;
  for (let i = 0; i < officeIds.length; i += BATCH) {
    const { data } = await supabase
      .from('offices_master')
      .select('office_id, division_name')
      .in('office_id', officeIds.slice(i, i + BATCH));
    for (const r of (data ?? []) as MasterRow[]) {
      masterMap.set(r.office_id, r.division_name);
    }
  }

  // 3. Aggregate in application code
  const divMap = new Map<string, { total_cnt: number; total_amt: number; digital_cnt: number; digital_amt: number; office_count: number }>();
  for (const div of ALL_DIVISIONS) {
    divMap.set(div, { total_cnt: 0, total_amt: 0, digital_cnt: 0, digital_amt: 0, office_count: 0 });
  }

  for (const row of allTxns) {
    const divName = masterMap.get(row.office_id);
    if (!divName || !divMap.has(divName)) continue;
    const d = divMap.get(divName)!;
    d.total_cnt += row.total_cnt ?? 0;
    d.total_amt += Number(row.total_amt ?? 0);
    d.digital_cnt += row.digital_cnt ?? 0;
    d.digital_amt += Number(row.digital_amt ?? 0);
    d.office_count += 1;
  }

  return Array.from(divMap.entries()).map(([division_name, d]) => ({
    division_name,
    ...d,
    digital_pct_cnt: d.total_cnt > 0 ? (d.digital_cnt / d.total_cnt) * 100 : 0,
    digital_pct_amt: d.total_amt > 0 ? (d.digital_amt / d.total_amt) * 100 : 0,
  }));
}
