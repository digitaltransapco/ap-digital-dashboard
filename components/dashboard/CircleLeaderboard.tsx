import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getTopOfficesCircle } from '@/lib/queries/getTopOffices';
import { TAB_ORDER } from '@/lib/utils/constants';
import { formatCount, formatPct } from '@/lib/utils/format';
import { digitalPctColor } from '@/lib/utils/colors';

interface Props {
  snapshotId: string;
}

export async function CircleLeaderboard({ snapshotId }: Props) {
  const [hoData, soData, boData, bpcData] = await Promise.all([
    getTopOfficesCircle(snapshotId, 'HO'),
    getTopOfficesCircle(snapshotId, 'SO'),
    getTopOfficesCircle(snapshotId, 'BO'),
    getTopOfficesCircle(snapshotId, 'BPC'),
  ]);

  const tabData = { HO: hoData, SO: soData, BO: boData, BPC: bpcData };

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
                {offices.length === 0 ? (
                  <p className="text-sm text-[var(--fg-muted)] py-4">No {tab} offices found.</p>
                ) : (
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-[var(--fg-muted)]">
                        <th scope="col" className="text-left py-2 font-medium">#</th>
                        <th scope="col" className="text-left py-2 font-medium">Office</th>
                        <th scope="col" className="text-left py-2 font-medium">Division</th>
                        <th scope="col" className="text-right py-2 font-medium pr-2">Total Txns</th>
                        <th scope="col" className="text-right py-2 font-medium pr-2">Cash Txns</th>
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
                            <td className="py-2 text-[var(--fg-muted)] text-xs">{o.division_name.replace(' Division', '')}</td>
                            <td className="py-2 text-right font-mono tabular-nums pr-2">{formatCount(o.total_cnt)}</td>
                            <td className="py-2 text-right font-mono tabular-nums pr-2 text-rose-700">{formatCount(o.manual_cnt)}</td>
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
                )}
              </TabsContent>
            );
          })}
        </Tabs>
      </CardContent>
    </Card>
  );
}
