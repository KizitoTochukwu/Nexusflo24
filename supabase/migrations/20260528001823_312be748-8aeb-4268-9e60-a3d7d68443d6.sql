-- Restrict pending invite visibility to workspace admins/owners only.
DROP POLICY IF EXISTS "Members can view invitations" ON public.invitations;
CREATE POLICY "Admins can view invitations"
  ON public.invitations
  FOR SELECT
  TO authenticated
  USING (public.is_workspace_admin(auth.uid(), workspace_id));

DROP POLICY IF EXISTS "Members can view workspace invites" ON public.workspace_invites;
CREATE POLICY "Admins can view workspace invites"
  ON public.workspace_invites
  FOR SELECT
  TO authenticated
  USING (public.is_workspace_admin(auth.uid(), workspace_id));

-- Ensure public funnel steps belong to the same active funnel/workspace before exposing page content.
DROP POLICY IF EXISTS "Public can view steps of active funnels" ON public.funnel_steps;
CREATE POLICY "Public can view steps of active funnels"
  ON public.funnel_steps
  FOR SELECT
  TO public
  USING (
    EXISTS (
      SELECT 1
      FROM public.funnels f
      WHERE f.id = funnel_steps.funnel_id
        AND f.workspace_id = funnel_steps.workspace_id
        AND f.status = 'active'
    )
  );

-- Remove sensitive workspace data from Realtime publications to prevent cross-workspace event subscription leakage.
ALTER PUBLICATION supabase_realtime DROP TABLE
  public.leads,
  public.campaign_messages,
  public.sms_logs,
  public.sales_conversations,
  public.message_credits,
  public.credit_transactions,
  public.email_logs;

-- Limit direct column exposure for booking pages: members can read booking page configuration, but not token/calendar references.
REVOKE SELECT ON public.booking_pages FROM anon;
REVOKE SELECT ON public.booking_pages FROM authenticated;

GRANT SELECT (
  id,
  workspace_id,
  user_id,
  name,
  slug,
  duration_minutes,
  availability,
  timezone,
  buffer_minutes,
  max_days_ahead,
  description,
  color,
  status,
  created_at,
  updated_at,
  notify_host,
  location_type,
  location_value
) ON public.booking_pages TO authenticated;
GRANT SELECT ON public.booking_pages TO service_role;

-- Safe admin-only helper for calendar connection status without exposing token references to all workspace members.
CREATE OR REPLACE FUNCTION public.get_booking_calendar_status(p_booking_page_id uuid)
RETURNS TABLE (
  connected boolean,
  token_id uuid,
  calendar_id text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM public.booking_pages bp
    WHERE bp.id = p_booking_page_id
      AND public.is_workspace_admin(auth.uid(), bp.workspace_id)
  ) THEN
    RETURN QUERY SELECT false, NULL::uuid, NULL::text;
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    (gct.id IS NOT NULL) AS connected,
    gct.id AS token_id,
    gct.calendar_id
  FROM public.booking_pages bp
  LEFT JOIN public.google_calendar_tokens gct ON gct.id = bp.google_token_id
  WHERE bp.id = p_booking_page_id
  LIMIT 1;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_booking_calendar_status(uuid) TO authenticated;