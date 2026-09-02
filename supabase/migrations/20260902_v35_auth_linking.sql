-- Pricely V3.5: User Authentication & Account Identity Linking
-- Enhances push_subscriptions with foreign key to auth.users and robust RLS policies.

-- 1. Ensure foreign key constraint from push_subscriptions.user_id to auth.users(id)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_push_sub_user'
  ) THEN
    ALTER TABLE push_subscriptions
      ADD CONSTRAINT fk_push_sub_user
      FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END $$;

-- 2. Enable Row Level Security (RLS)
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Policy 1: Authenticated users can read their own subscriptions
DROP POLICY IF EXISTS authenticated_user_select ON push_subscriptions;
CREATE POLICY authenticated_user_select ON push_subscriptions
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Policy 2: Authenticated users can insert their own subscriptions
DROP POLICY IF EXISTS authenticated_user_insert ON push_subscriptions;
CREATE POLICY authenticated_user_insert ON push_subscriptions
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid() OR user_id IS NULL);

-- Policy 3: Authenticated users can update their own subscriptions
DROP POLICY IF EXISTS authenticated_user_update ON push_subscriptions;
CREATE POLICY authenticated_user_update ON push_subscriptions
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Policy 4: Authenticated users can delete their own subscriptions
DROP POLICY IF EXISTS authenticated_user_delete ON push_subscriptions;
CREATE POLICY authenticated_user_delete ON push_subscriptions
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- Policy 5: Service role maintains full access for background cron and push notifications
DROP POLICY IF EXISTS service_role_full_access ON push_subscriptions;
CREATE POLICY service_role_full_access ON push_subscriptions
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
