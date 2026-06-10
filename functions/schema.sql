CREATE TABLE IF NOT EXISTS subscribers (
  id TEXT PRIMARY KEY,
  endpoint TEXT NOT NULL,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  daily_reminder BOOLEAN DEFAULT 0,
  next_cycle_alert_date TEXT
);

CREATE INDEX IF NOT EXISTS idx_daily_reminder ON subscribers(daily_reminder);
CREATE INDEX IF NOT EXISTS idx_cycle_alert ON subscribers(next_cycle_alert_date);
