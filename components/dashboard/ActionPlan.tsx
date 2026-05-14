import { getActionPlan } from '@/lib/queries/getActionPlan';
import type { ActionPlan as ActionPlanData, ActionPlanOffice } from '@/lib/queries/getActionPlan';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { formatCount, formatPct } from '@/lib/utils/format';
import { digitalPctColor } from '@/lib/utils/colors';
import { ActionPlanCopyButton } from './ActionPlanCopyButton';
import { ActionPlanShell } from './ActionPlanShell';

interface Props {
  snapshotId: string;
  snapshotDate: string;
}

function buildWhatsAppText(plan: ActionPlanData, snapshotDate: string): string {
  const lines: string[] = [
    `🎯 ACTION PLAN — +${plan.delta_pp_target}pp Digital Lift (AP Circle)`,
    ``,
    `Lift Digital % from ${plan.current_circle_pct.toFixed(1)}% → ${plan.target_circle_pct.toFixed(1)}%`,
    `Contact ${plan.offices.length} offices · Add ~${plan.required_additional_digital.toLocaleString('en-IN')} digital txns`,
    `Snapshot: ${snapshotDate}`,
    ``,
    `PRIORITY OFFICES:`,
    ...plan.offices.map(
      (o) =>
        `${o.rank}. ${o.office_name} (${o.division_name.replace(' Division', '')}) — ${o.current_digital_pct.toFixed(1)}% digital → ${o.current_cash.toLocaleString('en-IN')} cash txns`,
    ),
  ];
  return lines.join('\n');
}

const TYPE_BADGE_STYLES: Record<string, string> = {
  HPO: 'bg-indigo-100 text-indigo-700',
  SPO: 'bg-purple-100 text-purple-700',
  BPO: 'bg-sky-100 text-sky-700',
  BPC: 'bg-teal-100 text-teal-700',
};

function OfficeTable({ offices }: { offices: ActionPlanOffice[] }) {
  if (offices.length === 0) {
    return <p className="text-sm text-[var(--fg-muted)] py-4 text-center">No addressable offices found for this target.</p>;
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b text-[var(--fg-muted)]">
            <th scope="col" className="text-left py-2 font-medium w-5">#</th>
            <th scope="col" className="text-left py-2 font-medium">Office</th>
            <th scope="col" className="text-left py-2 font-medium">Division</th>
            <th scope="col" className="text-center py-2 font-medium">Type</th>
            <th scope="col" className="text-right py-2 font-medium">Total</th>
            <th scope="col" className="text-right py-2 font-medium">Cash</th>
            <th scope="col" className="text-right py-2 font-medium">Cur Dig%</th>
            <th scope="col" className="text-right py-2 font-medium text-emerald-700">+Lift</th>
            <th scope="col" className="text-right py-2 font-medium">Cum%</th>
          </tr>
        </thead>
        <tbody>
          {offices.map((o) => {
            const color = digitalPctColor(o.current_digital_pct);
            const badgeStyle = TYPE_BADGE_STYLES[o.office_type_code] ?? 'bg-gray-100 text-gray-600';
            return (
              <tr key={o.office_id} className="border-b last:border-0 hover:bg-gray-50/50">
                <td className="py-1.5 text-[var(--fg-muted)]">{o.rank}</td>
                <td className="py-1.5 font-medium max-w-[140px] truncate" title={o.office_name}>{o.office_name}</td>
                <td className="py-1.5 text-[var(--fg-muted)]">{o.division_name.replace(' Division', '')}</td>
                <td className="py-1.5 text-center">
                  <span className={`inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-semibold ${badgeStyle}`}>
                    {o.office_type_code === 'HPO' ? 'HO' : o.office_type_code === 'SPO' ? 'SO' : o.office_type_code === 'BPO' ? 'BO' : o.office_type_code}
                  </span>
                </td>
                <td className="py-1.5 text-right font-mono tabular-nums">{formatCount(o.current_total)}</td>
                <td className="py-1.5 text-right font-mono tabular-nums text-rose-700">{formatCount(o.current_cash)}</td>
                <td className="py-1.5 text-right">
                  <Badge className={`${color.bg} ${color.text} border-0 font-mono text-xs`}>
                    {formatPct(o.current_digital_pct)}
                  </Badge>
                </td>
                <td className="py-1.5 text-right font-mono tabular-nums text-emerald-700 font-semibold">
                  +{formatCount(o.projected_lift)}
                </td>
                <td className="py-1.5 text-right font-mono tabular-nums text-indigo-700">
                  {formatPct(o.cumulative_circle_pct)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function PlanTab({
  plan,
  snapshotDate,
}: {
  plan: ActionPlanData;
  snapshotDate: string;
}) {
  const whatsapp = buildWhatsAppText(plan, snapshotDate);

  return (
    <div className="space-y-4">
      {/* Summary band */}
      <div className="rounded-lg bg-indigo-50 border border-indigo-200 px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div className="space-y-0.5">
          <p className="text-sm font-semibold text-indigo-900">
            Lift Circle Digital % from <strong>{plan.current_circle_pct.toFixed(1)}%</strong> to <strong>{plan.target_circle_pct.toFixed(1)}%</strong> (+{plan.delta_pp_target} pp)
          </p>
          <p className="text-xs text-indigo-700">
            Contact <strong>{plan.offices.length}</strong> offices · Add <strong>{formatCount(plan.required_additional_digital)}</strong> digital transactions
          </p>
        </div>
        <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full shrink-0 ${plan.goal_achievable ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
          {plan.goal_achievable ? '✓ Goal achievable' : '⚠ Stretch — additional offices may be needed'}
        </span>
      </div>

      {/* Table + copy button */}
      <div className="flex items-center justify-end">
        <ActionPlanCopyButton text={whatsapp} />
      </div>

      <OfficeTable offices={plan.offices} />

      {/* Footer */}
      <p className="text-xs text-[var(--fg-muted)] border-t border-[var(--border)] pt-3 mt-1">
        This plan assumes each office reaches 80% digital — a realistic stretch with focused intervention. Conversion below 80% requires a larger office list.
      </p>
    </div>
  );
}

export async function ActionPlan({ snapshotId, snapshotDate }: Props) {
  const [plan10, plan5] = await Promise.all([
    getActionPlan(snapshotId, 10),
    getActionPlan(snapshotId, 5),
  ]);

  return (
    <Card className="overflow-hidden">
      <ActionPlanShell plan10OfficeCount={plan10.offices.length} plan5OfficeCount={plan5.offices.length}>
        <Tabs defaultValue="10pp">
          <TabsList className="mb-4">
            <TabsTrigger value="10pp">+10pp Goal</TabsTrigger>
            <TabsTrigger value="5pp">+5pp Goal</TabsTrigger>
          </TabsList>
          <TabsContent value="10pp">
            <PlanTab plan={plan10} snapshotDate={snapshotDate} />
          </TabsContent>
          <TabsContent value="5pp">
            <PlanTab plan={plan5} snapshotDate={snapshotDate} />
          </TabsContent>
        </Tabs>
      </ActionPlanShell>
    </Card>
  );
}
