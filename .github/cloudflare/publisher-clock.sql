CREATE TABLE IF NOT EXISTS clock_ticks (
  id INTEGER PRIMARY KEY,
  state TEXT NOT NULL CHECK (state IN ('attempting','accepted','retrying')),
  at_ms INTEGER NOT NULL,
  code TEXT NOT NULL DEFAULT ''
);
CREATE INDEX IF NOT EXISTS clock_ticks_time ON clock_ticks(at_ms);
