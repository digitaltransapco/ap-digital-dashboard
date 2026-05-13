import type { CircleStats } from '@/lib/queries/getCircleStats';

export interface BiCallout {
  id: string;
  title: string;
  body: string;
  cta: string;
  variant: 'warning' | 'positive' | 'danger' | 'info';
}

export interface OfficeInsightData {
  office_id: number;
  office_name: string;
  division_name: string;
  total_cnt: number;
  digital_pct_cnt: number | null;
  manual_cnt: number;
  top_digital_mode?: string;
}

export interface DivisionInsightData {
  division_name: string;
  digital_pct_cnt: number;
  top_digital_mode?: string;
}

export function generateInsights(
  circleStats: CircleStats,
  offices: OfficeInsightData[],
  divisions: DivisionInsightData[],
): BiCallout[] {
  const callouts: BiCallout[] = [];

  // 1. Digital Headroom
  const laggards = offices
    .filter((o) => (o.digital_pct_cnt ?? 0) < circleStats.digital_pct_cnt && o.total_cnt > 20)
    .sort((a, b) => b.total_cnt - a.total_cnt)
    .slice(0, 20);

  const headroomTxns = laggards.reduce((s, o) => {
    return s + o.total_cnt * (circleStats.digital_pct_cnt - (o.digital_pct_cnt ?? 0)) / 100;
  }, 0);
  const headroomTxnsRounded = Math.round(headroomTxns);
  const liftPp = circleStats.total_cnt > 0
    ? (headroomTxnsRounded / circleStats.total_cnt) * 100
    : 0;

  callouts.push({
    id: 'headroom',
    title: 'Digital Headroom',
    body: `If your bottom-20 high-volume laggards matched the circle's average digital % (${circleStats.digital_pct_cnt.toFixed(1)}%), AP Circle would log ${headroomTxnsRounded.toLocaleString('en-IN')} additional digital transactions per day. That's a +${liftPp.toFixed(1)} pp lift on the headline number.`,
    cta: 'Focus divisional reviews on these offices first.',
    variant: 'warning',
  });

  // 2. Quick Wins — offices within 5pp of 50% or 70%
  const quickWins50 = offices.filter((o) => {
    const p = o.digital_pct_cnt ?? 0;
    return p >= 45 && p < 50;
  });
  const quickWins70 = offices.filter((o) => {
    const p = o.digital_pct_cnt ?? 0;
    return p >= 65 && p < 70;
  });
  const allQuickWins = [...quickWins70, ...quickWins50].sort((a, b) => b.total_cnt - a.total_cnt);
  const qwCount = allQuickWins.length;
  const milestone = quickWins70.length > 0 ? '70%' : '50%';
  const top3Names = allQuickWins.slice(0, 3).map((o) => o.office_name).join(', ');

  callouts.push({
    id: 'quickwins',
    title: 'Quick Wins',
    body: qwCount > 0
      ? `${qwCount} office${qwCount > 1 ? 's are' : ' is'} within 5 percentage points of crossing the ${milestone} digital milestone. A focused push for one week clears the threshold. Top 3: ${top3Names}.`
      : 'All high-volume offices have crossed the major digital milestones. Maintain momentum!',
    cta: 'Assign a nudge campaign to these offices this week.',
    variant: 'positive',
  });

  // 3. Cash-Only Watchlist — >50 txns, 0 digital
  const cashOnly = offices
    .filter((o) => o.total_cnt > 50 && (o.digital_pct_cnt ?? 0) === 0)
    .sort((a, b) => b.total_cnt - a.total_cnt);
  const cashOnlyCount = cashOnly.length;
  const cashTop3 = cashOnly.slice(0, 3).map((o) => `${o.office_name} (${o.division_name})`).join('; ');

  callouts.push({
    id: 'cashonly',
    title: 'Cash-Only Watchlist',
    body: cashOnlyCount > 0
      ? `${cashOnlyCount} office${cashOnlyCount > 1 ? 's' : ''} process more than 50 transactions and accept zero digital payments. Top 3: ${cashTop3 || 'N/A'}.`
      : 'No high-volume cash-only offices detected today. Great progress!',
    cta: 'Escalate to divisional heads for immediate POS enablement.',
    variant: 'danger',
  });

  // 4. Star Division
  const avgDivPct = divisions.reduce((s, d) => s + d.digital_pct_cnt, 0) / (divisions.length || 1);
  const starDiv = divisions.sort((a, b) => b.digital_pct_cnt - a.digital_pct_cnt)[0];
  const aboveAvg = starDiv ? starDiv.digital_pct_cnt - avgDivPct : 0;

  callouts.push({
    id: 'star',
    title: 'Star Division',
    body: starDiv
      ? `${starDiv.division_name} leads on digital % at ${starDiv.digital_pct_cnt.toFixed(1)}%, ${aboveAvg.toFixed(1)} pp above the circle average.${starDiv.top_digital_mode ? ` Their key mode: ${starDiv.top_digital_mode}.` : ''}`
      : 'Upload data to see the star division.',
    cta: 'Share their playbook with other divisions.',
    variant: 'info',
  });

  return callouts;
}
