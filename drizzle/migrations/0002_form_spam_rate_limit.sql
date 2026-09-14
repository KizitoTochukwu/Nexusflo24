CREATE TABLE public.form_rate_limit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  form_id uuid NOT NULL,
  ip_hash text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_form_rate_limit_lookup ON public.form_rate_limit (form_id, ip_hash, created_at DESC);

GRANT ALL ON public.form_rate_limit TO service_role;

ALTER TABLE public.form_rate_limit ENABLE ROW LEVEL SECURITY;
-- No policies: only the service role (edge functions) may touch this table.
