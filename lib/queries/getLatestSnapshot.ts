import { createServiceClient } from '@/lib/supabase/server';
import type { UploadSnapshot } from '@/lib/supabase/types';

export async function getLatestSnapshot(): Promise<UploadSnapshot | null> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from('upload_snapshots')
    .select('*')
    .order('snapshot_date', { ascending: false })
    .limit(1)
    .single();

  if (error) return null;
  return data as UploadSnapshot;
}
