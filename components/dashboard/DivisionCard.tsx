import type { DivisionStats } from '@/lib/queries/getDivisionStats';
import type { TopOffice } from '@/lib/queries/getTopOffices';
import type { TabLabel } from '@/lib/utils/constants';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { OfficeTypeTabs } from './OfficeTypeTabs';
import { formatCount, formatPct } from '@/lib/utils/format';
import { digitalPctColor } from '@/lib/utils/colors';

interface Props {
  stats: DivisionStats;
  tabData: Record<TabLabel, { push: TopOffice[]; champions: TopOffice[]; volume: TopOffice[] }>;
}

export function DivisionCard({ stats, tabData }: Props) {
  const color = digitalPctColor(stats.digital_pct_cnt);
  const shortName = stats.division_name.replace(' Division', '');

  return (
    <Card className="flex flex-col hover:shadow-lg transition-shadow duration-200">
      <CardHeader className="pb-2 flex-row items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-bold text-[var(--fg)] leading-tight">{shortName}</h3>
          <p className="text-xs text-[var(--fg-muted)] mt-0.5">Division</p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <Badge variant="secondary" className="font-mono text-xs bg-gray-100">
            {formatCount(stats.total_cnt)}
          </Badge>
          <div className="w-px h-4 bg-[var(--border)]" aria-hidden="true" />
          <Badge className={`${color.bg} ${color.text} border-0 font-mono text-xs`}>
            {formatPct(stats.digital_pct_cnt)}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="flex-1 pt-0 space-y-3">
        {/* Digital % progress bar */}
        <div>
          <div className="flex justify-between text-xs text-[var(--fg-muted)] mb-1">
            <span>{formatCount(stats.digital_cnt)} digital</span>
            <span>of {formatCount(stats.total_cnt)}</span>
          </div>
          <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full ${color.bar}`}
              style={{ width: `${Math.min(stats.digital_pct_cnt, 100)}%` }}
            />
          </div>
        </div>
        <OfficeTypeTabs tabData={tabData} />
      </CardContent>
    </Card>
  );
}
