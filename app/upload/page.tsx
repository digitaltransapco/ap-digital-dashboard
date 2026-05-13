'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { FileDropzone } from '@/components/upload/FileDropzone';
import { ValidationPreview } from '@/components/upload/ValidationPreview';
import { DeltaPreview } from '@/components/upload/DeltaPreview';
import { parseBookingCsv } from '@/lib/parse/parseBookingCsv';
import { computeAggregates } from '@/lib/parse/computeAggregates';
import { formatCount } from '@/lib/utils/format';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, CheckCircle2 } from 'lucide-react';

interface ParsedState {
  filename: string;
  rowCount: number;
  aggregates: ReturnType<typeof computeAggregates>;
  summaryTotalCnt: number | null;
  matchedCount: number;
}

interface PrevSnapshot {
  snapshot_date: string;
  total_cnt: number | null;
  digital_cnt: number | null;
}

export default function UploadPage() {
  const router = useRouter();
  const [parsed, setParsed] = useState<ParsedState | null>(null);
  const [snapshotDate, setSnapshotDate] = useState(new Date().toISOString().slice(0, 10));
  const [periodStart, setPeriodStart] = useState(new Date().toISOString().slice(0, 8) + '01');
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [prevSnapshot, setPrevSnapshot] = useState<PrevSnapshot | null>(null);
  const [snapshotExists, setSnapshotExists] = useState(false);

  const handleFile = useCallback(async (file: File) => {
    const text = await file.text();
    const { officeRows, summaryRow, errors } = parseBookingCsv(text);

    if (errors.length > 0 && officeRows.length === 0) {
      toast.error('Parse failed: ' + errors[0]);
      return;
    }

    const aggregates = computeAggregates(officeRows);

    try {
      const res = await fetch('/api/snapshots');
      const json = await res.json();
      const snapshots: PrevSnapshot[] = json.snapshots ?? [];
      const existing = snapshots.find((s: PrevSnapshot) => s.snapshot_date === snapshotDate);
      setSnapshotExists(!!existing);
      const prev = snapshots.find((s: PrevSnapshot) => s.snapshot_date < snapshotDate);
      setPrevSnapshot(prev ?? null);
    } catch {
      // ignore - non-critical
    }

    setParsed({
      filename: file.name,
      rowCount: officeRows.length,
      aggregates,
      summaryTotalCnt: summaryRow?.total_cnt ?? null,
      matchedCount: aggregates.length,
    });
  }, [snapshotDate]);

  const handleUpload = async () => {
    if (!parsed) return;
    setLoading(true);

    const payload = {
      snapshot_date: snapshotDate,
      period_start: periodStart,
      period_end: snapshotDate,
      source_filename: parsed.filename,
      offices: parsed.aggregates,
      pin: pin || undefined,
    };

    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error ?? 'Upload failed');
        return;
      }
      toast.success(`Uploaded ${formatCount(json.circle_totals.total_cnt)} transactions · ${json.matched_offices} offices matched`);
      setTimeout(() => router.push('/'), 1200);
    } catch {
      toast.error('Network error');
    } finally {
      setLoading(false);
    }
  };

  const currentTotalCnt = parsed?.aggregates.reduce((s, a) => s + a.total_cnt, 0) ?? 0;
  const currentDigitalCnt = parsed?.aggregates.reduce((s, a) => s + a.digital_cnt, 0) ?? 0;
  const currentDigitalPct = currentTotalCnt > 0 ? (currentDigitalCnt / currentTotalCnt) * 100 : 0;
  const summaryMatch = parsed?.summaryTotalCnt == null || Math.abs(currentTotalCnt - parsed.summaryTotalCnt) / Math.max(parsed.summaryTotalCnt, 1) < 0.001;

  return (
    <div className="min-h-screen bg-[var(--bg)] py-10 px-4">
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Upload Booking Report</h1>
          <p className="text-sm text-gray-500 mt-1">AP Circle · Cumulative MTD Booking Paymentwise CSV</p>
        </div>

        <FileDropzone onFile={handleFile} disabled={loading} />

        {parsed && (
          <>
            <div className="p-4 rounded-lg border bg-white space-y-4">
              <h3 className="font-semibold text-gray-800">Detected</h3>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-gray-500 text-xs">Rows parsed</p>
                  <p className="font-medium">{formatCount(parsed.rowCount)} office rows{parsed.summaryTotalCnt != null ? ' + 1 summary' : ''}</p>
                </div>
                <div>
                  <p className="text-gray-500 text-xs">Source file</p>
                  <p className="font-medium truncate">{parsed.filename}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-500 block mb-1">Snapshot date</label>
                  <Input type="date" value={snapshotDate} onChange={(e) => setSnapshotDate(e.target.value)} className="text-sm" />
                </div>
                <div>
                  <label className="text-xs text-gray-500 block mb-1">Period start</label>
                  <Input type="date" value={periodStart} onChange={(e) => setPeriodStart(e.target.value)} className="text-sm" />
                </div>
              </div>
            </div>

            <ValidationPreview
              rowCount={parsed.rowCount}
              matchedOffices={parsed.matchedCount}
              orphanOffices={0}
              orphanNames={[]}
              summaryMatch={summaryMatch}
              summaryDiff={parsed.summaryTotalCnt != null ? currentTotalCnt - parsed.summaryTotalCnt : 0}
              snapshotExists={snapshotExists}
            />

            {prevSnapshot && prevSnapshot.total_cnt != null && (
              <DeltaPreview
                currentTotalCnt={currentTotalCnt}
                currentDigitalPct={currentDigitalPct}
                prevTotalCnt={prevSnapshot.total_cnt}
                prevDigitalPct={prevSnapshot.total_cnt > 0 ? ((prevSnapshot.digital_cnt ?? 0) / prevSnapshot.total_cnt) * 100 : 0}
                prevDate={prevSnapshot.snapshot_date}
              />
            )}

            <div className="space-y-3">
              <div>
                <label className="text-xs text-gray-500 block mb-1">PIN (if required)</label>
                <Input type="password" placeholder="Enter upload PIN" value={pin} onChange={(e) => setPin(e.target.value)} className="max-w-xs" />
              </div>

              <Button
                onClick={handleUpload}
                disabled={loading || parsed.rowCount === 0}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3"
              >
                {loading
                  ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Uploading…</>
                  : <><CheckCircle2 className="w-4 h-4 mr-2" /> Confirm Upload</>}
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
