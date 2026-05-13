import * as XLSX from 'xlsx';
import * as path from 'path';
import * as fs from 'fs';
import { createClient } from '@supabase/supabase-js';
import { AP_CIRCLE_DIVISIONS, OFFICE_TYPE_LABELS } from '../lib/utils/constants';
import * as dotenv from 'dotenv';

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const VALID_TYPE_CODES = new Set(Object.keys(OFFICE_TYPE_LABELS));
const VALID_DIVISIONS = new Set<string>(AP_CIRCLE_DIVISIONS);

interface XlsxRow {
  [key: string]: string | number | undefined;
}

function findColumn(headers: string[], patterns: RegExp[]): string | undefined {
  return headers.find((h) => patterns.some((p) => p.test(h)));
}

async function main() {
  const dataDir = path.resolve(__dirname, '../data');
  const files = fs.readdirSync(dataDir).filter((f) => f.endsWith('.xlsx') || f.endsWith('.xls'));
  if (files.length === 0) {
    console.error('No XLSX file found in data/');
    process.exit(1);
  }

  const xlsxPath = path.join(dataDir, files[0]);
  console.log(`Reading: ${xlsxPath}`);

  const workbook = XLSX.readFile(xlsxPath);
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows: XlsxRow[] = XLSX.utils.sheet_to_json(sheet, { defval: '' });

  console.log(`Total rows in sheet: ${rows.length}`);

  const headers = Object.keys(rows[0] || {});

  const colOfficeId = findColumn(headers, [/office.?id/i, /^office_id$/i]) ?? '';
  const colOfficeName = findColumn(headers, [/office.?name/i]) ?? '';
  const colTypeCode = findColumn(headers, [/office.?type.?code/i, /type.?code/i]) ?? '';
  const colPincode = findColumn(headers, [/pin.?code/i, /pincode/i]);
  const colDivision = findColumn(headers, [/division.?name/i]) ?? '';
  const colRegion = findColumn(headers, [/region.?name/i]);
  const colStatusId = findColumn(headers, [/office.?status.?id/i, /status.?id/i]);
  const colHoId = findColumn(headers, [/^ho.?id$/i]);
  const colHoName = findColumn(headers, [/^ho.?name$/i]);
  const colSoId = findColumn(headers, [/^so.?id$/i]);
  const colSoName = findColumn(headers, [/^so.?name$/i]);

  if (!colOfficeId || !colOfficeName || !colTypeCode || !colDivision) {
    console.error('Missing required columns. Found:', headers.join(', '));
    process.exit(1);
  }

  interface OfficeMasterInsert {
    office_id: number;
    office_name: string;
    office_type_code: string;
    pincode?: number | null;
    division_name: string;
    region_name: string;
    ho_id?: number | null;
    ho_name?: string | null;
    so_id?: number | null;
    so_name?: string | null;
  }
  const filtered: OfficeMasterInsert[] = [];
  let skippedStatus = 0, skippedType = 0, skippedDivision = 0;

  for (const row of rows) {
    const statusId = colStatusId ? Number(row[colStatusId]) : 1;
    if (colStatusId && statusId !== 1) { skippedStatus++; continue; }

    const typeCode = String(row[colTypeCode] ?? '').trim().toUpperCase();
    if (!VALID_TYPE_CODES.has(typeCode)) { skippedType++; continue; }

    const divName = String(row[colDivision] ?? '').trim();
    if (!VALID_DIVISIONS.has(divName)) { skippedDivision++; continue; }

    const officeId = Number(row[colOfficeId]);
    if (!officeId) continue;

    filtered.push({
      office_id: officeId,
      office_name: String(row[colOfficeName] ?? '').trim(),
      office_type_code: typeCode,
      pincode: colPincode && row[colPincode] ? Number(row[colPincode]) : null,
      division_name: divName,
      region_name: colRegion ? String(row[colRegion] ?? '').trim() : '',
      ho_id: colHoId && row[colHoId] ? Number(row[colHoId]) : null,
      ho_name: colHoName ? String(row[colHoName] ?? '').trim() || null : null,
      so_id: colSoId && row[colSoId] ? Number(row[colSoId]) : null,
      so_name: colSoName ? String(row[colSoName] ?? '').trim() || null : null,
    });
  }

  console.log(`\nFiltered: ${filtered.length} offices`);
  console.log(`Skipped: ${skippedStatus} (status≠1), ${skippedType} (invalid type), ${skippedDivision} (invalid division)`);

  // Verify divisions
  const foundDivisions = new Set(filtered.map((r) => r.division_name));
  const missingDivisions = AP_CIRCLE_DIVISIONS.filter((d) => !foundDivisions.has(d));
  if (missingDivisions.length > 0) {
    console.warn('\nWARN: Missing divisions:', missingDivisions);
  }

  if (foundDivisions.size !== 29) {
    console.error(`\nFATAL: Expected exactly 29 divisions, found ${foundDivisions.size}`);
    process.exit(1);
  }

  // Upsert in chunks of 500
  const CHUNK = 500;
  let upserted = 0;
  for (let i = 0; i < filtered.length; i += CHUNK) {
    const chunk = filtered.slice(i, i + CHUNK);
    const { error } = await supabase.from('offices_master').upsert(chunk, { onConflict: 'office_id' });
    if (error) {
      console.error(`Error upserting chunk at ${i}:`, error.message);
      process.exit(1);
    }
    upserted += chunk.length;
    process.stdout.write(`\rUpserted ${upserted}/${filtered.length}...`);
  }

  console.log('\n\nSeed complete!\n');

  // Summary table
  const typeSummary = new Map<string, number>();
  for (const r of filtered) {
    typeSummary.set(r.office_type_code, (typeSummary.get(r.office_type_code) ?? 0) + 1);
  }
  console.log('Summary by office type:');
  typeSummary.forEach((count, code) => {
    console.log(`  ${code}: ${count}`);
  });
  console.log(`\nTotal divisions: ${foundDivisions.size}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
