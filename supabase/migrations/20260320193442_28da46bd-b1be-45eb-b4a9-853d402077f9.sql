
-- Smart Lists (saved filter presets)
CREATE TABLE public.smart_lists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  name text NOT NULL,
  icon text DEFAULT '📋',
  filters jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_default boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.smart_lists ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view workspace smart_lists" ON public.smart_lists
  FOR SELECT TO authenticated
  USING (workspace_id IN (SELECT user_workspace_ids(auth.uid())));

CREATE POLICY "Members can insert workspace smart_lists" ON public.smart_lists
  FOR INSERT TO authenticated
  WITH CHECK (workspace_id IN (SELECT user_workspace_ids(auth.uid())));

CREATE POLICY "Members can update workspace smart_lists" ON public.smart_lists
  FOR UPDATE TO authenticated
  USING (workspace_id IN (SELECT user_workspace_ids(auth.uid())))
  WITH CHECK (workspace_id IN (SELECT user_workspace_ids(auth.uid())));

CREATE POLICY "Members can delete workspace smart_lists" ON public.smart_lists
  FOR DELETE TO authenticated
  USING (workspace_id IN (SELECT user_workspace_ids(auth.uid())));

-- Workspace branding (white-label)
CREATE TABLE public.workspace_branding (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE UNIQUE,
  logo_url text,
  icon_url text,
  brand_color text DEFAULT '#D4AF37',
  brand_name text,
  custom_domain text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.workspace_branding ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view workspace branding" ON public.workspace_branding
  FOR SELECT TO authenticated
  USING (workspace_id IN (SELECT user_workspace_ids(auth.uid())));

CREATE POLICY "Admins can insert workspace branding" ON public.workspace_branding
  FOR INSERT TO authenticated
  WITH CHECK (is_workspace_admin(auth.uid(), workspace_id));

CREATE POLICY "Admins can update workspace branding" ON public.workspace_branding
  FOR UPDATE TO authenticated
  USING (is_workspace_admin(auth.uid(), workspace_id))
  WITH CHECK (is_workspace_admin(auth.uid(), workspace_id));

-- Templates marketplace
CREATE TABLE public.templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category text NOT NULL CHECK (category IN ('email', 'automation', 'funnel')),
  name text NOT NULL,
  description text,
  thumbnail_url text,
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  tags text[] DEFAULT '{}',
  popularity integer NOT NULL DEFAULT 0,
  is_premium boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.templates ENABLE ROW LEVEL SECURITY;

-- Templates are publicly readable
CREATE POLICY "Anyone can view templates" ON public.templates
  FOR SELECT TO authenticated
  USING (true);

-- Only service role can manage templates (seeded by admins)
CREATE POLICY "Service can manage templates" ON public.templates
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);
