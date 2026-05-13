import type { TopOffice, RankingView } from '@/lib/queries/getTopOffices';
import { formatCount, formatINR, formatPct } from '@/lib/utils/format';
import { digitalPctColor } from '@/lib/utils/colors';
import { Badge } from '@/components/ui/badge';

interface Props {
  offices: TopOffice[];
  view: RankingView;
}

export function TopOfficesTable({ offices, view }: Props) {
  if (offices.length === 0) {
    const msg = view === 'champions'
      ? 'No champions in this category yet.'
      : 'No offices found for this selection.';
    return <p className="text-xs text-[var(--fg-muted)] py-3 text-center">{msg}</p>;
  }

  return (
    <table className="w-full text-xs">
      <thead>
        <tr className="border-b text-[var(--fg-muted)]">
          <th scope="col" className="text-left py-1.5 font-medium w-4">#</th>
          <th scope="col" className="text-left py-1.5 font-medium">Office</th>
          {view === 'push' && <th scope="col" className="text-right py-1.5 font-medium">Total</th>}
          {view === 'push' && <th scope="col" className="text-right py-1.5 font-medium">Manual</th>}
          {view === 'champions' && <th scope="col" className="text-right py-1.5 font-medium">Total</th>}
          {view === 'champions' && <th scope="col" className="text-left py-1.5 font-medium pl-2">Top Mode</th>}
          {view === 'volume' && <th scope="col" className="text-right py-1.5 font-medium">Total</th>}
          {view === 'volume' && <th scope="col" className="text-right py-1.5 font-medium">Amount</th>}
          <th scope="col" className="text-right py-1.5 font-medium">Digital%</th>
        </tr>
      </thead>
      <tbody>
        {offices.map((o, i) => {
          const color = digitalPctColor(o.digital_pct_cnt);
          return (
            <tr key={o.office_id} className="border-b last:border-0 hover:bg-gray-50/50">
              <td className="py-1.5 text-[var(--fg-muted)]">{i + 1}</td>
              <td className="py-1.5 font-medium leading-tight max-w-[120px] truncate" title={o.office_name}>{o.office_name}</td>
              {view === 'push' && <td className="py-1.5 text-right font-mono tabular-nums">{formatCount(o.total_cnt)}</td>}
              {view === 'push' && <td className="py-1.5 text-right font-mono tabular-nums text-rose-700">{formatCount(o.manual_cnt)}</td>}
              {view === 'champions' && <td className="py-1.5 text-right font-mono tabular-nums">{formatCount(o.total_cnt)}</td>}
              {view === 'champions' && (
                <td className="py-1.5 pl-2 text-[var(--fg-muted)] text-xs max-w-[80px] truncate" title={o.top_digital_mode ?? ''}>
                  {o.top_digital_mode ?? '–'}
                </td>
              )}
              {view === 'volume' && <td className="py-1.5 text-right font-mono tabular-nums">{formatCount(o.total_cnt)}</td>}
              {view === 'volume' && <td className="py-1.5 text-right font-mono tabular-nums">{formatINR(o.total_amt)}</td>}
              <td className="py-1.5 text-right">
                <Badge className={`${color.bg} ${color.text} border-0 font-mono text-xs`}>
                  {o.digital_pct_cnt != null ? formatPct(o.digital_pct_cnt) : '–'}
                </Badge>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
