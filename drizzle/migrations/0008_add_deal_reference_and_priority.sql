ALTER TABLE public.crm_deals
  ADD COLUMN IF NOT EXISTS reference_number text,
  ADD COLUMN IF NOT EXISTS priority text;

CREATE INDEX IF NOT EXISTS crm_deals_reference_number_idx
  ON public.crm_deals (workspace_id, reference_number);