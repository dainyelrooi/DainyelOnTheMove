-- Additive, isolated per existing D1 environment. No visitor content migration.
CREATE TABLE IF NOT EXISTS site_settings(name TEXT PRIMARY KEY,value TEXT NOT NULL,updated_ms INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS site_webhook_events(
 digest TEXT PRIMARY KEY,campaign INTEGER NOT NULL CHECK(campaign>0),
 event TEXT NOT NULL CHECK(event IN('delivered','hardBounce','softBounce','unsubscribed','spam')),
 occurred_ms INTEGER NOT NULL,received_ms INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS site_webhook_time ON site_webhook_events(received_ms);
CREATE TABLE IF NOT EXISTS site_push_registrations(
 fid TEXT PRIMARY KEY CHECK(length(fid) BETWEEN 22 AND 128),secret_sha TEXT NOT NULL CHECK(length(secret_sha)=64),
 created_ms INTEGER NOT NULL,updated_ms INTEGER NOT NULL,expires_ms INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS site_push_expiry ON site_push_registrations(expires_ms);
CREATE TABLE IF NOT EXISTS site_push_jobs(
 entry_id TEXT NOT NULL,fid TEXT NOT NULL,state TEXT NOT NULL CHECK(state IN('reserved','accepted','retrying','uncertain','failed')),
 lease TEXT NOT NULL,lease_until INTEGER NOT NULL,next_ms INTEGER NOT NULL DEFAULT 0,attempts INTEGER NOT NULL DEFAULT 1,updated_ms INTEGER NOT NULL,
 PRIMARY KEY(entry_id,fid)
);
CREATE INDEX IF NOT EXISTS site_push_updated ON site_push_jobs(updated_ms);
CREATE TABLE IF NOT EXISTS site_push_admissions(id TEXT PRIMARY KEY,ip_hash TEXT NOT NULL,created_ms INTEGER NOT NULL);
CREATE INDEX IF NOT EXISTS site_push_admission_time ON site_push_admissions(created_ms);
CREATE INDEX IF NOT EXISTS site_push_admission_ip ON site_push_admissions(ip_hash,created_ms);
CREATE TRIGGER IF NOT EXISTS site_push_admission_limits BEFORE INSERT ON site_push_admissions BEGIN
 SELECT RAISE(ABORT,'PUSH_DAY_LIMIT') WHERE (SELECT count(*) FROM site_push_admissions WHERE created_ms>NEW.created_ms-86400000)>=300;
 SELECT RAISE(ABORT,'PUSH_IP_LIMIT') WHERE (SELECT count(*) FROM site_push_admissions WHERE ip_hash=NEW.ip_hash AND created_ms>NEW.created_ms-86400000)>=10;
END;
CREATE TRIGGER IF NOT EXISTS site_push_capacity BEFORE INSERT ON site_push_registrations WHEN NOT EXISTS(SELECT 1 FROM site_push_registrations WHERE fid=NEW.fid) BEGIN
 SELECT RAISE(ABORT,'PUSH_CAPACITY') WHERE (SELECT count(*) FROM site_push_registrations)>=1000;
END;

CREATE TABLE IF NOT EXISTS site_capacity(id INTEGER PRIMARY KEY CHECK(id=1),events INTEGER NOT NULL DEFAULT 0 CHECK(events BETWEEN 0 AND 20000));
INSERT OR IGNORE INTO site_capacity(id,events) VALUES(1,(SELECT count(*) FROM site_webhook_events));
CREATE TRIGGER IF NOT EXISTS site_events_added AFTER INSERT ON site_webhook_events BEGIN UPDATE site_capacity SET events=events+1 WHERE id=1; END;
CREATE TRIGGER IF NOT EXISTS site_events_removed AFTER DELETE ON site_webhook_events BEGIN UPDATE site_capacity SET events=events-1 WHERE id=1; END;
