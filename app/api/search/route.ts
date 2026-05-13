import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { getLatestSnapshot } from '@/lib/queries/getLatestSnapshot';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get('q')?.trim() ?? '';
  if (q.length < 2) return NextResponse.json({ offices: [] });

  const supabase = createServiceClient();
  const snap = await getLatestSnapshot();
  if (!snap) return NextResponse.json({ offices: [] });

  const { data: masterRows } = await supabase
    .from('offices_master')
    .select('office_id, office_name, division_name')
    .ilike('office_name', `%${q}%`)
    .limit(20);

  if (!masterRows || masterRows.length === 0) return NextResponse.json({ offices: [] });

  const officeIds = (masterRows as { office_id: number; office_name: string; division_name: string }[])
    .map((r) => r.office_id);

  const { data: txns } = await supabase
    .from('office_transactions')
    .select('office_id, total_cnt, digital_pct_cnt')
    .eq('snapshot_id', snap.id)
    .in('office_id', officeIds);

  const txnMap = new Map(
    ((txns ?? []) as { office_id: number; total_cnt: number | null; digital_pct_cnt: number | null }[])
      .map((t) => [t.office_id, t]),
  );

  const offices = (masterRows as { office_id: number; office_name: string; division_name: string }[])
    .map((m) => {
      const txn = txnMap.get(m.office_id);
      return {
        office_id: m.office_id,
        office_name: m.office_name,
        division_name: m.division_name,
        total_cnt: txn?.total_cnt ?? null,
        digital_pct_cnt: txn?.digital_pct_cnt ?? null,
      };
    })
    .filter((o) => o.total_cnt != null && o.total_cnt > 0)
    .sort((a, b) => (b.total_cnt ?? 0) - (a.total_cnt ?? 0));

  return NextResponse.json({ offices });
}
