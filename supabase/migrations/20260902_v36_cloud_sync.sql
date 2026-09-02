-- Pricely V3.6: Cloud Sync for Wishlist & Tracked Targets
-- Creates persistent PostgreSQL tables for wishlist_items and tracked_targets with RLS

-- 1. Wishlist Items Table
CREATE TABLE IF NOT EXISTS wishlist_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_user_wishlist_product UNIQUE (user_id, product_id)
);

-- Index for fast user wishlist retrieval
CREATE INDEX IF NOT EXISTS idx_wishlist_items_user_id ON wishlist_items(user_id);

-- 2. Tracked Targets Table
CREATE TABLE IF NOT EXISTS tracked_targets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id TEXT NOT NULL,
  target_price NUMERIC NULL,
  tracked_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_user_tracked_product UNIQUE (user_id, product_id)
);

-- Index for fast user targets retrieval
CREATE INDEX IF NOT EXISTS idx_tracked_targets_user_id ON tracked_targets(user_id);

-- 3. Enable Row Level Security (RLS)
ALTER TABLE wishlist_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE tracked_targets ENABLE ROW LEVEL SECURITY;

-- Wishlist RLS Policies
DROP POLICY IF EXISTS wishlist_user_select ON wishlist_items;
CREATE POLICY wishlist_user_select ON wishlist_items
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS wishlist_user_insert ON wishlist_items;
CREATE POLICY wishlist_user_insert ON wishlist_items
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS wishlist_user_update ON wishlist_items;
CREATE POLICY wishlist_user_update ON wishlist_items
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS wishlist_user_delete ON wishlist_items;
CREATE POLICY wishlist_user_delete ON wishlist_items
  FOR DELETE TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS wishlist_service_role ON wishlist_items;
CREATE POLICY wishlist_service_role ON wishlist_items
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

-- Tracked Targets RLS Policies
DROP POLICY IF EXISTS tracked_targets_user_select ON tracked_targets;
CREATE POLICY tracked_targets_user_select ON tracked_targets
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS tracked_targets_user_insert ON tracked_targets;
CREATE POLICY tracked_targets_user_insert ON tracked_targets
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS tracked_targets_user_update ON tracked_targets;
CREATE POLICY tracked_targets_user_update ON tracked_targets
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS tracked_targets_user_delete ON tracked_targets;
CREATE POLICY tracked_targets_user_delete ON tracked_targets
  FOR DELETE TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS tracked_targets_service_role ON tracked_targets;
CREATE POLICY tracked_targets_service_role ON tracked_targets
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);
