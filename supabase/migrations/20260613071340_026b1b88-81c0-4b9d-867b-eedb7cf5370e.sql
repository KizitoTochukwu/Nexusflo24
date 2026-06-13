DROP POLICY IF EXISTS "Public can view active booking pages" ON public.booking_pages;

DROP POLICY IF EXISTS "Public can view steps of active funnels" ON public.funnel_steps;

CREATE OR REPLACE FUNCTION public.get_public_funnel_steps(p_funnel_id uuid)
RETURNS TABLE(id uuid, step_order integer, step_type text, page_content jsonb)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT fs.id, fs.step_order, fs.step_type, fs.page_content
  FROM public.funnel_steps fs
  JOIN public.funnels f
    ON f.id = fs.funnel_id
   AND f.workspace_id = fs.workspace_id
  WHERE fs.funnel_id = p_funnel_id
    AND f.status = 'active'
  ORDER BY fs.step_order ASC;
$$;

GRANT EXECUTE ON FUNCTION public.get_public_funnel_steps(uuid) TO anon, authenticated;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'whatsapp_messages'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime DROP TABLE public.whatsapp_messages';
  END IF;
END $$;