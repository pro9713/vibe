-- Pricely V4.0: Admin Product & Retailer Management System
-- Schema for admin_users, admin_retailers, admin_products, and admin_product_offers with strict RLS

-- 1. Admin Users Table (Registry of authorized administrative accounts)
CREATE TABLE IF NOT EXISTS admin_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'admin',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_admin_user_id UNIQUE (user_id),
  CONSTRAINT uq_admin_email UNIQUE (email)
);

CREATE INDEX IF NOT EXISTS idx_admin_users_user_id ON admin_users(user_id);
CREATE INDEX IF NOT EXISTS idx_admin_users_email ON admin_users(email);

-- 2. Admin Retailers Table (Managed store metadata, trust scores, and affiliate rules)
CREATE TABLE IF NOT EXISTS admin_retailers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  website TEXT NOT NULL,
  logo TEXT,
  trusted BOOLEAN NOT NULL DEFAULT true,
  trust_score INTEGER NOT NULL DEFAULT 85,
  affiliate_type TEXT NOT NULL DEFAULT 'none',
  affiliate_param TEXT,
  affiliate_value TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_admin_retailers_active ON admin_retailers(is_active);

-- 3. Admin Products Table (Admin-managed catalog extensions with draft/published lifecycle)
CREATE TABLE IF NOT EXISTS admin_products (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  brand TEXT NOT NULL,
  category TEXT NOT NULL,
  description TEXT,
  image TEXT NOT NULL,
  images JSONB NOT NULL DEFAULT '[]'::jsonb,
  rating NUMERIC(2,1) NOT NULL DEFAULT 0.0,
  reviews INTEGER NOT NULL DEFAULT 0,
  trust_score INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'draft',
  source_url TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT chk_admin_product_status CHECK (status IN ('draft', 'published', 'hidden', 'archived'))
);

CREATE INDEX IF NOT EXISTS idx_admin_products_status ON admin_products(status);
CREATE INDEX IF NOT EXISTS idx_admin_products_category ON admin_products(category);
CREATE INDEX IF NOT EXISTS idx_admin_products_brand ON admin_products(brand);

-- 4. Admin Product Offers Table (Store pricing, availability, and product URLs)
CREATE TABLE IF NOT EXISTS admin_product_offers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id TEXT NOT NULL REFERENCES admin_products(id) ON DELETE CASCADE,
  store TEXT NOT NULL,
  price NUMERIC NOT NULL,
  original_price NUMERIC,
  currency TEXT NOT NULL DEFAULT 'INR',
  url TEXT NOT NULL,
  affiliate_url TEXT,
  availability BOOLEAN NOT NULL DEFAULT true,
  last_updated TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_admin_product_offers_product_id ON admin_product_offers(product_id);

-- 5. Enable Row Level Security (RLS) on all admin tables
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_retailers ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_product_offers ENABLE ROW LEVEL SECURITY;

-- 6. Helper function: checks whether the current executing auth user is an active admin
CREATE OR REPLACE FUNCTION is_admin_user()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM admin_users WHERE user_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. RLS Policies for admin_users
DROP POLICY IF EXISTS admin_users_select_self ON admin_users;
CREATE POLICY admin_users_select_self ON admin_users
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS admin_users_service_role ON admin_users;
CREATE POLICY admin_users_service_role ON admin_users
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

-- 8. RLS Policies for admin_retailers
-- Public and regular users can only read active retailers
DROP POLICY IF EXISTS admin_retailers_public_select ON admin_retailers;
CREATE POLICY admin_retailers_public_select ON admin_retailers
  FOR SELECT TO anon, authenticated
  USING (is_active = true);

-- Admins and service role have full CRUD on retailers
DROP POLICY IF EXISTS admin_retailers_admin_manage ON admin_retailers;
CREATE POLICY admin_retailers_admin_manage ON admin_retailers
  FOR ALL TO authenticated
  USING (is_admin_user())
  WITH CHECK (is_admin_user());

DROP POLICY IF EXISTS admin_retailers_service_role ON admin_retailers;
CREATE POLICY admin_retailers_service_role ON admin_retailers
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

-- 9. RLS Policies for admin_products
-- Public and regular users can only read published products
DROP POLICY IF EXISTS admin_products_public_select ON admin_products;
CREATE POLICY admin_products_public_select ON admin_products
  FOR SELECT TO anon, authenticated
  USING (status = 'published');

-- Admins and service role have full CRUD on products
DROP POLICY IF EXISTS admin_products_admin_manage ON admin_products;
CREATE POLICY admin_products_admin_manage ON admin_products
  FOR ALL TO authenticated
  USING (is_admin_user())
  WITH CHECK (is_admin_user());

DROP POLICY IF EXISTS admin_products_service_role ON admin_products;
CREATE POLICY admin_products_service_role ON admin_products
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

-- 10. RLS Policies for admin_product_offers
-- Public can read offers only for published products
DROP POLICY IF EXISTS admin_offers_public_select ON admin_product_offers;
CREATE POLICY admin_offers_public_select ON admin_product_offers
  FOR SELECT TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_products
      WHERE admin_products.id = admin_product_offers.product_id
        AND admin_products.status = 'published'
    )
  );

-- Admins and service role have full CRUD on product offers
DROP POLICY IF EXISTS admin_offers_admin_manage ON admin_product_offers;
CREATE POLICY admin_offers_admin_manage ON admin_product_offers
  FOR ALL TO authenticated
  USING (is_admin_user())
  WITH CHECK (is_admin_user());

DROP POLICY IF EXISTS admin_offers_service_role ON admin_product_offers;
CREATE POLICY admin_offers_service_role ON admin_product_offers
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);
