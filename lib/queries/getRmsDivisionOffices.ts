import { createServiceClient } from '@/lib/supabase/server';
import type { RankingView } from './getTopOffices';

export interface RmsOfficeRow {
  office_id: number;
  office_name: string;
  office_type_code: string;
  total_cnt: number;
  manual_cnt: number;
  digital_cnt: number;
  digital_pct_cnt: number | null;
}

export async function getRmsDivisionOffices(
  snapshotId: string,
  divisionName: string,
  rankingMode: RankingView,
  limit = 10,
): Promise<RmsOfficeRow[]> {
  const supabase = createServiceClient();

  // All offices in this RMS division — no type filter
  const { data: masterRows } = await supabase
    .from('offices_master')
    .select('office_id, office_name, office_type_code')
    .eq('division_name', divisionName);

  if (!masterRows || masterRows.length === 0) return [];

  const masterMap = new Map(
    (masterRows as { office_id: number; office_name: string; office_type_code: string }[]).map(
      (r) => [r.office_id, r],
    ),
  );
  const officeIds = Array.from(masterMap.keys());

  // Fetch transactions
  const txnMap = new Map<number, { total_cnt: number; manual_cnt: number; digital_cnt: number; digital_pct_cnt: number | null }>();
  const BATCH = 500;
  for (let i = 0; i < officeIds.length; i += BATCH) {
    const { data } = await supabase
      .from('office_transactions')
      .select('office_id, total_cnt, manual_cnt, digital_cnt, digital_pct_cnt')
      .eq('snapshot_id', snapshotId)
      .in('office_id', officeIds.slice(i, i + BATCH));
    for (const r of (data ?? []) as { office_id: number; total_cnt: number; manual_cnt: number; digital_cnt: number; digital_pct_cnt: number | null }[]) {
      txnMap.set(r.office_id, r);
    }
  }

  const offices: RmsOfficeRow[] = Array.from(masterMap.entries()).flatMap(([id, master]) => {
    const txn = txnMap.get(id);
    if (!txn || txn.total_cnt === 0) return [];
    return [{
      office_id: id,
      office_name: master.office_name,
      office_type_code: master.office_type_code,
      total_cnt: txn.total_cnt,
      manual_cnt: txn.manual_cnt,
      digital_cnt: txn.digital_cnt,
      digital_pct_cnt: txn.digital_pct_cnt,
    }];
  });

  if (rankingMode === 'push') {
    return offices.sort((a, b) => b.manual_cnt - a.manual_cnt || b.total_cnt - a.total_cnt).slice(0, limit);
  }
  if (rankingMode === 'champions') {
    return offices
      .filter((o) => o.total_cnt > 0 && (o.digital_pct_cnt ?? 0) > 0)
      .sort((a, b) => (b.digital_pct_cnt ?? 0) - (a.digital_pct_cnt ?? 0) || b.total_cnt - a.total_cnt)
      .slice(0, limit);
  }
  return offices.sort((a, b) => b.total_cnt - a.total_cnt).slice(0, limit);
}
