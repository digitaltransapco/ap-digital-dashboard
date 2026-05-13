import { createServiceClient } from '@/lib/supabase/server';

export type RankingView = 'push' | 'champions' | 'volume';

export interface TopOffice {
  office_id: number;
  office_name: string;
  division_name: string;
  office_type_code: string;
  total_cnt: number;
  total_amt: number;
  manual_cnt: number;
  digital_cnt: number;
  digital_pct_cnt: number | null;
  top_digital_mode?: string;
}

interface TxnRow {
  office_id: number;
  manual_cnt: number | null;
  digital_cnt: number | null;
  total_cnt: number | null;
  total_amt: number | null;
  digital_pct_cnt: number | null;
  modes: Record<string, { cnt: number; amt: number }> | null;
}

interface MasterRow {
  office_id: number;
  office_name: string;
  division_name: string;
  office_type_code: string;
}

const TYPE_CODE_MAP: Record<string, string> = { HO: 'HPO', SO: 'SPO', BO: 'BPO', BPC: 'BPC' };

export async function getTopOfficesForDivision(
  snapshotId: string,
  divisionName: string,
  officeTypeLabel: string,
  view: RankingView = 'push',
): Promise<TopOffice[]> {
  const supabase = createServiceClient();
  const typeCode = TYPE_CODE_MAP[officeTypeLabel] ?? officeTypeLabel;

  // 1. Get office IDs for this division + type from master
  const { data: masterRows } = await supabase
    .from('offices_master')
    .select('office_id, office_name, division_name, office_type_code')
    .eq('division_name', divisionName)
    .eq('office_type_code', typeCode);

  if (!masterRows || masterRows.length === 0) return [];
  const masterMap = new Map((masterRows as MasterRow[]).map((r) => [r.office_id, r]));
  const divOfficeIds = Array.from(masterMap.keys());

  // 2. Fetch transactions for those office IDs in this snapshot (batched)
  const txnMap = new Map<number, TxnRow>();
  const BATCH = 500;
  for (let i = 0; i < divOfficeIds.length; i += BATCH) {
    const { data } = await supabase
      .from('office_transactions')
      .select('office_id, manual_cnt, digital_cnt, total_cnt, total_amt, digital_pct_cnt, modes')
      .eq('snapshot_id', snapshotId)
      .in('office_id', divOfficeIds.slice(i, i + BATCH));
    for (const r of (data ?? []) as TxnRow[]) {
      txnMap.set(r.office_id, r);
    }
  }

  // 3. Build office list (only offices with transactions)
  const offices: TopOffice[] = Array.from(masterMap.entries()).flatMap(([officeId, master]) => {
    const txn = txnMap.get(officeId);
    if (!txn) return [];

    let topDigitalMode: string | undefined;
    if (txn.modes) {
      const best = Object.entries(txn.modes).filter(([, v]) => v.cnt > 0).sort((a, b) => b[1].cnt - a[1].cnt)[0];
      topDigitalMode = best?.[0];
    }

    return [{
      office_id: officeId,
      office_name: master.office_name,
      division_name: master.division_name,
      office_type_code: master.office_type_code,
      total_cnt: txn.total_cnt ?? 0,
      total_amt: Number(txn.total_amt ?? 0),
      manual_cnt: txn.manual_cnt ?? 0,
      digital_cnt: txn.digital_cnt ?? 0,
      digital_pct_cnt: txn.digital_pct_cnt ?? null,
      top_digital_mode: topDigitalMode,
    }];
  });

  // 4. Sort by view
  if (view === 'push') {
    return offices.sort((a, b) => b.manual_cnt - a.manual_cnt || b.total_cnt - a.total_cnt).slice(0, 5);
  }
  if (view === 'champions') {
    const avgVol = offices.reduce((s, o) => s + o.total_cnt, 0) / (offices.length || 1);
    return offices
      .filter((o) => o.total_cnt >= avgVol)
      .sort((a, b) => (b.digital_pct_cnt ?? 0) - (a.digital_pct_cnt ?? 0) || b.total_cnt - a.total_cnt)
      .slice(0, 5);
  }
  return offices.sort((a, b) => b.total_cnt - a.total_cnt).slice(0, 5);
}

export async function getTopOfficesCircle(
  snapshotId: string,
  officeTypeLabel: string,
): Promise<TopOffice[]> {
  const supabase = createServiceClient();
  const typeCode = TYPE_CODE_MAP[officeTypeLabel] ?? officeTypeLabel;

  // 1. Get top office IDs by total_cnt for this snapshot
  const { data: topTxns } = await supabase
    .from('office_transactions')
    .select('office_id, digital_cnt, digital_pct_cnt, total_cnt, total_amt, manual_cnt')
    .eq('snapshot_id', snapshotId)
    .order('total_cnt', { ascending: false })
    .limit(500); // fetch top 500 then filter by type

  if (!topTxns || topTxns.length === 0) return [];

  const txnList = topTxns as TxnRow[];
  const officeIds = txnList.map((r) => r.office_id);

  // 2. Look up master for those IDs, filter by type
  const masterMap = new Map<number, MasterRow>();
  const BATCH = 500;
  for (let i = 0; i < officeIds.length; i += BATCH) {
    const { data } = await supabase
      .from('offices_master')
      .select('office_id, office_name, division_name, office_type_code')
      .in('office_id', officeIds.slice(i, i + BATCH))
      .eq('office_type_code', typeCode);
    for (const r of (data ?? []) as MasterRow[]) {
      masterMap.set(r.office_id, r);
    }
  }

  // 3. Build result — only offices in master with correct type
  return txnList
    .filter((t) => masterMap.has(t.office_id))
    .slice(0, 5)
    .map((t) => {
      const m = masterMap.get(t.office_id)!;
      return {
        office_id: t.office_id,
        office_name: m.office_name,
        division_name: m.division_name,
        office_type_code: m.office_type_code,
        total_cnt: t.total_cnt ?? 0,
        total_amt: Number(t.total_amt ?? 0),
        manual_cnt: t.manual_cnt ?? 0,
        digital_cnt: t.digital_cnt ?? 0,
        digital_pct_cnt: t.digital_pct_cnt ?? null,
      };
    });
}
