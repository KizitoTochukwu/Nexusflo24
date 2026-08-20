CREATE OR REPLACE FUNCTION public.active_funnel_workspace_id(p_funnel_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT workspace_id FROM public.funnels WHERE id = p_funnel_id AND status = 'active'
$$;

GRANT EXECUTE ON FUNCTION public.active_funnel_workspace_id(uuid) TO anon, authenticated;

DROP POLICY IF EXISTS "Anyone can insert funnel visits for active funnels" ON public.funnel_visits;
CREATE POLICY "Anyone can insert funnel visits for active funnels"
ON public.funnel_visits FOR INSERT TO public
WITH CHECK (workspace_id = public.active_funnel_workspace_id(funnel_id));

GRANT INSERT ON public.funnel_visits TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.funnel_visits TO authenticated;
GRANT ALL ON public.funnel_visits TO service_role;