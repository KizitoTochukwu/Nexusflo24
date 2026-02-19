
-- Explicit service-role-only policies for payment_events
CREATE POLICY "Service role can insert payment events"
  ON public.payment_events
  FOR INSERT
  TO service_role
  WITH CHECK (true);

CREATE POLICY "Service role can select payment events"
  ON public.payment_events
  FOR SELECT
  TO service_role
  USING (true);

CREATE POLICY "Service role can update payment events"
  ON public.payment_events
  FOR UPDATE
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Service role can delete payment events"
  ON public.payment_events
  FOR DELETE
  TO service_role
  USING (true);
