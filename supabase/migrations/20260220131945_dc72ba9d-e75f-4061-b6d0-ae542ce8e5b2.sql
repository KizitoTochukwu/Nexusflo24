
-- Funnels table
CREATE TABLE public.funnels (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  name text NOT NULL,
  description text DEFAULT '',
  objective text NOT NULL DEFAULT 'lead_capture',
  status text NOT NULL DEFAULT 'draft',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.funnels ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view workspace funnels" ON public.funnels FOR SELECT
  USING (workspace_id IN (SELECT user_workspace_ids(auth.uid())));
CREATE POLICY "Members can insert workspace funnels" ON public.funnels FOR INSERT
  WITH CHECK (workspace_id IN (SELECT user_workspace_ids(auth.uid())));
CREATE POLICY "Members can update workspace funnels" ON public.funnels FOR UPDATE
  USING (workspace_id IN (SELECT user_workspace_ids(auth.uid())));
CREATE POLICY "Members can delete workspace funnels" ON public.funnels FOR DELETE
  USING (workspace_id IN (SELECT user_workspace_ids(auth.uid())));

CREATE TRIGGER update_funnels_updated_at BEFORE UPDATE ON public.funnels
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Funnel steps table
CREATE TABLE public.funnel_steps (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  funnel_id uuid NOT NULL REFERENCES public.funnels(id) ON DELETE CASCADE,
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  step_order integer NOT NULL DEFAULT 0,
  step_type text NOT NULL DEFAULT 'landing',
  page_content jsonb DEFAULT '{}'::jsonb,
  conversion_rate real NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.funnel_steps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view workspace funnel steps" ON public.funnel_steps FOR SELECT
  USING (workspace_id IN (SELECT user_workspace_ids(auth.uid())));
CREATE POLICY "Members can insert workspace funnel steps" ON public.funnel_steps FOR INSERT
  WITH CHECK (workspace_id IN (SELECT user_workspace_ids(auth.uid())));
CREATE POLICY "Members can update workspace funnel steps" ON public.funnel_steps FOR UPDATE
  USING (workspace_id IN (SELECT user_workspace_ids(auth.uid())));
CREATE POLICY "Members can delete workspace funnel steps" ON public.funnel_steps FOR DELETE
  USING (workspace_id IN (SELECT user_workspace_ids(auth.uid())));

-- Funnel visits table
CREATE TABLE public.funnel_visits (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  funnel_id uuid NOT NULL REFERENCES public.funnels(id) ON DELETE CASCADE,
  step_id uuid NOT NULL REFERENCES public.funnel_steps(id) ON DELETE CASCADE,
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  lead_id uuid REFERENCES public.leads(id) ON DELETE SET NULL,
  converted boolean NOT NULL DEFAULT false,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  device_type text DEFAULT 'desktop',
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.funnel_visits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view workspace funnel visits" ON public.funnel_visits FOR SELECT
  USING (workspace_id IN (SELECT user_workspace_ids(auth.uid())));
CREATE POLICY "Members can insert workspace funnel visits" ON public.funnel_visits FOR INSERT
  WITH CHECK (workspace_id IN (SELECT user_workspace_ids(auth.uid())));
CREATE POLICY "Members can delete workspace funnel visits" ON public.funnel_visits FOR DELETE
  USING (workspace_id IN (SELECT user_workspace_ids(auth.uid())));
