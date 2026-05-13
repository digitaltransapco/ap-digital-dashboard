import Papa from 'papaparse';

export interface RawOfficeRow {
  office_id: number;
  office_name: string;
  modes: Record<string, { cnt: number; amt: number }>;
  total_cnt: number;
  total_amt: number;
}

export interface ParseResult {
  officeRows: RawOfficeRow[];
  summaryRow: { total_cnt: number; total_amt: number } | null;
  errors: string[];
  rawHeaders: string[];
}

function parseModeColumns(headers: string[]): Array<{ mode: string; field: 'cnt' | 'amt'; colIndex: number }> {
  const result: Array<{ mode: string; field: 'cnt' | 'amt'; colIndex: number }> = [];
  headers.forEach((h, i) => {
    const cntMatch = h.match(/^(.+)\s*\(Cnt\)$/i);
    const amtMatch = h.match(/^(.+)\s*\(Amt\)$/i);
    if (cntMatch) result.push({ mode: cntMatch[1].trim(), field: 'cnt', colIndex: i });
    if (amtMatch) result.push({ mode: amtMatch[1].trim(), field: 'amt', colIndex: i });
  });
  return result;
}

export function parseBookingCsv(csvText: string): ParseResult {
  const errors: string[] = [];

  const parsed = Papa.parse<string[]>(csvText, {
    header: false,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim(),
  });

  if (parsed.errors.length > 0) {
    errors.push(...parsed.errors.map((e) => e.message));
  }

  const rows = parsed.data as string[][];
  if (rows.length < 2) {
    return { officeRows: [], summaryRow: null, errors: ['CSV has fewer than 2 rows'], rawHeaders: [] };
  }

  const headers = rows[0].map((h) => h.trim());
  const modeColumns = parseModeColumns(headers);

  const officeIdIdx = headers.findIndex((h) => /office.?id/i.test(h));
  const officeNameIdx = headers.findIndex((h) => /office.?name/i.test(h));
  const totalCntIdx = headers.findIndex((h) => /total.*cnt|total.*count/i.test(h));
  const totalAmtIdx = headers.findIndex((h) => /total.*amt|total.*amount/i.test(h));

  const officeRows: RawOfficeRow[] = [];
  let summaryRow: { total_cnt: number; total_amt: number } | null = null;

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const rawId = officeIdIdx >= 0 ? row[officeIdIdx]?.trim() : '';
    const rawName = officeNameIdx >= 0 ? row[officeNameIdx]?.trim() : '';

    const isSummary = !rawId || isNaN(Number(rawId));

    const modes: Record<string, { cnt: number; amt: number }> = {};
    for (const { mode, field, colIndex } of modeColumns) {
      if (!modes[mode]) modes[mode] = { cnt: 0, amt: 0 };
      const val = parseFloat(row[colIndex]?.replace(/,/g, '') || '0') || 0;
      modes[mode][field] = val;
    }

    const totalCnt = totalCntIdx >= 0
      ? parseFloat(row[totalCntIdx]?.replace(/,/g, '') || '0') || 0
      : Object.values(modes).reduce((s, m) => s + m.cnt, 0);
    const totalAmt = totalAmtIdx >= 0
      ? parseFloat(row[totalAmtIdx]?.replace(/,/g, '') || '0') || 0
      : Object.values(modes).reduce((s, m) => s + m.amt, 0);

    if (isSummary) {
      summaryRow = { total_cnt: totalCnt, total_amt: totalAmt };
    } else {
      officeRows.push({
        office_id: Number(rawId),
        office_name: rawName,
        modes,
        total_cnt: totalCnt,
        total_amt: totalAmt,
      });
    }
  }

  return { officeRows, summaryRow, errors, rawHeaders: headers };
}
