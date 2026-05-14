-- v1.2: Recompute manual/digital/total per Directorate mode reclassification.
-- The modes JSONB column has raw per-mode counts; we reinterpret here so
-- existing snapshots stay consistent with new logic.
--
-- IMPORTANT: Before running, verify the JSONB structure with:
--   SELECT modes FROM office_transactions LIMIT 1;
-- Adjust the path expressions below if the structure differs.
-- Expected structure: { "Cash": { "cnt": 123, "amt": 4567 }, "DQR Scan": ... }

BEGIN;

-- Step 1: Recompute manual_cnt (Cash only)
UPDATE office_transactions SET
  manual_cnt = COALESCE((modes->'Cash'->>'cnt')::int, 0),
  manual_amt = COALESCE((modes->'Cash'->>'amt')::numeric, 0);

-- Step 2: Recompute digital_cnt (12 modes only)
UPDATE office_transactions SET
  digital_cnt =
      COALESCE((modes->'DQR Scan'->>'cnt')::int, 0)
    + COALESCE((modes->'SBIPOS-CARD'->>'cnt')::int, 0)
    + COALESCE((modes->'SBIPOS BHARATQR'->>'cnt')::int, 0)
    + COALESCE((modes->'SBIEPAY BHARATQR'->>'cnt')::int, 0)
    + COALESCE((modes->'SBIEPAY UPI'->>'cnt')::int, 0)
    + COALESCE((modes->'SBIEPAY Credit Card'->>'cnt')::int, 0)
    + COALESCE((modes->'SBIEPAY Debit Card'->>'cnt')::int, 0)
    + COALESCE((modes->'SBIEPAY NEFT'->>'cnt')::int, 0)
    + COALESCE((modes->'RTGS'->>'cnt')::int, 0)
    + COALESCE((modes->'Wallet'->>'cnt')::int, 0)
    + COALESCE((modes->'POSB'->>'cnt')::int, 0)
    + COALESCE((modes->'IPPB'->>'cnt')::int, 0),
  digital_amt =
      COALESCE((modes->'DQR Scan'->>'amt')::numeric, 0)
    + COALESCE((modes->'SBIPOS-CARD'->>'amt')::numeric, 0)
    + COALESCE((modes->'SBIPOS BHARATQR'->>'amt')::numeric, 0)
    + COALESCE((modes->'SBIEPAY BHARATQR'->>'amt')::numeric, 0)
    + COALESCE((modes->'SBIEPAY UPI'->>'amt')::numeric, 0)
    + COALESCE((modes->'SBIEPAY Credit Card'->>'amt')::numeric, 0)
    + COALESCE((modes->'SBIEPAY Debit Card'->>'amt')::numeric, 0)
    + COALESCE((modes->'SBIEPAY NEFT'->>'amt')::numeric, 0)
    + COALESCE((modes->'RTGS'->>'amt')::numeric, 0)
    + COALESCE((modes->'Wallet'->>'amt')::numeric, 0)
    + COALESCE((modes->'POSB'->>'amt')::numeric, 0)
    + COALESCE((modes->'IPPB'->>'amt')::numeric, 0);

-- Step 3: Zero out the "other" bucket (excluded modes no longer counted)
UPDATE office_transactions SET
  other_cnt = 0,
  other_amt = 0;

-- Step 4: Recompute total_cnt and digital_pct_cnt
UPDATE office_transactions SET
  total_cnt = manual_cnt + digital_cnt,
  total_amt = manual_amt + digital_amt,
  digital_pct_cnt = CASE
    WHEN (manual_cnt + digital_cnt) > 0
    THEN ROUND(digital_cnt::numeric / (manual_cnt + digital_cnt) * 100, 2)
    ELSE NULL
  END,
  digital_pct_amt = CASE
    WHEN (manual_amt + digital_amt) > 0
    THEN ROUND(digital_amt / (manual_amt + digital_amt) * 100, 2)
    ELSE NULL
  END;

-- Step 5: Recompute cached aggregates on upload_snapshots
UPDATE upload_snapshots us SET
  total_cnt = sub.t_cnt,
  total_amt = sub.t_amt,
  digital_cnt = sub.d_cnt,
  digital_amt = sub.d_amt
FROM (
  SELECT snapshot_id,
         SUM(total_cnt) AS t_cnt, SUM(total_amt) AS t_amt,
         SUM(digital_cnt) AS d_cnt, SUM(digital_amt) AS d_amt
  FROM office_transactions
  GROUP BY snapshot_id
) sub
WHERE sub.snapshot_id = us.id;

COMMIT;
