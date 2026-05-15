import { NextRequest, NextResponse } from 'next/server';
import ExcelJS from 'exceljs';
import { createServiceClient } from '@/lib/supabase/server';
import { ALL_DIVISIONS } from '@/lib/utils/constants';

export const dynamic = 'force-dynamic';

// The 7 digital modes shown as individual columns in the report
const REPORT_MODES = [
  'DQR Scan',
  'SBIPOS-CARD',
  'SBIPOS BHARATQR',
  'SBIEPAY UPI',
  'SBIEPAY Credit Card',
  'SBIEPAY Debit Card',
  'SBIEPAY NEFT',
] as const;

// Column headers matching the report image (all caps for credit/debit)
const MODE_HEADERS = [
  'DQR Scan',
  'SBIPOS-CARD',
  'SBIPOS BHARATQR',
  'SBIEPAY UPI',
  'SBIEPAY CREDIT CARD',
  'SBIEPAY DEBIT CARD',
  'SBIEPAY NEFT',
];

type TxnRow = {
  office_id: number;
  manual_cnt: number | null;
  modes: Record<string, { cnt: number; amt: number }> | null;
};

type MasterRow = { office_id: number; division_name: string };

function stripDivision(name: string): string {
  return name.replace(/ Divison$/, '').replace(/ Division$/, '');
}

function fmtDate(isoDate: string): string {
  const [y, mo, d] = isoDate.split('-');
  return `${d}.${mo}.${y}`;
}

export async function GET(req: NextRequest) {
  const snapshotId = req.nextUrl.searchParams.get('snapshotId');
  if (!snapshotId) {
    return NextResponse.json({ error: 'snapshotId required' }, { status: 400 });
  }

  const supabase = createServiceClient();

  // Snapshot date for the title
  const { data: snap } = await supabase
    .from('upload_snapshots')
    .select('snapshot_date')
    .eq('id', snapshotId)
    .single();
  const snapshotDate: string = snap?.snapshot_date ?? '';

  // Fetch all transactions with manual_cnt + modes JSONB
  const PAGE_SIZE = 1000;
  const allTxns: TxnRow[] = [];
  let page = 0;
  while (true) {
    const { data } = await supabase
      .from('office_transactions')
      .select('office_id, manual_cnt, modes')
      .eq('snapshot_id', snapshotId)
      .order('id', { ascending: true })
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);
    if (!data || data.length === 0) break;
    allTxns.push(...(data as TxnRow[]));
    if (data.length < PAGE_SIZE) break;
    page++;
  }

  // Build division → office mapping
  const officeIds = allTxns.map((r) => r.office_id);
  const masterMap = new Map<number, string>();
  const BATCH = 500;
  for (let i = 0; i < officeIds.length; i += BATCH) {
    const { data } = await supabase
      .from('offices_master')
      .select('office_id, division_name')
      .in('office_id', officeIds.slice(i, i + BATCH));
    for (const r of (data ?? []) as MasterRow[]) {
      masterMap.set(r.office_id, r.division_name);
    }
  }

  // Aggregate by division
  type DivAgg = { cash: number; modeCnts: Record<string, number> };
  const divMap = new Map<string, DivAgg>();
  for (const div of ALL_DIVISIONS) {
    divMap.set(div, {
      cash: 0,
      modeCnts: Object.fromEntries(REPORT_MODES.map((m) => [m, 0])),
    });
  }
  for (const row of allTxns) {
    const divName = masterMap.get(row.office_id);
    if (!divName || !divMap.has(divName)) continue;
    const d = divMap.get(divName)!;
    d.cash += row.manual_cnt ?? 0;
    if (row.modes) {
      for (const mode of REPORT_MODES) {
        d.modeCnts[mode] += row.modes[mode]?.cnt ?? 0;
      }
    }
  }

  // Compute per-division totals and sort by digital % descending
  const divRows = Array.from(divMap.entries())
    .map(([div, d]) => {
      const totalDigital = REPORT_MODES.reduce((s, m) => s + d.modeCnts[m], 0);
      const total = d.cash + totalDigital;
      const pct = total > 0 ? (totalDigital / total) * 100 : 0;
      return { div, cash: d.cash, modeCnts: d.modeCnts, totalDigital, total, pct };
    })
    .sort((a, b) => b.pct - a.pct);

  // Grand totals
  const grandCash = divRows.reduce((s, r) => s + r.cash, 0);
  const grandModeCnts = Object.fromEntries(
    REPORT_MODES.map((m) => [m, divRows.reduce((s, r) => s + r.modeCnts[m], 0)]),
  );
  const grandDigital = divRows.reduce((s, r) => s + r.totalDigital, 0);
  const grandTotal = grandCash + grandDigital;
  const grandPct = grandTotal > 0 ? (grandDigital / grandTotal) * 100 : 0;

  // ─── Build workbook ──────────────────────────────────────────────────────────
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Digital Transactions');

  const HEADER_ROW = 2;
  const DATA_START = 3;
  const DATA_END = DATA_START + divRows.length - 1;
  const TOTAL_ROW = DATA_END + 1;
  const NUM_COLS = 14; // A–N
  const PCT_COL = 'N';

  // Row 1 — merged title
  const titleText = snapshotDate
    ? `Daily report on Digital transactions dated ${fmtDate(snapshotDate)}`
    : 'Daily report on Digital transactions';
  ws.addRow([titleText]);
  ws.mergeCells(`A1:N1`);
  const titleCell = ws.getCell('A1');
  titleCell.font = { bold: true, size: 12 };
  titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
  titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9E1F2' } };
  ws.getRow(1).height = 22;

  // Row 2 — column headers
  const headers = [
    'SL No', 'Division', 'Cash',
    ...MODE_HEADERS,
    'Total Non-Digital', 'Total Digital', 'Total', '% Digital',
  ];
  ws.addRow(headers);
  const hRow = ws.getRow(HEADER_ROW);
  hRow.height = 36;
  hRow.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 10 };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2E5E9B' } };
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    cell.border = {
      top: { style: 'thin', color: { argb: 'FFFFFFFF' } },
      left: { style: 'thin', color: { argb: 'FFFFFFFF' } },
      bottom: { style: 'thin', color: { argb: 'FFFFFFFF' } },
      right: { style: 'thin', color: { argb: 'FFFFFFFF' } },
    };
  });

  // Data rows
  for (let i = 0; i < divRows.length; i++) {
    const r = divRows[i];
    const rowArr = [
      i + 1,
      stripDivision(r.div),
      r.cash,
      r.modeCnts['DQR Scan'],
      r.modeCnts['SBIPOS-CARD'],
      r.modeCnts['SBIPOS BHARATQR'],
      r.modeCnts['SBIEPAY UPI'],
      r.modeCnts['SBIEPAY Credit Card'],
      r.modeCnts['SBIEPAY Debit Card'],
      r.modeCnts['SBIEPAY NEFT'],
      r.cash,              // Total Non-Digital
      r.totalDigital,      // Total Digital
      r.total,             // Total
      parseFloat(r.pct.toFixed(2)),
    ];
    const dataRow = ws.addRow(rowArr);
    dataRow.height = 16;
    const isAlt = i % 2 === 1;
    dataRow.eachCell({ includeEmpty: true }, (cell, colNum) => {
      cell.border = {
        top: { style: 'hair', color: { argb: 'FFBCBCBC' } },
        bottom: { style: 'hair', color: { argb: 'FFBCBCBC' } },
        left: { style: 'hair', color: { argb: 'FFBCBCBC' } },
        right: { style: 'hair', color: { argb: 'FFBCBCBC' } },
      };
      if (colNum >= 3 && colNum <= NUM_COLS - 1) {
        cell.alignment = { horizontal: 'right' };
        cell.numFmt = '#,##0';
      }
      if (colNum === NUM_COLS) {
        cell.alignment = { horizontal: 'right' };
        cell.numFmt = '0.00"%"';
      }
      if (colNum === 2) cell.alignment = { horizontal: 'left' };
      if (colNum === 1) cell.alignment = { horizontal: 'center' };
      if (isAlt && colNum !== NUM_COLS) {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF2F2F2' } };
      }
    });
  }

  // Grand Total row
  const gtRow = ws.addRow([
    '',
    'Grand Total',
    grandCash,
    grandModeCnts['DQR Scan'],
    grandModeCnts['SBIPOS-CARD'],
    grandModeCnts['SBIPOS BHARATQR'],
    grandModeCnts['SBIEPAY UPI'],
    grandModeCnts['SBIEPAY Credit Card'],
    grandModeCnts['SBIEPAY Debit Card'],
    grandModeCnts['SBIEPAY NEFT'],
    grandCash,
    grandDigital,
    grandTotal,
    parseFloat(grandPct.toFixed(2)),
  ]);
  gtRow.height = 18;
  gtRow.eachCell({ includeEmpty: true }, (cell, colNum) => {
    cell.font = { bold: true };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFBDD7EE' } };
    cell.border = {
      top: { style: 'medium', color: { argb: 'FF2E5E9B' } },
      bottom: { style: 'medium', color: { argb: 'FF2E5E9B' } },
      left: { style: 'hair', color: { argb: 'FFBCBCBC' } },
      right: { style: 'hair', color: { argb: 'FFBCBCBC' } },
    };
    if (colNum >= 3 && colNum <= NUM_COLS - 1) {
      cell.alignment = { horizontal: 'right' };
      cell.numFmt = '#,##0';
    }
    if (colNum === NUM_COLS) {
      cell.alignment = { horizontal: 'right' };
      cell.numFmt = '0.00"%"';
    }
    if (colNum === 2) cell.alignment = { horizontal: 'left' };
  });

  // Force-apply % format to every cell in column N — eachCell skips cells whose value is 0
  for (let rowNum = DATA_START; rowNum <= TOTAL_ROW; rowNum++) {
    const cell = ws.getCell(rowNum, 14);
    cell.numFmt = '0.00"%"';
    cell.alignment = { horizontal: 'right' };
  }

  // Conditional formatting on % Digital column (col N = 14)
  // Priority determines precedence: lower number = higher priority (wins over others)
  // Conditional formatting precedence: lower priority number wins when multiple rules match.
  // "between" is inclusive on both ends in Excel; priority ordering handles overlap at boundaries.
  ws.addConditionalFormatting({
    ref: `${PCT_COL}${DATA_START}:${PCT_COL}${TOTAL_ROW}`,
    rules: [
      {
        priority: 1,
        type: 'cellIs',
        operator: 'greaterThan', // > 90
        formulae: [90],
        style: {
          fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1A5C2A' } },
          font: { color: { argb: 'FFFFFFFF' }, bold: true },
        },
      },
      {
        priority: 2,
        type: 'cellIs',
        operator: 'between', // 80–90 inclusive; beats rule 3 at boundary 80
        formulae: [80, 90],
        style: {
          fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF70AD47' } },
          font: { color: { argb: 'FF000000' } },
        },
      },
      {
        priority: 3,
        type: 'cellIs',
        operator: 'between', // 50–80 inclusive; boundary 80 already handled by rule 2
        formulae: [50, 80],
        style: {
          fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFF4040' } },
          font: { color: { argb: 'FFFFFFFF' } },
        },
      },
      {
        priority: 4,
        type: 'cellIs',
        operator: 'lessThan', // < 50
        formulae: [50],
        style: {
          fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF9B0000' } },
          font: { color: { argb: 'FFFFFFFF' }, bold: true },
        },
      },
    ],
  });

  // Column widths
  ws.getColumn(1).width = 6;   // SL No
  ws.getColumn(2).width = 24;  // Division
  ws.getColumn(3).width = 10;  // Cash
  ws.getColumn(4).width = 11;  // DQR Scan
  ws.getColumn(5).width = 13;  // SBIPOS-CARD
  ws.getColumn(6).width = 17;  // SBIPOS BHARATQR
  ws.getColumn(7).width = 13;  // SBIEPAY UPI
  ws.getColumn(8).width = 20;  // SBIEPAY CREDIT CARD
  ws.getColumn(9).width = 20;  // SBIEPAY DEBIT CARD
  ws.getColumn(10).width = 13; // SBIEPAY NEFT
  ws.getColumn(11).width = 16; // Total Non-Digital
  ws.getColumn(12).width = 13; // Total Digital
  ws.getColumn(13).width = 10; // Total
  ws.getColumn(14).width = 10; // % Digital

  // Freeze the header row
  ws.views = [{ state: 'frozen', xSplit: 0, ySplit: 2 }];

  const buffer = await wb.xlsx.writeBuffer();
  const filename = `digital-report-${snapshotDate || 'latest'}.xlsx`;

  return new NextResponse(buffer as ArrayBuffer, {
    status: 200,
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  });
}
