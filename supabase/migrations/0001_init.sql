-- One-time seed from the hierarchy XLSX. Filtered to office_status_id = 1
-- and to the 29 territorial divisions (excludes RMS AG/TP/V/Y and the
-- stray 'Vijayawada Region' row).
CREATE TABLE offices_master (
  office_id            BIGINT PRIMARY KEY,
  office_name          TEXT NOT NULL,
  office_type_code     TEXT NOT NULL,           -- HPO | SPO | BPO | BPC | (others excluded from dashboard)
  pincode              INTEGER,
  division_name        TEXT NOT NULL,
  region_name          TEXT NOT NULL,
  ho_id                BIGINT,
  ho_name              TEXT,
  so_id                BIGINT,
  so_name              TEXT,
  created_at           TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_om_division ON offices_master(division_name);
CREATE INDEX idx_om_type ON offices_master(office_type_code);

-- One row per CSV upload. snapshot_date is the cumulative-as-of date.
CREATE TABLE upload_snapshots (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  snapshot_date      DATE NOT NULL UNIQUE,       -- e.g. 2026-05-13
  period_start       DATE NOT NULL,              -- e.g. 2026-05-01
  period_end         DATE NOT NULL,              -- = snapshot_date
  uploaded_at        TIMESTAMPTZ DEFAULT now(),
  source_filename    TEXT,
  row_count          INTEGER,
  matched_offices    INTEGER,                    -- joined to master
  orphan_offices     INTEGER,                    -- in CSV, not in master
  total_cnt          INTEGER,                    -- circle aggregates cached
  total_amt          NUMERIC(15,2),
  digital_cnt        INTEGER,
  digital_amt        NUMERIC(15,2),
  notes              TEXT
);
CREATE INDEX idx_us_date ON upload_snapshots(snapshot_date DESC);

-- Per-office, per-snapshot. Mode-wise stored as JSONB for flexibility.
CREATE TABLE office_transactions (
  id                  BIGSERIAL PRIMARY KEY,
  snapshot_id         UUID REFERENCES upload_snapshots(id) ON DELETE CASCADE,
  office_id           BIGINT NOT NULL,           -- soft FK (no constraint, orphans allowed)
  manual_cnt          INTEGER NOT NULL DEFAULT 0,
  manual_amt          NUMERIC(15,2) NOT NULL DEFAULT 0,
  digital_cnt         INTEGER NOT NULL DEFAULT 0,
  digital_amt         NUMERIC(15,2) NOT NULL DEFAULT 0,
  other_cnt           INTEGER NOT NULL DEFAULT 0,
  other_amt           NUMERIC(15,2) NOT NULL DEFAULT 0,
  total_cnt           INTEGER NOT NULL DEFAULT 0,
  total_amt           NUMERIC(15,2) NOT NULL DEFAULT 0,
  digital_pct_cnt     NUMERIC(5,2),              -- nullable when total_cnt = 0
  digital_pct_amt     NUMERIC(5,2),
  modes               JSONB NOT NULL DEFAULT '{}'::jsonb,
  UNIQUE(snapshot_id, office_id)
);
CREATE INDEX idx_ot_snapshot ON office_transactions(snapshot_id);
CREATE INDEX idx_ot_office   ON office_transactions(office_id);
CREATE INDEX idx_ot_total    ON office_transactions(snapshot_id, total_cnt DESC);
