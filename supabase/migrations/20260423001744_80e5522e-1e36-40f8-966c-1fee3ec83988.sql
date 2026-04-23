
-- 1. Drop the FK that blocks workflow ids from being stored in automation_id
ALTER TABLE public.scheduled_jobs
  DROP CONSTRAINT IF EXISTS scheduled_jobs_automation_id_fkey;

-- 2. Allow null so workflow jobs don't need a fake automation id
ALTER TABLE public.scheduled_jobs
  ALTER COLUMN automation_id DROP NOT NULL;

-- 3. Index for fast workflow-job lookups (Diagnostics queue, retries)
CREATE INDEX IF NOT EXISTS scheduled_jobs_workflow_idx
  ON public.scheduled_jobs ((payload->>'workflow_id'), status, run_at);
