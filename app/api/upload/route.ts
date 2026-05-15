import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

import { createServiceClient } from '@/lib/supabase/server';
import { parseBookingCsv } from '@/lib/parse/parseBookingCsv';
import { computeAggregates } from '@/lib/parse/computeAggregates';
import type { UploadSnapshot } from '@/lib/supabase/types';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

// Max concurrent Supabase insert requests — keeps total time well under 60 s
const INSERT_CONCURRENCY = 6;
const INSERT_CHUNK = 1000;

export async function POST(req: NextRequest) {
  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: 'Expected multipart/form-data' }, { status: 400 });
  }

  const fileEntry = formData.get('file');
  const snapshot_date = formData.get('snapshot_date')?.toString() ?? '';
  const period_start = formData.get('period_start')?.toString() ?? '';
  const pin = formData.get('pin')?.toString() ?? '';

  if (!(fileEntry instanceof File)) {
    return NextResponse.json({ error: 'Missing file field' }, { status: 400 });
  }
  if (!DATE_RE.test(snapshot_date) || !DATE_RE.test(period_start)) {
    return NextResponse.json({ error: 'Invalid or missing date fields' }, { status: 422 });
  }

  const uploadPin = process.env.UPLOAD_PIN;
  if (uploadPin && pin !== uploadPin) {
    return NextResponse.json({ error: 'Invalid PIN' }, { status: 401 });
  }

  const csvText = await fileEntry.text();
  const { officeRows, errors } = parseBookingCsv(csvText);

  if (errors.length > 0 && officeRows.length === 0) {
    return NextResponse.json({ error: 'CSV parse failed: ' + errors[0] }, { status: 422 });
  }

  const offices = computeAggregates(officeRows);
  const period_end = snapshot_date;
  const source_filename = fileEntry.name;

  const total_cnt   = offices.reduce((s, o) => s + o.total_cnt,   0);
  const total_amt   = offices.reduce((s, o) => s + o.total_amt,   0);
  const digital_cnt = offices.reduce((s, o) => s + o.digital_cnt, 0);
  const digital_amt = offices.reduce((s, o) => s + o.digital_amt, 0);

  const supabase = createServiceClient();

  // Upsert snapshot metadata
  const { data: snapshotData, error: snapError } = await supabase
    .from('upload_snapshots')
    .upsert({
      snapshot_date,
      period_start,
      period_end,
      source_filename,
      row_count: offices.length,
      matched_offices: null,
      orphan_offices: null,
      total_cnt,
      total_amt,
      digital_cnt,
      digital_amt,
    }, { onConflict: 'snapshot_date' })
    .select()
    .single();

  if (snapError || !snapshotData) {
    return NextResponse.json({ error: snapError?.message ?? 'Snapshot upsert failed' }, { status: 500 });
  }

  const snapshot = snapshotData as UploadSnapshot;
  const snapshotId = snapshot.id;

  // Clear previous transaction rows for this snapshot
  const { error: delError } = await supabase
    .from('office_transactions')
    .delete()
    .eq('snapshot_id', snapshotId);

  if (delError) {
    return NextResponse.json({ error: delError.message }, { status: 500 });
  }

  // Build all insert chunks upfront
  const chunks: object[][] = [];
  for (let i = 0; i < offices.length; i += INSERT_CHUNK) {
    chunks.push(
      offices.slice(i, i + INSERT_CHUNK).map((o) => ({
        snapshot_id:       snapshotId,
        office_id:         o.office_id,
        manual_cnt:        o.manual_cnt,
        manual_amt:        o.manual_amt,
        digital_cnt:       o.digital_cnt,
        digital_amt:       o.digital_amt,
        other_cnt:         o.other_cnt,
        other_amt:         o.other_amt,
        total_cnt:         o.total_cnt,
        total_amt:         o.total_amt,
        digital_pct_cnt:   o.digital_pct_cnt,
        digital_pct_amt:   o.digital_pct_amt,
        modes:             o.modes,
      })),
    );
  }

  // Insert with bounded concurrency so all rows land before the 60-s timeout
  for (let i = 0; i < chunks.length; i += INSERT_CONCURRENCY) {
    const batch = chunks.slice(i, i + INSERT_CONCURRENCY);
    const results = await Promise.all(
      batch.map((chunk) => supabase.from('office_transactions').insert(chunk)),
    );
    for (const { error } of results) {
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }

  // Verify every row was saved — if the count is short, the insert was cut off
  // mid-way (e.g. timeout). Return an error so the user knows to re-upload
  // rather than silently showing partial data on the dashboard.
  const { count: savedCount, error: countError } = await supabase
    .from('office_transactions')
    .select('*', { count: 'exact', head: true })
    .eq('snapshot_id', snapshotId);

  if (countError || savedCount !== offices.length) {
    return NextResponse.json(
      {
        error: `Upload incomplete: ${savedCount ?? 0} of ${offices.length} offices saved. Please upload the file again.`,
      },
      { status: 500 },
    );
  }

  return NextResponse.json({
    snapshot_id: snapshotId,
    matched_offices: offices.length,
    orphan_offices: 0,
    circle_totals: { total_cnt, total_amt, digital_cnt, digital_amt },
  });
}
