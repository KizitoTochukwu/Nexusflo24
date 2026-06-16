DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN
    SELECT policyname FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'site_custom_code' AND cmd = 'SELECT'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.site_custom_code', pol.policyname);
  END LOOP;
END $$;

CREATE POLICY "Admins can read site_custom_code"
  ON public.site_custom_code
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.get_public_site_custom_code()
RETURNS TABLE (
  head_code text,
  body_code text,
  head_enabled boolean,
  body_enabled boolean
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT head_code, body_code, head_enabled, body_enabled
  FROM public.site_custom_code
  WHERE id = 'global'
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_public_site_custom_code() TO anon, authenticated;