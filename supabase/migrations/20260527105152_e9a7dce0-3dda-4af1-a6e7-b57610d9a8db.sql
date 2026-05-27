
-- 1) automation_logs: only service_role can insert
DROP POLICY IF EXISTS "Members can insert workspace automation logs" ON public.automation_logs;
CREATE POLICY "Service can insert automation_logs"
ON public.automation_logs FOR INSERT TO service_role
WITH CHECK (true);

-- 2) bookings: validate workspace_id matches the booking page
DROP POLICY IF EXISTS "Anonymous can book active pages" ON public.bookings;
CREATE POLICY "Anonymous can book active pages"
ON public.bookings FOR INSERT TO anon
WITH CHECK (
  workspace_id = (
    SELECT bp.workspace_id FROM public.booking_pages bp
    WHERE bp.id = booking_page_id AND bp.status = 'active'
  )
);

-- 3) form_submissions: validate workspace_id matches the form
DROP POLICY IF EXISTS "Public can insert form_submissions" ON public.form_submissions;
CREATE POLICY "Public can insert form_submissions"
ON public.form_submissions FOR INSERT TO public
WITH CHECK (
  workspace_id = (
    SELECT f.workspace_id FROM public.forms f
    WHERE f.id = form_id AND f.status = 'active'
  )
);

-- 4) funnel_visits: validate workspace_id matches the funnel
DROP POLICY IF EXISTS "Anyone can insert funnel visits for active funnels" ON public.funnel_visits;
CREATE POLICY "Anyone can insert funnel visits for active funnels"
ON public.funnel_visits FOR INSERT TO public
WITH CHECK (
  workspace_id = (
    SELECT fn.workspace_id FROM public.funnels fn
    WHERE fn.id = funnel_id AND fn.status = 'active'
  )
);

-- 5) referrals: tighten check so referral_code must match the referrer's actual code
DROP POLICY IF EXISTS "Public can insert referrals" ON public.referrals;
CREATE POLICY "Public can insert referrals"
ON public.referrals FOR INSERT TO anon
WITH CHECK (
  reward_credits = 0
  AND status = 'clicked'
  AND referrer_user_id IN (
    SELECT r.referrer_user_id FROM public.referrals r
    WHERE r.referral_code = referrals.referral_code
  )
);

-- 6) workspace_members: remove self-insert escalation branch. Membership is created
-- exclusively via service-role accept-invite or the on-profile-created trigger.
DROP POLICY IF EXISTS "Admin/owner can insert members" ON public.workspace_members;
CREATE POLICY "Admin/owner can insert members"
ON public.workspace_members FOR INSERT TO authenticated
WITH CHECK (is_workspace_admin(auth.uid(), workspace_id));
