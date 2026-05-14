/**
 * One-time migration: recompute manual/digital/total buckets per v1.2 mode
 * reclassification. Run once after deploying v1.2 code.
 *
 *   npx tsx scripts/migrate-buckets.ts
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

const envPath = path.resolve(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) dotenv.config({ path: envPath });
else dotenv.config();

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

const MANUAL_MODES = new Set(['Cash']);
const DIGITAL_MODES = new Set([
  'DQR Scan', 'SBIPOS-CARD', 'SBIPOS BHARATQR', 'SBIEPAY BHARATQR',
  'SBIEPAY UPI', 'SBIEPAY Credit Card', 'SBIEPAY Debit Card',
  'SBIEPAY NEFT', 'RTGS', 'Wallet', 'POSB', 'IPPB',
]);

function recompute(modes: Record<string, { cnt: number; amt: number }> | null) {
  let manual_cnt = 0, manual_amt = 0, digital_cnt = 0, digital_amt = 0;
  for (const [mode, { cnt, amt }] of Object.entries(modes ?? {})) {
    if (MANUAL_MODES.has(mode))       { manual_cnt += cnt;  manual_amt += amt;  }
    else if (DIGITAL_MODES.has(mode)) { digital_cnt += cnt; digital_amt += amt; }
  }
  const total_cnt = manual_cnt + digital_cnt;
  const total_amt = manual_amt + digital_amt;
  return {
    manual_cnt, manual_amt, digital_cnt, digital_amt,
    other_cnt: 0, other_amt: 0,
    total_cnt, total_amt,
    digital_pct_cnt: total_cnt > 0 ? parseFloat(((digital_cnt / total_cnt) * 100).toFixed(2)) : null,
    digital_pct_amt: total_amt > 0 ? parseFloat(((digital_amt / total_amt) * 100).toFixed(2)) : null,
  };
}

async function main() {
  // ── Step 1: fetch all rows ────────────────────────────────────────────────
  console.log('Fetching office_transactions…');
  const PAGE = 1000;
  const rows: { id: string; office_id: number; snapshot_id: string; modes: Record<string, { cnt: number; amt: number }> | null }[] = [];
  let page = 0;
  while (true) {
    const { data, error } = await supabase
      .from('office_transactions')
      .select('id, office_id, snapshot_id, modes')
      .range(page * PAGE, (page + 1) * PAGE - 1);
    if (error) { console.error('Fetch error:', error.message); process.exit(1); }
    if (!data || data.length === 0) break;
    rows.push(...(data as typeof rows));
    process.stdout.write(`\r  fetched ${rows.length} rows…`);
    if (data.length < PAGE) break;
    page++;
  }
  console.log(`\n  total: ${rows.length} rows`);

  // ── Step 2: batch-upsert recomputed values (500 rows per request) ─────────
  console.log('Upserting recomputed values…');
  const CHUNK = 500;
  let done = 0;
  for (let i = 0; i < rows.length; i += CHUNK) {
    const chunk = rows.slice(i, i + CHUNK).map((r) => ({
      id: r.id,
      office_id: r.office_id,
      snapshot_id: r.snapshot_id,
      ...recompute(r.modes),
    }));
    const { error } = await supabase
      .from('office_transactions')
      .upsert(chunk, { onConflict: 'id' });
    if (error) { console.error(`\nUpsert error at chunk ${i}:`, error.message); process.exit(1); }
    done += chunk.length;
    process.stdout.write(`\r  upserted ${done}/${rows.length} rows…`);
  }
  console.log('\n  office_transactions done.');

  // ── Step 3: re-aggregate upload_snapshots ────────────────────────────────
  console.log('Re-aggregating upload_snapshots…');
  const { data: snapshots, error: snapErr } = await supabase
    .from('upload_snapshots').select('id, snapshot_date');
  if (snapErr) { console.error('Snapshots fetch:', snapErr.message); process.exit(1); }

  for (const snap of (snapshots ?? []) as { id: string; snapshot_date: string }[]) {
    const allTxns: { total_cnt: number; total_amt: number; digital_cnt: number; digital_amt: number }[] = [];
    let p = 0;
    while (true) {
      const { data } = await supabase
        .from('office_transactions')
        .select('total_cnt, total_amt, digital_cnt, digital_amt')
        .eq('snapshot_id', snap.id)
        .range(p * PAGE, (p + 1) * PAGE - 1);
      if (!data || data.length === 0) break;
      allTxns.push(...(data as typeof allTxns));
      if (data.length < PAGE) break;
      p++;
    }
    const agg = {
      total_cnt:   allTxns.reduce((s, r) => s + r.total_cnt, 0),
      total_amt:   allTxns.reduce((s, r) => s + Number(r.total_amt), 0),
      digital_cnt: allTxns.reduce((s, r) => s + r.digital_cnt, 0),
      digital_amt: allTxns.reduce((s, r) => s + Number(r.digital_amt), 0),
    };
    const pct = agg.total_cnt > 0 ? ((agg.digital_cnt / agg.total_cnt) * 100).toFixed(1) : '0';
    const { error: upErr } = await supabase.from('upload_snapshots').update(agg).eq('id', snap.id);
    if (upErr) { console.error(`Snapshot update error ${snap.id}:`, upErr.message); process.exit(1); }
    console.log(`  ${snap.snapshot_date}: total=${agg.total_cnt.toLocaleString('en-IN')}  digital=${agg.digital_cnt.toLocaleString('en-IN')}  pct=${pct}%`);
  }

  console.log('\nMigration complete.');
}

main().catch((e) => { console.error(e); process.exit(1); });
