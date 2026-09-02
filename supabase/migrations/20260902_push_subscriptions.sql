-- Pricely V3.4: Persistent Push Subscription Schema
-- Supports multi-device subscriptions per user or anonymous client.

CREATE TABLE IF NOT EXISTS push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NULL,
  anonymous_client_id TEXT NULL,
  endpoint TEXT NOT NULL UNIQUE,
  expiration_time BIGINT NULL,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  user_agent TEXT NULL,
  device_label TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_success_at TIMESTAMPTZ NULL,
  last_failure_at TIMESTAMPTZ NULL,
  failure_count INT NOT NULL DEFAULT 0
);

-- Index for fast lookup and deduplication by endpoint
CREATE INDEX IF NOT EXISTS idx_push_sub_endpoint ON push_subscriptions (endpoint);

-- Index for querying multi-device subscriptions by user ID or anonymous client
CREATE INDEX IF NOT EXISTS idx_push_sub_user_id ON push_subscriptions (user_id);
CREATE INDEX IF NOT EXISTS idx_push_sub_anon_client ON push_subscriptions (anonymous_client_id);

-- Row Level Security (RLS) policies
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Allow server service-role full access
CREATE POLICY service_role_all ON push_subscriptions
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
