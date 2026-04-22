-- R2E2 D1 Schema
-- Run: wrangler d1 execute r2e2-db --remote --file=src/modules/db/schema.sql

CREATE TABLE IF NOT EXISTS media (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  bucket       TEXT NOT NULL,
  key          TEXT NOT NULL,
  title        TEXT,
  description  TEXT,
  source       TEXT,
  content_type TEXT,
  size         INTEGER,
  uploaded_at  TEXT,
  indexed_at   TEXT NOT NULL DEFAULT (datetime('now')),
  public       INTEGER DEFAULT 0,
  UNIQUE(bucket, key)
);

CREATE TABLE IF NOT EXISTS settings (
  key        TEXT PRIMARY KEY,
  value      TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS tags (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  name         TEXT NOT NULL,
  slug         TEXT NOT NULL UNIQUE,
  usage_count  INTEGER NOT NULL DEFAULT 0,
  created_at   TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS media_tags (
  media_id  INTEGER NOT NULL,
  tag_id    INTEGER NOT NULL,
  PRIMARY KEY (media_id, tag_id),
  FOREIGN KEY (media_id) REFERENCES media(id) ON DELETE CASCADE,
  FOREIGN KEY (tag_id)   REFERENCES tags(id)  ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS ai_usage (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  bucket         TEXT NOT NULL,
  key            TEXT NOT NULL,
  action         TEXT NOT NULL,
  model          TEXT NOT NULL,
  success        INTEGER NOT NULL,
  error_message  TEXT,
  latency_ms     INTEGER,
  created_at     TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_media_bucket_key    ON media(bucket, key);
CREATE INDEX IF NOT EXISTS idx_media_title         ON media(title);
CREATE INDEX IF NOT EXISTS idx_media_public        ON media(public, indexed_at);
CREATE INDEX IF NOT EXISTS idx_media_tags_media_id ON media_tags(media_id);
CREATE INDEX IF NOT EXISTS idx_media_tags_tag_id   ON media_tags(tag_id);
CREATE INDEX IF NOT EXISTS idx_ai_usage_created_at ON ai_usage(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_usage_action     ON ai_usage(action, created_at DESC);
