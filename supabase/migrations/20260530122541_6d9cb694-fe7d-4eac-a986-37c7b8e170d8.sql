-- Revoke column-level grants on sensitive Google OAuth fields from anon/authenticated
-- so the public booking page RLS policy cannot leak google_token_id / google_calendar_id.
REVOKE SELECT (google_token_id, google_calendar_id) ON public.booking_pages FROM anon;
REVOKE SELECT (google_token_id, google_calendar_id) ON public.booking_pages FROM authenticated;
GRANT SELECT (google_token_id, google_calendar_id) ON public.booking_pages TO service_role;