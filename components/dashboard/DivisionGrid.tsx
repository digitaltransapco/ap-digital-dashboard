import type { DivisionStats } from '@/lib/queries/getDivisionStats';
import type { TopOffice } from '@/lib/queries/getTopOffices';
import type { TabLabel } from '@/lib/utils/constants';
import { DivisionCard } from './DivisionCard';
import { getTopOfficesForDivision } from '@/lib/queries/getTopOffices';
import { TAB_ORDER } from '@/lib/utils/constants';

interface Props {
  divisionStats: DivisionStats[];
  snapshotId: string;
}

export async function DivisionGrid({ divisionStats, snapshotId }: Props) {
  // Fetch all tab data for all divisions in parallel
  const allTabData = await Promise.all(
    divisionStats.map(async (div) => {
      const tabEntries = await Promise.all(
        TAB_ORDER.map(async (tab) => {
          const [push, champions, volume] = await Promise.all([
            getTopOfficesForDivision(snapshotId, div.division_name, tab, 'push'),
            getTopOfficesForDivision(snapshotId, div.division_name, tab, 'champions'),
            getTopOfficesForDivision(snapshotId, div.division_name, tab, 'volume'),
          ]);
          return [tab, { push, champions, volume }] as const;
        }),
      );
      return { division_name: div.division_name, tabData: Object.fromEntries(tabEntries) as Record<TabLabel, { push: TopOffice[]; champions: TopOffice[]; volume: TopOffice[] }> };
    }),
  );

  const tabDataMap = new Map(allTabData.map((d) => [d.division_name, d.tabData]));

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {divisionStats.map((div) => (
        <div
          key={div.division_name}
          id={`division-${div.division_name.toLowerCase().replace(/\s+/g, '-')}`}
          className="rounded-xl transition-shadow duration-500 scroll-mt-6"
        >
          <DivisionCard
            stats={div}
            tabData={tabDataMap.get(div.division_name)!}
          />
        </div>
      ))}
    </div>
  );
}
