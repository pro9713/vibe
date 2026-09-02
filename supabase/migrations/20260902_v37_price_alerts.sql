-- Pricely V3.7: Cloud Price Alert History Sync & Notification Feed
-- Creates persistent PostgreSQL table for price_alerts with RLS and index optimizations

CREATE TABLE IF NOT EXISTS price_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  alert_type TEXT NOT NULL CHECK (alert_type IN ('TARGET_REACHED', 'PRICE_DROP')),
  product_id TEXT NOT NULL,
  product_name TEXT NOT NULL,
  store TEXT NOT NULL,
  previous_price NUMERIC NULL,
  current_price NUMERIC NOT NULL,
  target_price NUMERIC NULL,
  drop_amount NUMERIC NULL,
  drop_percentage NUMERIC NULL,
  pincode TEXT NULL,
  read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for fast user alert queries and sorting
CREATE INDEX IF NOT EXISTS idx_price_alerts_user_id ON price_alerts(user_id);
CREATE INDEX IF NOT EXISTS idx_price_alerts_created_at ON price_alerts(created_at DESC);

-- Enable Row Level Security (RLS)
ALTER TABLE price_alerts ENABLE ROW LEVEL SECURITY;

-- User Policies: Authenticated users can only access and modify their own alerts
DROP POLICY IF EXISTS price_alerts_user_select ON price_alerts;
CREATE POLICY price_alerts_user_select ON price_alerts
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS price_alerts_user_insert ON price_alerts;
CREATE POLICY price_alerts_user_insert ON price_alerts
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS price_alerts_user_update ON price_alerts;
CREATE POLICY price_alerts_user_update ON price_alerts
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS price_alerts_user_delete ON price_alerts;
CREATE POLICY price_alerts_user_delete ON price_alerts
  FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- Service Role Policy: Background cron and push services have full access
DROP POLICY IF EXISTS price_alerts_service_role ON price_alerts;
CREATE POLICY price_alerts_service_role ON price_alerts
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);
