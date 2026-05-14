import { createServiceClient } from '@/lib/supabase/server';
import { TERRITORIAL_DIVISIONS } from '@/lib/utils/constants';

export interface ActionPlanOffice {
  rank: number;
  office_id: number;
  office_name: string;
  office_type_code: string;
  division_name: string;
  current_total: number;
  current_cash: number;
  current_digital: number;
  current_digital_pct: number;
  projected_lift: number;
  cumulative_lift: number;
  cumulative_circle_pct: number;
}

export interface ActionPlan {
  delta_pp_target: number;
  current_circle_pct: number;
  target_circle_pct: number;
  required_additional_digital: number;
  total_addressable_lift: number;
  offices: ActionPlanOffice[];
  goal_achievable: boolean;
}

const VALID_TYPE_CODES = new Set(['HPO', 'SPO', 'BPO', 'BPC']);
const DIVISION_SET = new Set<string>(TERRITORIAL_DIVISIONS);

export async function getActionPlan(
  snapshotId: string,
  deltaPp: number,
  targetOfficePct: number = 80,
): Promise<ActionPlan> {
  const supabase = createServiceClient();

  // 1. Fetch all transactions for this snapshot (paginated)
  const PAGE_SIZE = 1000;
  const allTxns: { office_id: number; total_cnt: number; digital_cnt: number; manual_cnt: number }[] = [];
  let page = 0;
  while (true) {
    const { data } = await supabase
      .from('office_transactions')
      .select('office_id, total_cnt, digital_cnt, manual_cnt')
      .eq('snapshot_id', snapshotId)
      .gt('total_cnt', 0)
      .order('id', { ascending: true })
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);
    if (!data || data.length === 0) break;
    allTxns.push(...(data as { office_id: number; total_cnt: number; digital_cnt: number; manual_cnt: number }[]));
    if (data.length < PAGE_SIZE) break;
    page++;
  }

  if (allTxns.length === 0) {
    return {
      delta_pp_target: deltaPp,
      current_circle_pct: 0,
      target_circle_pct: deltaPp,
      required_additional_digital: 0,
      total_addressable_lift: 0,
      offices: [],
      goal_achievable: false,
    };
  }

  // 2. Batch-fetch office master for all IDs; filter to 4 types + 29 divisions
  const officeIds = allTxns.map((r) => r.office_id);
  const masterMap = new Map<number, { office_name: string; office_type_code: string; division_name: string }>();
  const BATCH = 500;
  for (let i = 0; i < officeIds.length; i += BATCH) {
    const { data } = await supabase
      .from('offices_master')
      .select('office_id, office_name, office_type_code, division_name')
      .in('office_id', officeIds.slice(i, i + BATCH));
    for (const r of (data ?? []) as { office_id: number; office_name: string; office_type_code: string; division_name: string }[]) {
      if (VALID_TYPE_CODES.has(r.office_type_code) && DIVISION_SET.has(r.division_name)) {
        masterMap.set(r.office_id, r);
      }
    }
  }

  // 3. Circle baseline uses the full snapshot (same universe as the headline KPI).
  //    Candidates are still filtered to the addressable territorial offices.
  const circle_total   = allTxns.reduce((s, t) => s + t.total_cnt, 0);
  const circle_digital = allTxns.reduce((s, t) => s + t.digital_cnt, 0);
  const universe = allTxns.filter((t) => masterMap.has(t.office_id));
  const current_circle_pct = circle_total > 0 ? (circle_digital / circle_total) * 100 : 0;
  const target_circle_pct = current_circle_pct + deltaPp;
  const required_additional_digital = (deltaPp / 100) * circle_total;

  // 4. Compute lift potential per office; skip offices already at or above target
  const threshold = targetOfficePct / 100;
  const candidates = universe
    .map((t) => {
      const lift = Math.max(0, t.total_cnt * threshold - t.digital_cnt);
      return { txn: t, lift };
    })
    .filter((c) => c.lift > 0)
    .sort((a, b) => b.lift - a.lift);

  const total_addressable_lift = candidates.reduce((s, c) => s + c.lift, 0);

  // 5. Greedy accumulation — cap at 30 offices
  const MAX_OFFICES = 30;
  const selected: ActionPlanOffice[] = [];
  let cumulative_lift = 0;

  for (const { txn, lift } of candidates) {
    if (selected.length >= MAX_OFFICES) break;
    const master = masterMap.get(txn.office_id)!;
    cumulative_lift += lift;
    const cumulative_circle_pct = circle_total > 0
      ? ((circle_digital + cumulative_lift) / circle_total) * 100
      : 0;

    selected.push({
      rank: selected.length + 1,
      office_id: txn.office_id,
      office_name: master.office_name,
      office_type_code: master.office_type_code,
      division_name: master.division_name,
      current_total: txn.total_cnt,
      current_cash: txn.manual_cnt,
      current_digital: txn.digital_cnt,
      current_digital_pct: txn.total_cnt > 0 ? (txn.digital_cnt / txn.total_cnt) * 100 : 0,
      projected_lift: Math.round(lift),
      cumulative_lift: Math.round(cumulative_lift),
      cumulative_circle_pct,
    });

    if (cumulative_lift >= required_additional_digital) break;
  }

  const goal_achievable = cumulative_lift >= required_additional_digital;

  return {
    delta_pp_target: deltaPp,
    current_circle_pct,
    target_circle_pct,
    required_additional_digital: Math.round(required_additional_digital),
    total_addressable_lift: Math.round(total_addressable_lift),
    offices: selected,
    goal_achievable,
  };
}
