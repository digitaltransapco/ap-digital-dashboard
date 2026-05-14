/**
 * One-time: add the 2 new SOs that appear in May reports but are missing
 * from the 30-March hierarchy file. Assigned to Visakhapatnam Division
 * as a placeholder until Sri Prasanna confirms the correct division.
 *
 *   npx tsx scripts/add-new-sos.ts
 */
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

const envPath = path.resolve(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) dotenv.config({ path: envPath });
else dotenv.config();

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

const NEW_SOS = [
  {
    office_id: 11661541,
    office_name: 'Dhanalakshmipuram S.O',
    office_type_code: 'SPO',
    division_name: 'Visakhapatnam Division',
    region_name: 'Visakhapatnam Region',
    pincode: null,
  },
  {
    office_id: 11661542,
    office_name: 'Sagar Nagar S.O',
    office_type_code: 'SPO',
    division_name: 'Visakhapatnam Division',
    region_name: 'Visakhapatnam Region',
    pincode: null,
  },
];

async function main() {
  const { error } = await sb
    .from('offices_master')
    .upsert(NEW_SOS, { onConflict: 'office_id' });

  if (error) {
    console.error('Upsert failed:', error.message);
    process.exit(1);
  }

  console.log('Added / updated:');
  for (const o of NEW_SOS) {
    console.log(`  ${o.office_id} — ${o.office_name} → ${o.division_name} [${o.office_type_code}]`);
  }

  // Verify
  const { data } = await sb
    .from('offices_master')
    .select('office_id, office_name, office_type_code, division_name')
    .in('office_id', NEW_SOS.map((o) => o.office_id));
  console.log('\nVerified in master:');
  console.table(data);

  // Confirm distinct division count
  const { data: divCount } = await sb
    .from('offices_master')
    .select('division_name');
  const unique = new Set((divCount ?? []).map((r: { division_name: string }) => r.division_name));
  console.log(`\nDistinct divisions in master: ${unique.size}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
