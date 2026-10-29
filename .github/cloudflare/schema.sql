-- Text-only moderation storage. No email addresses, raw IPs, tokens or media.
PRAGMA foreign_keys = ON;
CREATE TABLE IF NOT EXISTS settings (
  name TEXT PRIMARY KEY CHECK (name = 'rate_salt'),
  value TEXT NOT NULL CHECK (length(value) = 64)
);
INSERT OR IGNORE INTO settings(name,value) VALUES ('rate_salt',lower(hex(randomblob(32))));

CREATE TABLE IF NOT EXISTS capacity (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  active INTEGER NOT NULL DEFAULT 0 CHECK (active BETWEEN 0 AND 2000)
);
INSERT OR IGNORE INTO capacity(id,active) VALUES (1,0);

-- Keep only the opaque request ID after erasure so a delayed retry cannot
-- recreate the removed text. This contains no visitor content or address.
CREATE TABLE IF NOT EXISTS removals (
  id TEXT PRIMARY KEY,
  removed_ms INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS submissions (
  id TEXT PRIMARY KEY CHECK (length(id) = 35 AND substr(id,1,3) = 'cf-'),
  payload_hash TEXT NOT NULL CHECK (length(payload_hash) = 64),
  kind TEXT NOT NULL CHECK (kind IN ('question','thread','reply')),
  topic TEXT NOT NULL DEFAULT '',
  question TEXT NOT NULL DEFAULT '',
  display_name TEXT NOT NULL DEFAULT '' CHECK (length(display_name) <= 40),
  message TEXT NOT NULL DEFAULT '',
  parent_id TEXT NOT NULL DEFAULT '',
  publication_consent INTEGER NOT NULL CHECK (publication_consent = 1),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','published','archived')),
  revision INTEGER NOT NULL DEFAULT 1 CHECK (revision >= 1),
  answer TEXT NOT NULL DEFAULT '' CHECK (length(answer) <= 3000),
  created_ms INTEGER NOT NULL CHECK (created_ms > 0),
  updated_ms INTEGER NOT NULL CHECK (updated_ms >= created_ms),
  published_ms INTEGER,
  CHECK ((kind IN ('question','thread') AND length(question) BETWEEN 10 AND 1000
      AND length(topic) BETWEEN 1 AND 80 AND message = '' AND parent_id = '')
    OR (kind = 'reply' AND question = '' AND topic = ''
      AND length(message) BETWEEN 10 AND 1000 AND length(parent_id) BETWEEN 1 AND 80)),
  CHECK (kind = 'question' OR length(display_name) >= 2),
  CHECK (status != 'published' OR published_ms IS NOT NULL),
  CHECK (kind != 'question' OR status != 'published' OR length(answer) > 0)
);
CREATE INDEX IF NOT EXISTS submissions_review ON submissions(status,created_ms DESC,id DESC);
CREATE INDEX IF NOT EXISTS submissions_public ON submissions(kind,status,published_ms DESC,id DESC);
CREATE INDEX IF NOT EXISTS submissions_parent ON submissions(parent_id,status);
CREATE TRIGGER IF NOT EXISTS submission_reply_parent BEFORE INSERT ON submissions
WHEN NEW.kind = 'reply' AND substr(NEW.parent_id,1,3) = 'cf-' BEGIN
  SELECT RAISE(ABORT,'INBOX_PARENT') WHERE NOT EXISTS
    (SELECT 1 FROM submissions WHERE id = NEW.parent_id AND kind = 'thread' AND status = 'published');
END;

-- These admission records are temporary, pseudonymous rate counters. Their
-- insertion and the actual submission always share one atomic D1 batch.
CREATE TABLE IF NOT EXISTS admissions (
  id TEXT PRIMARY KEY,
  ip_hash TEXT NOT NULL CHECK (length(ip_hash) = 64),
  created_ms INTEGER NOT NULL CHECK (created_ms > 0)
);
CREATE INDEX IF NOT EXISTS admissions_time ON admissions(created_ms);
CREATE INDEX IF NOT EXISTS admissions_ip_time ON admissions(ip_hash,created_ms);
CREATE TRIGGER IF NOT EXISTS admission_limits BEFORE INSERT ON admissions BEGIN
  SELECT RAISE(ABORT,'INBOX_DAY_LIMIT') WHERE
    (SELECT count(*) FROM admissions WHERE created_ms >= (NEW.created_ms / 86400000) * 86400000) >= 100;
  SELECT RAISE(ABORT,'INBOX_IP_LIMIT') WHERE
    (SELECT count(*) FROM admissions WHERE ip_hash = NEW.ip_hash AND created_ms > NEW.created_ms - 900000) >= 5;
END;
CREATE TRIGGER IF NOT EXISTS submission_capacity_insert AFTER INSERT ON submissions
WHEN NEW.status != 'archived' BEGIN
  SELECT RAISE(ABORT,'INBOX_CAPACITY') WHERE (SELECT active FROM capacity WHERE id = 1) >= 2000;
  UPDATE capacity SET active = active + 1 WHERE id = 1;
END;
CREATE TRIGGER IF NOT EXISTS submission_capacity_update AFTER UPDATE OF status ON submissions
WHEN (OLD.status = 'archived') != (NEW.status = 'archived') BEGIN
  SELECT RAISE(ABORT,'INBOX_CAPACITY') WHERE OLD.status = 'archived' AND (SELECT active FROM capacity WHERE id = 1) >= 2000;
  UPDATE capacity SET active = active + CASE WHEN NEW.status = 'archived' THEN -1 ELSE 1 END WHERE id = 1;
END;
CREATE TRIGGER IF NOT EXISTS submission_capacity_delete AFTER DELETE ON submissions
WHEN OLD.status != 'archived' BEGIN
  UPDATE capacity SET active = active - 1 WHERE id = 1;
END;
