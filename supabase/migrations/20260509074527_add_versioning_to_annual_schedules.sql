-- 既存の year UNIQUE 制約を削除し、(year, version_number) でユニークに変更
ALTER TABLE annual_schedules DROP CONSTRAINT annual_schedules_year_key;

ALTER TABLE annual_schedules
  ADD COLUMN version_number int NOT NULL DEFAULT 1,
  ADD COLUMN file_label text,
  ADD COLUMN is_current boolean NOT NULL DEFAULT true,
  ADD COLUMN created_at timestamptz NOT NULL DEFAULT now();

ALTER TABLE annual_schedules
  ADD CONSTRAINT annual_schedules_year_version_key UNIQUE (year, version_number);

-- 各年度につき is_current = true は1つだけ
CREATE UNIQUE INDEX annual_schedules_year_current_idx
  ON annual_schedules (year)
  WHERE is_current = true;
