-- annual_schedule_comments を年度ベースに変更
-- annual_schedule_id (uuid FK) を削除し、year (int) を追加

ALTER TABLE annual_schedule_comments
  DROP COLUMN annual_schedule_id;

ALTER TABLE annual_schedule_comments
  ADD COLUMN year int NOT NULL;

CREATE INDEX annual_schedule_comments_year_idx
  ON annual_schedule_comments (year);
