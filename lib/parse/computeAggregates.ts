import { bucketOf } from './classifyMode';
import type { RawOfficeRow } from './parseBookingCsv';

export interface OfficeAggregate {
  office_id: number;
  manual_cnt: number;
  manual_amt: number;
  digital_cnt: number;
  digital_amt: number;
  other_cnt: number;
  other_amt: number;
  total_cnt: number;
  total_amt: number;
  digital_pct_cnt: number | null;
  digital_pct_amt: number | null;
  modes: Record<string, { cnt: number; amt: number }>;
}

export function computeAggregates(officeRows: RawOfficeRow[]): OfficeAggregate[] {
  return officeRows.map((row) => {
    let manual_cnt = 0, manual_amt = 0;
    let digital_cnt = 0, digital_amt = 0;
    let other_cnt = 0, other_amt = 0;

    for (const [mode, { cnt, amt }] of Object.entries(row.modes)) {
      const bucket = bucketOf(mode);
      if (bucket === 'manual') { manual_cnt += cnt; manual_amt += amt; }
      else if (bucket === 'digital') { digital_cnt += cnt; digital_amt += amt; }
      else { other_cnt += cnt; other_amt += amt; }
    }

    const total_cnt = row.total_cnt || manual_cnt + digital_cnt + other_cnt;
    const total_amt = row.total_amt || manual_amt + digital_amt + other_amt;

    return {
      office_id: row.office_id,
      manual_cnt, manual_amt,
      digital_cnt, digital_amt,
      other_cnt, other_amt,
      total_cnt, total_amt,
      digital_pct_cnt: total_cnt > 0 ? (digital_cnt / total_cnt) * 100 : null,
      digital_pct_amt: total_amt > 0 ? (digital_amt / total_amt) * 100 : null,
      modes: row.modes,
    };
  });
}
