-- Site-wide custom code injection (admin-managed)
CREATE TABLE public.site_custom_code (
  id text NOT NULL PRIMARY KEY DEFAULT 'global',
  head_code text NOT NULL DEFAULT '',
  body_code text NOT NULL DEFAULT '',
  head_enabled boolean NOT NULL DEFAULT true,
  body_enabled boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid,
  CONSTRAINT site_custom_code_singleton CHECK (id = 'global')
);

ALTER TABLE public.site_custom_code ENABLE ROW LEVEL SECURITY;

-- Anyone (including anon) can read so snippets load on public pages
CREATE POLICY "Anyone can read site custom code"
ON public.site_custom_code
FOR SELECT
USING (true);

-- Only platform admins can insert/update
CREATE POLICY "Admins can insert site custom code"
ON public.site_custom_code
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update site custom code"
ON public.site_custom_code
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_site_custom_code_updated_at
BEFORE UPDATE ON public.site_custom_code
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Seed the singleton row
INSERT INTO public.site_custom_code (id, head_code, body_code, head_enabled, body_enabled)
VALUES ('global', '', '', true, true)
ON CONFLICT (id) DO NOTHING;

-- Enable realtime so saves propagate live
ALTER PUBLICATION supabase_realtime ADD TABLE public.site_custom_code;