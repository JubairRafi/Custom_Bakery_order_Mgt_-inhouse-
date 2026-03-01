-- ═══════════════════════════════════════════════════════
-- RLS FIX: Create a SECURITY DEFINER function to check
-- admin role without triggering RLS recursion
-- ═══════════════════════════════════════════════════════

-- This function bypasses RLS when checking if the current user is admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid() AND role = 'admin'
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ─── Drop old policies that cause recursion ────────────

-- Users table
DROP POLICY IF EXISTS "Admins can view all users" ON public.users;
DROP POLICY IF EXISTS "Admins can insert users" ON public.users;
DROP POLICY IF EXISTS "Admins can update users" ON public.users;

-- Products table
DROP POLICY IF EXISTS "Admins can manage products" ON public.products;

-- Customer default products
DROP POLICY IF EXISTS "Admins can manage defaults" ON public.customer_default_products;

-- Orders table
DROP POLICY IF EXISTS "Admins can manage all orders" ON public.orders;

-- Order items
DROP POLICY IF EXISTS "Admins can manage all order items" ON public.order_items;

-- Settings
DROP POLICY IF EXISTS "Admins can update settings" ON public.settings;

-- ─── Recreate policies using is_admin() function ──────

-- Users
CREATE POLICY "Admins can view all users"
  ON public.users FOR SELECT
  USING (public.is_admin());

CREATE POLICY "Admins can insert users"
  ON public.users FOR INSERT
  WITH CHECK (public.is_admin());

CREATE POLICY "Admins can update users"
  ON public.users FOR UPDATE
  USING (public.is_admin());

-- Products
CREATE POLICY "Admins can manage products"
  ON public.products FOR ALL
  USING (public.is_admin());

-- Customer default products
CREATE POLICY "Admins can manage defaults"
  ON public.customer_default_products FOR ALL
  USING (public.is_admin());

-- Orders
CREATE POLICY "Admins can manage all orders"
  ON public.orders FOR ALL
  USING (public.is_admin());

-- Order items
CREATE POLICY "Admins can manage all order items"
  ON public.order_items FOR ALL
  USING (public.is_admin());

-- Settings
CREATE POLICY "Admins can update settings"
  ON public.settings FOR UPDATE
  USING (public.is_admin());
