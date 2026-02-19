
-- Allow users to delete their own profile (GDPR compliance)
CREATE POLICY "Users can delete their own profile"
  ON public.profiles
  FOR DELETE
  USING (auth.uid() = id);

-- Allow service role to delete subscriptions for lifecycle management
CREATE POLICY "Service role can delete subscriptions"
  ON public.subscriptions
  FOR DELETE
  TO service_role
  USING (true);
