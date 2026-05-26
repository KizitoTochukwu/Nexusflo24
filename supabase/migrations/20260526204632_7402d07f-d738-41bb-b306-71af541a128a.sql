
-- 1. Bookings: tighten anon insert + restrict member policies to authenticated
DROP POLICY IF EXISTS "Anyone can insert bookings" ON public.bookings;
CREATE POLICY "Anonymous can book active pages"
ON public.bookings FOR INSERT TO anon
WITH CHECK (booking_page_id IN (SELECT id FROM public.booking_pages WHERE status = 'active'));

DROP POLICY IF EXISTS "Members can delete workspace bookings" ON public.bookings;
CREATE POLICY "Members can delete workspace bookings"
ON public.bookings FOR DELETE TO authenticated
USING (workspace_id IN (SELECT public.user_workspace_ids(auth.uid())));

DROP POLICY IF EXISTS "Members can insert workspace bookings" ON public.bookings;
CREATE POLICY "Members can insert workspace bookings"
ON public.bookings FOR INSERT TO authenticated
WITH CHECK (workspace_id IN (SELECT public.user_workspace_ids(auth.uid())));

DROP POLICY IF EXISTS "Members can update workspace bookings" ON public.bookings;
CREATE POLICY "Members can update workspace bookings"
ON public.bookings FOR UPDATE TO authenticated
USING (workspace_id IN (SELECT public.user_workspace_ids(auth.uid())));

DROP POLICY IF EXISTS "Members can view workspace bookings" ON public.bookings;
CREATE POLICY "Members can view workspace bookings"
ON public.bookings FOR SELECT TO authenticated
USING (workspace_id IN (SELECT public.user_workspace_ids(auth.uid())));

-- 2. funnel-assets: require workspace-scoped folder path on upload
DROP POLICY IF EXISTS "Authenticated users can upload funnel assets" ON storage.objects;
CREATE POLICY "Authenticated users can upload funnel assets"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'funnel-assets'
  AND public.is_workspace_member(auth.uid(), ((storage.foldername(name))[1])::uuid)
);

DROP POLICY IF EXISTS "Users can delete own funnel assets" ON storage.objects;
CREATE POLICY "Users can delete own funnel assets"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'funnel-assets'
  AND public.is_workspace_member(auth.uid(), ((storage.foldername(name))[1])::uuid)
);

-- 3. Referrals: constrain public insert
DROP POLICY IF EXISTS "Public can insert referrals" ON public.referrals;
CREATE POLICY "Public can insert referrals"
ON public.referrals FOR INSERT TO anon
WITH CHECK (
  reward_credits = 0
  AND status = 'clicked'
  AND referrer_user_id IN (SELECT id FROM public.profiles)
);

-- 4. Drop redundant public-role policies
DROP POLICY IF EXISTS "Members can view workspace sales_closer_settings" ON public.sales_closer_settings;
DROP POLICY IF EXISTS "Workspace members can view whatsapp_messages" ON public.whatsapp_messages;

-- 5. Remove site_custom_code from realtime publication
ALTER PUBLICATION supabase_realtime DROP TABLE public.site_custom_code;
