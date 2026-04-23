ALTER TABLE public.automations
ADD COLUMN IF NOT EXISTS exit_criteria JSONB NOT NULL DEFAULT '[]'::jsonb;

COMMENT ON COLUMN public.automations.exit_criteria IS
'Array of exit signal objects, e.g. [{"type":"purchase_happened"},{"type":"unsubscribed"},{"type":"tag_added","tag":"customer"}]. When any signal matches for an enrolled lead, pending scheduled_jobs for this automation+lead are cancelled.';