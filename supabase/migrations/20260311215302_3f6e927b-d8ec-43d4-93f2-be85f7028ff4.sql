
ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS pipeline_stage text NOT NULL DEFAULT 'new_lead',
  ADD COLUMN IF NOT EXISTS assigned_owner_id uuid,
  ADD COLUMN IF NOT EXISTS campaign_name text,
  ADD COLUMN IF NOT EXISTS funnel_name text;

CREATE TABLE IF NOT EXISTS public.lead_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  title text NOT NULL,
  description text,
  due_date timestamptz,
  is_completed boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.lead_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view workspace lead_tasks" ON public.lead_tasks
  FOR SELECT TO authenticated USING (workspace_id IN (SELECT user_workspace_ids(auth.uid())));
CREATE POLICY "Members can insert workspace lead_tasks" ON public.lead_tasks
  FOR INSERT TO authenticated WITH CHECK (workspace_id IN (SELECT user_workspace_ids(auth.uid())));
CREATE POLICY "Members can update workspace lead_tasks" ON public.lead_tasks
  FOR UPDATE TO authenticated USING (workspace_id IN (SELECT user_workspace_ids(auth.uid())))
  WITH CHECK (workspace_id IN (SELECT user_workspace_ids(auth.uid())));
CREATE POLICY "Members can delete workspace lead_tasks" ON public.lead_tasks
  FOR DELETE TO authenticated USING (workspace_id IN (SELECT user_workspace_ids(auth.uid())));

CREATE TABLE IF NOT EXISTS public.lead_routing_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  folder_id uuid NOT NULL REFERENCES public.lead_folders(id) ON DELETE CASCADE,
  match_field text NOT NULL,
  match_value text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.lead_routing_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can manage workspace routing_rules" ON public.lead_routing_rules
  FOR ALL TO authenticated
  USING (workspace_id IN (SELECT user_workspace_ids(auth.uid())))
  WITH CHECK (workspace_id IN (SELECT user_workspace_ids(auth.uid())));
