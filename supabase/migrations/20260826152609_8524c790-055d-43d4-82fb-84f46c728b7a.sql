-- 1. Internal-only tables: explicit deny-all policies for API roles (service role bypasses RLS)
CREATE POLICY "No direct API access" ON public.oauth_connection_states
  AS RESTRICTIVE FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);

CREATE POLICY "No direct API access" ON public.mcp_rate_limits
  AS RESTRICTIVE FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);

REVOKE ALL ON public.oauth_connection_states FROM anon, authenticated;
REVOKE ALL ON public.mcp_rate_limits FROM anon, authenticated;
GRANT ALL ON public.oauth_connection_states TO service_role;
GRANT ALL ON public.mcp_rate_limits TO service_role;

-- 2. Pin search_path on email queue security-definer functions
ALTER FUNCTION public.delete_email(text, bigint) SET search_path = public, pgmq, pg_temp;
ALTER FUNCTION public.enqueue_email(text, jsonb) SET search_path = public, pgmq, pg_temp;
ALTER FUNCTION public.move_to_dlq(text, text, bigint, jsonb) SET search_path = public, pgmq, pg_temp;
ALTER FUNCTION public.read_email_batch(text, integer, integer) SET search_path = public, pgmq, pg_temp;