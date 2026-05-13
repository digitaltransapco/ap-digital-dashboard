import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
import { z } from 'zod';
import { createServiceClient } from '@/lib/supabase/server';
import type { UploadSnapshot } from '@/lib/supabase/types';

const OfficeRowSchema = z.object({
  office_id: z.number(),
  manual_cnt: z.number(),
  manual_amt: z.number(),
  digital_cnt: z.number(),
  digital_amt: z.number(),
  other_cnt: z.number(),
  other_amt: z.number(),
  total_cnt: z.number(),
  total_amt: z.number(),
  digital_pct_cnt: z.number().nullable(),
  digital_pct_amt: z.number().nullable(),
  modes: z.record(z.string(), z.object({ cnt: z.number(), amt: z.number() })),
});

const UploadPayloadSchema = z.object({
  snapshot_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  period_start: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  period_end: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  source_filename: z.string(),
  offices: z.array(OfficeRowSchema),
  pin: z.string().optional(),
});

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });

  const parsed = UploadPayloadSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Validation failed', details: parsed.error.flatten() }, { status: 422 });
  }

  const uploadPin = process.env.UPLOAD_PIN;
  if (uploadPin) {
    const providedPin = parsed.data.pin ?? req.headers.get('x-upload-pin') ?? '';
    if (providedPin !== uploadPin) {
      return NextResponse.json({ error: 'Invalid PIN' }, { status: 401 });
    }
  }

  const { snapshot_date, period_start, period_end, source_filename, offices } = parsed.data;
  const supabase = createServiceClient();

  // Check office ID matches in chunks to stay within PostgREST URL limits
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
