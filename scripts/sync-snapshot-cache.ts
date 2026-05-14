/**
 * One-time: resync upload_snapshots cached totals to match the filtered
 * live aggregation (offices_master-matched offices only — same universe
 * as the fixed getCircleStats). Run after deploying the v1.2-fix.
 *
 *   npx tsx scripts/sync-snapshot-cache.ts
 */
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

const envPath = path.resolve(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) dotenv.config({ path: envPath });
else dotenv.config();

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

const PAGE = 1000;

async function main() {
  const { data: snapshots, error } = await sb
    .from('upload_snapshots')
    .select('id, snapshot_date')
    .order('snapshot_date', { ascending: false });
  if (error) { console.error(error.message); process.exit(1); }

  for (const snap of (snapshots ?? []) as { id: string; snapshot_date: string }[]) {
    // Fetch all txns for this snapshot
    const txns: { office_id: number; total_cnt: number; total_amt: number; digital_cnt: number; digital_amt: number }[] = [];
    let page = 0;
    while (true) {
      const { data } = await sb
        .from('office_transactions')
        .select('office_id, total_cnt, total_amt, digital_cnt, digital_amt')
        .eq('snapshot_id', snap.id)
        .range(page * PAGE, (page + 1) * PAGE - 1);
      if (!data || data.length === 0) break;
      txns.push(...(data as typeof txns));
      if (data.length < PAGE) break;
      page++;
    }

    // Build masterSet for these office IDs
    const officeIds = txns.map((t) => t.office_id);
    const masterSet = new Set<number>();
    const BATCH = 500;
    for (let i = 0; i < officeIds.length; i += BATCH) {
      const { data } = await sb
        .from('offices_master')
        .select('office_id')
        .in('office_id', officeIds.slice(i, i + BATCH));
      for (const r of (data ?? []) as { office_id: number }[]) masterSet.add(r.office_id);
    }

    // Aggregate filtered rows only
    const filtered = txns.filter((t) => masterSet.has(t.office_id));
    const total_cnt   = filtered.reduce((s, t) => s + t.total_cnt, 0);
    const total_amt   = filtered.reduce((s, t) => s + Number(t.total_amt), 0);
    const digital_cnt = filtered.reduce((s, t) => s + t.digital_cnt, 0);
    const digital_amt = filtered.reduce((s, t) => s + Number(t.digital_amt), 0);
    const pct = total_cnt > 0 ? ((digital_cnt / total_cnt) * 100).toFixed(1) : '0';

    const { error: upErr } = await sb
      .from('upload_snapshots')
      .update({ total_cnt, total_amt, digital_cnt, digital_amt })
      .eq('id', snap.id);
    if (upErr) { console.error(`Update error ${snap.snapshot_date}:`, upErr.message); process.exit(1); }
    console.log(`${snap.snapshot_date}: total=${total_cnt.toLocaleString('en-IN')}  digital=${digital_cnt.toLocaleString('en-IN')}  pct=${pct}%  (matched ${masterSet.size}/${officeIds.length})`);
  }

  console.log('\nCache sync complete.');
}

main().catch((e) => { console.error(e); process.exit(1); });
