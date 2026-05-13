import { createServiceClient } from '@/lib/supabase/server';
import type { UploadSnapshot } from '@/lib/supabase/types';

export interface SnapshotDelta {
  delta_total_cnt: number | null;
  delta_total_cnt_pct: number | null;
  delta_digital_cnt: number | null;
  delta_digital_pct_cnt_pp: number | null;
  prev_snapshot: UploadSnapshot | null;
}

export async function getDelta(current: UploadSnapshot): Promise<SnapshotDelta> {
  const supabase = createServiceClient();

  const { data: prev } = await supabase
    .from('upload_snapshots')
    .select('*')
    .lt('snapshot_date', current.snapshot_date)
    .order('snapshot_date', { ascending: false })
    .limit(1)
    .single();

  const prevSnap = prev ? (prev as UploadSnapshot) : null;

  if (!prevSnap || !current.total_cnt || !prevSnap.total_cnt) {
    return { delta_total_cnt: null, delta_total_cnt_pct: null, delta_digital_cnt: null, delta_digital_pct_cnt_pp: null, prev_snapshot: prevSnap };
  }

  const delta_total_cnt = current.total_cnt - prevSnap.total_cnt;
  const delta_total_cnt_pct = (delta_total_cnt / prevSnap.total_cnt) * 100;

  const currDigitalPct = current.total_cnt > 0 ? ((current.digital_cnt ?? 0) / current.total_cnt) * 100 : 0;
  const prevDigitalPct = prevSnap.total_cnt > 0 ? ((prevSnap.digital_cnt ?? 0) / prevSnap.total_cnt) * 100 : 0;

  return {
    delta_total_cnt,
    delta_total_cnt_pct,
    delta_digital_cnt: (current.digital_cnt ?? 0) - (prevSnap.digital_cnt ?? 0),
    delta_digital_pct_cnt_pp: currDigitalPct - prevDigitalPct,
    prev_snapshot: prevSnap,
  };
}
