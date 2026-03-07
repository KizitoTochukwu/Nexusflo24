

## Plan: pg_cron Job Queue for Automation Delays

### Overview
Add a `scheduled_jobs` table, modify `execute-automation` to pause at delay steps and schedule future execution, create a `process-scheduled-jobs` edge function, and wire it up with pg_cron to run every minute.

### Database Changes (Migration)

**1. Create `scheduled_jobs` table:**
```sql
CREATE TABLE public.scheduled_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL,
  automation_id uuid NOT NULL,
  lead_id uuid NOT NULL,
  step_index integer NOT NULL,
  run_at timestamptz NOT NULL,
  payload jsonb DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'pending',
  error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.scheduled_jobs ENABLE ROW LEVEL SECURITY;

-- Members can view their workspace's scheduled jobs
CREATE POLICY "Members can view workspace scheduled_jobs"
  ON public.scheduled_jobs FOR SELECT TO authenticated
  USING (workspace_id IN (SELECT user_workspace_ids(auth.uid())));

-- Service role inserts/updates (edge functions use service_role)
CREATE POLICY "Service can insert scheduled_jobs"
  ON public.scheduled_jobs FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Service can update scheduled_jobs"
  ON public.scheduled_jobs FOR UPDATE
  USING (true) WITH CHECK (true);

CREATE POLICY "Service can delete scheduled_jobs"
  ON public.scheduled_jobs FOR DELETE
  USING (true);

-- Index for cron polling
CREATE INDEX idx_scheduled_jobs_pending ON public.scheduled_jobs (run_at) WHERE status = 'pending';
```

**2. Enable pg_cron + pg_net extensions (via insert tool, not migration):**
```sql
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;
```

**3. Create cron job (via insert tool — contains project-specific URL/key):**
```sql
SELECT cron.schedule(
  'process-scheduled-jobs',
  '* * * * *',
  $$
  SELECT net.http_post(
    url:='https://stuaikfyuwcjmchcvfie.supabase.co/functions/v1/process-scheduled-jobs',
    headers:='{"Content-Type":"application/json","Authorization":"Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN0dWFpa2Z5dXdjam1jaGN2ZmllIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA3NDMxNTIsImV4cCI6MjA4NjMxOTE1Mn0.6klVTh_SkcPmBUggnT6CvYI-uZJ1-1GusC9pMk8xUUE"}'::jsonb,
    body:='{"source":"cron"}'::jsonb
  ) AS request_id;
  $$
);
```

### Edge Function Changes

**4. Modify `supabase/functions/execute-automation/index.ts`**

Update the execution loop: when a `delay` step is encountered, calculate `run_at` from the delay config, insert a `scheduled_jobs` record with `step_index` pointing to the **next** step after the delay, log the delay as `"scheduled"`, and **break** the loop (stop executing further steps).

Add support for an optional `start_from_step` parameter so the cron processor can resume from a specific step index.

Key logic change in the `case "delay"` block:
```typescript
case "delay": {
  const delayMinutes = parseDelay(config.delay); // e.g. "1d" → 1440
  const runAt = new Date(Date.now() + delayMinutes * 60_000).toISOString();
  const nextStepIndex = steps!.indexOf(step) + 1;
  
  await supabase.from("scheduled_jobs").insert({
    workspace_id,
    automation_id,
    lead_id,
    step_index: nextStepIndex,
    run_at: runAt,
    payload: { automation_id, lead_id, workspace_id },
    status: "pending",
  });
  
  details = { scheduled_run_at: runAt, delay: config.delay };
  status = "scheduled";
  // Log and break — remaining steps execute later
  skipRemaining = true;
  break;
}
```

Add a `parseDelay` helper: parses `"1d"`, `"2h"`, `"30m"` → minutes.

Accept `start_from_step` in the request body to allow resuming mid-workflow.

**5. Create `supabase/functions/process-scheduled-jobs/index.ts`**

New edge function that:
- Queries `scheduled_jobs` where `status = 'pending'` AND `run_at <= now()`, limited to 50 rows
- For each job: sets status to `"running"`, calls `execute-automation` internally (passing `start_from_step: job.step_index`), then sets status to `"completed"` or `"failed"`
- Uses `FOR UPDATE SKIP LOCKED` pattern via a raw RPC to prevent double-processing

**6. Register in `supabase/config.toml`:**
```toml
[functions.process-scheduled-jobs]
  verify_jwt = false
```

### Scope
- 1 new table (`scheduled_jobs`) with RLS + index
- 2 extensions enabled (`pg_cron`, `pg_net`)
- 1 cron job created
- 1 edge function modified (`execute-automation`)
- 1 new edge function (`process-scheduled-jobs`)
- 1 config update (`config.toml`)
- No frontend changes needed

