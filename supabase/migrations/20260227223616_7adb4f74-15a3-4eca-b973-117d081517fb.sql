-- Add WITH CHECK to funnels UPDATE policy
DROP POLICY IF EXISTS "Members can update workspace funnels" ON public.funnels;
CREATE POLICY "Members can update workspace funnels"
  ON public.funnels FOR UPDATE
  USING (workspace_id IN (SELECT user_workspace_ids(auth.uid())))
  WITH CHECK (workspace_id IN (SELECT user_workspace_ids(auth.uid())));

-- Add WITH CHECK to funnel_steps UPDATE policy  
DROP POLICY IF EXISTS "Members can update workspace funnel steps" ON public.funnel_steps;
CREATE POLICY "Members can update workspace funnel steps"
  ON public.funnel_steps FOR UPDATE
  USING (workspace_id IN (SELECT user_workspace_ids(auth.uid())))
  WITH CHECK (workspace_id IN (SELECT user_workspace_ids(auth.uid())));