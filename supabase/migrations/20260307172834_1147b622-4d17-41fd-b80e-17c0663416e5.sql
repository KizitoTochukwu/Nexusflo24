CREATE TABLE public.scheduled_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  automation_id uuid NOT NULL REFERENCES public.automations(id) ON DELETE CASCADE,
  lead_id uuid NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  step_index integer NOT NULL,
  run_at timestamptz NOT NULL,
  payload jsonb DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'pending',
  error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.scheduled_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view workspace scheduled_jobs"
  ON public.scheduled_jobs FOR SELECT TO authenticated
  USING (workspace_id IN (SELECT user_workspace_ids(auth.uid())));

CREATE POLICY "Service can insert scheduled_jobs"
  ON public.scheduled_jobs FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Service can update scheduled_jobs"
  ON public.scheduled_jobs FOR UPDATE
  USING (true) WITH CHECK (true);

CREATE POLICY "Service can delete scheduled_jobs"
  ON public.scheduled_jobs FOR DELETE
  USING (true);

CREATE INDEX idx_scheduled_jobs_pending ON public.scheduled_jobs (run_at) WHERE status = 'pending';