
DROP POLICY "Service role can insert notifications" ON public.notifications;

CREATE POLICY "Workspace members can insert notifications"
  ON public.notifications FOR INSERT
  TO authenticated
  WITH CHECK (workspace_id IN (SELECT user_workspace_ids(auth.uid())));
