'use client';

import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RankingToggle } from './RankingToggle';
import { TopOfficesTable } from './TopOfficesTable';
import type { TopOffice, RankingView } from '@/lib/queries/getTopOffices';
import type { TabLabel } from '@/lib/utils/constants';
import { TAB_ORDER } from '@/lib/utils/constants';

interface Props {
  tabData: Record<TabLabel, { push: TopOffice[]; champions: TopOffice[]; volume: TopOffice[] }>;
}

export function OfficeTypeTabs({ tabData }: Props) {
  const [view, setView] = useState<RankingView>('push');

  return (
    <div className="space-y-2">
      <RankingToggle value={view} onChange={setView} />
      <Tabs defaultValue="HO">
        <TabsList className="h-7 gap-0.5">
          {TAB_ORDER.map((tab) => (
            <TabsTrigger key={tab} value={tab} className="text-xs h-6 px-2">{tab}</TabsTrigger>
          ))}
        </TabsList>
        {TAB_ORDER.map((tab) => {
          const offices = tabData[tab]?.[view] ?? [];
          const hasAny = tabData[tab]?.push?.length > 0 || tabData[tab]?.champions?.length > 0 || tabData[tab]?.volume?.length > 0;
          return (
            <TabsContent key={tab} value={tab} className="mt-2">
              {!hasAny ? (
                <p className="text-xs text-[var(--fg-muted)] py-3 text-center">No {tab}s in this division.</p>
              ) : (
                <TopOfficesTable offices={offices} view={view} />
              )}
            </TabsContent>
          );
        })}
      </Tabs>
    </div>
  );
}
