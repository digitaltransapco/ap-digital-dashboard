import type { BiCallout } from '@/lib/insights/generate';
import { AlertTriangle, TrendingUp, Target, Star } from 'lucide-react';

interface Props {
  callouts: BiCallout[];
}

const VARIANT_STYLES = {
  warning: { bg: 'bg-amber-50 border-amber-200', icon: AlertTriangle, iconColor: 'text-amber-600', titleColor: 'text-amber-900' },
  positive: { bg: 'bg-emerald-50 border-emerald-200', icon: TrendingUp, iconColor: 'text-emerald-600', titleColor: 'text-emerald-900' },
  danger: { bg: 'bg-rose-50 border-rose-200', icon: Target, iconColor: 'text-rose-600', titleColor: 'text-rose-900' },
  info: { bg: 'bg-indigo-50 border-indigo-200', icon: Star, iconColor: 'text-indigo-600', titleColor: 'text-indigo-900' },
};

export function BICalloutStrip({ callouts }: Props) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
      {callouts.map((c) => {
        const { bg, icon: Icon, iconColor, titleColor } = VARIANT_STYLES[c.variant];
        return (
          <div key={c.id} className={`rounded-xl border p-4 flex flex-col gap-2 ${bg}`}>
            <div className="flex items-start gap-2">
              <Icon className={`w-4 h-4 shrink-0 mt-0.5 ${iconColor}`} />
              <div>
                <h3 className={`text-sm font-semibold leading-tight ${titleColor}`}>{c.title}</h3>
                {c.subtitle && <p className={`text-xs font-normal mt-0.5 ${titleColor} opacity-70`}>{c.subtitle}</p>}
              </div>
            </div>
            <p className="text-xs text-gray-700 leading-relaxed flex-1">{c.body}</p>
            <p className="text-xs font-medium text-gray-600 border-t border-black/10 pt-2 mt-1">{c.cta}</p>
          </div>
        );
      })}
    </div>
  );
}
