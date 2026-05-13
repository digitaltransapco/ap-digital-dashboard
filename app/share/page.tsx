import { getLatestSnapshot } from '@/lib/queries/getLatestSnapshot';
import { getCircleStats } from '@/lib/queries/getCircleStats';
import { getDivisionStats } from '@/lib/queries/getDivisionStats';
import { formatCount, formatINRCr, formatPct } from '@/lib/utils/format';
import { digitalPctColor } from '@/lib/utils/colors';

export const dynamic = 'force-dynamic';

export default async function SharePage() {
  const snapshot = await getLatestSnapshot();
  if (!snapshot) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <p className="text-gray-500 text-sm">No data available.</p>
      </div>
    );
  }

  const [circleStats, divisionStats] = await Promise.all([
    getCircleStats(snapshot.id),
    getDivisionStats(snapshot.id),
  ]);

  if (!circleStats) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <p className="text-gray-500 text-sm">Failed to load statistics.</p>
      </div>
    );
  }

  const sorted = [...divisionStats].sort((a, b) => b.digital_pct_cnt - a.digital_pct_cnt);
  const top3 = sorted.slice(0, 3);
  const bottom3 = sorted.slice(-3).reverse();

  const circleColor = digitalPctColor(circleStats.digital_pct_cnt);

  return (
    /* 9:16 share card — fixed width, designed to be screenshotted */
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div
        className="w-[360px] bg-white rounded-2xl overflow-hidden shadow-2xl flex flex-col"
        style={{ minHeight: '640px' }}
      >
        {/* India Post red accent bar + header */}
        <div className="bg-[#c8102e] px-5 py-4">
          <p className="text-white/80 text-[10px] font-medium uppercase tracking-widest">Andhra Pradesh Postal Circle</p>
          <p className="text-white text-sm font-semibold mt-0.5">Digital Transactions Dashboard</p>
        </div>

        <div className="flex-1 flex flex-col px-5 py-4 gap-4">
          {/* Big headline */}
          <div className="text-center py-2">
            <p className="text-6xl font-bold font-mono tabular-nums text-gray-900 leading-none">
              {formatPct(circleStats.digital_pct_cnt)}
            </p>
            <p className="text-sm text-gray-500 mt-1">digital transactions by count</p>
            <p className="text-xs text-gray-400 mt-0.5">As of {snapshot.snapshot_date} · Period {snapshot.period_start} – {snapshot.period_end}</p>
          </div>

          {/* Circle progress bar */}
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full ${circleColor.bar}`}
              style={{ width: `${Math.min(circleStats.digital_pct_cnt, 100)}%` }}
            />
          </div>

          {/* 3 mini stats */}
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: 'Total Txns', value: formatCount(circleStats.total_cnt) },
              { label: 'Total Amount', value: formatINRCr(circleStats.total_amt) },
              { label: 'Headroom', value: formatCount(circleStats.digital_headroom) },
            ].map(({ label, value }) => (
              <div key={label} className="bg-gray-50 rounded-lg p-2 text-center">
                <p className="text-[10px] text-gray-500 uppercase tracking-wide leading-tight">{label}</p>
                <p className="text-sm font-bold font-mono tabular-nums text-gray-900 mt-0.5 leading-tight">{value}</p>
              </div>
            ))}
          </div>

          {/* Top 3 divisions */}
          <div>
            <p className="text-xs font-semibold text-gray-700 uppercase tracking-wide mb-2">Top 3 Divisions</p>
            <div className="space-y-2">
              {top3.map((d, i) => {
                const color = digitalPctColor(d.digital_pct_cnt);
                return (
                  <div key={d.division_name} className="flex items-center gap-2">
                    <span className="text-xs text-gray-400 w-4">{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="text-xs font-medium text-gray-800 truncate">{d.division_name.replace(' Division', '')}</span>
                        <span className={`text-xs font-mono font-bold ${color.text} ml-1 shrink-0`}>{formatPct(d.digital_pct_cnt)}</span>
                      </div>
                      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${color.bar}`} style={{ width: `${Math.min(d.digital_pct_cnt, 100)}%` }} />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Bottom 3 divisions (push targets) */}
          <div>
            <p className="text-xs font-semibold text-gray-700 uppercase tracking-wide mb-2">Push Targets</p>
            <div className="space-y-2">
              {bottom3.map((d) => {
                const color = digitalPctColor(d.digital_pct_cnt);
                return (
                  <div key={d.division_name} className="flex items-center gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="text-xs font-medium text-gray-800 truncate">{d.division_name.replace(' Division', '')}</span>
                        <span className={`text-xs font-mono font-bold ${color.text} ml-1 shrink-0`}>{formatPct(d.digital_pct_cnt)}</span>
                      </div>
                      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${color.bar}`} style={{ width: `${Math.min(d.digital_pct_cnt, 100)}%` }} />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-gray-50 border-t border-gray-100 px-5 py-3">
          <p className="text-[10px] text-gray-400 text-center">
            Live dashboard · ap-digital-dashboard.vercel.app
          </p>
        </div>
      </div>
    </div>
  );
}
