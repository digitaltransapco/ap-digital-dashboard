import type { DivisionStats } from '@/lib/queries/getDivisionStats';
import type { TopOffice } from '@/lib/queries/getTopOffices';
import type { TabLabel } from '@/lib/utils/constants';
import { DivisionCard } from './DivisionCard';
import { RmsDivisionCard } from './RmsDivisionCard';
import { getTopOfficesForDivision } from '@/lib/queries/getTopOffices';
import { getRmsDivisionOffices } from '@/lib/queries/getRmsDivisionOffices';
import { TAB_ORDER, isRmsDivision } from '@/lib/utils/constants';

interface Props {
  divisionStats: DivisionStats[];
  snapshotId: string;
}

export async function DivisionGrid({ divisionStats, snapshotId }: Props) {
  const territorial = divisionStats.filter((d) => !isRmsDivision(d.division_name));
  const rms         = divisionStats.filter((d) =>  isRmsDivision(d.division_name));

  // Fetch territorial tab data in parallel
  const allTabData = await Promise.all(
    territorial.map(async (div) => {
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

  // Fetch RMS office data in parallel
  const rmsOfficeData = await Promise.all(
    rms.map(async (div) => {
      const [push, champions, volume] = await Promise.all([
        getRmsDivisionOffices(snapshotId, div.division_name, 'push'),
        getRmsDivisionOffices(snapshotId, div.division_name, 'champions'),
        getRmsDivisionOffices(snapshotId, div.division_name, 'volume'),
      ]);
      return { division_name: div.division_name, officesByMode: { push, champions, volume } };
    }),
  );
  const rmsOfficeMap = new Map(rmsOfficeData.map((d) => [d.division_name, d.officesByMode]));

  const rmsDivisionsHaveData = rms.some((d) => d.total_cnt > 0);

  return (
    <>
      {/* 29 Territorial divisions */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {territorial.map((div) => (
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

      {/* RMS divisions section */}
      {rmsDivisionsHaveData && (
        <section className="mt-12">
          <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-1 mb-4">
            <div>
              <h2 className="text-lg font-bold text-[var(--fg)]">RMS Divisions</h2>
              <p className="text-xs text-[var(--fg-muted)]">Mail logistics — Railway Mail Service, Sorting Hubs, Foreign Post</p>
            </div>
            <span className="text-sm text-[var(--fg-muted)] shrink-0">
              {rms.length} divisions · all-types view
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {rms.map((div) => (
              <div
                key={div.division_name}
                id={`division-${div.division_name.toLowerCase().replace(/\s+/g, '-')}`}
                className="rounded-xl transition-shadow duration-500 scroll-mt-6"
              >
                <RmsDivisionCard
                  divisionName={div.division_name}
                  total_cnt={div.total_cnt}
                  digital_cnt={div.digital_cnt}
                  digital_pct_cnt={div.digital_pct_cnt}
                  office_count={div.office_count}
                  officesByMode={rmsOfficeMap.get(div.division_name)!}
                />
              </div>
            ))}
          </div>
        </section>
      )}
    </>
  );
}
