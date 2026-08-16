CREATE TABLE public.store_orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID,
  workspace_id UUID,
  email TEXT NOT NULL,
  full_name TEXT,
  phone TEXT,
  business_name TEXT,
  website TEXT,
  industry TEXT,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  currency TEXT NOT NULL DEFAULT 'GBP',
  subtotal_pence INTEGER NOT NULL DEFAULT 0,
  total_pence INTEGER NOT NULL DEFAULT 0,
  monthly_total_pence INTEGER NOT NULL DEFAULT 0,
  plan_slug TEXT,
  stripe_session_id TEXT,
  stripe_payment_intent TEXT,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.store_order_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID NOT NULL REFERENCES public.store_orders(id) ON DELETE CASCADE,
  kind TEXT NOT NULL DEFAULT 'product',
  product_slug TEXT,
  bundle_slug TEXT,
  plan_slug TEXT,
  name TEXT NOT NULL,
  unit_price_pence INTEGER NOT NULL DEFAULT 0,
  quantity INTEGER NOT NULL DEFAULT 1,
  configuration JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.store_projects (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID REFERENCES public.store_orders(id) ON DELETE CASCADE,
  order_item_id UUID REFERENCES public.store_order_items(id) ON DELETE SET NULL,
  user_id UUID,
  workspace_id UUID,
  name TEXT NOT NULL,
  product_slug TEXT,
  bundle_slug TEXT,
  status TEXT NOT NULL DEFAULT 'onboarding',
  progress INTEGER NOT NULL DEFAULT 0,
  configuration JSONB NOT NULL DEFAULT '{}'::jsonb,
  onboarding_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  onboarding_completed_at TIMESTAMPTZ,
  approval_requested_at TIMESTAMPTZ,
  approved_at TIMESTAMPTZ,
  go_live_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.store_project_updates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.store_projects(id) ON DELETE CASCADE,
  author_id UUID,
  title TEXT NOT NULL,
  body TEXT,
  update_type TEXT NOT NULL DEFAULT 'note',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_store_orders_user ON public.store_orders(user_id);
CREATE INDEX idx_store_order_items_order ON public.store_order_items(order_id);
CREATE INDEX idx_store_projects_user ON public.store_projects(user_id);
CREATE INDEX idx_store_project_updates_project ON public.store_project_updates(project_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.store_orders TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.store_order_items TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.store_projects TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.store_project_updates TO authenticated;
GRANT ALL ON public.store_orders TO service_role;
GRANT ALL ON public.store_order_items TO service_role;
GRANT ALL ON public.store_projects TO service_role;
GRANT ALL ON public.store_project_updates TO service_role;

ALTER TABLE public.store_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_project_updates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view their orders" ON public.store_orders
  FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users create their orders" ON public.store_orders
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Admins manage orders" ON public.store_orders
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins delete orders" ON public.store_orders
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users view their order items" ON public.store_order_items
  FOR SELECT TO authenticated USING (
    public.has_role(auth.uid(), 'admin')
    OR EXISTS (SELECT 1 FROM public.store_orders o WHERE o.id = order_id AND o.user_id = auth.uid())
  );
CREATE POLICY "Users create their order items" ON public.store_order_items
  FOR INSERT TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM public.store_orders o WHERE o.id = order_id AND o.user_id = auth.uid())
  );
CREATE POLICY "Admins manage order items" ON public.store_order_items
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users view their projects" ON public.store_projects
  FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users update their projects" ON public.store_projects
  FOR UPDATE TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins create projects" ON public.store_projects
  FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins delete projects" ON public.store_projects
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users view their project updates" ON public.store_project_updates
  FOR SELECT TO authenticated USING (
    public.has_role(auth.uid(), 'admin')
    OR EXISTS (SELECT 1 FROM public.store_projects p WHERE p.id = project_id AND p.user_id = auth.uid())
  );
CREATE POLICY "Admins manage project updates" ON public.store_project_updates
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_store_orders_updated_at BEFORE UPDATE ON public.store_orders
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_store_projects_updated_at BEFORE UPDATE ON public.store_projects
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();