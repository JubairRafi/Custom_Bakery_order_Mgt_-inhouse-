-- ═══════════════════════════════════════════════════════
-- BAKERY ORDER MANAGEMENT SYSTEM — DATABASE SCHEMA
-- ═══════════════════════════════════════════════════════

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─── Helper: Admin check (SECURITY DEFINER to avoid RLS recursion) ──
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid() AND role = 'admin'
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ─── Users ─────────────────────────────────────────────
CREATE TABLE public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  role TEXT CHECK (role IN ('admin', 'customer')) NOT NULL DEFAULT 'customer',
  active_status BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
  ON public.users FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Admins can view all users"
  ON public.users FOR SELECT
  USING (public.is_admin());

CREATE POLICY "Admins can insert users"
  ON public.users FOR INSERT
  WITH CHECK (public.is_admin());

CREATE POLICY "Admins can update users"
  ON public.users FOR UPDATE
  USING (public.is_admin());

-- ─── Product Categories ────────────────────────────────
CREATE TABLE public.product_categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.product_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read categories"
  ON public.product_categories FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Admins manage categories"
  ON public.product_categories FOR ALL
  USING (public.is_admin());

-- ─── Tags ──────────────────────────────────────────────
CREATE TABLE public.tags (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read tags"
  ON public.tags FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Admins manage tags"
  ON public.tags FOR ALL
  USING (public.is_admin());

-- ─── Products ──────────────────────────────────────────
CREATE TABLE public.products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  active_status BOOLEAN DEFAULT true,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  category_id UUID REFERENCES public.product_categories(id) ON DELETE SET NULL
);

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can read products"
  ON public.products FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Admins can manage products"
  ON public.products FOR ALL
  USING (public.is_admin());

-- ─── Product ↔ Tags ────────────────────────────────────
CREATE TABLE public.product_tags (
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
  tag_id UUID REFERENCES public.tags(id) ON DELETE CASCADE,
  PRIMARY KEY (product_id, tag_id)
);

ALTER TABLE public.product_tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read product_tags"
  ON public.product_tags FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Admins manage product_tags"
  ON public.product_tags FOR ALL
  USING (public.is_admin());

-- ─── Customer ↔ Tags ───────────────────────────────────
CREATE TABLE public.customer_tags (
  customer_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  tag_id UUID REFERENCES public.tags(id) ON DELETE CASCADE,
  PRIMARY KEY (customer_id, tag_id)
);

ALTER TABLE public.customer_tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Customers can view own tags"
  ON public.customer_tags FOR SELECT
  USING (auth.uid() = customer_id);

CREATE POLICY "Admins manage customer_tags"
  ON public.customer_tags FOR ALL
  USING (public.is_admin());

-- ─── Customer Default Products ─────────────────────────
CREATE TABLE public.customer_default_products (
  customer_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
  PRIMARY KEY (customer_id, product_id)
);

ALTER TABLE public.customer_default_products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Customers can view own defaults"
  ON public.customer_default_products FOR SELECT
  USING (auth.uid() = customer_id);

CREATE POLICY "Admins can manage defaults"
  ON public.customer_default_products FOR ALL
  USING (public.is_admin());

-- ─── Orders ────────────────────────────────────────────
CREATE TABLE public.orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id UUID REFERENCES public.users(id),
  order_type TEXT CHECK (order_type IN ('weekly', 'daily')) NOT NULL,
  week_start_date DATE,
  delivery_date DATE,
  status TEXT DEFAULT 'submitted',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES public.users(id)
);

ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Customers can view own orders"
  ON public.orders FOR SELECT
  USING (auth.uid() = customer_id);

CREATE POLICY "Customers can insert own orders"
  ON public.orders FOR INSERT
  WITH CHECK (auth.uid() = customer_id);

CREATE POLICY "Admins can manage all orders"
  ON public.orders FOR ALL
  USING (public.is_admin());

-- ─── Order Items ───────────────────────────────────────
CREATE TABLE public.order_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.products(id),
  delivery_date DATE NOT NULL,
  quantity INTEGER NOT NULL CHECK (quantity >= 0)
);

ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Customers can view own order items"
  ON public.order_items FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.orders WHERE id = order_id AND customer_id = auth.uid())
  );

CREATE POLICY "Customers can insert own order items"
  ON public.order_items FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.orders WHERE id = order_id AND customer_id = auth.uid())
  );

CREATE POLICY "Admins can manage all order items"
  ON public.order_items FOR ALL
  USING (public.is_admin());

-- ─── Settings ──────────────────────────────────────────
CREATE TABLE public.settings (
  id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  daily_cutoff_time TIME NOT NULL DEFAULT '12:00:00',
  weekly_cutoff_day INTEGER NOT NULL DEFAULT 6, -- 0=Sun, 6=Sat
  weekly_cutoff_time TIME NOT NULL DEFAULT '12:00:00'
);

ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can read settings"
  ON public.settings FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Admins can update settings"
  ON public.settings FOR UPDATE
  USING (public.is_admin());

-- ─── Seed default settings ────────────────────────────
INSERT INTO public.settings (id, daily_cutoff_time, weekly_cutoff_day, weekly_cutoff_time)
VALUES (1, '12:00:00', 6, '12:00:00')
ON CONFLICT (id) DO NOTHING;

-- ─── Trigger: Auto-create user profile on signup ──────
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, name, email, role, active_status)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.email),
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'role', 'customer'),
    true
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
