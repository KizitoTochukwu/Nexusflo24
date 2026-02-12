CREATE POLICY "Service role can insert subscriptions"
  ON public.subscriptions
  FOR INSERT
  TO service_role
  WITH CHECK (true);

CREATE POLICY "Service role can update subscriptions"
  ON public.subscriptions
  FOR UPDATE
  TO service_role
  USING (true)
  WITH CHECK (true);
