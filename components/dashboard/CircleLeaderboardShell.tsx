'use client';

import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { Collapsible, CollapsibleContent } from '@/components/ui/collapsible';

interface Props {
  children: React.ReactNode;
}

export function CircleLeaderboardShell({ children }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full text-left cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] rounded-t-xl px-6 pt-6 pb-3"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <p className="text-base font-semibold text-[var(--fg)] leading-tight">Top Cash (Non-Digital) Transacting Offices</p>
            <p className="text-xs text-[var(--fg-muted)] mt-0.5">
              {open
                ? 'Offices with the most cash transactions across AP Circle — convert these first.'
                : 'HO · SO · BO · BPC · OTH — click to expand'}
            </p>
          </div>
          <span className="shrink-0 mt-0.5 text-[var(--fg-muted)]">
            {open ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </span>
        </div>
      </button>

      <CollapsibleContent className="px-6 pb-6">
        {children}
      </CollapsibleContent>
    </Collapsible>
  );
}
