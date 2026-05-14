import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

import { createServiceClient } from '@/lib/supabase/server';
import { parseBookingCsv } from '@/lib/parse/parseBookingCsv';
import { computeAggregates } from '@/lib/parse/computeAggregates';
import type { UploadSnapshot } from '@/lib/supabase/types';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

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

  const supabase = createServiceClient();

  const officeIds = offices.map((o) => o.office_id);
  const masterIdSet = new Set<number>();
  const ID_CHUNK = 500;
  for (let i = 0; i < officeIds.length; i += ID_CHUNK) {
    const chunk = officeIds.slice(i, i + ID_CHUNK);
    const { data } = await supabase.from('offices_master').select('office_id').in('office_id', chunk);
    ((data ?? []) as { office_id: number }[]).forEach((r) => masterIdSet.add(r.office_id));
  }
  const matched_offices = offices.filter((o) => masterIdSet.has(o.office_id)).length;
  const orphan_offices = offices.length - matched_offices;

  const total_cnt = offices.reduce((s, o) => s + o.total_cnt, 0);
  const total_amt = offices.reduce((s, o) => s + o.total_amt, 0);
  const digital_cnt = offices.reduce((s, o) => s + o.digital_cnt, 0);
  const digital_amt = offices.reduce((s, o) => s + o.digital_amt, 0);

  const { data: snapshotData, error: snapError } = await supabase
    .from('upload_snapshots')
    .upsert({
      snapshot_date,
      period_start,
      period_end,
      source_filename,
      row_count: offices.length,
      matched_offices,
      orphan_offices,
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

  const { error: delError } = await supabase
    .from('office_transactions')
    .delete()
    .eq('snapshot_id', snapshotId);

  if (delError) {
    return NextResponse.json({ error: delError.message }, { status: 500 });
  }

  const CHUNK = 500;
  for (let i = 0; i < offices.length; i += CHUNK) {
    const chunk = offices.slice(i, i + CHUNK).map((o) => ({
      snapshot_id: snapshotId,
      office_id: o.office_id,
      manual_cnt: o.manual_cnt,
      manual_amt: o.manual_amt,
      digital_cnt: o.digital_cnt,
      digital_amt: o.digital_amt,
      other_cnt: o.other_cnt,
      other_amt: o.other_amt,
      total_cnt: o.total_cnt,
      total_amt: o.total_amt,
      digital_pct_cnt: o.digital_pct_cnt,
      digital_pct_amt: o.digital_pct_amt,
      modes: o.modes,
    }));

    const { error: insertError } = await supabase.from('office_transactions').insert(chunk);
    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }
  }

  return NextResponse.json({
    snapshot_id: snapshotId,
    matched_offices,
    orphan_offices,
    circle_totals: { total_cnt, total_amt, digital_cnt, digital_amt },
  });
}
