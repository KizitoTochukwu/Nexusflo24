
ALTER TABLE public.automations
  ADD COLUMN IF NOT EXISTS enrollment_object_type text DEFAULT 'lead',
  ADD COLUMN IF NOT EXISTS enrollment_method text DEFAULT 'event',
  ADD COLUMN IF NOT EXISTS trigger_source text,
  ADD COLUMN IF NOT EXISTS trigger_event text,
  ADD COLUMN IF NOT EXISTS filter_groups jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS reenrollment_config jsonb NOT NULL DEFAULT '{"mode":"never"}'::jsonb,
  ADD COLUMN IF NOT EXISTS deduplication_key text,
  ADD COLUMN IF NOT EXISTS trigger_summary text,
  ADD COLUMN IF NOT EXISTS last_tested_at timestamptz,
  ADD COLUMN IF NOT EXISTS folder_id uuid;

-- Backfill trigger_source / trigger_event from legacy trigger_type
UPDATE public.automations
SET trigger_source = CASE trigger_type
    WHEN 'new_lead'             THEN 'crm'
    WHEN 'lead_added_to_folder' THEN 'crm'
    WHEN 'lead_tagged'          THEN 'crm'
    WHEN 'tag_added_any'        THEN 'crm'
    WHEN 'score_threshold'      THEN 'crm'
    WHEN 'form_submitted'       THEN 'forms'
    WHEN 'roi_calculator_submitted' THEN 'forms'
    WHEN 'funnel_step_completed' THEN 'funnels'
    WHEN 'campaign_completed'   THEN 'campaigns'
    WHEN 'appointment_booked'   THEN 'bookings'
    WHEN 'appointment_cancelled' THEN 'bookings'
    WHEN 'appointment_completed' THEN 'bookings'
    WHEN 'email_opened'         THEN 'email'
    WHEN 'link_clicked'         THEN 'email'
    WHEN 'whatsapp_replied'     THEN 'whatsapp'
    WHEN 'sms_replied'          THEN 'sms'
    WHEN 'purchase_event'       THEN 'payments'
    WHEN 'webhook_received'     THEN 'webhooks'
    ELSE NULL
  END,
    trigger_event = trigger_type
WHERE trigger_source IS NULL
  AND trigger_type IS NOT NULL;
