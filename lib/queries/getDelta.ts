import { createServiceClient } from '@/lib/supabase/server';
import type { UploadSnapshot } from '@/lib/supabase/types';
import type { CircleStats } from '@/lib/queries/getCircleStats';

export interface SnapshotDelta {
  delta_total_cnt: number | null;
  delta_total_cnt_pct: number | null;
  delta_digital_cnt: number | null;
  delta_digital_pct_cnt_pp: number | null;
  prev_snapshot: UploadSnapshot | null;
}

export async function getDelta(
  currentSnapshot: UploadSnapshot,
  liveStats: CircleStats,
): Promise<SnapshotDelta> {
  const supabase = createServiceClient();

  const { data: prev } = await supabase
    .from('upload_snapshots')
    .select('*')
    .lt('snapshot_date', currentSnapshot.snapshot_date)
    .order('snapshot_date', { ascending: false })
    .limit(1)
    .single();

  const prevSnap = prev ? (prev as UploadSnapshot) : null;

  if (!prevSnap || !prevSnap.total_cnt) {
    return { delta_total_cnt: null, delta_total_cnt_pct: null, delta_digital_cnt: null, delta_digital_pct_cnt_pp: null, prev_snapshot: prevSnap };
  }

  // Use live stats for current to avoid stale upload_snapshots cache
  const currTotal = liveStats.total_cnt;
  const currDigital = liveStats.digital_cnt;

  const delta_total_cnt = currTotal - prevSnap.total_cnt;
  const delta_total_cnt_pct = (delta_total_cnt / prevSnap.total_cnt) * 100;

  const currDigitalPct = currTotal > 0 ? (currDigital / currTotal) * 100 : 0;
  const prevDigitalPct = prevSnap.total_cnt > 0 ? ((prevSnap.digital_cnt ?? 0) / prevSnap.total_cnt) * 100 : 0;

  return {
    delta_total_cnt,
    delta_total_cnt_pct,
    delta_digital_cnt: currDigital - (prevSnap.digital_cnt ?? 0),
    delta_digital_pct_cnt_pp: currDigitalPct - prevDigitalPct,
    prev_snapshot: prevSnap,
  };
}
