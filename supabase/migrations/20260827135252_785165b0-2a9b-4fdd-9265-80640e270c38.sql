-- 1. Extend whatsapp_messages
ALTER TABLE public.whatsapp_messages
  ADD COLUMN IF NOT EXISTS submitted_at timestamptz,
  ADD COLUMN IF NOT EXISTS sent_at timestamptz,
  ADD COLUMN IF NOT EXISTS waba_id text,
  ADD COLUMN IF NOT EXISTS sender_phone_number_id text,
  ADD COLUMN IF NOT EXISTS language_code text,
  ADD COLUMN IF NOT EXISTS automation_id uuid,
  ADD COLUMN IF NOT EXISTS automation_run_id uuid,
  ADD COLUMN IF NOT EXISTS error_code integer,
  ADD COLUMN IF NOT EXISTS error_title text,
  ADD COLUMN IF NOT EXISTS error_details text,
  ADD COLUMN IF NOT EXISTS fbtrace_id text,
  ADD COLUMN IF NOT EXISTS last_status_at timestamptz,
  ADD COLUMN IF NOT EXISTS credit_charged boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS sender_ownership text;

CREATE UNIQUE INDEX IF NOT EXISTS whatsapp_messages_outbound_wamid_key
  ON public.whatsapp_messages (wa_message_id)
  WHERE direction = 'outbound' AND wa_message_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS whatsapp_messages_ws_status_idx
  ON public.whatsapp_messages (workspace_id, status, created_at DESC);

-- 2. Status events (append-only)
CREATE TABLE IF NOT EXISTS public.whatsapp_status_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid,
  message_id uuid REFERENCES public.whatsapp_messages(id) ON DELETE CASCADE,
  wamid text NOT NULL,
  status text NOT NULL,
  meta_timestamp timestamptz,
  recipient_id text,
  conversation_id text,
  pricing jsonb,
  error_code integer,
  error_title text,
  error_message text,
  error_details text,
  fbtrace_id text,
  raw jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS whatsapp_status_events_unique
  ON public.whatsapp_status_events (wamid, status, COALESCE(meta_timestamp, '-infinity'::timestamptz));
CREATE INDEX IF NOT EXISTS whatsapp_status_events_msg_idx
  ON public.whatsapp_status_events (message_id, created_at DESC);

GRANT SELECT ON public.whatsapp_status_events TO authenticated;
GRANT ALL ON public.whatsapp_status_events TO service_role;
ALTER TABLE public.whatsapp_status_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members read own workspace WA status events"
  ON public.whatsapp_status_events FOR SELECT TO authenticated
  USING (workspace_id IS NOT NULL AND public.is_workspace_member(auth.uid(), workspace_id));

CREATE POLICY "Platform staff read all WA status events"
  ON public.whatsapp_status_events FOR SELECT TO authenticated
  USING (public.is_platform_staff(auth.uid()));

-- 3. Webhook events log (redacted)
CREATE TABLE IF NOT EXISTS public.whatsapp_webhook_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_key text NOT NULL,
  workspace_id uuid,
  phone_number_id text,
  signature_valid boolean NOT NULL DEFAULT false,
  event_type text,
  status_count integer NOT NULL DEFAULT 0,
  message_count integer NOT NULL DEFAULT 0,
  payload_redacted jsonb,
  processing_error text,
  received_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS whatsapp_webhook_events_key_uidx
  ON public.whatsapp_webhook_events (event_key);
CREATE INDEX IF NOT EXISTS whatsapp_webhook_events_ws_idx
  ON public.whatsapp_webhook_events (workspace_id, received_at DESC);

GRANT SELECT ON public.whatsapp_webhook_events TO authenticated;
GRANT ALL ON public.whatsapp_webhook_events TO service_role;
ALTER TABLE public.whatsapp_webhook_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members read own workspace WA webhook events"
  ON public.whatsapp_webhook_events FOR SELECT TO authenticated
  USING (workspace_id IS NOT NULL AND public.is_workspace_member(auth.uid(), workspace_id));

CREATE POLICY "Platform staff read all WA webhook events"
  ON public.whatsapp_webhook_events FOR SELECT TO authenticated
  USING (public.is_platform_staff(auth.uid()));

-- 4. Provider health (evidence only)
CREATE TABLE IF NOT EXISTS public.whatsapp_provider_health (
  workspace_id uuid PRIMARY KEY,
  waba_id text,
  phone_number_id text,
  display_phone_number text,
  verified_name text,
  token_configured boolean NOT NULL DEFAULT false,
  token_type text,
  token_expires_at timestamptz,
  phone_registration_state text,
  app_subscribed boolean,
  messages_field_subscribed boolean,
  callback_verified_at timestamptz,
  last_webhook_at timestamptz,
  last_sent_callback_at timestamptz,
  last_delivered_callback_at timestamptz,
  last_failed_callback_at timestamptz,
  last_template_sync_at timestamptz,
  api_version text,
  last_error text,
  last_checked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.whatsapp_provider_health TO authenticated;
GRANT ALL ON public.whatsapp_provider_health TO service_role;
ALTER TABLE public.whatsapp_provider_health ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members read own workspace WA health"
  ON public.whatsapp_provider_health FOR SELECT TO authenticated
  USING (public.is_workspace_member(auth.uid(), workspace_id));

CREATE POLICY "Platform staff read all WA health"
  ON public.whatsapp_provider_health FOR SELECT TO authenticated
  USING (public.is_platform_staff(auth.uid()));

CREATE TRIGGER whatsapp_provider_health_updated_at
  BEFORE UPDATE ON public.whatsapp_provider_health
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();