'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { RankingToggle } from './RankingToggle';
import type { RmsOfficeRow } from '@/lib/queries/getRmsDivisionOffices';
import type { RankingView } from '@/lib/queries/getTopOffices';
import { formatCount, formatPct } from '@/lib/utils/format';
import { digitalPctColor } from '@/lib/utils/colors';

interface Props {
  divisionName: string;
  total_cnt: number;
  digital_cnt: number;
  digital_pct_cnt: number;
  office_count: number;
  officesByMode: {
    push: RmsOfficeRow[];
    champions: RmsOfficeRow[];
    volume: RmsOfficeRow[];
  };
}

const TYPE_BADGE: Record<string, string> = {
  RMO: 'bg-orange-100 text-orange-700',
  NPH: 'bg-amber-100 text-amber-700',
  NSH: 'bg-yellow-100 text-yellow-700',
  TMO: 'bg-lime-100 text-lime-700',
  IDC: 'bg-cyan-100 text-cyan-700',
  BNP: 'bg-sky-100 text-sky-700',
  FPO: 'bg-violet-100 text-violet-700',
};

function OfficeTable({ offices }: { offices: RmsOfficeRow[] }) {
  if (offices.length === 0) {
    return <p className="text-xs text-[var(--fg-muted)] py-3 text-center">No offices found for this view.</p>;
  }
  return (
    <table className="w-full text-xs">
      <thead>
        <tr className="border-b text-[var(--fg-muted)]">
          <th scope="col" className="text-left py-1.5 font-medium w-4">#</th>
          <th scope="col" className="text-left py-1.5 font-medium">Office</th>
          <th scope="col" className="text-left py-1.5 font-medium">Type</th>
          <th scope="col" className="text-right py-1.5 font-medium">Total</th>
          <th scope="col" className="text-right py-1.5 font-medium">Cash</th>
          <th scope="col" className="text-right py-1.5 font-medium">Digital</th>
          <th scope="col" className="text-right py-1.5 font-medium">Digital%</th>
        </tr>
      </thead>
      <tbody>
        {offices.map((o, i) => {
          const color = digitalPctColor(o.digital_pct_cnt);
          const badgeStyle = TYPE_BADGE[o.office_type_code] ?? 'bg-gray-100 text-gray-600';
          return (
            <tr key={o.office_id} className="border-b last:border-0 hover:bg-gray-50/50">
              <td className="py-1.5 text-[var(--fg-muted)]">{i + 1}</td>
              <td className="py-1.5 font-medium leading-tight max-w-[110px] truncate" title={o.office_name}>
                {o.office_name}
              </td>
              <td className="py-1.5">
                <span className={`inline-flex items-center rounded px-1 py-0.5 text-[10px] font-semibold ${badgeStyle}`}>
                  {o.office_type_code}
                </span>
              </td>
              <td className="py-1.5 text-right font-mono tabular-nums">{formatCount(o.total_cnt)}</td>
              <td className="py-1.5 text-right font-mono tabular-nums text-rose-700">{formatCount(o.manual_cnt)}</td>
              <td className="py-1.5 text-right font-mono tabular-nums text-emerald-700">{formatCount(o.digital_cnt)}</td>
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

export function RmsDivisionCard({ divisionName, total_cnt, digital_cnt, digital_pct_cnt, office_count, officesByMode }: Props) {
  const [view, setView] = useState<RankingView>('push');
  const color = digitalPctColor(digital_pct_cnt);
  const shortName = divisionName.replace(' Division', '').replace(' Divison', '');

  return (
    <Card className="flex flex-col hover:shadow-lg transition-shadow duration-200">
      <CardHeader className="pb-2 flex-row items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-bold text-[var(--fg)] leading-tight">{shortName}</h3>
          <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--fg-muted)] mt-0.5">
            RMS Division · Mail logistics
          </p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <Badge variant="secondary" className="font-mono text-xs bg-gray-100">
            {formatCount(total_cnt)}
          </Badge>
          <div className="w-px h-4 bg-[var(--border)]" aria-hidden="true" />
          <Badge className={`${color.bg} ${color.text} border-0 font-mono text-xs`}>
            {formatPct(digital_pct_cnt)}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="flex-1 pt-0 space-y-3">
        {/* Stats + progress bar */}
        <div>
          <div className="flex justify-between text-xs text-[var(--fg-muted)] mb-1">
            <span>{formatCount(digital_cnt)} digital · {office_count} offices</span>
            <span>of {formatCount(total_cnt)}</span>
          </div>
          <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full ${color.bar}`}
              style={{ width: `${Math.min(digital_pct_cnt, 100)}%` }}
            />
          </div>
        </div>
        <RankingToggle value={view} onChange={setView} />
        <OfficeTable offices={officesByMode[view]} />
      </CardContent>
    </Card>
  );
}
