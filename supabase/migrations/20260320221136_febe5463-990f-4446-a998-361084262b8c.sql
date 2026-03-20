
CREATE TABLE public.workspace_domains (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  resend_domain_id text NOT NULL,
  domain_name text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(workspace_id, resend_domain_id)
);

ALTER TABLE public.workspace_domains ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view workspace domains"
  ON public.workspace_domains FOR SELECT TO authenticated
  USING (workspace_id IN (SELECT user_workspace_ids(auth.uid())));

CREATE POLICY "Admins can insert workspace domains"
  ON public.workspace_domains FOR INSERT TO authenticated
  WITH CHECK (is_workspace_admin(auth.uid(), workspace_id));

CREATE POLICY "Admins can delete workspace domains"
  ON public.workspace_domains FOR DELETE TO authenticated
  USING (is_workspace_admin(auth.uid(), workspace_id));

CREATE POLICY "Service can manage workspace domains"
  ON public.workspace_domains FOR ALL TO service_role
  USING (true) WITH CHECK (true);
