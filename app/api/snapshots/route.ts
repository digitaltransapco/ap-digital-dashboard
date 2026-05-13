import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
import { createServiceClient } from '@/lib/supabase/server';
import { z } from 'zod';

export async function GET() {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from('upload_snapshots')
    .select('*')
    .order('snapshot_date', { ascending: false })
    .limit(30);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ snapshots: data });
}

const DeleteSchema = z.object({ snapshot_id: z.string().uuid() });

export async function DELETE(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const parsed = DeleteSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: 'Invalid body' }, { status: 400 });

  const supabase = createServiceClient();
  const { error } = await supabase
    .from('upload_snapshots')
    .delete()
    .eq('id', parsed.data.snapshot_id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
