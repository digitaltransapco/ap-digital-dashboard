'use client';

import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { Collapsible, CollapsibleContent } from '@/components/ui/collapsible';

interface Props {
  plan10OfficeCount: number;
  plan5OfficeCount: number;
  children: React.ReactNode;
}

export function ActionPlanShell({ plan10OfficeCount, plan5OfficeCount, children }: Props) {
  const [open, setOpen] = useState(true);

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full text-left cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] rounded-t-xl px-6 pt-6 pb-3"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <p className="text-base font-semibold text-[var(--fg)] leading-tight">Action Plan — Where to push next</p>
            {open ? (
              <p className="text-xs text-[var(--fg-muted)] mt-0.5">
                Offices to prioritise this week to lift Circle Digital %. Math assumes each targeted office moves to 80% digital adoption.
              </p>
            ) : (
              <p className="text-xs text-[var(--fg-muted)] mt-0.5">
                +10pp goal: <strong>{plan10OfficeCount}</strong> offices · +5pp goal: <strong>{plan5OfficeCount}</strong> offices · Click to expand
              </p>
            )}
          </div>
          <span className="shrink-0 mt-0.5 text-[var(--fg-muted)] transition-transform duration-200 ease-in-out">
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
