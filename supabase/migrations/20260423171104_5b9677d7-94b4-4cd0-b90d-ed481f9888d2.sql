
ALTER TABLE public.automations
  ADD COLUMN IF NOT EXISTS exit_criteria jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS exit_actions jsonb NOT NULL DEFAULT '[]'::jsonb;

CREATE INDEX IF NOT EXISTS idx_scheduled_jobs_lead_automation_status
  ON public.scheduled_jobs (lead_id, automation_id, status);

CREATE INDEX IF NOT EXISTS idx_automations_workspace_status_exit
  ON public.automations (workspace_id, status)
  WHERE jsonb_array_length(exit_criteria) > 0;
