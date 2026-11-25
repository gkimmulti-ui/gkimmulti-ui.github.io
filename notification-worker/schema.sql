-- Separate subscription-only D1 database. Never bind the private app dashboard database.
PRAGMA foreign_keys = ON;
CREATE TABLE IF NOT EXISTS subscriptions(
  id TEXT PRIMARY KEY,
  app TEXT NOT NULL,
  endpoint TEXT NOT NULL,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  token_hash TEXT NOT NULL,
  lang TEXT NOT NULL,
  consent_at TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  UNIQUE(app, endpoint)
);
CREATE INDEX IF NOT EXISTS sub_app_exp ON subscriptions(app, expires_at);
CREATE TABLE IF NOT EXISTS releases(
  app TEXT PRIMARY KEY,
  store_url TEXT NOT NULL,
  published_at TEXT NOT NULL,
  verified_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS dispatches(
  subscription_id TEXT PRIMARY KEY REFERENCES subscriptions(id) ON DELETE CASCADE,
  claimed_at TEXT NOT NULL,
  state TEXT NOT NULL CHECK(state IN ('claimed','sent','expired','failed'))
);
CREATE TABLE IF NOT EXISTS quotas(day TEXT NOT NULL, kind TEXT NOT NULL, used INTEGER NOT NULL, PRIMARY KEY(day,kind));
