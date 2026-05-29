
-- 1. Fix mutable search_path on pgmq wrapper functions
CREATE OR REPLACE FUNCTION public.delete_email(queue_name text, message_id bigint)
 RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public', 'pgmq'
AS $function$
BEGIN
  RETURN pgmq.delete(queue_name, message_id);
EXCEPTION WHEN undefined_table THEN
  RETURN FALSE;
END;
$function$;

CREATE OR REPLACE FUNCTION public.read_email_batch(queue_name text, batch_size integer, vt integer)
 RETURNS TABLE(msg_id bigint, read_ct integer, message jsonb)
 LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public', 'pgmq'
AS $function$
BEGIN
  RETURN QUERY SELECT r.msg_id, r.read_ct, r.message FROM pgmq.read(queue_name, vt, batch_size) r;
EXCEPTION WHEN undefined_table THEN
  PERFORM pgmq.create(queue_name);
  RETURN;
END;
$function$;

CREATE OR REPLACE FUNCTION public.enqueue_email(queue_name text, payload jsonb)
 RETURNS bigint LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public', 'pgmq'
AS $function$
BEGIN
  RETURN pgmq.send(queue_name, payload);
EXCEPTION WHEN undefined_table THEN
  PERFORM pgmq.create(queue_name);
  RETURN pgmq.send(queue_name, payload);
END;
$function$;

CREATE OR REPLACE FUNCTION public.move_to_dlq(source_queue text, dlq_name text, message_id bigint, payload jsonb)
 RETURNS bigint LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public', 'pgmq'
AS $function$
DECLARE new_id BIGINT;
BEGIN
  SELECT pgmq.send(dlq_name, payload) INTO new_id;
  PERFORM pgmq.delete(source_queue, message_id);
  RETURN new_id;
EXCEPTION WHEN undefined_table THEN
  BEGIN PERFORM pgmq.create(dlq_name); EXCEPTION WHEN OTHERS THEN NULL; END;
  SELECT pgmq.send(dlq_name, payload) INTO new_id;
  BEGIN PERFORM pgmq.delete(source_queue, message_id); EXCEPTION WHEN undefined_table THEN NULL; END;
  RETURN new_id;
END;
$function$;

-- Revoke broad EXECUTE on the pgmq wrappers (only service_role needs them via edge functions)
REVOKE EXECUTE ON FUNCTION public.delete_email(text, bigint) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.read_email_batch(text, integer, integer) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.enqueue_email(text, jsonb) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.move_to_dlq(text, text, bigint, jsonb) FROM PUBLIC, anon, authenticated;

-- 2. Fix referrals INSERT policy: tighten WITH CHECK to enforce that the
-- supplied referrer_user_id is the actual owner of the referral_code.
DROP POLICY IF EXISTS "Public can insert referrals" ON public.referrals;
CREATE POLICY "Public can insert referrals"
ON public.referrals FOR INSERT TO anon, authenticated
WITH CHECK (
  reward_credits = 0
  AND status = 'clicked'
  AND referrer_user_id = (
    SELECT r.referrer_user_id FROM public.referrals r
    WHERE r.referral_code = referrals.referral_code
    LIMIT 1
  )
);

-- 3. Add public SELECT policy on booking_pages scoped to active rows
-- (mirrors funnels/forms pattern). Column-level grants already hide
-- google_token_id / google_calendar_id from anon/authenticated.
DROP POLICY IF EXISTS "Public can view active booking pages" ON public.booking_pages;
CREATE POLICY "Public can view active booking pages"
ON public.booking_pages FOR SELECT TO anon, authenticated
USING (status = 'active');

-- 4. Lock down anon EXECUTE on SECURITY DEFINER helpers that should never be
-- callable directly from the client. Keep authenticated EXECUTE where RLS
-- policies depend on them.
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_workspace_member(uuid, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_workspace_admin(uuid, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.user_workspace_ids(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_email_in_admin_allowlist(text) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.sync_admin_role() FROM anon;
REVOKE EXECUTE ON FUNCTION public.assign_next_round_robin(uuid) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.decay_inactive_leads() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.increment_automation_run(uuid) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.get_booking_calendar_status(uuid) FROM anon;
