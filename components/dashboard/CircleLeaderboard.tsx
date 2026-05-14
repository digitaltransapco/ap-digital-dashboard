import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getTopOfficesCircle } from '@/lib/queries/getTopOffices';
import type { TopOffice } from '@/lib/queries/getTopOffices';
import { TAB_ORDER } from '@/lib/utils/constants';
import { formatCount, formatPct } from '@/lib/utils/format';
import { digitalPctColor } from '@/lib/utils/colors';

interface Props {
  snapshotId: string;
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

function StandardTable({ offices }: { offices: TopOffice[] }) {
  if (offices.length === 0) return <p className="text-sm text-[var(--fg-muted)] py-4">No offices found.</p>;
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b text-[var(--fg-muted)]">
          <th scope="col" className="text-left py-2 font-medium">#</th>
          <th scope="col" className="text-left py-2 font-medium">Office</th>
          <th scope="col" className="text-left py-2 font-medium">Division</th>
          <th scope="col" className="text-right py-2 font-medium pr-2">Total Txns</th>
          <th scope="col" className="text-right py-2 font-medium pr-2">Cash Txns</th>
          <th scope="col" className="text-right py-2 font-medium pr-2">Digital Txns</th>
          <th scope="col" className="text-right py-2 font-medium">Digital %</th>
        </tr>
      </thead>
      <tbody>
        {offices.map((o, i) => {
          const color = digitalPctColor(o.digital_pct_cnt);
          return (
            <tr key={o.office_id} className="border-b last:border-0">
              <td className="py-2 text-[var(--fg-muted)] w-6">{i + 1}</td>
              <td className="py-2 font-medium">{o.office_name}</td>
              <td className="py-2 text-[var(--fg-muted)] text-xs">{o.division_name.replace(' Division', '').replace(' Divison', '')}</td>
              <td className="py-2 text-right font-mono tabular-nums pr-2">{formatCount(o.total_cnt)}</td>
              <td className="py-2 text-right font-mono tabular-nums pr-2 text-rose-700">{formatCount(o.manual_cnt)}</td>
              <td className="py-2 text-right font-mono tabular-nums pr-2 text-emerald-700">{formatCount(o.digital_cnt)}</td>
              <td className="py-2 text-right">
                <Badge className={`${color.bg} ${color.text} border-0 font-mono`}>
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

function OthTable({ offices }: { offices: TopOffice[] }) {
  if (offices.length === 0) return <p className="text-sm text-[var(--fg-muted)] py-4">No non-standard offices found.</p>;
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b text-[var(--fg-muted)]">
          <th scope="col" className="text-left py-2 font-medium">#</th>
          <th scope="col" className="text-left py-2 font-medium">Office</th>
          <th scope="col" className="text-left py-2 font-medium">Type</th>
          <th scope="col" className="text-left py-2 font-medium">Division</th>
          <th scope="col" className="text-right py-2 font-medium pr-2">Total Txns</th>
          <th scope="col" className="text-right py-2 font-medium pr-2">Cash Txns</th>
          <th scope="col" className="text-right py-2 font-medium pr-2">Digital Txns</th>
          <th scope="col" className="text-right py-2 font-medium">Digital %</th>
        </tr>
      </thead>
      <tbody>
        {offices.map((o, i) => {
          const color = digitalPctColor(o.digital_pct_cnt);
          const badgeStyle = TYPE_BADGE[o.office_type_code] ?? 'bg-gray-100 text-gray-600';
          return (
            <tr key={o.office_id} className="border-b last:border-0">
              <td className="py-2 text-[var(--fg-muted)] w-6">{i + 1}</td>
              <td className="py-2 font-medium">{o.office_name}</td>
              <td className="py-2">
                <span className={`inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-semibold ${badgeStyle}`}>
                  {o.office_type_code}
                </span>
              </td>
              <td className="py-2 text-[var(--fg-muted)] text-xs">{o.division_name.replace(' Division', '').replace(' Divison', '')}</td>
              <td className="py-2 text-right font-mono tabular-nums pr-2">{formatCount(o.total_cnt)}</td>
              <td className="py-2 text-right font-mono tabular-nums pr-2 text-rose-700">{formatCount(o.manual_cnt)}</td>
              <td className="py-2 text-right font-mono tabular-nums pr-2 text-emerald-700">{formatCount(o.digital_cnt)}</td>
              <td className="py-2 text-right">
                <Badge className={`${color.bg} ${color.text} border-0 font-mono`}>
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

export async function CircleLeaderboard({ snapshotId }: Props) {
  const results = await Promise.all(
    TAB_ORDER.map((tab) => getTopOfficesCircle(snapshotId, tab)),
  );
  const tabData = Object.fromEntries(TAB_ORDER.map((tab, i) => [tab, results[i]]));

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold">Top Cash (Non-Digital) Transacting Offices</CardTitle>
        <p className="text-xs text-[var(--fg-muted)] mt-0.5">Offices with the most cash transactions across AP Circle — convert these first.</p>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="HO">
          <TabsList className="mb-4">
            {TAB_ORDER.map((tab) => (
              <TabsTrigger key={tab} value={tab}>{tab}</TabsTrigger>
            ))}
          </TabsList>
          {TAB_ORDER.map((tab) => {
            const offices = tabData[tab];
            return (
              <TabsContent key={tab} value={tab}>
                {tab === 'OTH'
                  ? <OthTable offices={offices} />
                  : <StandardTable offices={offices} />
                }
              </TabsContent>
            );
          })}
        </Tabs>
      </CardContent>
    </Card>
  );
}
