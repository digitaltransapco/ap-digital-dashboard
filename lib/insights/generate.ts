import type { CircleStats } from '@/lib/queries/getCircleStats';

export interface BiCallout {
  id: string;
  title: string;
  subtitle?: string;
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
  /** Per-mode digital transaction counts for this office */
  mode_cnts?: Record<string, number>;
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

  // Exclude orphan offices (not in offices_master — division_name is empty)
  const knownOffices = offices.filter((o) => o.division_name !== '');

  // 1. Digital Headroom (Top-20 high-volume laggards)
  const laggards = knownOffices
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
    subtitle: 'Top-20 high-volume laggards',
    body: `If your bottom-20 high-volume laggards matched the circle's average digital % (${circleStats.digital_pct_cnt.toFixed(1)}%), AP Circle would log ${headroomTxnsRounded.toLocaleString('en-IN')} additional digital transactions per day. That's a +${liftPp.toFixed(1)} pp lift on the headline number.`,
    cta: 'Focus divisional reviews on these offices first.',
    variant: 'warning',
  });

  // 2. Quick Wins — offices within 5pp of 50% AND/OR 70% milestones
  const quickWins50 = knownOffices
    .filter((o) => { const p = o.digital_pct_cnt ?? 0; return p >= 45 && p < 50; })
    .sort((a, b) => b.total_cnt - a.total_cnt);
  const quickWins70 = knownOffices
    .filter((o) => { const p = o.digital_pct_cnt ?? 0; return p >= 65 && p < 70; })
    .sort((a, b) => b.total_cnt - a.total_cnt);

  const lines: string[] = [];
  if (quickWins70.length > 0) {
    const top3 = quickWins70.slice(0, 3).map((o) => o.office_name).join(', ');
    lines.push(`Near 70% milestone: ${quickWins70.length} office${quickWins70.length > 1 ? 's' : ''} within 5 pp (top 3: ${top3}).`);
  }
  if (quickWins50.length > 0) {
    const top3 = quickWins50.slice(0, 3).map((o) => o.office_name).join(', ');
    lines.push(`Near 50% milestone: ${quickWins50.length} office${quickWins50.length > 1 ? 's' : ''} within 5 pp (top 3: ${top3}).`);
  }

  callouts.push({
    id: 'quickwins',
    title: 'Quick Wins',
    body: lines.length > 0
      ? lines.join(' ')
      : 'All high-volume offices have crossed the major digital milestones. Maintain momentum!',
    cta: 'Assign nudge campaigns to these offices this week.',
    variant: 'positive',
  });

  // 3. Cash-Only Watchlist — >50 txns, 0 digital
  const cashOnly = knownOffices
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

  // 4. Star Division — include top digital mode playbook detail
  const avgDivPct = divisions.reduce((s, d) => s + d.digital_pct_cnt, 0) / (divisions.length || 1);
  const starDiv = [...divisions].sort((a, b) => b.digital_pct_cnt - a.digital_pct_cnt)[0];
  const aboveAvg = starDiv ? starDiv.digital_pct_cnt - avgDivPct : 0;

  let starModeDetail = '';
  if (starDiv) {
    // Aggregate mode_cnts across all offices in the star division
    const modeTotals: Record<string, number> = {};
    for (const o of knownOffices.filter((o) => o.division_name === starDiv.division_name)) {
      if (o.mode_cnts) {
        for (const [mode, cnt] of Object.entries(o.mode_cnts)) {
          modeTotals[mode] = (modeTotals[mode] ?? 0) + cnt;
        }
      }
    }
    const totalDigital = Object.values(modeTotals).reduce((s, v) => s + v, 0);
    const topModeEntry = Object.entries(modeTotals).sort((a, b) => b[1] - a[1])[0];
    if (topModeEntry && totalDigital > 0) {
      const pct = Math.round((topModeEntry[1] / totalDigital) * 100);
      starModeDetail = ` Their secret weapon: ${topModeEntry[0]} drives ${pct}% of their digital count — replicate.`;
    }
  }

  callouts.push({
    id: 'star',
    title: 'Star Division',
    body: starDiv
      ? `${starDiv.division_name} leads on digital % at ${starDiv.digital_pct_cnt.toFixed(1)}%, ${aboveAvg.toFixed(1)} pp above the circle average.${starModeDetail}`
      : 'Upload data to see the star division.',
    cta: 'Share their playbook with other divisions.',
    variant: 'info',
  });

  return callouts;
}
