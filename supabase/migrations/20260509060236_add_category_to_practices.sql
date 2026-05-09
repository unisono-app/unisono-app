CREATE TYPE practice_category AS ENUM ('practice', 'event');

ALTER TABLE practices
  ADD COLUMN category practice_category NOT NULL DEFAULT 'practice',
  ADD COLUMN event_name text;
