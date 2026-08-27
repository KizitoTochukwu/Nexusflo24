
CREATE TABLE public.prospecting_send_lease (
  id text PRIMARY KEY,
  locked_until timestamptz,
  last_result jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT ALL ON public.prospecting_send_lease TO service_role;
ALTER TABLE public.prospecting_send_lease ENABLE ROW LEVEL SECURITY;

INSERT INTO public.prospecting_send_lease (id, locked_until) VALUES ('global', NULL);
