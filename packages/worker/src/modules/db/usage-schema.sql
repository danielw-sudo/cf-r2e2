CREATE TABLE IF NOT EXISTS ai_usage (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  bucket TEXT NOT NULL,
  key TEXT NOT NULL,
  action TEXT NOT NULL,
  model TEXT NOT NULL,
  success INTEGER NOT NULL DEFAULT 1,
  error_message TEXT,
  latency_ms INTEGER,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_usage_created ON ai_usage(created_at);
CREATE INDEX IF NOT EXISTS idx_usage_action ON ai_usage(action);
