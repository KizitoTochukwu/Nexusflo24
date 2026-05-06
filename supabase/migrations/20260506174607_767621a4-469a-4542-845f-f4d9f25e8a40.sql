CREATE INDEX IF NOT EXISTS idx_scheduled_jobs_automation_lead_status
  ON public.scheduled_jobs (automation_id, lead_id, status);

CREATE INDEX IF NOT EXISTS idx_scheduled_jobs_status_run_at
  ON public.scheduled_jobs (status, run_at);

CREATE INDEX IF NOT EXISTS idx_automation_logs_event_status_created
  ON public.automation_logs (event_type, status, created_at DESC);
