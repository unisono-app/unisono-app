ALTER TABLE practices ALTER COLUMN schedule TYPE text USING schedule::text;
ALTER TABLE practices ALTER COLUMN content TYPE text USING content::text;
