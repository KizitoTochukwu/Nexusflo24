-- ============ ROLE HELPERS ============
CREATE OR REPLACE FUNCTION public.workspace_role(_user_id uuid, _workspace_id uuid)
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT role FROM public.workspace_members WHERE user_id = _user_id AND workspace_id = _workspace_id LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.can_manage_commerce(_user_id uuid, _workspace_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.workspace_role(_user_id, _workspace_id) IN ('owner','admin','commerce_manager')
$$;

CREATE OR REPLACE FUNCTION public.can_fulfil_orders(_user_id uuid, _workspace_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.workspace_role(_user_id, _workspace_id) IN ('owner','admin','commerce_manager','fulfilment_staff')
$$;

-- ============ STORES ============
CREATE TABLE public.shop_stores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'draft',
  is_primary boolean NOT NULL DEFAULT true,
  currency text NOT NULL DEFAULT 'GBP',
  countries_served text[] NOT NULL DEFAULT '{}',
  product_types text[] NOT NULL DEFAULT '{}',
  business_name text,
  business_email text,
  business_phone text,
  business_address jsonb NOT NULL DEFAULT '{}'::jsonb,
  policies jsonb NOT NULL DEFAULT '{}'::jsonb,
  setup_step integer NOT NULL DEFAULT 0,
  setup_completed_at timestamptz,
  published_at timestamptz,
  platform_fee_bps integer NOT NULL DEFAULT 0,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_shop_stores_ws ON public.shop_stores(workspace_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.shop_stores TO authenticated;
GRANT ALL ON public.shop_stores TO service_role;
ALTER TABLE public.shop_stores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff read stores" ON public.shop_stores FOR SELECT TO authenticated USING (public.is_workspace_member(auth.uid(), workspace_id));
CREATE POLICY "managers insert stores" ON public.shop_stores FOR INSERT TO authenticated WITH CHECK (public.can_manage_commerce(auth.uid(), workspace_id));
CREATE POLICY "managers update stores" ON public.shop_stores FOR UPDATE TO authenticated USING (public.can_manage_commerce(auth.uid(), workspace_id)) WITH CHECK (public.can_manage_commerce(auth.uid(), workspace_id));
CREATE POLICY "admins delete stores" ON public.shop_stores FOR DELETE TO authenticated USING (public.is_workspace_admin(auth.uid(), workspace_id));

CREATE TABLE public.shop_store_branding (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL UNIQUE REFERENCES public.shop_stores(id) ON DELETE CASCADE,
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  logo_url text,
  cover_url text,
  primary_color text NOT NULL DEFAULT '#0B1F3A',
  accent_color text NOT NULL DEFAULT '#D4AF37',
  font_family text NOT NULL DEFAULT 'inter',
  tagline text,
  social_links jsonb NOT NULL DEFAULT '{}'::jsonb,
  navigation jsonb NOT NULL DEFAULT '[]'::jsonb,
  footer_text text,
  seo_title text,
  seo_description text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.shop_store_branding TO authenticated;
GRANT ALL ON public.shop_store_branding TO service_role;
ALTER TABLE public.shop_store_branding ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff read branding" ON public.shop_store_branding FOR SELECT TO authenticated USING (public.is_workspace_member(auth.uid(), workspace_id));
CREATE POLICY "managers write branding" ON public.shop_store_branding FOR ALL TO authenticated USING (public.can_manage_commerce(auth.uid(), workspace_id)) WITH CHECK (public.can_manage_commerce(auth.uid(), workspace_id));

CREATE TABLE public.shop_store_domains (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES public.shop_stores(id) ON DELETE CASCADE,
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  domain text NOT NULL UNIQUE,
  verified_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.shop_store_domains TO authenticated;
GRANT ALL ON public.shop_store_domains TO service_role;
ALTER TABLE public.shop_store_domains ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff read domains" ON public.shop_store_domains FOR SELECT TO authenticated USING (public.is_workspace_member(auth.uid(), workspace_id));
CREATE POLICY "managers write domains" ON public.shop_store_domains FOR ALL TO authenticated USING (public.can_manage_commerce(auth.uid(), workspace_id)) WITH CHECK (public.can_manage_commerce(auth.uid(), workspace_id));

-- ============ COLLECTIONS & PRODUCTS ============
CREATE TABLE public.shop_collections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES public.shop_stores(id) ON DELETE CASCADE,
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  slug text NOT NULL,
  name text NOT NULL,
  description text,
  image_url text,
  is_public boolean NOT NULL DEFAULT true,
  position integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (store_id, slug)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.shop_collections TO authenticated;
GRANT ALL ON public.shop_collections TO service_role;
ALTER TABLE public.shop_collections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff read collections" ON public.shop_collections FOR SELECT TO authenticated USING (public.is_workspace_member(auth.uid(), workspace_id));
CREATE POLICY "managers write collections" ON public.shop_collections FOR ALL TO authenticated USING (public.can_manage_commerce(auth.uid(), workspace_id)) WITH CHECK (public.can_manage_commerce(auth.uid(), workspace_id));

CREATE TABLE public.shop_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES public.shop_stores(id) ON DELETE CASCADE,
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  slug text NOT NULL,
  name text NOT NULL,
  short_description text,
  description text,
  product_type text NOT NULL DEFAULT 'physical',
  status text NOT NULL DEFAULT 'draft',
  visibility text NOT NULL DEFAULT 'public',
  sku text,
  price_amount integer NOT NULL DEFAULT 0,
  compare_at_amount integer,
  currency text NOT NULL DEFAULT 'GBP',
  tax_category text NOT NULL DEFAULT 'standard',
  billing_type text NOT NULL DEFAULT 'one_time',
  billing_interval text,
  trial_days integer,
  tags text[] NOT NULL DEFAULT '{}',
  seo_title text,
  seo_description text,
  button_text text NOT NULL DEFAULT 'Buy now',
  -- physical
  track_inventory boolean NOT NULL DEFAULT false,
  inventory_quantity integer NOT NULL DEFAULT 0,
  low_stock_threshold integer,
  allow_backorder boolean NOT NULL DEFAULT false,
  weight_grams integer,
  requires_shipping boolean NOT NULL DEFAULT false,
  shipping_class text,
  -- digital
  download_limit integer,
  download_expiry_days integer,
  -- service
  deliverables text,
  booking_page_id uuid REFERENCES public.booking_pages(id) ON DELETE SET NULL,
  appointment_type_id uuid REFERENCES public.appointment_types(id) ON DELETE SET NULL,
  onboarding_instructions text,
  -- course / membership (entitlements wired in a later phase)
  academy_course_slug text,
  access_duration_days integer,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (store_id, slug)
);
CREATE INDEX idx_shop_products_store_status ON public.shop_products(store_id, status);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.shop_products TO authenticated;
GRANT ALL ON public.shop_products TO service_role;
ALTER TABLE public.shop_products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff read products" ON public.shop_products FOR SELECT TO authenticated USING (public.is_workspace_member(auth.uid(), workspace_id));
CREATE POLICY "managers write products" ON public.shop_products FOR ALL TO authenticated USING (public.can_manage_commerce(auth.uid(), workspace_id)) WITH CHECK (public.can_manage_commerce(auth.uid(), workspace_id));

CREATE TABLE public.shop_collection_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  collection_id uuid NOT NULL REFERENCES public.shop_collections(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.shop_products(id) ON DELETE CASCADE,
  position integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (collection_id, product_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.shop_collection_products TO authenticated;
GRANT ALL ON public.shop_collection_products TO service_role;
ALTER TABLE public.shop_collection_products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff read collection products" ON public.shop_collection_products FOR SELECT TO authenticated USING (public.is_workspace_member(auth.uid(), workspace_id));
CREATE POLICY "managers write collection products" ON public.shop_collection_products FOR ALL TO authenticated USING (public.can_manage_commerce(auth.uid(), workspace_id)) WITH CHECK (public.can_manage_commerce(auth.uid(), workspace_id));

CREATE TABLE public.shop_product_variants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.shop_products(id) ON DELETE CASCADE,
  name text NOT NULL,
  options jsonb NOT NULL DEFAULT '{}'::jsonb,
  sku text,
  price_amount integer,
  inventory_quantity integer NOT NULL DEFAULT 0,
  weight_grams integer,
  position integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_shop_variants_product ON public.shop_product_variants(product_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.shop_product_variants TO authenticated;
GRANT ALL ON public.shop_product_variants TO service_role;
ALTER TABLE public.shop_product_variants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff read variants" ON public.shop_product_variants FOR SELECT TO authenticated USING (public.is_workspace_member(auth.uid(), workspace_id));
CREATE POLICY "managers write variants" ON public.shop_product_variants FOR ALL TO authenticated USING (public.can_manage_commerce(auth.uid(), workspace_id)) WITH CHECK (public.can_manage_commerce(auth.uid(), workspace_id));

CREATE TABLE public.shop_product_prices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.shop_products(id) ON DELETE CASCADE,
  variant_id uuid REFERENCES public.shop_product_variants(id) ON DELETE CASCADE,
  currency text NOT NULL,
  amount integer NOT NULL,
  billing_type text NOT NULL DEFAULT 'one_time',
  billing_interval text,
  stripe_price_id text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.shop_product_prices TO authenticated;
GRANT ALL ON public.shop_product_prices TO service_role;
ALTER TABLE public.shop_product_prices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff read prices" ON public.shop_product_prices FOR SELECT TO authenticated USING (public.is_workspace_member(auth.uid(), workspace_id));
CREATE POLICY "managers write prices" ON public.shop_product_prices FOR ALL TO authenticated USING (public.can_manage_commerce(auth.uid(), workspace_id)) WITH CHECK (public.can_manage_commerce(auth.uid(), workspace_id));

CREATE TABLE public.shop_product_media (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.shop_products(id) ON DELETE CASCADE,
  url text NOT NULL,
  alt text,
  position integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.shop_product_media TO authenticated;
GRANT ALL ON public.shop_product_media TO service_role;
ALTER TABLE public.shop_product_media ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff read media" ON public.shop_product_media FOR SELECT TO authenticated USING (public.is_workspace_member(auth.uid(), workspace_id));
CREATE POLICY "managers write media" ON public.shop_product_media FOR ALL TO authenticated USING (public.can_manage_commerce(auth.uid(), workspace_id)) WITH CHECK (public.can_manage_commerce(auth.uid(), workspace_id));

CREATE TABLE public.shop_product_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.shop_products(id) ON DELETE CASCADE,
  storage_path text NOT NULL,
  file_name text NOT NULL,
  file_size bigint,
  mime_type text,
  position integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.shop_product_files TO authenticated;
GRANT ALL ON public.shop_product_files TO service_role;
ALTER TABLE public.shop_product_files ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff read files" ON public.shop_product_files FOR SELECT TO authenticated USING (public.is_workspace_member(auth.uid(), workspace_id));
CREATE POLICY "managers write files" ON public.shop_product_files FOR ALL TO authenticated USING (public.can_manage_commerce(auth.uid(), workspace_id)) WITH CHECK (public.can_manage_commerce(auth.uid(), workspace_id));

CREATE TABLE public.shop_inventory_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.shop_products(id) ON DELETE CASCADE,
  variant_id uuid REFERENCES public.shop_product_variants(id) ON DELETE SET NULL,
  delta integer NOT NULL,
  reason text NOT NULL,
  reference text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.shop_inventory_movements TO authenticated;
GRANT ALL ON public.shop_inventory_movements TO service_role;
ALTER TABLE public.shop_inventory_movements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff read inventory" ON public.shop_inventory_movements FOR SELECT TO authenticated USING (public.is_workspace_member(auth.uid(), workspace_id));

-- ============ CUSTOMERS, CARTS, DISCOUNTS ============
CREATE TABLE public.shop_customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  store_id uuid NOT NULL REFERENCES public.shop_stores(id) ON DELETE CASCADE,
  user_id uuid,
  contact_id uuid REFERENCES public.contacts(id) ON DELETE SET NULL,
  email text NOT NULL,
  full_name text,
  phone text,
  stripe_customer_id text,
  total_orders integer NOT NULL DEFAULT 0,
  total_spent integer NOT NULL DEFAULT 0,
  last_order_at timestamptz,
  marketing_opt_in boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (store_id, email)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.shop_customers TO authenticated;
GRANT ALL ON public.shop_customers TO service_role;
ALTER TABLE public.shop_customers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff read customers" ON public.shop_customers FOR SELECT TO authenticated USING (public.is_workspace_member(auth.uid(), workspace_id));
CREATE POLICY "managers write customers" ON public.shop_customers FOR ALL TO authenticated USING (public.can_manage_commerce(auth.uid(), workspace_id)) WITH CHECK (public.can_manage_commerce(auth.uid(), workspace_id));
CREATE POLICY "customer reads self" ON public.shop_customers FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE TABLE public.shop_discounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  store_id uuid NOT NULL REFERENCES public.shop_stores(id) ON DELETE CASCADE,
  code text NOT NULL,
  description text,
  discount_type text NOT NULL DEFAULT 'percentage',
  value integer NOT NULL,
  currency text,
  min_subtotal integer,
  max_redemptions integer,
  redemption_count integer NOT NULL DEFAULT 0,
  starts_at timestamptz,
  ends_at timestamptz,
  is_active boolean NOT NULL DEFAULT true,
  applies_to_product_ids uuid[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (store_id, code)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.shop_discounts TO authenticated;
GRANT ALL ON public.shop_discounts TO service_role;
ALTER TABLE public.shop_discounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff read discounts" ON public.shop_discounts FOR SELECT TO authenticated USING (public.is_workspace_member(auth.uid(), workspace_id));
CREATE POLICY "managers write discounts" ON public.shop_discounts FOR ALL TO authenticated USING (public.can_manage_commerce(auth.uid(), workspace_id)) WITH CHECK (public.can_manage_commerce(auth.uid(), workspace_id));

CREATE TABLE public.shop_carts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  store_id uuid NOT NULL REFERENCES public.shop_stores(id) ON DELETE CASCADE,
  token text NOT NULL UNIQUE,
  user_id uuid,
  email text,
  status text NOT NULL DEFAULT 'open',
  discount_code text,
  currency text NOT NULL DEFAULT 'GBP',
  abandoned_at timestamptz,
  converted_order_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.shop_carts TO service_role;
GRANT SELECT ON public.shop_carts TO authenticated;
ALTER TABLE public.shop_carts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff read carts" ON public.shop_carts FOR SELECT TO authenticated USING (public.is_workspace_member(auth.uid(), workspace_id));

CREATE TABLE public.shop_cart_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cart_id uuid NOT NULL REFERENCES public.shop_carts(id) ON DELETE CASCADE,
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.shop_products(id) ON DELETE CASCADE,
  variant_id uuid REFERENCES public.shop_product_variants(id) ON DELETE SET NULL,
  quantity integer NOT NULL DEFAULT 1,
  unit_amount integer NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.shop_cart_items TO service_role;
GRANT SELECT ON public.shop_cart_items TO authenticated;
ALTER TABLE public.shop_cart_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff read cart items" ON public.shop_cart_items FOR SELECT TO authenticated USING (public.is_workspace_member(auth.uid(), workspace_id));

-- ============ SHIPPING ============
CREATE TABLE public.shop_shipping_zones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  store_id uuid NOT NULL REFERENCES public.shop_stores(id) ON DELETE CASCADE,
  name text NOT NULL,
  countries text[] NOT NULL DEFAULT '{}',
  regions text[] NOT NULL DEFAULT '{}',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.shop_shipping_zones TO authenticated;
GRANT ALL ON public.shop_shipping_zones TO service_role;
ALTER TABLE public.shop_shipping_zones ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff read zones" ON public.shop_shipping_zones FOR SELECT TO authenticated USING (public.is_workspace_member(auth.uid(), workspace_id));
CREATE POLICY "managers write zones" ON public.shop_shipping_zones FOR ALL TO authenticated USING (public.can_manage_commerce(auth.uid(), workspace_id)) WITH CHECK (public.can_manage_commerce(auth.uid(), workspace_id));

CREATE TABLE public.shop_shipping_rates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  zone_id uuid NOT NULL REFERENCES public.shop_shipping_zones(id) ON DELETE CASCADE,
  name text NOT NULL,
  rate_type text NOT NULL DEFAULT 'flat',
  amount integer NOT NULL DEFAULT 0,
  free_over_amount integer,
  shipping_class text,
  delivery_estimate text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.shop_shipping_rates TO authenticated;
GRANT ALL ON public.shop_shipping_rates TO service_role;
ALTER TABLE public.shop_shipping_rates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff read rates" ON public.shop_shipping_rates FOR SELECT TO authenticated USING (public.is_workspace_member(auth.uid(), workspace_id));
CREATE POLICY "managers write rates" ON public.shop_shipping_rates FOR ALL TO authenticated USING (public.can_manage_commerce(auth.uid(), workspace_id)) WITH CHECK (public.can_manage_commerce(auth.uid(), workspace_id));

-- ============ ORDERS ============
CREATE TABLE public.shop_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  store_id uuid NOT NULL REFERENCES public.shop_stores(id) ON DELETE CASCADE,
  customer_id uuid REFERENCES public.shop_customers(id) ON DELETE SET NULL,
  contact_id uuid REFERENCES public.contacts(id) ON DELETE SET NULL,
  user_id uuid,
  order_number text NOT NULL,
  email text NOT NULL,
  full_name text,
  phone text,
  status text NOT NULL DEFAULT 'pending',
  fulfilment_status text NOT NULL DEFAULT 'unfulfilled',
  currency text NOT NULL DEFAULT 'GBP',
  subtotal_amount integer NOT NULL DEFAULT 0,
  discount_amount integer NOT NULL DEFAULT 0,
  shipping_amount integer NOT NULL DEFAULT 0,
  tax_amount integer NOT NULL DEFAULT 0,
  total_amount integer NOT NULL DEFAULT 0,
  refunded_amount integer NOT NULL DEFAULT 0,
  discount_code text,
  shipping_address jsonb NOT NULL DEFAULT '{}'::jsonb,
  billing_address jsonb NOT NULL DEFAULT '{}'::jsonb,
  shipping_rate_id uuid REFERENCES public.shop_shipping_rates(id) ON DELETE SET NULL,
  stripe_checkout_session_id text,
  stripe_payment_intent_id text,
  stripe_subscription_id text,
  stripe_account_id text,
  notes text,
  paid_at timestamptz,
  cancelled_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (store_id, order_number)
);
CREATE INDEX idx_shop_orders_ws_created ON public.shop_orders(workspace_id, created_at DESC);
CREATE UNIQUE INDEX idx_shop_orders_session ON public.shop_orders(stripe_checkout_session_id) WHERE stripe_checkout_session_id IS NOT NULL;
GRANT SELECT, INSERT, UPDATE ON public.shop_orders TO authenticated;
GRANT ALL ON public.shop_orders TO service_role;
ALTER TABLE public.shop_orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff read orders" ON public.shop_orders FOR SELECT TO authenticated USING (public.is_workspace_member(auth.uid(), workspace_id));
CREATE POLICY "fulfilment updates orders" ON public.shop_orders FOR UPDATE TO authenticated USING (public.can_fulfil_orders(auth.uid(), workspace_id)) WITH CHECK (public.can_fulfil_orders(auth.uid(), workspace_id));
CREATE POLICY "customer reads own orders" ON public.shop_orders FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE TABLE public.shop_order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  order_id uuid NOT NULL REFERENCES public.shop_orders(id) ON DELETE CASCADE,
  product_id uuid REFERENCES public.shop_products(id) ON DELETE SET NULL,
  variant_id uuid REFERENCES public.shop_product_variants(id) ON DELETE SET NULL,
  name text NOT NULL,
  product_type text NOT NULL DEFAULT 'physical',
  sku text,
  quantity integer NOT NULL DEFAULT 1,
  unit_amount integer NOT NULL DEFAULT 0,
  total_amount integer NOT NULL DEFAULT 0,
  fulfilled_quantity integer NOT NULL DEFAULT 0,
  requires_shipping boolean NOT NULL DEFAULT false,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_shop_order_items_order ON public.shop_order_items(order_id);
GRANT SELECT ON public.shop_order_items TO authenticated;
GRANT ALL ON public.shop_order_items TO service_role;
ALTER TABLE public.shop_order_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff read order items" ON public.shop_order_items FOR SELECT TO authenticated USING (public.is_workspace_member(auth.uid(), workspace_id));
CREATE POLICY "customer reads own order items" ON public.shop_order_items FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.shop_orders o WHERE o.id = order_id AND o.user_id = auth.uid()));

CREATE TABLE public.shop_order_status_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  order_id uuid NOT NULL REFERENCES public.shop_orders(id) ON DELETE CASCADE,
  from_status text,
  to_status text NOT NULL,
  note text,
  actor_user_id uuid,
  source text NOT NULL DEFAULT 'system',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.shop_order_status_history TO authenticated;
GRANT ALL ON public.shop_order_status_history TO service_role;
ALTER TABLE public.shop_order_status_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff read order history" ON public.shop_order_status_history FOR SELECT TO authenticated USING (public.is_workspace_member(auth.uid(), workspace_id));
CREATE POLICY "fulfilment writes order history" ON public.shop_order_status_history FOR INSERT TO authenticated WITH CHECK (public.can_fulfil_orders(auth.uid(), workspace_id));

CREATE TABLE public.shop_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  store_id uuid NOT NULL REFERENCES public.shop_stores(id) ON DELETE CASCADE,
  order_id uuid REFERENCES public.shop_orders(id) ON DELETE SET NULL,
  type text NOT NULL,
  status text NOT NULL DEFAULT 'succeeded',
  currency text NOT NULL,
  amount integer NOT NULL,
  fee_amount integer NOT NULL DEFAULT 0,
  stripe_object_id text,
  failure_reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_shop_tx_ws ON public.shop_transactions(workspace_id, created_at DESC);
GRANT SELECT ON public.shop_transactions TO authenticated;
GRANT ALL ON public.shop_transactions TO service_role;
ALTER TABLE public.shop_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff read transactions" ON public.shop_transactions FOR SELECT TO authenticated USING (public.is_workspace_member(auth.uid(), workspace_id));

CREATE TABLE public.shop_fulfilments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  order_id uuid NOT NULL REFERENCES public.shop_orders(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'fulfilled',
  carrier text,
  tracking_number text,
  tracking_url text,
  notified_at timestamptz,
  note text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.shop_fulfilments TO authenticated;
GRANT ALL ON public.shop_fulfilments TO service_role;
ALTER TABLE public.shop_fulfilments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff read fulfilments" ON public.shop_fulfilments FOR SELECT TO authenticated USING (public.is_workspace_member(auth.uid(), workspace_id));
CREATE POLICY "fulfilment writes fulfilments" ON public.shop_fulfilments FOR ALL TO authenticated USING (public.can_fulfil_orders(auth.uid(), workspace_id)) WITH CHECK (public.can_fulfil_orders(auth.uid(), workspace_id));

CREATE TABLE public.shop_fulfilment_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  fulfilment_id uuid NOT NULL REFERENCES public.shop_fulfilments(id) ON DELETE CASCADE,
  order_item_id uuid NOT NULL REFERENCES public.shop_order_items(id) ON DELETE CASCADE,
  quantity integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.shop_fulfilment_items TO authenticated;
GRANT ALL ON public.shop_fulfilment_items TO service_role;
ALTER TABLE public.shop_fulfilment_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff read fulfilment items" ON public.shop_fulfilment_items FOR SELECT TO authenticated USING (public.is_workspace_member(auth.uid(), workspace_id));
CREATE POLICY "fulfilment writes fulfilment items" ON public.shop_fulfilment_items FOR INSERT TO authenticated WITH CHECK (public.can_fulfil_orders(auth.uid(), workspace_id));

-- ============ SELLER PAYMENTS / EVENTS ============
CREATE TABLE public.seller_payment_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL UNIQUE REFERENCES public.workspaces(id) ON DELETE CASCADE,
  provider text NOT NULL DEFAULT 'stripe',
  stripe_account_id text UNIQUE,
  livemode boolean NOT NULL DEFAULT false,
  charges_enabled boolean NOT NULL DEFAULT false,
  payouts_enabled boolean NOT NULL DEFAULT false,
  details_submitted boolean NOT NULL DEFAULT false,
  default_currency text,
  country text,
  connected_by uuid,
  connected_at timestamptz,
  disconnected_at timestamptz,
  last_synced_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.seller_payment_accounts TO authenticated;
GRANT ALL ON public.seller_payment_accounts TO service_role;
ALTER TABLE public.seller_payment_accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff read payment account" ON public.seller_payment_accounts FOR SELECT TO authenticated USING (public.is_workspace_member(auth.uid(), workspace_id));

CREATE TABLE public.commerce_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  store_id uuid REFERENCES public.shop_stores(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  order_id uuid REFERENCES public.shop_orders(id) ON DELETE SET NULL,
  customer_id uuid REFERENCES public.shop_customers(id) ON DELETE SET NULL,
  contact_id uuid REFERENCES public.contacts(id) ON DELETE SET NULL,
  product_id uuid REFERENCES public.shop_products(id) ON DELETE SET NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_commerce_events_ws ON public.commerce_events(workspace_id, created_at DESC);
GRANT SELECT ON public.commerce_events TO authenticated;
GRANT ALL ON public.commerce_events TO service_role;
ALTER TABLE public.commerce_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff read commerce events" ON public.commerce_events FOR SELECT TO authenticated USING (public.is_workspace_member(auth.uid(), workspace_id));

CREATE TABLE public.processed_webhook_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source text NOT NULL DEFAULT 'stripe_connect',
  event_id text NOT NULL,
  account_id text,
  event_type text,
  processed_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (source, event_id)
);
GRANT ALL ON public.processed_webhook_events TO service_role;
ALTER TABLE public.processed_webhook_events ENABLE ROW LEVEL SECURITY;

-- ============ updated_at TRIGGERS ============
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'shop_stores','shop_store_branding','shop_store_domains','shop_collections','shop_products',
    'shop_product_variants','shop_product_prices','shop_customers','shop_discounts','shop_carts',
    'shop_shipping_zones','shop_shipping_rates','shop_orders','shop_fulfilments','seller_payment_accounts'
  ] LOOP
    EXECUTE format(
      'CREATE TRIGGER trg_%1$s_updated_at BEFORE UPDATE ON public.%1$s FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column()', t);
  END LOOP;
END $$;

-- ============ PUBLIC STOREFRONT READ FUNCTIONS ============
CREATE OR REPLACE FUNCTION public.get_public_store(p_slug text)
RETURNS TABLE(id uuid, workspace_id uuid, slug text, name text, description text, currency text,
  countries_served text[], policies jsonb, business_name text, business_email text, business_phone text,
  logo_url text, cover_url text, primary_color text, accent_color text, font_family text, tagline text,
  social_links jsonb, navigation jsonb, footer_text text, seo_title text, seo_description text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT s.id, s.workspace_id, s.slug, s.name, s.description, s.currency, s.countries_served, s.policies,
         s.business_name, s.business_email, s.business_phone,
         b.logo_url, b.cover_url, COALESCE(b.primary_color,'#0B1F3A'), COALESCE(b.accent_color,'#D4AF37'),
         COALESCE(b.font_family,'inter'), b.tagline, COALESCE(b.social_links,'{}'::jsonb),
         COALESCE(b.navigation,'[]'::jsonb), b.footer_text, b.seo_title, b.seo_description
  FROM public.shop_stores s
  LEFT JOIN public.shop_store_branding b ON b.store_id = s.id
  WHERE s.slug = p_slug AND s.status = 'published'
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.get_public_store_products(p_store_slug text, p_collection_slug text DEFAULT NULL)
RETURNS TABLE(id uuid, slug text, name text, short_description text, product_type text, price_amount integer,
  compare_at_amount integer, currency text, billing_type text, billing_interval text, button_text text,
  image_url text, tags text[])
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT p.id, p.slug, p.name, p.short_description, p.product_type, p.price_amount, p.compare_at_amount,
         p.currency, p.billing_type, p.billing_interval, p.button_text,
         (SELECT m.url FROM public.shop_product_media m WHERE m.product_id = p.id ORDER BY m.position LIMIT 1),
         p.tags
  FROM public.shop_products p
  JOIN public.shop_stores s ON s.id = p.store_id AND s.status = 'published'
  WHERE s.slug = p_store_slug AND p.status = 'active' AND p.visibility = 'public'
    AND (p_collection_slug IS NULL OR EXISTS (
      SELECT 1 FROM public.shop_collection_products cp
      JOIN public.shop_collections c ON c.id = cp.collection_id
      WHERE cp.product_id = p.id AND c.slug = p_collection_slug AND c.is_public
    ))
  ORDER BY p.created_at DESC;
$$;

CREATE OR REPLACE FUNCTION public.get_public_store_product(p_store_slug text, p_product_slug text)
RETURNS TABLE(id uuid, store_id uuid, slug text, name text, short_description text, description text,
  product_type text, price_amount integer, compare_at_amount integer, currency text, billing_type text,
  billing_interval text, trial_days integer, button_text text, requires_shipping boolean,
  track_inventory boolean, inventory_quantity integer, allow_backorder boolean, deliverables text,
  onboarding_instructions text, booking_page_id uuid, seo_title text, seo_description text,
  media jsonb, variants jsonb)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT p.id, p.store_id, p.slug, p.name, p.short_description, p.description, p.product_type,
         p.price_amount, p.compare_at_amount, p.currency, p.billing_type, p.billing_interval, p.trial_days,
         p.button_text, p.requires_shipping, p.track_inventory, p.inventory_quantity, p.allow_backorder,
         p.deliverables, p.onboarding_instructions, p.booking_page_id, p.seo_title, p.seo_description,
         COALESCE((SELECT jsonb_agg(jsonb_build_object('url', m.url, 'alt', m.alt) ORDER BY m.position)
                   FROM public.shop_product_media m WHERE m.product_id = p.id), '[]'::jsonb),
         COALESCE((SELECT jsonb_agg(jsonb_build_object('id', v.id, 'name', v.name, 'options', v.options,
                     'price_amount', COALESCE(v.price_amount, p.price_amount),
                     'inventory_quantity', v.inventory_quantity) ORDER BY v.position)
                   FROM public.shop_product_variants v WHERE v.product_id = p.id AND v.is_active), '[]'::jsonb)
  FROM public.shop_products p
  JOIN public.shop_stores s ON s.id = p.store_id AND s.status = 'published'
  WHERE s.slug = p_store_slug AND p.slug = p_product_slug AND p.status = 'active' AND p.visibility = 'public'
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.get_public_store_collections(p_store_slug text)
RETURNS TABLE(id uuid, slug text, name text, description text, image_url text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT c.id, c.slug, c.name, c.description, c.image_url
  FROM public.shop_collections c
  JOIN public.shop_stores s ON s.id = c.store_id AND s.status = 'published'
  WHERE s.slug = p_store_slug AND c.is_public
  ORDER BY c.position ASC, c.created_at ASC;
$$;

GRANT EXECUTE ON FUNCTION public.get_public_store(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_public_store_products(text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_public_store_product(text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_public_store_collections(text) TO anon, authenticated;