-- Add UPDATE policy on lead_folder_leads so upserts (INSERT...ON CONFLICT DO UPDATE) work cleanly
-- without RLS rejecting the no-op update path.
CREATE POLICY "Members can update workspace folder leads"
ON public.lead_folder_leads
FOR UPDATE
USING (workspace_id IN (SELECT public.user_workspace_ids(auth.uid())))
WITH CHECK (workspace_id IN (SELECT public.user_workspace_ids(auth.uid())));