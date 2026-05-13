import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
import { getLatestSnapshot } from '@/lib/queries/getLatestSnapshot';
import { getCircleStats } from '@/lib/queries/getCircleStats';
import { getDivisionStats } from '@/lib/queries/getDivisionStats';

export async function GET() {
  const snapshot = await getLatestSnapshot();
  if (!snapshot) return NextResponse.json({ error: 'No snapshot found' }, { status: 404 });

  const [circleStats, divisionStats] = await Promise.all([
    getCircleStats(snapshot.id),
    getDivisionStats(snapshot.id),
  ]);

  return NextResponse.json({ snapshot, circleStats, divisionStats });
}
