-- Fix funnel_steps UPDATE policy (USING must come before WITH CHECK)
DROP POLICY IF EXISTS "Members can update workspace funnel steps" ON public.funnel_steps;
CREATE POLICY "Members can update workspace funnel steps"
  ON public.funnel_steps FOR UPDATE TO authenticated
  USING (workspace_id IN (SELECT user_workspace_ids(auth.uid())))
  WITH CHECK (workspace_id IN (SELECT user_workspace_ids(auth.uid())));