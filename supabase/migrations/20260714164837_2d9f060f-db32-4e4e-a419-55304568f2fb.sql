-- 1. Extend workflows with enrollment-object trigger structure
ALTER TABLE public.workflows
  ADD COLUMN IF NOT EXISTS enrollment_object_type text NOT NULL DEFAULT 'lead',
  ADD COLUMN IF NOT EXISTS enrollment_method text NOT NULL DEFAULT 'event',
  ADD COLUMN IF NOT EXISTS trigger_source text,
  ADD COLUMN IF NOT EXISTS trigger_event text,
  ADD COLUMN IF NOT EXISTS trigger_config jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS filter_groups jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS reenrollment_config jsonb NOT NULL DEFAULT '{"mode":"never"}'::jsonb,
  ADD COLUMN IF NOT EXISTS deduplication_key text,
  ADD COLUMN IF NOT EXISTS trigger_summary text,
  ADD COLUMN IF NOT EXISTS last_tested_at timestamptz,
  ADD COLUMN IF NOT EXISTS folder_id uuid;

-- 2. Backfill trigger_source / trigger_event from existing canvas trigger nodes
DO $$
DECLARE
  wf RECORD;
  trig jsonb;
  sub text;
  cfg jsonb;
  src text;
BEGIN
  FOR wf IN SELECT id, canvas_json FROM public.workflows WHERE trigger_event IS NULL LOOP
    trig := NULL;
    IF wf.canvas_json ? 'nodes' THEN
      SELECT n INTO trig
      FROM jsonb_array_elements(wf.canvas_json->'nodes') n
      WHERE n->'data'->>'kind' = 'trigger'
      LIMIT 1;
    END IF;

    IF trig IS NULL THEN
      CONTINUE;
    END IF;

    sub := trig->'data'->>'subType';
    cfg := COALESCE(trig->'data'->'config', '{}'::jsonb);

    src := CASE
      WHEN sub IN ('new_lead','lead_added_to_folder','lead_tagged','tag_added_any','score_threshold') THEN 'crm'
      WHEN sub = 'form_submitted' THEN 'forms'
      WHEN sub = 'funnel_step_completed' THEN 'funnels'
      WHEN sub = 'appointment_booked' THEN 'bookings'
      WHEN sub IN ('email_opened','email_not_opened','link_clicked') THEN 'email'
      WHEN sub = 'whatsapp_replied' THEN 'whatsapp'
      WHEN sub = 'sms_replied' THEN 'sms'
      WHEN sub = 'campaign_completed' THEN 'campaigns'
      WHEN sub = 'purchase_event' THEN 'payments'
      WHEN sub IN ('trial_started','trial_ending_soon','subscription_cancelled') THEN 'subscriptions'
      WHEN sub = 'roi_calculator_submitted' THEN 'forms'
      WHEN sub = 'meta_lead_received' THEN 'meta_lead_ads'
      ELSE 'crm'
    END;

    UPDATE public.workflows
      SET trigger_source = src,
          trigger_event = sub,
          trigger_config = cfg,
          enrollment_object_type = COALESCE(enrollment_object_type, 'lead')
      WHERE id = wf.id;
  END LOOP;
END $$;

-- 3. Deduplication table for webhook retries
CREATE TABLE IF NOT EXISTS public.processed_automation_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL,
  workflow_id uuid NOT NULL REFERENCES public.workflows(id) ON DELETE CASCADE,
  event_key text NOT NULL,
  external_event_id text NOT NULL,
  event_payload jsonb,
  processed_at timestamptz NOT NULL DEFAULT now(),
  status text NOT NULL DEFAULT 'processed',
  UNIQUE (workspace_id, workflow_id, external_event_id)
);

GRANT SELECT ON public.processed_automation_events TO authenticated;
GRANT ALL ON public.processed_automation_events TO service_role;

ALTER TABLE public.processed_automation_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Workspace members can view processed events"
  ON public.processed_automation_events
  FOR SELECT
  TO authenticated
  USING (public.is_workspace_member(auth.uid(), workspace_id));

CREATE INDEX IF NOT EXISTS idx_processed_events_workflow
  ON public.processed_automation_events (workflow_id, processed_at DESC);